// Logic điều khiển giao diện, tính BMI/TDEE, accordion và kết nối Supabase
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initBmiCalculator();
    initAccordion();
    initOrderForm();
});

// 1. Quản lý Dark/Light Theme
function initTheme() {
    const themeToggle = document.querySelector(".theme-toggle");
    if (!themeToggle) return;

    // Đọc theme từ localStorage hoặc phát hiện theme hệ thống
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    let currentTheme = "light";
    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
        currentTheme = "dark";
    }

    // Áp dụng theme ban đầu
    document.documentElement.setAttribute("data-theme", currentTheme);
    updateThemeIcon(themeToggle, currentTheme);

    // Xử lý sự kiện click
    themeToggle.addEventListener("click", () => {
        currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", currentTheme);
        localStorage.setItem("theme", currentTheme);
        updateThemeIcon(themeToggle, currentTheme);
    });
}

function updateThemeIcon(button, theme) {
    if (theme === "dark") {
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
            </svg>`;
    } else {
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>`;
    }
}

// 2. Bộ tính toán BMI & TDEE
let currentBmiResult = null;
let currentTdeeResult = null;

function initBmiCalculator() {
    const calcForm = document.getElementById("bmi-form");
    if (!calcForm) return;

    calcForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const gender = document.querySelector('input[name="gender"]:checked').value;
        const age = parseInt(document.getElementById("age").value);
        const height = parseFloat(document.getElementById("height").value);
        const weight = parseFloat(document.getElementById("weight").value);
        const activity = parseFloat(document.getElementById("activity").value);

        if (!age || !height || !weight) return;

        // 1. Tính chỉ số BMI
        const heightInMeters = height / 100;
        const bmi = weight / (heightInMeters * heightInMeters);
        currentBmiResult = parseFloat(bmi.toFixed(1));

        // 2. Tính chỉ số BMR (Mifflin-St Jeor)
        let bmr = 0;
        if (gender === "male") {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        }

        // 3. Tính TDEE
        const tdee = bmr * activity;
        currentTdeeResult = Math.round(tdee);

        // Hiển thị kết quả lên giao diện
        displayCalculatorResults(currentBmiResult, currentTdeeResult);
    });
}

function displayCalculatorResults(bmi, tdee) {
    const placeholder = document.getElementById("result-placeholder");
    const resultBox = document.getElementById("result-content");
    const bmiVal = document.getElementById("bmi-val");
    const tdeeVal = document.getElementById("tdee-val");
    const pointer = document.getElementById("bmi-pointer");
    const statusText = document.getElementById("bmi-status-text");
    const adviceText = document.getElementById("bmi-advice");

    if (placeholder) placeholder.style.display = "none";
    if (resultBox) resultBox.style.display = "block";

    bmiVal.innerText = bmi;
    tdeeVal.innerText = `${tdee} kcal`;

    // Xác định trạng thái BMI và vị trí kim chỉ (thanh phần trăm 0% - 100%)
    let status = "";
    let color = "";
    let pointerPercent = 50;
    let advice = "";

    if (bmi < 18.5) {
        status = "Thiếu cân (Gầy)";
        color = "#3b82f6";
        pointerPercent = Math.max(10, ((bmi - 10) / 8.5) * 25);
        advice = "Cơ thể bạn đang thiếu năng lượng. Bạn cần nạp lượng calo nhiều hơn TDEE một chút và duy trì chế độ ăn đa dạng để tăng cân an toàn.";
    } else if (bmi >= 18.5 && bmi < 25) {
        status = "Cân đối (Bình thường)";
        color = "#10b981";
        pointerPercent = 25 + ((bmi - 18.5) / 6.5) * 35;
        advice = "Tuyệt vời! Chỉ số cơ thể của bạn rất lý tưởng. Hãy duy trì chế độ ăn cân bằng để tiếp tục bảo vệ vóc dáng hiện tại.";
    } else if (bmi >= 25 && bmi < 30) {
        status = "Thừa cân";
        color = "#fbbf24";
        pointerPercent = 60 + ((bmi - 25) / 5) * 20;
        advice = "Bạn đang ở trạng thái thừa cân nhẹ. Để giảm mỡ an toàn, bạn nên đặt mục tiêu ăn thâm hụt calo (nạp ít hơn TDEE khoảng 300-500 kcal mỗi ngày) mà không cần nhịn đói.";
    } else {
        status = "Béo phì";
        color = "#ef4444";
        pointerPercent = Math.min(95, 80 + ((bmi - 30) / 10) * 20);
        advice = "Chỉ số béo phì cảnh báo rủi ro về sức khỏe. Việc thâm hụt calo lành mạnh kết hợp vận động là cần thiết để bảo vệ hệ tim mạch và xương khớp của bạn.";
    }

    statusText.innerText = status;
    statusText.style.color = color;
    pointer.style.left = `${pointerPercent}%`;
    adviceText.innerText = advice;

    // Tự động điền các chỉ số vào form đăng ký mua sách bên dưới nếu có
    const heightField = document.getElementById("order-height");
    const weightField = document.getElementById("order-weight");
    if (heightField) heightField.value = document.getElementById("height").value;
    if (weightField) weightField.value = document.getElementById("weight").value;
}

// 3. Quản lý Accordion (Mục lục Ebook)
function initAccordion() {
    const headers = document.querySelectorAll(".accordion-header");
    if (headers.length === 0) return;

    headers.forEach((header) => {
        header.addEventListener("click", () => {
            const item = header.parentElement;
            const isActive = item.classList.contains("active");

            // Đóng tất cả các mục khác
            document.querySelectorAll(".accordion-item").forEach((el) => {
                el.classList.remove("active");
            });

            // Nếu chưa active thì mở mục hiện tại
            if (!isActive) {
                item.classList.add("active");
            }
        });
    });

    // Mặc định mở sẵn mục đầu tiên (Chương 1) theo quy tắc AI
    const firstItem = document.querySelector(".accordion-item");
    if (firstItem) {
        firstItem.classList.add("active");
    }
}

// 4. Form Đăng ký nhận sách & Lưu Supabase
function initOrderForm() {
    const orderForm = document.getElementById("order-form");
    if (!orderForm) return;

    orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const name = document.getElementById("order-name").value;
        const email = document.getElementById("order-email").value;
        const phone = document.getElementById("order-phone").value;
        const amount = 299000; // Giá sách cố định VNĐ

        // Lấy chỉ số BMI/TDEE từ calculator nếu đã tính toán
        const height = parseFloat(document.getElementById("height")?.value || 0);
        const weight = parseFloat(document.getElementById("weight")?.value || 0);
        const bmi = currentBmiResult;
        const tdee = currentTdeeResult;

        const submitBtn = orderForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerText = "Đang gửi đăng ký...";

        try {
            if (!supabaseClient) {
                throw new Error("Không thể kết nối với Supabase client.");
            }

            // 1. Lưu thông tin đơn hàng vào Supabase (hệ thống tự động sinh access_code)
            const { data, error } = await supabaseClient
                .from("orders")
                .insert([{
                    name,
                    email,
                    phone,
                    amount,
                    ai_questions_left: 20,
                    height: height > 0 ? height : null,
                    weight: weight > 0 ? weight : null,
                    bmi: bmi || null,
                    tdee: tdee || null
                }])
                .select();

            if (error) throw error;

            const order = data[0];

            // 2. Gọi Vercel Serverless API gửi thông báo đơn hàng qua Telegram
            try {
                await fetch("/api/send-notification", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: order.name,
                        phone: order.phone,
                        email: order.email,
                        access_code: order.access_code,
                        amount: order.amount,
                        bmi: order.bmi,
                        tdee: order.tdee
                    })
                });
            } catch (notifyErr) {
                console.error("Gửi thông báo Telegram lỗi:", notifyErr);
                // Vẫn tiếp tục vì đơn đã lưu DB thành công
            }

            // 3. Hiển thị thông báo thành công và chuyển hướng (hoặc hiển thị thông tin chuyển khoản)
            showPaymentModal(order.name, order.phone, order.access_code, order.amount);

        } catch (err) {
            console.error("Đăng ký lỗi:", err);
            alert("Có lỗi xảy ra trong quá trình đăng ký: " + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    });
}

function showPaymentModal(name, phone, code, amount) {
    // Tạo modal thanh toán chèn trực tiếp vào DOM
    const modalHtml = `
        <div id="payment-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:9999; padding: 20px;">
            <div style="background:var(--bg-card); color:var(--text-main); padding:32px; border-radius:16px; max-width:500px; width:100%; border:1px solid var(--border-color); box-shadow:var(--shadow); position:relative; text-align:center;">
                <h3 style="font-family:var(--font-serif); font-size:1.8rem; margin-bottom:16px; color:var(--primary);">Đăng Ký Thành Công!</h3>
                <p style="margin-bottom:20px; font-size:0.95rem;">Chào <strong>${name}</strong>, đơn hàng của bạn đã được ghi nhận trên hệ thống.</p>
                
                <div style="background:var(--bg-color); border:1px dashed var(--primary); padding:16px; border-radius:12px; margin-bottom:24px; text-align:left; font-size:0.92rem;">
                    <p style="margin-bottom:8px;"><strong>Mã kích hoạt của bạn:</strong> <span style="font-family:monospace; font-size:1.1rem; color:var(--primary); font-weight:700;">${code}</span></p>
                    <p>*(Mã này sẽ được kích hoạt ngay sau khi bạn hoàn tất thanh toán)*</p>
                </div>
                
                <h4 style="margin-bottom:12px; font-weight:600;">Thông Tin Chuyển Khoản:</h4>
                <div style="background:var(--bg-color); padding:16px; border-radius:12px; text-align:left; font-size:0.9rem; line-height:1.6; margin-bottom:24px;">
                    <p><strong>Ngân hàng:</strong> BIDV</p>
                    <p><strong>Số tài khoản:</strong> 0982581222</p>
                    <p><strong>Chủ tài khoản:</strong> ĐINH KHÁNH TÙNG</p>
                    <p><strong>Số tiền:</strong> ${amount.toLocaleString('vi-VN')} VNĐ</p>
                    <p><strong>Nội dung chuyển khoản:</strong> <span style="color:var(--primary); font-weight:700;">${phone} ${code}</span></p>
                </div>
                
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:24px;">Sau khi chuyển khoản, Admin sẽ kích hoạt tài khoản của bạn trong 2-5 phút. Bạn có thể sử dụng Số điện thoại và Mã kích hoạt trên để đọc sách tại trang <strong>Đọc Sách Online</strong>.</p>
                
                <button id="close-modal-btn" class="btn btn-primary" style="width:100%;">Tôi Đã Chuyển Khoản</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML("beforeend", modalHtml);
    
    document.getElementById("close-modal-btn").addEventListener("click", () => {
        document.getElementById("payment-modal").remove();
        // Reset form
        document.getElementById("order-form").reset();
    });
}
