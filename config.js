// Cấu hình kết nối Supabase và các API liên quan cho dự án Ebook Giảm Cân
const SUPABASE_URL = "https://zvhtcaicryjzkuesueoz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_90HgsC-kpUrPHz37Et1N9g_Q9LukIuj";

// Khởi tạo Supabase client toàn cục
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Cấu hình API và Tokens
// Lưu ý bảo mật: OpenAI API Key đã được chuyển sang Serverless API (/api/chat) để bảo mật tuyệt đối, không lộ ở Client.
const TELEGRAM_BOT_TOKEN = "8954238957:AAG7CigXYJBpwApP2AT_z5_UFxwKXpy-_gI";
const TELEGRAM_CHAT_ID = "1017815376";
