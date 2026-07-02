const https = require('https');

module.exports = async (req, res) => {
    // Cấu hình Header CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { id, name, phone, email, access_code, amount, bmi, tdee } = req.body;

        const botToken = process.env.TELEGRAM_BOT_TOKEN || "8954238957:AAG7CigXYJBpwApP2AT_z5_UFxwKXpy-_gI";
        const chatId = process.env.TELEGRAM_CHAT_ID || "1017815376";

        const bmiInfo = bmi ? `\n• BMI: *${bmi}*\n• TDEE: *${tdee} kcal*` : '\n• BMI/TDEE: *Chưa tính toán*';

        const message = `🔔 *CÓ ĐƠN HÀNG MỚI ĐĂNG KÝ* 🔔\n\n` +
            `• Họ tên: *${name}*\n` +
            `• SĐT: *${phone}*\n` +
            `• Email: *${email}*\n` +
            `• Mã kích hoạt: \`${access_code}\`${bmiInfo}\n` +
            `• Giá bán: *${(amount || 299000).toLocaleString('vi-VN')} VNĐ*\n` +
            `• Trạng thái: *Đang Chờ Kích Hoạt* (Chuyển khoản BIDV)\n\n` +
            `👉 Duyệt nhanh đơn hàng trực tiếp bằng cách bấm nút dưới đây hoặc truy cập Admin Panel: http://${req.headers.host || 'localhost'}/admin.html`;

        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        // Chèn nút bấm Inline duyệt đơn trực tiếp qua Telegram
        const postData = JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Duyệt Đơn Hàng", callback_data: `approve_order:${id}` }
                    ]
                ]
            }
        });

        // Gửi request HTTPS tới Telegram API
        const response = await new Promise((resolve, reject) => {
            const urlObj = new URL(telegramUrl);
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const request = https.request(options, (responseStream) => {
                let responseBody = '';
                responseStream.on('data', (chunk) => {
                    responseBody += chunk;
                });
                responseStream.on('end', () => {
                    resolve({
                        statusCode: responseStream.statusCode,
                        body: responseBody
                    });
                });
            });

            request.on('error', (err) => {
                reject(err);
            });

            request.write(postData);
            request.end();
        });

        if (response.statusCode === 200) {
            return res.status(200).json({ status: 'success', message: 'Notification sent successfully' });
        } else {
            console.error('Telegram API error:', response.body);
            return res.status(500).json({ status: 'error', message: 'Telegram API returned error', details: response.body });
        }

    } catch (error) {
        console.error('Send notification server error:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
