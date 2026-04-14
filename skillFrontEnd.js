// ============================================
// Gainhub - Main JavaScript File
// All improvements included: Search, Filter, Pagination, Dark Mode, Reviews, Admin Messages, Friends List, etc.
// ============================================

// --- 1. Global Variables ---
let currentLang = 'en';
let activeChatId = null;
let chatInterval = null;
let allUsers = [];
let currentPage = 1;
const usersPerPage = 20;

// --- 2. Dark Mode Toggle ---
function toggleDarkMode() {
    document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', document.body.classList.contains('dark'));
    const btn = document.getElementById('darkModeBtn');
    if (btn) {
        if (document.body.classList.contains('dark')) {
            btn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            btn.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }
}

// Initialize Dark Mode from localStorage
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    const darkBtn = document.getElementById('darkModeBtn');
    if (darkBtn) darkBtn.innerHTML = '<i class="fas fa-sun"></i>';
}

// --- 3. Translation Dictionary ---
const translations = {
    en: {
        langBtn: "🌐 العربية",
        tagline: "Share your knowledge, learn something new.",
        navHome: "Home",
        navSignup: "Sign Up",
        navLogin: "Login",
        navProfile: "Profile",
        navExplore: "Explore",
        navContact: "Contact",
        homeTitle: "Learn a skill...<br>and teach another!",
        btnJoin: "Join Community",
        btnLogin: "Login",
        profileTitle: "My Profile",
        exploreTitle: "Explore Skills",
        lblOffers: "Offers",
        lblWants: "Wants",
        btnChat: "Chat",
        btnAdd: "Add Friend",
        btnPending: "Pending",
        notLoggedIn: "You are not logged in yet.",
        noRequests: "No pending requests.",
        pendingTitle: "Incoming Requests",
        contactTitle: "Contact Us",
        btnSend: "Send Message",
        myReviewsTitle: "My Reviews",
        noReviews: "No reviews yet.",
        searchPlaceholder: "🔍 Search by name or skill...",
        allCategories: "All Categories",
        categoryTech: "💻 Technology",
        categoryArt: "🎨 Art & Design",
        categoryLang: "🌍 Languages",
        categoryBusiness: "📊 Business",
        categorySports: "⚽ Sports",
        contactMessagesTitle: "Contact Messages",
        noMessages: "No messages yet",
        markAsRead: "Mark as read",
        read: "Read",
        refresh: "Refresh",
        myFriendsTitle: "My Friends",
        noFriendsYet: "No friends yet. Explore and add some!",
        fullName: "Full Name",
        email: "Email",
        password: "Password",
        confirmPassword: "Confirm Password",
        emailAddress: "Email Address",
        skillOffer: "Skill You Offer",
        skillLearn: "Skill You Want to Learn",
        selectCategory: "Select Skill Category",
        passwordMismatch: "Passwords do not match!",
        searchSkills: "Search for skills...",
        yourEmail: "Your Email",
        message: "Message",
        writeMessage: "Write a message...",
        logout: "Logout",
        allOfferLearn: "All: Offer/Learn",
        offering: "Offering",
        wantToLearn: "Want to Learn"
    },
    ar: {
        langBtn: "🌐 English",
        tagline: "شارك معرفتك وتعلم شيئاً جديداً.",
        navHome: "الرئيسية",
        navSignup: "إنشاء حساب",
        navLogin: "دخول",
        navProfile: "الملف",
        navExplore: "استكشف",
        navContact: "اتصل بنا",
        homeTitle: "تعلم مهارة...<br>وعلّم مهارة أخرى!",
        btnJoin: "انضم الآن",
        btnLogin: "دخول",
        profileTitle: "ملفي الشخصي",
        exploreTitle: "تصفح المهارات",
        lblOffers: "يقدم",
        lblWants: "يريد",
        btnChat: "محادثة",
        btnAdd: "إضافة صديق",
        btnPending: "قيد الانتظار",
        notLoggedIn: "أنت لم تسجل الدخول بعد.",
        noRequests: "لا توجد طلبات معلقة.",
        pendingTitle: "طلبات الإضافة الواردة",
        contactTitle: "اتصل بنا",
        btnSend: "إرسال",
        myReviewsTitle: "تقييماتي",
        noReviews: "لا توجد تقييمات بعد.",
        searchPlaceholder: "🔍 بحث بالاسم أو المهارة...",
        allCategories: "جميع الأقسام",
        categoryTech: "💻 تقنية",
        categoryArt: "🎨 فن وتصميم",
        categoryLang: "🌍 لغات",
        categoryBusiness: "📊 أعمال",
        categorySports: "⚽ رياضة",
        contactMessagesTitle: "رسائل التواصل",
        noMessages: "لا توجد رسائل بعد",
        markAsRead: "تحديد كمقروء",
        read: "مقروء",
        refresh: "تحديث",
        myFriendsTitle: "أصدقائي",
        noFriendsYet: "لا يوجد أصدقاء بعد. استكشف وأضف بعض الأصدقاء!",
        fullName: "الاسم الكامل",
        email: "البريد الإلكتروني",
        password: "كلمة المرور",
        confirmPassword: "تأكيد كلمة المرور",
        emailAddress: "البريد الإلكتروني",
        skillOffer: "المهارة التي تقدمها",
        skillLearn: "المهارة التي تريد تعلمها",
        selectCategory: "اختر تصنيف المهارة",
        passwordMismatch: "كلمات المرور غير متطابقة!",
        searchSkills: "ابحث عن مهارات...",
        yourEmail: "بريدك الإلكتروني",
        message: "الرسالة",
        writeMessage: "اكتب رسالة...",
        logout: "تسجيل خروج",
        allOfferLearn: "الكل: يقدم/يريد",
        offering: "يقدم",
        wantToLearn: "يريد التعلم"
    }
};

// --- 4. Language Toggle ---
function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ar' : 'en';
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    
    // Update all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            if (el.getAttribute('data-i18n-html') === 'true') {
                el.innerHTML = translations[currentLang][key];
            } else {
                el.textContent = translations[currentLang][key];
            }
        }
    });
    
    // Update all placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLang][key]) {
            el.placeholder = translations[currentLang][key];
        }
    });
    
    const langBtn = document.querySelector('.lang-toggle');
    if (langBtn) langBtn.textContent = translations[currentLang].langBtn;
    
    // Update category options
    updateCategoryOptions();
    
    // Update admin messages section text if visible
    const adminSection = document.getElementById('adminMessagesSection');
    if (adminSection && adminSection.style.display !== 'none') {
        const titleSpan = adminSection.querySelector('h3 span');
        if (titleSpan && titleSpan.getAttribute('data-i18n') === 'contactMessagesTitle') {
            titleSpan.textContent = translations[currentLang].contactMessagesTitle;
        }
        const refreshBtn = adminSection.querySelector('button');
        if (refreshBtn) {
            const refreshSpan = refreshBtn.querySelector('span');
            if (refreshSpan) refreshSpan.textContent = translations[currentLang].refresh;
        }
        loadAdminMessages();
    }
    
    // Update friends section title
    const friendsTitle = document.querySelector('#myFriendsList')?.parentElement?.querySelector('h3 span');
    if (friendsTitle && friendsTitle.getAttribute('data-i18n') === 'myFriendsTitle') {
        friendsTitle.textContent = translations[currentLang].myFriendsTitle;
    }
    
    // Update reviews title
    const reviewsTitle = document.querySelector('#myReviews')?.parentElement?.querySelector('h3');
    if (reviewsTitle) {
        const reviewSpan = reviewsTitle.querySelector('span');
        if (reviewSpan && reviewSpan.getAttribute('data-i18n') === 'myReviewsTitle') {
            reviewSpan.textContent = translations[currentLang].myReviewsTitle;
        }
    }
    
    // Update pending requests title
    const pendingTitle = document.querySelector('#incomingRequests')?.parentElement?.querySelector('h3');
    if (pendingTitle && pendingTitle.getAttribute('data-i18n') === 'pendingTitle') {
        pendingTitle.textContent = translations[currentLang].pendingTitle;
    }
    
    if (document.getElementById('explore')?.style.display !== 'none') {
        filterUsers();
    }
}

function updateCategoryOptions() {
    const categorySelects = document.querySelectorAll('#categoryFilter, #homeCategory');
    categorySelects.forEach(select => {
        if (select) {
            const options = select.querySelectorAll('option');
            if (options[0]) options[0].textContent = translations[currentLang].allCategories;
            if (options[1]) options[1].textContent = translations[currentLang].categoryTech;
            if (options[2]) options[2].textContent = translations[currentLang].categoryArt;
            if (options[3]) options[3].textContent = translations[currentLang].categoryLang;
            if (options[4]) options[4].textContent = translations[currentLang].categoryBusiness;
            if (options[5]) options[5].textContent = translations[currentLang].categorySports;
        }
    });
}

// --- 5. Navigation Between Sections ---
function showSection(id, btnElement) {
    document.querySelectorAll("main section").forEach(sec => {
        sec.style.display = "none";
    });
    
    const target = document.getElementById(id);
    if (!target) return;
    
    target.style.display = id === 'home' ? 'flex' : 'block';
    
    if (btnElement) {
        document.querySelectorAll("nav button").forEach(btn => {
            btn.classList.remove("active");
        });
        btnElement.classList.add("active");
    }
    
    if (id === 'explore') {
        updateExplore();
    }
    if (id === 'profile') {
        loadProfile();
    }
    
    setTimeout(applyTilt, 50);
}

// --- 6. 3D Tilt Effect on Cards ---
function applyTilt() {
    const cards = document.querySelectorAll('.card-container, .profile-card, .user-card');
    cards.forEach(card => {
        if (card.dataset.tiltApplied) return;
        card.dataset.tiltApplied = "true";
        
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            const multiplier = 8;
            const xRotate = (-y / (rect.height / 2)) * multiplier;
            const yRotate = (x / (rect.width / 2)) * multiplier;
            card.style.transform = `perspective(1000px) rotateX(${xRotate}deg) rotateY(${yRotate}deg) scale(1.02)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.transition = 'all 0.5s ease';
        });
    });
}

// --- 7. Profile Loading ---
async function loadProfile() {
    const res = await fetch('/api/current_user');
    const container = document.getElementById('profileCard');
    
    if (res.status === 401) {
        container.innerHTML = `<p class="empty-state">${translations[currentLang].notLoggedIn}</p>`;
        return;
    }
    
    const user = await res.json();
    container.innerHTML = `
        <div class="profile-info" style="text-align:center;">
            <img src="${user.profile_pic}" class="avatar-img-large" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">
            <h3 style="margin-top:1rem;">${escapeHtml(user.username)}</h3>
            <p style="color:var(--text-muted);">${user.email || ''}</p>
            <div class="rating-stars" style="justify-content: center; margin-top: 10px;">
                ${generateStars(user.rating || 0)}
                <span class="rating-count">(${user.reviewCount || 0})</span>
            </div>
        </div>
    `;
    
    loadIncomingRequests();
    loadMyReviews();
    loadAdminMessages();
    loadMyFriends();
}

// --- 8. Profile Picture Upload with Compression (Supports up to 10MB original) ---
function compressImage(file, maxSizeMB = 2) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Reduce size if too large (max 800px)
                const maxWidth = 800;
                const maxHeight = 800;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG with 0.7 quality (lower quality = smaller size)
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.7);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

document.getElementById('profilePicInput')?.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        document.getElementById('uploadStatus').innerHTML = '<span style="color: #ef4444;">❌ Please select an image file</span>';
        return;
    }
    
    // Allow original file up to 10MB (will be compressed)
    if (file.size > 10 * 1024 * 1024) {
        document.getElementById('uploadStatus').innerHTML = '<span style="color: #ef4444;">❌ Image too large (max 10MB original)</span>';
        return;
    }
    
    document.getElementById('uploadStatus').innerHTML = '<span style="color: var(--accent);"><i class="fas fa-spinner fa-spin"></i> Compressing image...</span>';
    
    try {
        // Compress the image
        const compressedBlob = await compressImage(file);
        
        console.log(`📸 Original size: ${(file.size / 1024).toFixed(2)} KB`);
        console.log(`📸 Compressed size: ${(compressedBlob.size / 1024).toFixed(2)} KB`);
        
        // Check compressed size (max 2MB)
        if (compressedBlob.size > 2 * 1024 * 1024) {
            document.getElementById('uploadStatus').innerHTML = '<span style="color: #ef4444;">❌ Image too large even after compression (max 2MB)</span>';
            return;
        }
        
        document.getElementById('uploadStatus').innerHTML = '<span style="color: var(--accent);"><i class="fas fa-spinner fa-spin"></i> Uploading...</span>';
        
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async function() {
            const base64String = reader.result;
            
            const response = await fetch('/api/update_profile_pic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile_pic: base64String })
            });
            
            const data = await response.json();
            if (data.success) {
                document.getElementById('uploadStatus').innerHTML = '<span style="color: #10b981;">✅ Profile picture updated!</span>';
                setTimeout(() => loadProfile(), 1000);
            } else {
                document.getElementById('uploadStatus').innerHTML = '<span style="color: #ef4444;">❌ Upload failed: ' + (data.error || 'Unknown error') + '</span>';
            }
        };
        reader.readAsDataURL(compressedBlob);
        
    } catch(err) {
        console.error('Upload error:', err);
        document.getElementById('uploadStatus').innerHTML = '<span style="color: #ef4444;">❌ Error processing image</span>';
    }
    
    e.target.value = '';
});

// --- 9. My Friends List ---
async function loadMyFriends() {
    try {
        const response = await fetch('/api/my_friends');
        if (response.status === 401) return;
        
        const friends = await response.json();
        const container = document.getElementById('myFriendsList');
        const friendsCount = document.getElementById('friendsCount');
        
        if (!container) return;
        
        if (friendsCount) {
            friendsCount.textContent = friends.length;
        }
        
        if (friends.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted);">
                <i class="fas fa-user-friends" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                <span data-i18n="noFriendsYet">${translations[currentLang].noFriendsYet}</span>
            </div>`;
            return;
        }
        
        container.innerHTML = friends.map(friend => `
            <div class="friend-item" style="display: flex; align-items: center; gap: 15px; padding: 12px; border-bottom: 1px solid var(--border); transition: all 0.3s; border-radius: 12px;">
                <img src="${friend.profile_pic}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent);" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">
                <div style="flex: 1;">
                    <strong style="font-size: 1rem;">${escapeHtml(friend.username)}</strong>
                    <div style="display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
                        <span style="font-size: 11px; background: rgba(102, 126, 234, 0.1); padding: 2px 8px; border-radius: 20px;">📤 ${escapeHtml(friend.skillOffer)}</span>
                        <span style="font-size: 11px; background: rgba(236, 72, 153, 0.1); padding: 2px 8px; border-radius: 20px;">📥 ${escapeHtml(friend.skillLearn)}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="openChat(${friend.id}, '${escapeHtml(friend.username)}')" class="friend-chat-btn" style="background: var(--gradient-btn); color: white; border: none; padding: 8px 16px; border-radius: 25px; cursor: pointer; font-size: 12px; transition: all 0.3s;">
                        <i class="fas fa-comment"></i> ${translations[currentLang].btnChat}
                    </button>
                    <button onclick="viewFriendProfile(${friend.id})" style="background: transparent; border: 1px solid var(--border); padding: 8px 12px; border-radius: 25px; cursor: pointer; font-size: 12px; transition: all 0.3s;">
                        <i class="fas fa-user"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch(e) {
        console.error('Error loading friends:', e);
    }
}

function viewFriendProfile(friendId) {
    const friend = allUsers.find(u => u.id === friendId);
    if (friend) {
        alert(`${friend.username}\n📤 ${translations[currentLang].lblOffers}: ${friend.skillOffer}\n📥 ${translations[currentLang].lblWants}: ${friend.skillLearn}\n⭐ Rating: ${(friend.rating || 0).toFixed(1)}/5`);
    }
}

// --- 10. Incoming Requests ---
async function loadIncomingRequests() {
    const res = await fetch('/api/my_requests');
    const requests = await res.json();
    const container = document.getElementById('incomingRequests');
    
    if (!container) return;
    
    if (requests.length === 0) {
        container.innerHTML = `<p class="empty-state">${translations[currentLang].noRequests}</p>`;
        return;
    }
    
    container.innerHTML = requests.map(req => `
        <div class="request-item" style="display: flex; align-items: center; gap: 12px; padding: 10px; border-bottom: 1px solid var(--border);">
            <img src="${req.sender_pic}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">
            <span style="flex:1; font-weight:600;">${escapeHtml(req.sender_name)}</span>
            <div style="display:flex; gap:0.5rem;">
                <button onclick="handleFriendRequest(${req.id}, 'accept')" style="background: #10b981; color: white; border: none; padding: 5px 12px; border-radius: 20px; cursor: pointer; transition: all 0.3s;">✓ Accept</button>
                <button onclick="handleFriendRequest(${req.id}, 'reject')" style="background: #9ca3af; color: white; border: none; padding: 5px 12px; border-radius: 20px; cursor: pointer; transition: all 0.3s;">✗ Reject</button>
            </div>
        </div>
    `).join('');
}

async function handleFriendRequest(reqId, action) {
    const res = await fetch(`/api/handle_request/${reqId}/${action}`, { method: 'POST' });
    if (res.ok) {
        loadIncomingRequests();
        if (action === 'accept') {
            updateExplore();
            loadMyFriends();
        }
    }
}

// --- 11. My Reviews ---
async function loadMyReviews() {
    const container = document.getElementById('myReviews');
    if (!container) return;
    
    try {
        const res = await fetch('/api/my_reviews');
        if (res.status === 401) {
            container.innerHTML = `<p class="empty-state">${translations[currentLang].notLoggedIn}</p>`;
            return;
        }
        const reviews = await res.json();
        
        if (reviews.length === 0) {
            container.innerHTML = `<p class="empty-state">${translations[currentLang].noReviews}</p>`;
            return;
        }
        
        container.innerHTML = reviews.map(review => `
            <div class="review-item" style="display: flex; align-items: center; gap: 12px; padding: 10px; border-bottom: 1px solid var(--border);">
                <img src="${review.reviewer_pic}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">
                <div style="flex:1;">
                    <strong>${escapeHtml(review.reviewer_name)}</strong>
                    <div class="rating-stars" style="margin-top: 4px;">${generateStars(review.rating)}</div>
                    <p style="font-size:0.85rem; margin-top:0.3rem;">${escapeHtml(review.comment)}</p>
                </div>
            </div>
        `).join('');
    } catch(e) {
        console.error('Error loading reviews:', e);
    }
}

// --- 12. Generate Stars ---
function generateStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < full; i++) stars += '<i class="fas fa-star" style="color:#f59e0b;"></i>';
    if (half) stars += '<i class="fas fa-star-half-alt" style="color:#f59e0b;"></i>';
    while (stars.length / 29 < 5) stars += '<i class="far fa-star" style="color:#f59e0b;"></i>';
    return stars;
}

// --- 13. Explore Users with Search, Filter, Pagination ---
async function updateExplore() {
    try {
        const response = await fetch('/api/users');
        allUsers = await response.json();
        filterUsers();
        applyTilt();
    } catch(e) {
        console.error('Error loading users:', e);
    }
}

function filterUsers() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const category = document.getElementById('categoryFilter')?.value || 'all';
    const skillType = document.getElementById('skillTypeFilter')?.value || 'all';
    
    let filtered = allUsers.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchTerm) ||
                              user.skillOffer.toLowerCase().includes(searchTerm) ||
                              user.skillLearn.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'all' || user.category === category;
        let matchesSkillType = true;
        if (skillType === 'offer') matchesSkillType = user.skillOffer !== 'Generalist';
        if (skillType === 'learn') matchesSkillType = user.skillLearn !== 'Everything';
        return matchesSearch && matchesCategory && matchesSkillType;
    });
    
    currentPage = 1;
    renderPaginatedUsers(filtered);
}

function renderPaginatedUsers(users) {
    const container = document.getElementById('cardsContainer');
    if (!container) return;
    
    const start = (currentPage - 1) * usersPerPage;
    const paginatedUsers = users.slice(start, start + usersPerPage);
    
    if (paginatedUsers.length === 0) {
        container.innerHTML = `<div class="empty-state">No users found matching your criteria.</div>`;
    } else {
        container.innerHTML = paginatedUsers.map(user => `
            <div class="profile-card user-card" data-user-id="${user.id}">
                <img src="${user.profile_pic}" class="avatar-img" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">
                <h3>${escapeHtml(user.username)}</h3>
                <div class="rating-stars">
                    ${generateStars(user.rating || 0)}
                    <span class="rating-count">(${user.reviewCount || 0})</span>
                </div>
                <div class="skills-wrapper">
                    <div class="skill-badge"><span>📤 ${translations[currentLang].lblOffers}</span><strong>${escapeHtml(user.skillOffer)}</strong></div>
                    <div class="skill-badge"><span>📥 ${translations[currentLang].lblWants}</span><strong>${escapeHtml(user.skillLearn)}</strong></div>
                </div>
                ${getActionButton(user)}
            </div>
        `).join('');
    }
    
    const totalPages = Math.ceil(users.length / usersPerPage);
    const paginationDiv = document.getElementById('pagination');
    if (paginationDiv) {
        paginationDiv.innerHTML = `
            <button onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>◀ Previous</button>
            <span>Page ${currentPage} of ${totalPages || 1}</span>
            <button onclick="changePage(1)" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>Next ▶</button>
        `;
    }
}

function changePage(delta) {
    currentPage += delta;
    filterUsers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getActionButton(user) {
    if (user.relationship === 'accepted') {
        return `<button onclick="openChat(${user.id}, '${escapeHtml(user.username)}')" class="chat-btn"><i class="fas fa-comment"></i> ${translations[currentLang].btnChat}</button>`;
    } else if (user.relationship === 'pending') {
        return `<button disabled class="pending-btn"><i class="fas fa-clock"></i> ${translations[currentLang].btnPending}</button>`;
    } else {
        return `<button onclick="sendFriendRequest(${user.id})" class="add-btn"><i class="fas fa-user-plus"></i> ${translations[currentLang].btnAdd}</button>`;
    }
}

async function sendFriendRequest(userId) {
    const res = await fetch(`/api/send_request/${userId}`, { method: 'POST' });
    if (res.status === 401) {
        alert(translations[currentLang].notLoggedIn);
    } else {
        const data = await res.json();
        if (data.success) updateExplore();
    }
}

// --- 14. Escape HTML for Security (XSS Protection) ---
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// --- 15. Chat System ---
async function openChat(userId, userName) {
    activeChatId = userId;
    document.getElementById('chatWith').innerText = userName;
    document.getElementById('chatWindow').style.display = 'flex';
    loadMessages();
    
    if (chatInterval) clearInterval(chatInterval);
    chatInterval = setInterval(loadMessages, 3000);
}

function closeChat() {
    document.getElementById('chatWindow').style.display = 'none';
    if (chatInterval) {
        clearInterval(chatInterval);
        chatInterval = null;
    }
    activeChatId = null;
}

async function loadMessages() {
    if (!activeChatId) return;
    
    try {
        const res = await fetch(`/api/chat/${activeChatId}`);
        const msgs = await res.json();
        
        const meRes = await fetch('/api/current_user');
        const me = await meRes.json();
        
        const container = document.getElementById('chatMessages');
        container.innerHTML = msgs.map(m => `
            <div style="align-self: ${m.sender === me.id ? 'flex-end' : 'flex-start'}; 
                        background: ${m.sender === me.id ? '#a855f7' : 'var(--bg-card)'}; 
                        color: ${m.sender === me.id ? 'white' : 'var(--text-primary)'};
                        padding: 8px 15px; 
                        border-radius: 18px; 
                        max-width: 80%; 
                        font-size: 14px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                ${escapeHtml(m.text)}
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    } catch(e) {
        console.error('Error loading messages:', e);
    }
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !activeChatId) return;
    
    try {
        await fetch(`/api/chat/${activeChatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        input.value = '';
        loadMessages();
    } catch(e) {
        console.error('Error sending message:', e);
    }
}

// --- 16. Contact Form ---
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'contactForm') {
        e.preventDefault();
        const email = document.getElementById('contactEmail')?.value;
        const message = document.getElementById('contactMessage')?.value;
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerHTML;
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;
        }
        
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, message })
            });
            const data = await res.json();
            if (data.success) {
                alert(currentLang === 'ar' ? "✓ شكراً لتواصلك معنا! تم إرسال رسالتك." : "✓ Thanks for reaching out! Your message has been sent.");
                e.target.reset();
            } else {
                alert("❌ Error: " + (data.error || "Please try again."));
            }
        } catch(err) {
            alert("❌ Network error. Please try again.");
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }
});

// --- 17. Password Confirmation on Signup ---
document.getElementById('signupForm')?.addEventListener('submit', function(e) {
    const pwd = document.getElementById('signupPassword')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;
    const errorDiv = document.getElementById('passwordError');
    
    if (pwd !== confirm) {
        e.preventDefault();
        if (errorDiv) errorDiv.style.display = 'block';
    } else if (errorDiv) {
        errorDiv.style.display = 'none';
    }
});

// --- 18. Enter key for chat ---
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.activeElement?.id === 'chatInput') {
        sendMessage();
    }
});

// --- 19. Home Page Search ---
function homeSearch() {
    const searchTerm = document.getElementById('homeSearch')?.value || '';
    const category = document.getElementById('homeCategory')?.value || 'all';
    
    if (searchTerm || category !== 'all') {
        showSection('explore', document.querySelectorAll('nav button')[4]);
        setTimeout(() => {
            if (searchTerm) {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.value = searchTerm;
            }
            if (category !== 'all') {
                const categoryFilter = document.getElementById('categoryFilter');
                if (categoryFilter) categoryFilter.value = category;
            }
            filterUsers();
        }, 100);
    } else {
        showSection('explore', document.querySelectorAll('nav button')[4]);
    }
}

// Connect home search button
document.getElementById('homeSearch')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') homeSearch();
});

// --- 20. Admin Messages Functions ---
async function loadAdminMessages() {
    try {
        const response = await fetch('/api/contact_messages');
        
        if (response.status === 403 || response.status === 401) {
            const section = document.getElementById('adminMessagesSection');
            if (section) section.style.display = 'none';
            return;
        }
        
        if (!response.ok) return;
        
        const messages = await response.json();
        const section = document.getElementById('adminMessagesSection');
        const container = document.getElementById('adminMessagesList');
        const unreadBadge = document.getElementById('unreadBadge');
        
        if (!section || !container) return;
        
        section.style.display = 'block';
        
        const unreadCount = messages.filter(m => !m.is_read).length;
        if (unreadBadge) {
            if (unreadCount > 0) {
                unreadBadge.textContent = `${unreadCount} New`;
                unreadBadge.style.display = 'inline-block';
            } else {
                unreadBadge.style.display = 'none';
            }
        }
        
        if (messages.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fas fa-inbox" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                ${translations[currentLang].noMessages}
            </div>`;
            return;
        }
        
        container.innerHTML = messages.map(msg => `
            <div class="admin-message-item" data-msg-id="${msg.id}" style="background: ${!msg.is_read ? 'rgba(102, 126, 234, 0.08)' : 'transparent'}; border-bottom: 1px solid var(--border); padding: 16px; transition: all 0.3s; border-radius: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px;">
                            <strong style="color: var(--accent);"><i class="fas fa-envelope"></i> ${escapeHtml(msg.email)}</strong>
                            <span style="font-size: 11px; color: var(--text-muted);"><i class="far fa-calendar-alt"></i> ${new Date(msg.created_at).toLocaleString()}</span>
                            ${!msg.is_read ? '<span style="background: #ef4444; color: white; font-size: 10px; padding: 2px 8px; border-radius: 20px;">NEW</span>' : ''}
                        </div>
                        <p style="color: var(--text-primary); margin: 0; line-height: 1.5; word-break: break-word;">${escapeHtml(msg.message)}</p>
                    </div>
                    ${!msg.is_read ? `
                        <button onclick="markMessageRead(${msg.id}, this)" style="background: var(--gradient-btn); color: white; border: none; padding: 6px 14px; border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.3s;">
                            <i class="fas fa-check"></i> ${translations[currentLang].markAsRead}
                        </button>
                    ` : `
                        <span style="font-size: 12px; color: #10b981;"><i class="fas fa-check-circle"></i> ${translations[currentLang].read}</span>
                    `}
                </div>
            </div>
        `).join('');
        
    } catch(e) {
        console.error('Error loading admin messages:', e);
    }
}

async function markMessageRead(msgId, btnElement) {
    try {
        const response = await fetch(`/api/mark_message_read/${msgId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const messageItem = btnElement.closest('.admin-message-item');
            if (messageItem) {
                messageItem.style.background = 'transparent';
                const buttonContainer = btnElement.parentElement;
                buttonContainer.innerHTML = `<span style="font-size: 12px; color: #10b981;"><i class="fas fa-check-circle"></i> ${translations[currentLang].read}</span>`;
            }
            
            const unreadBadge = document.getElementById('unreadBadge');
            if (unreadBadge) {
                const currentText = unreadBadge.textContent;
                const currentCount = parseInt(currentText) || 0;
                const newCount = currentCount - 1;
                if (newCount <= 0) {
                    unreadBadge.style.display = 'none';
                } else {
                    unreadBadge.textContent = `${newCount} New`;
                }
            }
        }
    } catch(e) {
        console.error('Error marking message as read:', e);
    }
}

function refreshAdminMessages() {
    loadAdminMessages();
}

// Make functions available globally
window.refreshAdminMessages = refreshAdminMessages;
window.loadMyFriends = loadMyFriends;
window.viewFriendProfile = viewFriendProfile;

// --- 21. Initialize on DOM Load ---
document.addEventListener('DOMContentLoaded', () => {
    // Set up search listeners
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', () => filterUsers());
    }
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => filterUsers());
    }
    
    const skillTypeFilter = document.getElementById('skillTypeFilter');
    if (skillTypeFilter) {
        skillTypeFilter.addEventListener('change', () => filterUsers());
    }
    
    // Handle URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    const error = urlParams.get('error');
    
    if (error) alert("Error: " + error);
    if (section) {
        const btns = document.querySelectorAll('nav button');
        const btn = Array.from(btns).find(b => 
            b.getAttribute('onclick')?.includes(section)
        );
        if (btn) showSection(section, btn);
    } else {
        showSection('home', document.querySelector('nav button'));
    }
    
    // Update category options for current language
    updateCategoryOptions();
    
    // Initialize all placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLang][key]) {
            el.placeholder = translations[currentLang][key];
        }
    });
});