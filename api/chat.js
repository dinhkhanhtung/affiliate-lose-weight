const https = require('https');

function telegramPost(url, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const postData = typeof body === 'string' ? body : JSON.stringify(body);
        
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
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
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages } = req.body;

        // Lấy API Keys từ Environment Variables (không chèn key cứng vào mã nguồn)
        const geminiKey = process.env.GEMINI_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;

        // 1. NẾU CÓ GEMINI KEY -> DÙNG GEMINI LÀM MẶC ĐỊNH
        if (geminiKey) {
            // Chuyển đổi cấu trúc OpenAI messages sang cấu trúc Gemini API
            const contents = [];
            let systemInstructionText = "";

            messages.forEach(msg => {
                if (msg.role === 'system') {
                    systemInstructionText = msg.content;
                } else {
                    contents.push({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.content }]
                    });
                }
            });

            const geminiPayload = {
                contents: contents,
                generationConfig: {
                    temperature: 0.7
                }
            };

            if (systemInstructionText) {
                geminiPayload.systemInstruction = {
                    parts: [{ text: systemInstructionText }]
                };
            }

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
            
            const response = await telegramPost(geminiUrl, geminiPayload);
            const responseData = JSON.parse(response.body);

            if (response.statusCode === 200 && responseData.candidates && responseData.candidates[0]) {
                const aiReply = responseData.candidates[0].content.parts[0].text;
                
                // Trả về định dạng tương thích với Client (OpenAI format)
                return res.status(200).json({
                    choices: [
                        {
                            message: {
                                role: 'assistant',
                                content: aiReply
                            }
                        }
                    ]
                });
            } else {
                console.warn('Gemini API failed, checking fallback to OpenAI...', responseData);
                // Nếu lỗi, tự động trượt xuống gọi OpenAI bên dưới
            }
        }

        // 2. PHƯƠNG ÁN DỰ PHÒNG: GỌI OPENAI
        if (openaiKey) {
            const openaiUrl = 'https://api.openai.com/v1/chat/completions';
            const response = await telegramPost(openaiUrl, {
                model: 'gpt-4o-mini',
                messages: messages,
                temperature: 0.7
            }, {
                'Authorization': `Bearer ${openaiKey}`
            });

            const responseData = JSON.parse(response.body);
            if (response.statusCode === 200) {
                return res.status(200).json(responseData);
            } else {
                return res.status(response.statusCode).json({ error: responseData.error ? responseData.error.message : 'OpenAI API Error' });
            }
        }

        return res.status(500).json({ error: 'No active AI API configuration (Gemini/OpenAI) found on Server.' });

    } catch (error) {
        console.error('Chat API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
