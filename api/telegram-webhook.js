const https = require('https');
const { Client } = require('pg');

// Helper gửi request HTTPS gọn nhẹ
function telegramPost(url, body) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const postData = JSON.stringify(body);
        
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let resBody = '';
            res.on('data', (chunk) => {
                resBody += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: resBody
                });
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Các biến cần dùng chung ở block catch
    let botToken = process.env.TELEGRAM_BOT_TOKEN || "8954238957:AAG7CigXYJBpwApP2AT_z5_UFxwKXpy-_gI";
    let callbackId = null;

    const answerCallback = async (text, showAlert = false) => {
        if (!callbackId) return;
        const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
        try {
            await telegramPost(url, {
                callback_query_id: callbackId,
                text: text,
                show_alert: showAlert
            });
        } catch (e) {
            console.error("Error answering callback:", e);
        }
    };

    try {
        const update = req.body;

        // Bỏ qua nếu không phải là Callback Query từ nút bấm
        if (!update || !update.callback_query) {
            return res.status(200).json({ status: 'ignored', message: 'Not a callback_query' });
        }

        const callbackQuery = update.callback_query;
        callbackId = callbackQuery.id;
        const cbData = callbackQuery.data || '';
        const message = callbackQuery.message || {};
        const chatId = message.chat ? message.chat.id : null;
        const messageId = message.message_id;

        const dbConnString = process.env.DATABASE_URL || "postgresql://postgres:T6Cz5p8TcXbw@db.zvhtcaicryjzkuesueoz.supabase.co:5432/postgres";

        if (cbData.startsWith('approve_order:')) {
            const orderId = parseInt(cbData.split(':')[1]);

            if (isNaN(orderId)) {
                await answerCallback('Mã đơn hàng không hợp lệ!', true);
                return res.status(200).json({ status: 'error', message: 'Invalid order ID' });
            }

            // 1. Kết nối PostgreSQL trực tiếp để kiểm tra và cập nhật
            const client = new Client({
                connectionString: dbConnString,
                ssl: dbConnString.includes('localhost') || dbConnString.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
            });
            await client.connect();

            // Truy vấn đơn hàng
            const queryRes = await client.query('SELECT name, phone, access_code, status, amount FROM public.orders WHERE id = $1', [orderId]);
            
            if (queryRes.rows.length === 0) {
                await client.end();
                await answerCallback('Lỗi: Không tìm thấy đơn hàng trên database!', true);
                return res.status(200).json({ status: 'error', message: 'Order not found' });
            }

            const order = queryRes.rows[0];
            const name = order.name;
            const accessCode = order.access_code;
            const status = order.status;
            const amount = order.amount || 299000;

            // Nếu đơn đã được duyệt trước đó
            if (status === 'approved') {
                await client.end();
                await answerCallback('Đơn hàng này đã được duyệt và kích hoạt trước đó!', true);
                
                // Ẩn nút bấm để tránh click nhầm
                const editUrl = `https://api.telegram.org/bot${botToken}/editMessageText`;
                const newText = `✅ *ĐƠN HÀNG ĐÃ ĐƯỢC DUYỆT TỪ TRƯỚC* ✅\n\n` +
                    `• Khách hàng: *${name}*\n` +
                    `• SĐT: *${order.phone}*\n` +
                    `• Mã kích hoạt: \`${accessCode}\`\n` +
                    `• Giá bán: *${amount.toLocaleString('vi-VN')} VNĐ*\n\n` +
                    `📍 Trạng thái: Đã duyệt thành công.`;

                await telegramPost(editUrl, {
                    chat_id: chatId,
                    message_id: messageId,
                    text: newText,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [] }
                });

                return res.status(200).json({ status: 'success', message: 'Order was already approved' });
            }

            // 2. Thực hiện cập nhật trạng thái đơn hàng thành 'approved'
            await client.query("UPDATE public.orders SET status = 'approved' WHERE id = $1", [orderId]);
            await client.end();

            // 3. Trả lời Telegram popup thành công
            await answerCallback(`Đã duyệt đơn hàng & kích hoạt mã ${accessCode} cho ${name}!`);

            // 4. Sửa lại tin nhắn Telegram gốc để báo duyệt thành công và ẩn nút
            const editUrl = `https://api.telegram.org/bot${botToken}/editMessageText`;
            const successText = `✅ *ĐƠN HÀNG ĐÃ DUYỆT THÀNH CÔNG* ✅\n\n` +
                `• Khách hàng: *${name}*\n` +
                `• SĐT: *${order.phone}*\n` +
                `• Mã kích hoạt: \`${accessCode}\`\n` +
                `• Giá bán: *${amount.toLocaleString('vi-VN')} VNĐ*\n\n` +
                `📍 Trạng thái: *Đã kích hoạt trực tiếp từ Telegram Bot*.\n` +
                `⏰ Duyệt lúc: ${new Date().toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'})}`;

            await telegramPost(editUrl, {
                chat_id: chatId,
                message_id: messageId,
                text: successText,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [] }
            });

            return res.status(200).json({ status: 'success', message: 'Order approved successfully via Telegram' });
        }

        return res.status(200).json({ status: 'ignored', message: 'Query type not supported' });

    } catch (error) {
        console.error('Telegram Webhook error:', error);
        // Báo lỗi cụ thể về Telegram để hiển thị Alert Popup cho Admin biết ngay
        await answerCallback("Lỗi duyệt đơn: " + error.message, true);
        return res.status(200).json({ status: 'error', message: error.message });
    }
};
