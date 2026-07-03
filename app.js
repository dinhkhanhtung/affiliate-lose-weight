document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initMobileMenu();
    initBmiCalculator();
    initAccordion();
    initOrderForm();
});

// Quản lý Hamburger Menu trên Mobile
function initMobileMenu() {
    const hamburgerBtn = document.getElementById("hamburger-btn");
    const navLinksMenu = document.getElementById("nav-links-menu");
    if (!hamburgerBtn || !navLinksMenu) return;

    hamburgerBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navLinksMenu.classList.toggle("active");
        hamburgerBtn.classList.toggle("active");
    });

    // Tự động đóng menu khi bấm vào link điều hướng
    const links = navLinksMenu.querySelectorAll("a");
    links.forEach(link => {
        link.addEventListener("click", () => {
            navLinksMenu.classList.remove("active");
            hamburgerBtn.classList.remove("active");
        });
    });

    // Đóng menu khi bấm ra ngoài
    document.addEventListener("click", (e) => {
        if (!navLinksMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            navLinksMenu.classList.remove("active");
            hamburgerBtn.classList.remove("active");
        }
    });
}

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

    // Xác định trạng thái BMI và vị trí kim chỉ
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
    const heightField = document.getElementById("order-height-hidden");
    const weightField = document.getElementById("order-weight-hidden");
    if (heightField) heightField.value = document.getElementById("height").value;
    if (weightField) weightField.value = document.getElementById("weight").value;
}

// 3. Quản lý Accordion (Mục lục Ebook & FAQ)
function initAccordion() {
    const headers = document.querySelectorAll(".accordion-header");
    if (headers.length === 0) return;

    headers.forEach((header) => {
        header.addEventListener("click", () => {
            const item = header.parentElement;
            const container = item.parentElement; // Accordion container tương ứng
            const isActive = item.classList.contains("active");

            // Chỉ đóng các mục trong cùng một container để tránh gập chéo giữa FAQ và Chương sách
            container.querySelectorAll(".accordion-item").forEach((el) => {
                el.classList.remove("active");
            });

            // Nếu chưa active thì mở mục hiện tại
            if (!isActive) {
                item.classList.add("active");
            }
        });
    });

    // Mặc định mở sẵn mục đầu tiên của mỗi accordion container
    document.querySelectorAll(".accordion-container").forEach((container) => {
        const firstItem = container.querySelector(".accordion-item");
        if (firstItem) {
            firstItem.classList.add("active");
        }
    });
}

// 4. Form Đăng ký nhận sách & Lưu Supabase
function initOrderForm() {
    const orderForm = document.getElementById("order-form");
    if (!orderForm) return;

    orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const name = document.getElementById("order-fullname").value;
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
                        id: order.id,
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
            }

            // 3. Hiển thị thông báo thành công và thông tin chuyển khoản VietQR
            showPaymentModal(order.name, order.phone, order.access_code, order.amount);

        } catch (err) {
            console.error("Lỗi đăng ký:", err);
            alert("Đã xảy ra lỗi trong quá trình xử lý đăng ký: " + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    });
}

// 5. Quản lý hiển thị Modal chuyển khoản và kiểm tra duyệt đơn hàng tự động
function showPaymentModal(name, phone, accessCode, amount) {
    const modal = document.getElementById("payment-modal-box");
    const codeVal = document.getElementById("payment-code-val");
    const qrGraphic = document.getElementById("payment-qr-graphic");
    const closeBtn = document.getElementById("close-modal-btn");
    const statusBox = document.getElementById("payment-status-box");
    const statusIcon = document.getElementById("payment-status-icon");
    const statusText = document.getElementById("payment-status-text");

    if (!modal) return;

    let isApproved = false;
    let pollingInterval = null;

    // Reset giao diện Trạng thái về mặc định
    if (statusBox) {
        statusBox.classList.remove("success");
        statusBox.style.borderStyle = "dashed";
    }
    if (statusIcon) {
        statusIcon.innerText = "🔄";
        statusIcon.style.animation = "spin 1.5s linear infinite";
    }
    if (statusText) {
        statusText.innerText = "Hệ thống đang chờ quét mã chuyển khoản...";
    }
    closeBtn.innerText = "Xác nhận đã chuyển khoản";
    closeBtn.className = "btn btn-primary";

    // Hiển thị mã nội dung chuyển khoản
    codeVal.innerText = accessCode;

    // Tự động tạo ảnh QR VietQR bằng API mở (nhanh, chuẩn và tự động điền nội dung)
    const description = encodeURIComponent(accessCode);
    const accountName = encodeURIComponent("DINH KHANH TUNG");
    const qrUrl = `https://img.vietqr.io/image/bidv-0982581222-compact.png?amount=${amount}&addInfo=${description}&accountName=${accountName}`;
    
    if (qrGraphic) {
        qrGraphic.innerHTML = `<img src="${qrUrl}" alt="VietQR Viet Nam" style="max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">`;
    }

    // Kích hoạt modal
    modal.classList.add("active");

    // Hàm gọi Supabase kiểm tra trạng thái đơn hàng (Approved hay chưa)
    const checkPaymentStatus = async () => {
        try {
            if (!supabaseClient) return;
            const { data, error } = await supabaseClient
                .from("orders")
                .select("status")
                .eq("phone", phone)
                .eq("access_code", accessCode)
                .maybeSingle();

            if (data && data.status === "approved") {
                isApproved = true;
                clearInterval(pollingInterval);
                
                // Cập nhật giao diện Thành công
                if (statusBox) {
                    statusBox.classList.add("success");
                    statusBox.style.borderStyle = "solid";
                }
                if (statusIcon) {
                    statusIcon.innerText = "✅";
                    statusIcon.style.animation = "none";
                }
                if (statusText) {
                    statusText.innerHTML = "<strong>Giao dịch đã được duyệt thành công!</strong> Cảm ơn bạn.";
                }
                
                // Đổi nút bấm chính sang truy cập sách trực tiếp
                closeBtn.innerText = "Bắt đầu đọc sách ngay 📖";
                closeBtn.style.backgroundColor = "#1c7d5c"; // Lục bảo
                closeBtn.style.borderColor = "#1c7d5c";
                closeBtn.onclick = () => {
                    sessionStorage.setItem("reader_phone", phone);
                    sessionStorage.setItem("reader_code", accessCode);
                    modal.classList.remove("active");
                    window.location.href = "reader.html";
                };
            }
        } catch (err) {
            console.error("Lỗi khi kiểm tra trạng thái đơn hàng:", err);
        }
    };

    // Khởi chạy vòng kiểm tra tự động cứ mỗi 3 giây
    pollingInterval = setInterval(checkPaymentStatus, 3000);

    // Xử lý đóng modal hoặc bấm nút thủ công
    const handleManualConfirmation = async () => {
        if (isApproved) {
            // Nếu đã approved thì chuyển trang
            sessionStorage.setItem("reader_phone", phone);
            sessionStorage.setItem("reader_code", accessCode);
            modal.classList.remove("active");
            window.location.href = "reader.html";
            return;
        }

        // Nếu chưa approved, cập nhật trạng thái ngay trong hộp thoại và tiếp tục chờ
        closeBtn.disabled = true;
        closeBtn.innerText = "Đang chờ đối soát tự động...";
        
        if (statusText) {
            statusText.innerHTML = `<strong>Đang kiểm tra giao dịch chuyển khoản...</strong><br><span style="font-size: 0.85rem; opacity: 0.85; margin-top: 6px; display: inline-block; line-height: 1.4;">Hệ thống đang đối soát ngân hàng tự động (thường mất 1-3 phút). Vui lòng không đóng cửa sổ này, hệ thống sẽ tự động chuyển hướng khi đơn hàng được duyệt!</span>`;
        }

        // Kiểm tra nhanh 1 lần lập tức
        await checkPaymentStatus();
    };

    closeBtn.onclick = handleManualConfirmation;

    // Đóng modal khi click ra ngoài overlay (Đồng thời tắt setInterval)
    modal.onclick = (e) => {
        if (e.target === modal) {
            clearInterval(pollingInterval);
            modal.classList.remove("active");
        }
    };
}

// 6. Xử lý nút Back to Top (Quay lại đầu trang)
document.addEventListener("DOMContentLoaded", () => {
    const backToTopBtn = document.getElementById("back-to-top");
    if (backToTopBtn) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 400) {
                backToTopBtn.classList.add("active");
            } else {
                backToTopBtn.classList.remove("active");
            }
        });
        
        backToTopBtn.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }
});
