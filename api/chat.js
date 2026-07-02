const https = require('https');

module.exports = async (req, res) => {
    // Cấu hình CORS
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
        
        // Đọc OpenAI Key từ biến môi trường Vercel (bảo mật tuyệt đối, không có key cứng)
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'OpenAI API key is not configured on Vercel environment variables.' });
        }

        const response = await new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                model: 'gpt-4o-mini',
                messages: messages,
                temperature: 0.7
            });

            const options = {
                hostname: 'api.openai.com',
                port: 443,
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
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

        const responseData = JSON.parse(response.body);

        if (response.statusCode !== 200) {
            console.error('OpenAI API returned error:', responseData);
            return res.status(response.statusCode).json({ error: responseData.error ? responseData.error.message : 'Unknown OpenAI error' });
        }

        return res.status(200).json(responseData);

    } catch (error) {
        console.error('Chat API server error:', error);
        return res.status(500).json({ error: error.message });
    }
};
