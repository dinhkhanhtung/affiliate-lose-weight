// Logic điều khiển giao diện đọc sách trực tuyến và Chatbot AI Coach
let bookChapters = [];
let currentChapterIndex = 0;
let userPhone = "";
let userAccessCode = "";
let userName = "Độc giả";
let aiQuestionsLeft = 0;
let userBmi = null;
let userTdee = null;
let chatHistory = [];

document.addEventListener("DOMContentLoaded", () => {
    initReaderTheme();
    checkExistingSession();
    initLoginForm();
    initLogoutBtn();
    initChapterNavigation();
    initChatForm();
    initFloatingChat();
    initAutoReadScroll();
    initFontControls();
    initAutoReadToggle();
    preventContentCopy();
});

// 1. Quản lý Theme trong trang Reader
function initReaderTheme() {
    const themeToggle = document.getElementById("reader-theme-toggle");
    if (!themeToggle) return;

    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIconReader(themeToggle, savedTheme);

    themeToggle.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", currentTheme);
        localStorage.setItem("theme", currentTheme);
        updateThemeIconReader(themeToggle, currentTheme);
    });
}

function updateThemeIconReader(button, theme) {
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

// 2. Chặn sao chép bản quyền sách
function preventContentCopy() {
    // Chặn click chuột phải
    document.addEventListener("contextmenu", (e) => {
        if (e.target.closest(".no-select")) {
            e.preventDefault();
        }
    });

    // Chặn phím tắt copy, view-source, F12
    document.addEventListener("keydown", (e) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modifierKey = isMac ? e.metaKey : e.ctrlKey;
        
        // Ctrl+C, Ctrl+U, Ctrl+Shift+I, F12
        if (
            (modifierKey && e.key === 'c') ||
            (modifierKey && e.key === 'u') ||
            (modifierKey && e.shiftKey && e.key === 'I') ||
            e.key === 'F12'
        ) {
            e.preventDefault();
        }
    });
}

// 3. Kiểm tra Session cũ đã đăng nhập
function checkExistingSession() {
    const savedPhone = localStorage.getItem("reader_phone");
    const savedCode = localStorage.getItem("reader_code");
    
    if (savedPhone && savedCode) {
        userPhone = savedPhone;
        userAccessCode = savedCode;
        loadBookData();
    } else {
        // Tắt màn hình loading để hiện form đăng nhập
        hideLoadingScreen();
    }
}

// 4. Form Đăng nhập đọc sách
function initLoginForm() {
    const loginForm = document.getElementById("reader-login-form");
    if (!loginForm) return;

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const phone = document.getElementById("login-phone").value.trim();
        const code = document.getElementById("login-code").value.trim().toUpperCase();

        const submitBtn = document.getElementById("login-submit-btn");
        submitBtn.disabled = true;
        submitBtn.innerText = "Đang kiểm tra kích hoạt...";

        // Hiện màn hình loading
        showLoadingScreen();

        try {
            if (!supabaseClient) {
                throw new Error("Không thể kết nối với cơ sở dữ liệu.");
            }

            // Gọi hàm RPC bảo mật kiểm tra quyền đọc sách
            const { data, error } = await supabaseClient.rpc("get_book_content", {
                customer_phone: phone,
                customer_code: code
            });

            if (error) throw error;

            // Nếu thành công, lưu session
            userPhone = phone;
            userAccessCode = code;
            localStorage.setItem("reader_phone", phone);
            localStorage.setItem("reader_code", code);
            
            // Xử lý dữ liệu sách
            bookChapters = data || [];
            
            // Lấy thông tin đơn hàng để chào khách hàng và hiển thị lượt AI
            await fetchUserOrderInfo();
            
            // Hiển thị giao diện đọc sách
            showReaderSection();

        } catch (err) {
            console.error("Đăng nhập thất bại:", err);
            hideLoadingScreen();
            alert("Đăng nhập lỗi: " + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Đăng Nhập Đọc Sách";
        }
    });
}

// Lấy thông tin chi tiết đơn hàng (lượt AI, tên, bmi, tdee)
async function fetchUserOrderInfo() {
    try {
        const { data, error } = await supabaseClient
            .from("orders")
            .select("name, ai_questions_left, bmi, tdee")
            .eq("phone", userPhone)
            .eq("access_code", userAccessCode)
            .eq("status", "approved")
            .single();

        if (error) throw error;
        
        if (data) {
            userName = data.name;
            aiQuestionsLeft = data.ai_questions_left;
            userBmi = data.bmi;
            userTdee = data.tdee;
            
            document.getElementById("display-user-name").innerText = userName;
            updateAiCreditDisplay();
        }
    } catch (e) {
        console.error("Không thể lấy thông tin chi tiết đơn hàng:", e);
    }
}

function updateAiCreditDisplay() {
    const display = document.getElementById("ai-credit-display");
    if (display) {
        display.innerText = `Còn ${aiQuestionsLeft} lượt`;
    }
    const triggerBadge = document.getElementById("ai-trigger-badge");
    if (triggerBadge) {
        triggerBadge.innerText = `Còn ${aiQuestionsLeft} lượt`;
    }
}

// 5. Tải nội dung sách sau khi đã xác thực Session
async function loadBookData() {
    try {
        if (!supabaseClient) {
            hideLoadingScreen();
            return;
        }

        // Tải nội dung sách từ RPC
        const { data, error } = await supabaseClient.rpc("get_book_content", {
            customer_phone: userPhone,
            customer_code: userAccessCode
        });

        if (error) {
            // Nếu lỗi phiên, xóa session bắt đăng nhập lại
            localStorage.removeItem("reader_phone");
            localStorage.removeItem("reader_code");
            hideLoadingScreen();
            return;
        }

        bookChapters = data || [];
        await fetchUserOrderInfo();
        showReaderSection();

    } catch (err) {
        console.error("Lỗi tải sách:", err);
        localStorage.removeItem("reader_phone");
        localStorage.removeItem("reader_code");
        hideLoadingScreen();
    }
}

function showReaderSection() {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("reader-section").style.display = "block";
    
    // Hiện lại Bottom Bar khi vào trang đọc chính
    const bottomBar = document.querySelector(".mobile-bottom-bar");
    if (bottomBar) {
        bottomBar.style.display = "";
    }
    
    // Nạp danh sách chương vào dropdown select
    const select = document.getElementById("chapter-select");
    if (select) {
        select.innerHTML = "";
        bookChapters.forEach((ch, idx) => {
            const opt = document.createElement("option");
            opt.value = idx;
            opt.innerText = `Chương ${ch.chapter_order}: ${ch.title}`;
            select.appendChild(opt);
        });
    }

    // Hiển thị chương cuối cùng đang đọc (hoặc chương đầu tiên)
    const lastReadIdx = parseInt(localStorage.getItem(`last_read_${userPhone}`) || "0");
    currentChapterIndex = lastReadIdx < bookChapters.length ? lastReadIdx : 0;
    renderChapter(currentChapterIndex);

    // Vô hiệu hóa nút Mua Ebook khi đã đăng nhập đọc sách
    disableBuyButton();

    // Tắt loading sau khi giao diện đã hiển thị xong
    hideLoadingScreen();
}

// Các hàm Helper đóng mở màn hình Loading đồng bộ
function showLoadingScreen() {
    const loadingSec = document.getElementById("loading-section");
    if (loadingSec) {
        loadingSec.style.display = "flex";
        loadingSec.style.opacity = "1";
        loadingSec.style.visibility = "visible";
    }
}

function hideLoadingScreen() {
    const loadingSec = document.getElementById("loading-section");
    if (loadingSec) {
        loadingSec.style.opacity = "0";
        loadingSec.style.visibility = "hidden";
        setTimeout(() => {
            loadingSec.style.display = "none";
        }, 400);
    }

    // Ẩn Bottom Bar khi người dùng đang ở màn hình kích hoạt/đăng nhập
    const loginSec = document.getElementById("login-section");
    if (loginSec && loginSec.style.display !== "none") {
        const bottomBar = document.querySelector(".mobile-bottom-bar");
        if (bottomBar) {
            bottomBar.style.display = "none";
        }
    }
}

// 6. Hiển thị nội dung chương sách (Markdown to HTML đơn giản)
function renderChapter(index) {
    if (bookChapters.length === 0 || index >= bookChapters.length) return;
    
    // Khóa sự kiện tự động cuộn qua chương trong lúc đang render
    isSwitchingChapter = true;
    
    currentChapterIndex = index;
    localStorage.setItem(`last_read_${userPhone}`, index);
    
    const chapter = bookChapters[index];
    
    document.getElementById("chapter-title").innerText = chapter.title;
    document.getElementById("chapter-number").innerText = `Chương ${chapter.chapter_order}`;
    
    // Xử lý hiển thị ảnh minh họa chương nếu có
    const imageContainer = document.getElementById("chapter-image-container");
    const chapterImage = document.getElementById("chapter-image");
    
    if (imageContainer && chapterImage) {
        if (chapter.image_url) {
            imageContainer.style.display = "block";
            imageContainer.classList.remove("image-loaded");
            chapterImage.classList.remove("loaded");
            
            chapterImage.src = chapter.image_url;
            chapterImage.onload = () => {
                imageContainer.classList.add("image-loaded");
                chapterImage.classList.add("loaded");
            };
        } else {
            imageContainer.style.display = "none";
            chapterImage.src = "";
        }
    }
    
    // Cập nhật dropdown
    const select = document.getElementById("chapter-select");
    if (select) select.value = index;

    // Chuyển đổi Markdown thô sang HTML đơn giản để hiển thị đẹp mắt
    const htmlContent = parseMarkdownToHtml(chapter.content);
    document.getElementById("chapter-content").innerHTML = htmlContent;

    // Áp dụng cỡ chữ của độc giả
    applyFontScale();

    // Cuộn trang đọc về đầu (tương thích cả PC và di động)
    resetReaderScroll();

    // Mở khóa tự động chuyển chương sau khi scroll và render đã ổn định hoàn toàn
    setTimeout(() => {
        isSwitchingChapter = false;
    }, 800);
}

// Markdown parser đơn giản bằng regex
function parseMarkdownToHtml(mdText) {
    if (!mdText) return "";
    
    let html = mdText
        // Tiêu đề
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Chữ đậm và nghiêng
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        // Dấu gạch ngang phân trang
        .replace(/^---$/gim, '<hr>')
        // Đoạn văn (tránh bao bọc các tag đã có)
        .split('\n').map(line => {
            const trimmed = line.trim();
            if (!trimmed) return "";
            if (trimmed.startsWith('<h') || trimmed.startsWith('<hr') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || trimmed.startsWith('<ol')) {
                return line;
            }
            // Hỗ trợ danh sách không thứ tự
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return `<li>${trimmed.substring(2)}</li>`;
            }
            return `<p>${trimmed}</p>`;
        }).join('\n');

    // Bao bọc danh sách <li> bằng <ul>
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    return html;
}

// 7. Điều hướng chương sách
function initChapterNavigation() {
    const prevBtn = document.getElementById("prev-chapter-btn");
    const nextBtn = document.getElementById("next-chapter-btn");
    const select = document.getElementById("chapter-select");

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (currentChapterIndex > 0) {
                renderChapter(currentChapterIndex - 1);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (currentChapterIndex < bookChapters.length - 1) {
                renderChapter(currentChapterIndex + 1);
            }
        });
    }

    if (select) {
        select.addEventListener("change", (e) => {
            const idx = parseInt(e.target.value);
            if (!isNaN(idx)) {
                renderChapter(idx);
            }
        });
    }
}

// 8. Đăng xuất
function initLogoutBtn() {
    const logoutBtn = document.getElementById("logout-btn");
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("reader_phone");
        localStorage.removeItem("reader_code");
        const bottomBar = document.querySelector(".mobile-bottom-bar");
        if (bottomBar) bottomBar.style.display = "none";
        location.reload();
    });
}

// 9. Ô Chat hỏi đáp Cố vấn AI Coach
function initChatForm() {
    const chatForm = document.getElementById("chat-form");
    if (!chatForm) return;

    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const input = document.getElementById("chat-input");
        const query = input.value.trim();
        if (!query) return;

        // 1. Kiểm tra số lượt hỏi
        if (aiQuestionsLeft <= 0) {
            alert("Bạn đã hết lượt hỏi cố vấn AI của gói Ebook này. Vui lòng liên hệ Admin Đinh Khánh Tùng (0982581222) để gia hạn thêm lượt hỏi.");
            return;
        }

        // Reset ô nhập ngay
        input.value = "";
        
        // 2. Hiển thị tin nhắn của khách hàng
        appendChatMessage(query, "user");

        // 3. Hiển thị typing indicator
        const typingId = appendTypingIndicator();

        try {
            // 4. Trừ lượt hỏi trên database Supabase bảo mật
            const { data: newCredits, error: decError } = await supabaseClient.rpc("decrement_ai_questions_left", {
                customer_phone: userPhone,
                customer_code: userAccessCode
            });

            if (decError) throw decError;
            
            // Cập nhật số lượt hỏi cục bộ
            aiQuestionsLeft = newCredits;
            updateAiCreditDisplay();

            // 5. Chuẩn bị bối cảnh (context) cho AI để có câu trả lời cá nhân hóa
            const currentChapter = bookChapters[currentChapterIndex];
            const chapterTextContext = currentChapter ? `Nội dung chương đang đọc (${currentChapter.title}): ${currentChapter.content.substring(0, 1500)}` : "";
            
            let userContext = `Độc giả tên là: ${userName}. `;
            if (userBmi && userTdee) {
                userContext += `Độc giả có chỉ số cơ thể: BMI = ${userBmi}, TDEE = ${userTdee} kcal. Hãy đưa ra lời khuyên cụ thể dựa trên chỉ số này khi họ hỏi về thực đơn hay calo.`;
            }

            const systemPrompt = 
                "Bạn là 'Cố Vấn Dinh Dưỡng AI' - một chuyên gia dinh dưỡng và giảm cân thân thiện, nhiệt tình của học viện FitLife. " +
                "Kiến thức của bạn được đào tạo dựa trên cuốn sách 'Giảm Cân Không Hành Xác'. " +
                "Hãy trả lời câu hỏi của độc giả một cách khoa học, thực tế theo phong cách Việt Nam. Khuyến khích ăn no bằng các món ăn Việt giàu xơ/đạm nạc, thâm hụt calo lành mạnh, không nhịn đói.\n\n" +
                `Bối cảnh độc giả: ${userContext}\n\n` +
                `Bối cảnh chương sách hiện tại: ${chapterTextContext}`;

            // Xây dựng hội thoại gửi lên OpenAI
            chatHistory.push({ role: "user", content: query });
            // Giới hạn lịch sử chat gửi đi để tránh tràn token
            const recentHistory = chatHistory.slice(-6);

            const messagesPayload = [
                { role: "system", content: systemPrompt },
                ...recentHistory
            ];

            // Gọi Vercel Serverless API chat để bảo mật key
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: messagesPayload
                })
            });

            const responseData = await response.json();
            
            // Xóa typing indicator
            removeTypingIndicator(typingId);

            if (responseData.error) {
                throw new Error(typeof responseData.error === 'object' ? responseData.error.message : responseData.error);
            }

            const aiReply = responseData.choices[0].message.content.trim();
            
            // Lưu reply vào lịch sử chat
            chatHistory.push({ role: "assistant", content: aiReply });

            // Hiển thị câu trả lời của AI
            appendChatMessage(aiReply, "ai");

        } catch (err) {
            console.error("AI Coach Error:", err);
            removeTypingIndicator(typingId);
            appendChatMessage("Xin lỗi, hệ thống AI của tôi đang quá tải hoặc gặp lỗi kết nối. Lượt hỏi của bạn chưa bị trừ. Vui lòng thử lại sau.", "ai");
            
            // Trả lại lượt hỏi cục bộ vì lỗi kết nối
            aiQuestionsLeft += 1;
            updateAiCreditDisplay();
        }
    });
}

function appendChatMessage(text, sender) {
    const chatContainer = document.getElementById("chat-messages");
    if (!chatContainer) return;

    const bubble = document.createElement("div");
    bubble.className = `chat-bubble chat-bubble-${sender}`;
    // Hỗ trợ hiển thị xuống dòng \n
    bubble.innerHTML = text.replace(/\n/g, "<br>");

    chatContainer.appendChild(bubble);
    // Cuộn chatbox xuống cuối
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function appendTypingIndicator() {
    const chatContainer = document.getElementById("chat-messages");
    if (!chatContainer) return null;

    const indicator = document.createElement("div");
    const id = "typing-" + Date.now();
    indicator.id = id;
    indicator.className = "typing-indicator";
    indicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;

    chatContainer.appendChild(indicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    if (!id) return;
    const indicator = document.getElementById(id);
    if (indicator) {
        indicator.remove();
    }
}

// Khởi tạo và quản lý trạng thái đóng mở chat AI trôi nổi
function initFloatingChat() {
    const trigger = document.getElementById("ai-chat-trigger");
    const panel = document.getElementById("ai-chat-panel");
    const closeBtn = document.getElementById("ai-chat-close-btn");
    
    if (!trigger || !panel) return;
    
    // Toggle mở/đóng chat khi nhấn nút nổi
    trigger.addEventListener("click", () => {
        panel.classList.toggle("active");
        if (panel.classList.contains("active")) {
            // Cuộn tin nhắn xuống cuối
            const chatMessages = document.getElementById("chat-messages");
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            trigger.classList.add("chat-open");
        } else {
            trigger.classList.remove("chat-open");
        }
    });
    
    // Đóng chat khi nhấn nút x
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            panel.classList.remove("active");
            trigger.classList.remove("chat-open");
        });
    }
}

// Khởi tạo tính năng Tự động cuộn qua chương mới
function initAutoReadScroll() {
    const readerMain = document.querySelector(".reader-main");
    
    // Lắng nghe scroll trên window (cho di động)
    window.addEventListener("scroll", () => {
        handleScrollAutoNext();
        updateReadingProgress();
    });
    
    // Lắng nghe scroll trên .reader-main (cho máy tính)
    if (readerMain) {
        readerMain.addEventListener("scroll", () => {
            handleScrollAutoNext();
            updateReadingProgress();
        });
    }
}

let isSwitchingChapter = false;

function handleScrollAutoNext() {
    if (!isAutoReadEnabled || isSwitchingChapter) return;
    
    // Nếu là chương cuối cùng thì thôi
    if (currentChapterIndex >= bookChapters.length - 1) return;
    
    const readerMain = document.querySelector(".reader-main");
    let isNearBottom = false;
    
    if (window.innerWidth > 992 && readerMain) {
        // Desktop container scroll
        isNearBottom = (readerMain.scrollHeight - readerMain.scrollTop - readerMain.clientHeight) < 40;
    } else {
        // Mobile/Tablet viewport scroll
        isNearBottom = (document.documentElement.scrollHeight - window.scrollY - window.innerHeight) < 80;
    }
    
    if (isNearBottom) {
        isSwitchingChapter = true;
        currentChapterIndex++;
        
        // Render chương mới
        renderChapter(currentChapterIndex);
        
        // Hiển thị toast thông báo góc trên
        showToastNotification(`Đang đọc tiếp: Chương ${bookChapters[currentChapterIndex].chapter_order}`);
        
        // Chờ 1.5s để tránh trigger liên tục khi scroll quá nhanh
        setTimeout(() => {
            isSwitchingChapter = false;
        }, 1500);
    }
}

// Cập nhật thanh tiến trình đọc sách ở đỉnh trang
function updateReadingProgress() {
    const progressBar = document.getElementById("reading-progress-bar");
    if (!progressBar) return;
    
    const readerMain = document.querySelector(".reader-main");
    let percentage = 0;
    
    if (window.innerWidth > 992 && readerMain) {
        const totalHeight = readerMain.scrollHeight - readerMain.clientHeight;
        if (totalHeight > 0) {
            percentage = (readerMain.scrollTop / totalHeight) * 100;
        }
    } else {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (totalHeight > 0) {
            percentage = (window.scrollY / totalHeight) * 100;
        }
    }
    
    progressBar.style.width = `${percentage}%`;
}

// Hiển thị thông báo Toast nhỏ trên đỉnh màn hình
function showToastNotification(message) {
    let toast = document.getElementById("reader-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "reader-toast";
        toast.className = "reader-toast-notification";
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// Reset vị trí cuộn trang về đầu (PC & Di động)
function resetReaderScroll() {
    window.scrollTo({ top: 0 });
    const readerMain = document.querySelector(".reader-main");
    if (readerMain) {
        readerMain.scrollTop = 0;
    }
    // Cập nhật lại progress bar về 0%
    const progressBar = document.getElementById("reading-progress-bar");
    if (progressBar) progressBar.style.width = "0%";
}

// Vô hiệu hóa nút Mua Ebook khi đã sở hữu sách
function disableBuyButton() {
    const buyBtn = document.querySelector(".mbb-cta-btn");
    if (buyBtn) {
        buyBtn.innerText = "ĐÃ SỞ HỮU";
        buyBtn.classList.add("disabled");
        buyBtn.href = "javascript:void(0)";
    }
}

// --- CÁC HÀM NÂNG CAO TRẢI NGHIỆM ĐỌC SÁCH ---

// 1. Quản lý cỡ chữ (Font size controls) cho độc giả trung niên (45+)
let currentFontScale = parseInt(localStorage.getItem("reader_font_scale") || "100");

function applyFontScale() {
    const content = document.getElementById("chapter-content");
    if (content) {
        // Cỡ chữ cơ bản của thiết kế là 1.15rem
        content.style.fontSize = `${(1.15 * currentFontScale) / 100}rem`;
    }
    const display = document.getElementById("font-size-display");
    if (display) {
        display.innerText = `${currentFontScale}%`;
    }
}

function initFontControls() {
    const decBtn = document.getElementById("font-dec-btn");
    const incBtn = document.getElementById("font-inc-btn");
    if (!decBtn || !incBtn) return;
    
    applyFontScale();
    
    decBtn.addEventListener("click", () => {
        if (currentFontScale > 80) {
            currentFontScale -= 10;
            localStorage.setItem("reader_font_scale", currentFontScale);
            applyFontScale();
        }
    });
    
    incBtn.addEventListener("click", () => {
        if (currentFontScale < 180) { // Tối đa 180% giúp người trung niên đọc cực kỳ rõ
            currentFontScale += 10;
            localStorage.setItem("reader_font_scale", currentFontScale);
            applyFontScale();
        }
    });
}

// 2. Quản lý trạng thái Bật/Tắt chế độ đọc nối tiếp
let isAutoReadEnabled = localStorage.getItem("reader_auto_read") !== "false"; // Mặc định là Bật (true)

function updateAutoReadUI() {
    const toggleBtn = document.getElementById("auto-read-toggle-btn");
    const statusText = document.getElementById("auto-read-status");
    if (!toggleBtn) return;
    
    if (isAutoReadEnabled) {
        toggleBtn.classList.add("active");
        if (statusText) statusText.innerText = "BẬT";
    } else {
        toggleBtn.classList.remove("active");
        if (statusText) statusText.innerText = "TẮT";
    }
}

function initAutoReadToggle() {
    const toggleBtn = document.getElementById("auto-read-toggle-btn");
    if (!toggleBtn) return;
    
    updateAutoReadUI();
    
    toggleBtn.addEventListener("click", () => {
        isAutoReadEnabled = !isAutoReadEnabled;
        localStorage.setItem("reader_auto_read", isAutoReadEnabled);
        updateAutoReadUI();
        
        showToastNotification(isAutoReadEnabled ? "Đã BẬT tự động chuyển chương" : "Đã TẮT tự động chuyển chương");
    });
}
