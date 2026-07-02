const https = require('https');

function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const reqOptions = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = https.request(reqOptions, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    body: body
                });
            });
        });

        req.on('error', (e) => {
            reject(e);
        });
        req.end();
    });
}

module.exports = async (req, res) => {
    try {
        const sbUrl = process.env.SUPABASE_URL || 'https://zvhtcaicryjzkuesueoz.supabase.co';
        const sbAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_90HgsC-kpUrPHz37Et1N9g_Q9LukIuj';

        // Gửi một truy vấn đơn giản đến REST API của Supabase (lấy tối đa 1 đơn hàng) để hệ thống ghi nhận hoạt động
        const response = await fetch(`${sbUrl}/rest/v1/orders?limit=1`, {
            headers: {
                'apikey': sbAnonKey,
                'Authorization': `Bearer ${sbAnonKey}`
            }
        });

        return res.status(200).json({
            status: 'success',
            message: 'Supabase keep-alive ping sent successfully (zvhtcaicryjzkuesueoz)',
            supabaseStatus: response.status
        });
    } catch (error) {
        console.error('Keep-alive error:', error);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};
