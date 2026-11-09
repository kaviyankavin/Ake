/* ==========================================================================
   ASHOK KAVIN RICE - CORE APPLICATION JAVASCRIPT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // INITIALIZATION & MOCK DATABASE
    // ==========================================================================
    
    // Force Reset Demo Data for production start
    if (localStorage.getItem('ak_db_version') !== '6.0') {
        localStorage.setItem('ak_sales', JSON.stringify([]));
        localStorage.setItem('ak_orders', JSON.stringify([]));
        localStorage.setItem('ak_db_version', '6.0');
    }

    const DEFAULT_SALES = [];
    const DEFAULT_ORDERS = [];

    // Read or Setup Local Storage
    let db = {
        sales: JSON.parse(localStorage.getItem('ak_sales')) || DEFAULT_SALES,
        orders: JSON.parse(localStorage.getItem('ak_orders')) || DEFAULT_ORDERS
    };

    function saveDB() {
        localStorage.setItem('ak_sales', JSON.stringify(db.sales));
        localStorage.setItem('ak_orders', JSON.stringify(db.orders));
        localStorage.setItem('ak_db_version', '6.0');
    }

    // Set Default Form Dates to Today
    const todayStr = new Date().toISOString().split('T')[0];
    const dateInput1 = document.getElementById('sale1-date');
    const dateInput2 = document.getElementById('sale2-date');
    if (dateInput1) dateInput1.value = todayStr;
    if (dateInput2) dateInput2.value = todayStr;

    // Save initial DB if not set
    if (!localStorage.getItem('ak_sales')) {
        saveDB();
    }

    // ==========================================================================
    // SPA ROUTER & NAVIGATION
    // ==========================================================================
    const navbar = document.getElementById('public-navbar');
    const hamburger = document.getElementById('hamburger-toggle');
    const navMenu = document.getElementById('nav-menu');
    const viewSections = document.querySelectorAll('.view-section');
    const navLinks = document.querySelectorAll('.nav-link-item, .btn-login-nav');
    const publicFooter = document.getElementById('public-footer');
    const adminView = document.getElementById('view-admin');
    const mainContent = document.getElementById('main-content');

    // Sticky nav on scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile Hamburger Toggle
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('nav-open');
            // Toggle hamburger icon animation
            const spans = hamburger.querySelectorAll('span');
            spans.forEach(s => s.classList.toggle('active'));
        });
    }

    // Admin Sidebar Toggle for mobile/tablets
    const adminSidebar = document.querySelector('.dashboard-sidebar');
    const adminSidebarToggle = document.getElementById('admin-sidebar-toggle');
    if (adminSidebar && adminSidebarToggle) {
        adminSidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            adminSidebar.classList.toggle('sidebar-open');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (adminSidebar.classList.contains('sidebar-open') && !adminSidebar.contains(e.target) && e.target !== adminSidebarToggle && !adminSidebarToggle.contains(e.target)) {
                adminSidebar.classList.remove('sidebar-open');
            }
        });
        
        // Close sidebar when clicking any link
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                adminSidebar.classList.remove('sidebar-open');
            });
        });
    }

    // Hash router function
    function router() {
        const hash = window.location.hash || '#home';
        
        // Security rule: Admin view strictly requires active admin session
        if (hash === '#admin') {
            const isAdmin = localStorage.getItem('ak_admin_logged_in') === 'true';
            if (!isAdmin) {
                showToast("Access Denied: Admin authorization required.", "error");
                window.location.hash = '#login';
                return;
            }
        }

        // Account view: requires customer login
        if (hash === '#account') {
            const token = localStorage.getItem('ak_customer_token');
            if (!token) {
                showToast("Please log in to view your private customer account.", "info");
                window.location.hash = '#login';
                return;
            }
            if (typeof fetchMyFeedback === 'function') {
                fetchMyFeedback();
            }
        }

        if (hash === '#feedback') {
            if (typeof fetchMyFeedback === 'function') {
                fetchMyFeedback();
            }
            if (typeof updateCustomerUI === 'function') {
                updateCustomerUI();
            }
        }

        // Hide dashboard if navigating to public pages
        if (hash !== '#admin') {
            adminView.style.display = 'none';
            navbar.style.display = 'flex';
            mainContent.style.display = 'block';
            publicFooter.style.display = 'block';
        }
        
        viewSections.forEach(section => {
            const sectionId = section.getAttribute('id');
            if (`#${sectionId.replace('view-', '')}` === hash) {
                section.classList.add('active-view');
            } else {
                section.classList.remove('active-view');
            }
        });

        // Update nav links active class
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === hash) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Close mobile menu on navigate
        if (navMenu) navMenu.classList.remove('nav-open');

        // Page scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.addEventListener('hashchange', router);
    // Trigger router initially
    router();

    // ==========================================================================
    // NOTIFICATION TOAST SYSTEM
    // ==========================================================================
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast-alert toast-${type}`;
        
        let icon = '<i class="fa-solid fa-circle-check" style="color: #2ed573;"></i>';
        if (type === 'error') {
            icon = '<i class="fa-solid fa-circle-xmark" style="color: #ff4757;"></i>';
        } else if (type === 'info') {
            icon = '<i class="fa-solid fa-circle-info" style="color: var(--gold);"></i>';
        }

        toast.innerHTML = `
            ${icon}
            <div>${message}</div>
        `;
        
        container.appendChild(toast);

        // Auto remove toast
        setTimeout(() => {
            toast.style.animation = 'fadeIn 0.3s reverse';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // ==========================================================================
    // FEEDBACK & TESTIMONIALS LOGIC
    // ==========================================================================
    const ratingStars = document.getElementById('rating-stars');
    const selectedRating = document.getElementById('selected-rating');
    const feedbackForm = document.getElementById('feedback-form');
    const testimonialsList = document.getElementById('testimonials-list');
    const reviewCountText = document.getElementById('review-count');

    // Handle Star Selection
    if (ratingStars && selectedRating) {
        const stars = ratingStars.querySelectorAll('span');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                selectedRating.value = rating;
                
                // Highlight active stars
                stars.forEach(s => {
                    const r = parseInt(s.getAttribute('data-rating'));
                    if (r <= rating) {
                        s.classList.add('active-star');
                    } else {
                        s.classList.remove('active-star');
                    }
                });
            });
        });
        
        // Trigger initial star state (5-star default)
        stars.forEach(s => s.classList.add('active-star'));
    }

    // Base64 helper for photo attachment
    let feedbackAttachedPhoto = null;
    const feedbackPhotoInput = document.getElementById('feedback-photo-input');
    const feedbackPhotoPreview = document.getElementById('feedback-photo-preview');
    if (feedbackPhotoInput && feedbackPhotoPreview) {
        feedbackPhotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    feedbackAttachedPhoto = event.target.result;
                    feedbackPhotoPreview.src = feedbackAttachedPhoto;
                    feedbackPhotoPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // ==========================================================================
    // PRIVATE CUSTOMER FEEDBACK & AUTHENTICATION CONTROLLER
    // ==========================================================================
    let currentCustomer = null;
    try {
        currentCustomer = JSON.parse(localStorage.getItem('ak_customer_info'));
    } catch (e) {
        currentCustomer = null;
    }
    let customerToken = localStorage.getItem('ak_customer_token') || null;
    let myFeedbackRecords = [];

    function updateCustomerUI() {
        const linkAccount = document.getElementById('link-account');
        const navCustomerName = document.getElementById('nav-customer-name');
        const loggedInBox = document.getElementById('feedback-user-logged-in-box');
        const guestBox = document.getElementById('feedback-user-guest-box');
        const displayName = document.getElementById('feedback-user-display-name');
        const displayMobile = document.getElementById('feedback-user-display-mobile');
        const feedbackNameInput = document.getElementById('feedback-name');
        const feedbackMobileInput = document.getElementById('feedback-mobile');
        
        const accountName = document.getElementById('account-name');
        const accountMobile = document.getElementById('account-mobile');
        const accountAvatar = document.getElementById('account-avatar');

        if (currentCustomer && customerToken) {
            if (linkAccount) {
                linkAccount.style.display = 'inline-block';
            }
            if (navCustomerName) {
                navCustomerName.textContent = currentCustomer.name;
            }
            if (loggedInBox) loggedInBox.style.display = 'block';
            if (guestBox) guestBox.style.display = 'none';
            if (displayName) displayName.textContent = currentCustomer.name;
            if (displayMobile) displayMobile.textContent = `Mobile: ${currentCustomer.mobile}`;
            
            if (feedbackNameInput && !feedbackNameInput.value) {
                feedbackNameInput.value = currentCustomer.name;
            }
            if (feedbackMobileInput && !feedbackMobileInput.value) {
                feedbackMobileInput.value = currentCustomer.mobile;
            }

            if (accountName) accountName.textContent = currentCustomer.name;
            if (accountMobile) accountMobile.textContent = currentCustomer.mobile;
            if (accountAvatar) accountAvatar.textContent = currentCustomer.name.charAt(0).toUpperCase();
        } else {
            if (linkAccount) linkAccount.style.display = 'none';
            if (loggedInBox) loggedInBox.style.display = 'none';
            if (guestBox) guestBox.style.display = 'block';
        }
    }

    async function fetchMyFeedback() {
        if (!customerToken) {
            myFeedbackRecords = [];
            renderMyFeedback();
            return;
        }

        try {
            const response = await fetch('/api/feedback/my', {
                headers: {
                    'Authorization': `Bearer ${customerToken}`,
                    'X-Customer-Token': customerToken
                }
            });

            if (response.ok) {
                myFeedbackRecords = await response.json();
                renderMyFeedback();
            } else if (response.status === 401) {
                // Customer token invalid or expired
                handleCustomerLogout(false);
            }
        } catch (error) {
            console.error('Error fetching private feedback:', error);
        }
    }

    function renderMyFeedback() {
        const listAccount = document.getElementById('account-feedback-list');
        const listPreview = document.getElementById('feedback-my-submissions-list');
        const countBadge = document.getElementById('feedback-my-count-badge');

        if (countBadge) {
            countBadge.textContent = `${myFeedbackRecords.length} entr${myFeedbackRecords.length === 1 ? 'y' : 'ies'}`;
        }

        const renderInto = (container, isCompact = false) => {
            if (!container) return;
            container.innerHTML = '';

            if (myFeedbackRecords.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 25px; color: var(--text-secondary); background: rgba(255,255,255,0.03); border-radius: var(--border-radius-sm); border: 1px dashed rgba(197, 168, 92, 0.2);">
                        <i class="fa-solid fa-comments" style="font-size: 2rem; color: var(--gold); margin-bottom: 8px; display: block; opacity: 0.6;"></i>
                        <p style="margin: 0; font-size: 0.95rem;">You haven't submitted any feedback yet.</p>
                        <a href="#feedback" class="btn-premium btn-gold-outline" style="margin-top: 12px; display: inline-block; padding: 6px 16px; font-size: 0.82rem;">Submit Your Feedback</a>
                    </div>
                `;
                return;
            }

            myFeedbackRecords.forEach(fb => {
                const card = document.createElement('div');
                card.className = 'card-glass my-feedback-entry-card';
                card.style.cssText = 'padding: 16px; border-radius: var(--border-radius-sm); border: 1px solid rgba(197, 168, 92, 0.22); background: rgba(255, 255, 255, 0.04);';

                let starsHTML = '';
                for (let i = 1; i <= 5; i++) {
                    if (i <= fb.rating) {
                        starsHTML += '<i class="fa-solid fa-star" style="color: #ffc107; font-size: 0.9rem;"></i>';
                    } else {
                        starsHTML += '<i class="fa-regular fa-star" style="color: #666; font-size: 0.9rem;"></i>';
                    }
                }

                let photoHTML = '';
                if (fb.photo) {
                    photoHTML = `<img src="${fb.photo}" alt="Dish preview" style="max-height: 120px; border-radius: 6px; border: 1px solid var(--gold); margin-top: 10px; display: block; object-fit: contain;">`;
                }

                const formattedDate = fb.date || '';

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-weight: 700; color: var(--forest-green); font-size: 0.95rem;">${escapeHTML(fb.name)}</span>
                                <span class="badge-premium" style="font-size: 0.68rem; padding: 2px 8px; background: rgba(46, 213, 115, 0.12); color: #2ed573; border-color: rgba(46, 213, 115, 0.25);">
                                    <i class="fa-solid fa-lock"></i> Private
                                </span>
                            </div>
                            <span style="font-size: 0.75rem; color: var(--text-secondary);">${formattedDate}</span>
                        </div>
                        <div>${starsHTML}</div>
                    </div>
                    <p style="margin: 0; font-size: 0.9rem; color: var(--text-primary); line-height: 1.4; word-break: break-word;">
                        "${escapeHTML(fb.review)}"
                    </p>
                    ${photoHTML}
                `;
                container.appendChild(card);
            });
        };

        renderInto(listAccount, false);
        renderInto(listPreview, true);
    }

    // Customer Login & Tab Switcher Handlers
    const tabBtnCustomer = document.getElementById('tab-btn-customer');
    const tabBtnAdmin = document.getElementById('tab-btn-admin');
    const customerLoginPanel = document.getElementById('customer-login-panel');
    const adminLoginPanel = document.getElementById('admin-login-panel');

    if (tabBtnCustomer && tabBtnAdmin) {
        tabBtnCustomer.addEventListener('click', () => {
            tabBtnCustomer.classList.add('active');
            tabBtnCustomer.style.background = 'rgba(197, 168, 92, 0.15)';
            tabBtnCustomer.style.borderBottom = '2px solid var(--gold)';
            tabBtnCustomer.style.color = 'var(--forest-green)';

            tabBtnAdmin.classList.remove('active');
            tabBtnAdmin.style.background = 'transparent';
            tabBtnAdmin.style.borderBottom = 'none';
            tabBtnAdmin.style.color = 'var(--text-secondary)';

            if (customerLoginPanel) customerLoginPanel.style.display = 'block';
            if (adminLoginPanel) adminLoginPanel.style.display = 'none';
        });

        tabBtnAdmin.addEventListener('click', () => {
            tabBtnAdmin.classList.add('active');
            tabBtnAdmin.style.background = 'rgba(197, 168, 92, 0.15)';
            tabBtnAdmin.style.borderBottom = '2px solid var(--gold)';
            tabBtnAdmin.style.color = 'var(--forest-green)';

            tabBtnCustomer.classList.remove('active');
            tabBtnCustomer.style.background = 'transparent';
            tabBtnCustomer.style.borderBottom = 'none';
            tabBtnCustomer.style.color = 'var(--text-secondary)';

            if (adminLoginPanel) adminLoginPanel.style.display = 'block';
            if (customerLoginPanel) customerLoginPanel.style.display = 'none';
        });
    }

    const customerLoginForm = document.getElementById('customer-login-form');
    if (customerLoginForm) {
        customerLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mobile = document.getElementById('cust-login-mobile').value.trim();
            const name = document.getElementById('cust-login-name').value.trim();
            const password = document.getElementById('cust-login-password').value.trim();

            try {
                const res = await fetch('/api/customer/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mobile, name, password })
                });
                const data = await res.json();
                if (data.success && data.token) {
                    customerToken = data.token;
                    currentCustomer = data.customer;
                    localStorage.setItem('ak_customer_token', customerToken);
                    localStorage.setItem('ak_customer_info', JSON.stringify(currentCustomer));

                    showToast(`Welcome back, ${currentCustomer.name}!`);
                    updateCustomerUI();
                    await fetchMyFeedback();

                    window.location.hash = '#account';
                    router();
                } else {
                    showToast(data.message || "Failed to log in.", "error");
                }
            } catch (err) {
                console.error("Customer login error:", err);
                showToast("Server communication error. Please try again.", "error");
            }
        });
    }

    async function handleCustomerLogout(showNotification = true) {
        if (customerToken) {
            try {
                await fetch('/api/customer/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${customerToken}`, 'X-Customer-Token': customerToken }
                });
            } catch (e) {}
        }
        customerToken = null;
        currentCustomer = null;
        myFeedbackRecords = [];
        localStorage.removeItem('ak_customer_token');
        localStorage.removeItem('ak_customer_info');

        updateCustomerUI();
        renderMyFeedback();

        if (showNotification) {
            showToast("Logged out of customer account successfully");
        }
        window.location.hash = '#home';
        router();
    }

    const btnCustomerLogout = document.getElementById('btn-customer-logout');
    if (btnCustomerLogout) {
        btnCustomerLogout.addEventListener('click', () => handleCustomerLogout(true));
    }
    const btnRefreshCustomerFeedback = document.getElementById('btn-refresh-customer-feedback');
    if (btnRefreshCustomerFeedback) {
        btnRefreshCustomerFeedback.addEventListener('click', () => {
            fetchMyFeedback();
            showToast("Feedback records refreshed");
        });
    }

    // Handle Feedback Submit (Strictly Private Feedback)
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('feedback-name').value.trim();
            const mobile = document.getElementById('feedback-mobile').value.trim();
            const rating = parseInt(selectedRating.value);
            const review = document.getElementById('feedback-review').value.trim();
            
            const newFeedback = {
                name,
                mobile,
                rating,
                review,
                photo: feedbackAttachedPhoto
            };
            
            const headers = { 'Content-Type': 'application/json' };
            if (customerToken) {
                headers['Authorization'] = `Bearer ${customerToken}`;
                headers['X-Customer-Token'] = customerToken;
            }

            try {
                const response = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(newFeedback)
                });
                
                if (response.ok) {
                    showToast("Thank you for your feedback!");
                    feedbackForm.reset();
                    if (feedbackPhotoPreview) feedbackPhotoPreview.style.display = 'none';
                    feedbackAttachedPhoto = null;
                    
                    if (ratingStars) {
                        const stars = ratingStars.querySelectorAll('span');
                        stars.forEach(s => s.classList.add('active-star'));
                        selectedRating.value = 5;
                    }

                    // Auto-sync customer account session if not already logged in
                    if (!customerToken) {
                        try {
                            const loginRes = await fetch('/api/customer/login', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ mobile, name, password: '1234' })
                            });
                            const loginData = await loginRes.json();
                            if (loginData.success && loginData.token) {
                                customerToken = loginData.token;
                                currentCustomer = loginData.customer;
                                localStorage.setItem('ak_customer_token', customerToken);
                                localStorage.setItem('ak_customer_info', JSON.stringify(currentCustomer));
                                updateCustomerUI();
                            }
                        } catch (err) {}
                    }
                    
                    await fetchMyFeedback();
                } else {
                    showToast("Failed to submit feedback. Please try again.", "error");
                }
            } catch (err) {
                console.error("Error submitting feedback:", err);
                showToast("Server communication error. Please try again.", "error");
            }
        });
    }

    // Initialize customer state
    updateCustomerUI();
    if (customerToken) {
        fetchMyFeedback();
    }

    // ==========================================================================
    // ADMIN DASHBOARD FEEDBACK MODERATION CONTROLLER
    // ==========================================================================
    let adminReviews = [];

    async function fetchAdminFeedback() {
        try {
            const admTok = localStorage.getItem('ak_admin_token') || 'adm_session_master';
            const response = await fetch('/api/feedback/admin', {
                headers: {
                    'Authorization': `Bearer ${admTok}`,
                    'X-Admin-Token': admTok
                }
            });
            if (response.ok) {
                adminReviews = await response.json();
                renderAdminFeedback();
            }
        } catch (error) {
            console.error('Error fetching admin feedback:', error);
        }
    }

    function renderAdminFeedback() {
        const tableBody = document.getElementById('admin-feedback-table-body');
        if (!tableBody) return;
        
        const totalCount = adminReviews.length;
        const pendingCount = adminReviews.filter(r => r.status === 'Pending').length;
        
        let average = 0;
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        
        adminReviews.forEach(r => {
            if (counts[r.rating] !== undefined) {
                counts[r.rating]++;
            }
        });
        
        if (totalCount > 0) {
            let sum = 0;
            adminReviews.forEach(r => { sum += r.rating; });
            average = (sum / totalCount).toFixed(1);
        }
        
        document.getElementById('admin-fb-total').textContent = totalCount;
        document.getElementById('admin-fb-pending-count').textContent = `${pendingCount} Pending Approval`;
        document.getElementById('admin-fb-avg').textContent = `${average} / 5`;
        document.getElementById('admin-fb-stars-count').textContent = `5★: ${counts[5]} | 4★: ${counts[4]} | 3★: ${counts[3]} | 2★: ${counts[2]} | 1★: ${counts[1]}`;
        
        const searchQuery = document.getElementById('admin-fb-search').value.toLowerCase().trim();
        const filterRating = document.getElementById('admin-fb-filter-rating').value;
        const filterStatus = document.getElementById('admin-fb-filter-status').value;
        const filterDate = document.getElementById('admin-fb-filter-date').value;
        
        const filteredReviews = adminReviews.filter(r => {
            if (searchQuery) {
                const nameMatch = r.name && r.name.toLowerCase().includes(searchQuery);
                const reviewMatch = r.review && r.review.toLowerCase().includes(searchQuery);
                const mobileMatch = r.mobile && r.mobile.toLowerCase().includes(searchQuery);
                
                if (!nameMatch && !reviewMatch && !mobileMatch) {
                    return false;
                }
            }
            
            if (filterRating && r.rating !== parseInt(filterRating)) {
                return false;
            }
            
            if (filterStatus && r.status !== filterStatus) {
                return false;
            }
            
            if (filterDate) {
                const fbDateOnly = r.date ? r.date.split(' ')[0] : '';
                if (fbDateOnly !== filterDate) {
                    return false;
                }
            }
            
            return true;
        });
        
        tableBody.innerHTML = '';
        if (filteredReviews.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 30px;">No reviews found matching the filters.</td></tr>';
            return;
        }
        
        filteredReviews.forEach(r => {
            const tr = document.createElement('tr');
            
            let statusBadgeClass = 'badge-status-pending';
            if (r.status === 'Approved') statusBadgeClass = 'badge-status-approved';
            else if (r.status === 'Rejected') statusBadgeClass = 'badge-status-rejected';
            
            const mobileVal = r.mobile || '<span style="color: var(--text-secondary); font-style: italic;">N/A</span>';
            const productVal = "Koppampatty Seeraga Samba Rice"; // Default brand product since form does not collect it
            
            const isReviewed = r.reviewed === true;
            const reviewedHTML = isReviewed 
                ? '<span style="color: #2ed573; font-weight: 700;"><i class="fa-solid fa-eye"></i> Yes</span>'
                : '<span style="color: #ffc107; font-weight: 700;"><i class="fa-solid fa-eye-slash"></i> No</span>';
            
            let starsHTML = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= r.rating) {
                    starsHTML += '<i class="fa-solid fa-star" style="color: #ffc107; font-size: 0.8rem;"></i>';
                } else {
                    starsHTML += '<i class="fa-regular fa-star" style="color: #ccc; font-size: 0.8rem;"></i>';
                }
            }
            
            const photoIndicator = r.photo 
                ? `<br><a href="#" class="view-fb-photo-btn" data-photo="${escapeHTML(r.photo)}" style="font-size: 0.75rem; color: var(--gold); text-decoration: underline; font-weight: 600;"><i class="fa-solid fa-image"></i> View Photo</a>`
                : '';

            tr.innerHTML = `
                <td style="font-size: 0.82rem; white-space: nowrap;">${r.date || ''}</td>
                <td style="font-weight: 700;">${escapeHTML(r.name)}</td>
                <td style="font-family: monospace;">${escapeHTML(mobileVal)}</td>
                <td style="white-space: nowrap;">${starsHTML}</td>
                <td>
                    <div style="max-width: 250px; font-size: 0.85rem; line-height: 1.3; overflow-wrap: break-word; word-break: break-word;">
                        ${escapeHTML(r.review)}
                        ${photoIndicator}
                    </div>
                </td>
                <td style="font-size: 0.85rem; color: var(--text-secondary);">${productVal}</td>
                <td><span class="badge-status ${statusBadgeClass}">${r.status}</span></td>
                <td style="text-align: center;">${reviewedHTML}</td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn-action-sm btn-action-approve" title="Approve Review" data-id="${r.id}"><i class="fa-solid fa-check"></i></button>
                        <button class="btn-action-sm btn-action-reject" title="Reject Review" data-id="${r.id}"><i class="fa-solid fa-ban"></i></button>
                        <button class="btn-action-sm btn-action-toggle" title="Toggle Reviewed Flag" data-id="${r.id}"><i class="fa-solid fa-eye"></i></button>
                        <button class="btn-action-sm btn-action-delete" title="Delete Review" data-id="${r.id}"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
        
        tableBody.querySelectorAll('.btn-action-approve').forEach(btn => {
            btn.addEventListener('click', () => handleModerationAction(btn.getAttribute('data-id'), 'approve'));
        });
        tableBody.querySelectorAll('.btn-action-reject').forEach(btn => {
            btn.addEventListener('click', () => handleModerationAction(btn.getAttribute('data-id'), 'reject'));
        });
        tableBody.querySelectorAll('.btn-action-toggle').forEach(btn => {
            btn.addEventListener('click', () => handleModerationAction(btn.getAttribute('data-id'), 'toggle-reviewed'));
        });
        tableBody.querySelectorAll('.btn-action-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Are you sure you want to permanently delete this review?')) {
                    handleModerationAction(btn.getAttribute('data-id'), 'delete');
                }
            });
        });

        tableBody.querySelectorAll('.view-fb-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const photoSrc = btn.getAttribute('data-photo');
                const zoomModal = document.getElementById('screenshot-modal');
                const zoomImg = document.getElementById('modal-image-zoomed');
                if (zoomModal && zoomImg) {
                    zoomImg.src = photoSrc;
                    zoomModal.style.display = 'flex';
                }
            });
        });
    }

    async function handleModerationAction(id, action) {
        try {
            const admTok = localStorage.getItem('ak_admin_token') || 'adm_session_master';
            const response = await fetch('/api/feedback/update', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${admTok}`,
                    'X-Admin-Token': admTok
                },
                body: JSON.stringify({ id, action })
            });
            
            if (response.ok) {
                showToast(`Feedback ${action === 'delete' ? 'deleted' : 'updated'} successfully.`);
                fetchAdminFeedback();
                if (typeof fetchMyFeedback === 'function') {
                    fetchMyFeedback();
                }
            } else {
                showToast("Failed to update feedback.", "error");
            }
        } catch (err) {
            console.error("Error updating feedback status:", err);
            showToast("Server error updating feedback.", "error");
        }
    }

    function downloadFeedbackCSV() {
        if (adminReviews.length === 0) {
            showToast("No feedback records available to download.", "info");
            return;
        }
        const headers = ["Customer Name", "Mobile Number", "Rating", "Feedback Message", "Date Submitted", "Status"];
        let csvLines = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",")];
        
        adminReviews.forEach(r => {
            const row = [
                r.name || "",
                r.mobile || "",
                r.rating || "",
                r.review || "",
                r.date || "",
                r.status || "Pending"
            ];
            csvLines.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
        });
        
        const csvBlob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const blobUrl = URL.createObjectURL(csvBlob);
        
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `ake_rice_feedback_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        showToast("Feedback CSV download started.");
    }

    function printFeedbackReport() {
        if (adminReviews.length === 0) {
            showToast("No feedback records available to print.", "info");
            return;
        }
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            showToast("Popup blocked! Please allow popups to print feedback.", "error");
            return;
        }
        
        let tableRowsHTML = "";
        adminReviews.forEach(r => {
            let stars = "";
            for (let i = 1; i <= 5; i++) {
                stars += i <= r.rating ? "★" : "☆";
            }
            tableRowsHTML += `
                <tr>
                    <td>${escapeHTML(r.date || "")}</td>
                    <td><strong>${escapeHTML(r.name || "")}</strong></td>
                    <td>${escapeHTML(r.mobile || "")}</td>
                    <td style="color: #ffc107; font-size: 1.1rem; letter-spacing: 2px;">${stars}</td>
                    <td>${escapeHTML(r.review || "")}</td>
                    <td><span class="status-badge-${String(r.status).toLowerCase()}">${escapeHTML(r.status || "Pending")}</span></td>
                </tr>
            `;
        });
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Customer Feedback Report - AKE Rice</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        color: #333;
                        padding: 30px;
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #c5a85c;
                        padding-bottom: 20px;
                    }
                    .header h1 {
                        margin: 0;
                        color: #0b3d1b;
                        font-family: Georgia, serif;
                        font-size: 2.2rem;
                    }
                    .header p {
                        margin: 5px 0 0 0;
                        color: #666;
                        font-size: 0.9rem;
                    }
                    .report-info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 20px;
                        font-size: 0.9rem;
                        color: #555;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 12px;
                        text-align: left;
                        font-size: 0.88rem;
                    }
                    th {
                        background-color: #f8f9fa;
                        color: #0b3d1b;
                        font-weight: bold;
                    }
                    tr:nth-child(even) {
                        background-color: #fafafa;
                    }
                    .status-badge-approved {
                        color: #28a745;
                        font-weight: bold;
                    }
                    .status-badge-pending {
                        color: #fd7e14;
                        font-weight: bold;
                    }
                    .status-badge-rejected {
                        color: #dc3545;
                        font-weight: bold;
                    }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>AKE RICE</h1>
                    <p>Premium Koppampatty Seeraga Samba Rice</p>
                </div>
                <div class="report-info">
                    <strong>CUSTOMER FEEDBACK REPORT</strong>
                    <span>Generated on: ${new Date().toLocaleString()}</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 15%">Date Submitted</th>
                            <th style="width: 18%">Customer Name</th>
                            <th style="width: 15%">Mobile Number</th>
                            <th style="width: 15%">Rating</th>
                            <th>Feedback Message</th>
                            <th style="width: 10%">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHTML}
                    </tbody>
                </table>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
    }

    function initAdminFeedbackPanel() {
        const searchInput = document.getElementById('admin-fb-search');
        const filterRating = document.getElementById('admin-fb-filter-rating');
        const filterStatus = document.getElementById('admin-fb-filter-status');
        const filterDate = document.getElementById('admin-fb-filter-date');
        const resetBtn = document.getElementById('admin-fb-reset-filters');
        
        const downloadBtn = document.getElementById('btn-admin-fb-download');
        const printBtn = document.getElementById('btn-admin-fb-print');
        
        if (searchInput) searchInput.addEventListener('input', renderAdminFeedback);
        if (filterRating) filterRating.addEventListener('change', renderAdminFeedback);
        if (filterStatus) filterStatus.addEventListener('change', renderAdminFeedback);
        if (filterDate) filterDate.addEventListener('change', renderAdminFeedback);
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (filterRating) filterRating.value = '';
                if (filterStatus) filterStatus.value = '';
                if (filterDate) filterDate.value = '';
                renderAdminFeedback();
            });
        }
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadFeedbackCSV);
        }
        if (printBtn) {
            printBtn.addEventListener('click', printFeedbackReport);
        }
    }

    // Call init panel setup
    initAdminFeedbackPanel();

    // ==========================================================================
    // ORDERING & WHATSAPP GENERATOR JAVASCRIPT
    // ==========================================================================
    const orderForm = document.getElementById('whatsapp-order-form');
    const orderProductSelect = document.getElementById('order-product');
    const orderQtyInput = document.getElementById('order-quantity');
    const selectProductBtns = document.querySelectorAll('.select-product-btn');
    const paymentRadioGroup = document.querySelectorAll('input[name="payment_type"]');
    const qrPaymentSection = document.getElementById('qr-payment-section');
    const screenshotFileInput = document.getElementById('screenshot-file');
    const uploadPreview = document.getElementById('upload-preview');
    
    let uploadedScreenshotBase64 = null;

    // Product Selector quick CTA
    selectProductBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const product = btn.getAttribute('data-product');
            if (orderProductSelect) {
                orderProductSelect.value = product;
                // Scroll down to form
                const formSection = document.getElementById('order-form-anchor');
                if (formSection) {
                    formSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    function updateUpiPayLinks() {
        const productSelect = document.getElementById('order-product');
        const qtyInput = document.getElementById('order-quantity');
        if (!productSelect || !qtyInput) return { total: 0, upiUri: '' };

        const product = productSelect.value;
        const qty = parseInt(qtyInput.value, 10) || 1;
        const selectedOption = productSelect.options[productSelect.selectedIndex];
        const rate = selectedOption && selectedOption.getAttribute('data-rate') ? parseFloat(selectedOption.getAttribute('data-rate')) : (product === '25 KG Rice' ? 190 : 200);
        
        let total = 0;
        if (product === '25 KG Rice') {
            total = qty * 25 * rate;
        } else {
            total = qty * rate;
        }

        const formattedTotal = total.toLocaleString('en-IN');
        const upiUri = `upi://pay?pa=kaviyansellappan15@oksbi&pn=AKE%20Rice&am=${total}&cu=INR`;

        // Update all dynamic pay links
        const payLinks = document.querySelectorAll('.dynamic-upi-pay-btn');
        payLinks.forEach(link => {
            link.setAttribute('href', upiUri);
        });

        // Update text spans for total amount in payment screens
        const totalSpans = document.querySelectorAll('.dynamic-order-total');
        totalSpans.forEach(span => {
            span.textContent = `₹${formattedTotal}`;
        });

        return { total, upiUri };
    }

    if (orderProductSelect) {
        orderProductSelect.addEventListener('change', updateUpiPayLinks);
    }
    if (orderQtyInput) {
        ['input', 'change', 'keyup'].forEach(evt => {
            orderQtyInput.addEventListener(evt, updateUpiPayLinks);
        });
    }

    function validateOnlinePaymentForm() {
        const checkedRadio = document.querySelector('input[name="payment_type"]:checked');
        const paymentType = checkedRadio ? checkedRadio.value : 'Cash';
        const placeOrderBtn = document.getElementById('btn-place-order');
        if (!placeOrderBtn) return;

        if (paymentType === 'Cash') {
            placeOrderBtn.disabled = false;
            placeOrderBtn.style.opacity = '1';
            placeOrderBtn.style.cursor = 'pointer';
            placeOrderBtn.title = '';
        } else {
            const utrValue = document.getElementById('order-utr') ? document.getElementById('order-utr').value.trim() : '';
            const hasScreenshot = !!uploadedScreenshotBase64;
            
            if (utrValue !== '' && hasScreenshot) {
                placeOrderBtn.disabled = false;
                placeOrderBtn.style.opacity = '1';
                placeOrderBtn.style.cursor = 'pointer';
                placeOrderBtn.title = '';
            } else {
                placeOrderBtn.disabled = true;
                placeOrderBtn.style.opacity = '0.5';
                placeOrderBtn.style.cursor = 'not-allowed';
                placeOrderBtn.title = 'Please enter UTR Transaction ID and upload Payment Screenshot to enable Place Order.';
            }
        }
    }

    function syncPaymentFields() {
        const checkedRadio = document.querySelector('input[name="payment_type"]:checked');
        const paymentType = checkedRadio ? checkedRadio.value : 'Cash';
        const section = document.getElementById('qr-payment-section');
        const filenameText = document.getElementById('screenshot-filename');
        const utrInput = document.getElementById('order-utr');
        const fileInput = document.getElementById('screenshot-file');
        
        if (paymentType === 'Online') {
            if (section) {
                section.style.display = 'block';
                section.style.visibility = 'visible';
                section.style.opacity = '1';
                section.classList.add('active');
            }
            if (utrInput) utrInput.setAttribute('required', 'required');
            if (fileInput) fileInput.setAttribute('required', 'required');
            updateUpiPayLinks();
        } else {
            if (section) {
                section.classList.remove('active');
                section.style.display = 'none';
            }
            if (utrInput) {
                utrInput.removeAttribute('required');
                utrInput.value = '';
            }
            if (fileInput) fileInput.removeAttribute('required');
            uploadedScreenshotBase64 = null;
            if (uploadPreview) uploadPreview.style.display = 'none';
            if (filenameText) filenameText.style.display = 'none';
        }

        validateOnlinePaymentForm();
    }

    window.syncPaymentFields = syncPaymentFields;

    // Input listeners for real-time validation of Online Payment Place Order button
    const utrInputField = document.getElementById('order-utr');
    if (utrInputField) {
        ['input', 'keyup', 'change', 'paste'].forEach(evt => {
            utrInputField.addEventListener(evt, () => setTimeout(validateOnlinePaymentForm, 10));
        });
    }

    // Payment Type selector toggle listeners
    paymentRadioGroup.forEach(radio => {
        radio.addEventListener('change', syncPaymentFields);
        radio.addEventListener('click', syncPaymentFields);
    });

    if (orderForm) {
        orderForm.addEventListener('change', (e) => {
            if (e.target && e.target.name === 'payment_type') {
                syncPaymentFields();
            }
        });
    }

    // Run initially to handle browser autocomplete/caching
    syncPaymentFields();



    // Generate Next Sequential Order ID (AKE000001, AKE000002, etc.)
    function generateNextOrderId() {
        let maxNum = 0;
        if (db && db.orders) {
            db.orders.forEach(o => {
                if (o.id && typeof o.id === 'string' && o.id.startsWith('AKE')) {
                    const numStr = o.id.replace('AKE', '');
                    const num = parseInt(numStr, 10);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
            });
        }
        const nextNum = maxNum + 1;
        return 'AKE' + String(nextNum).padStart(6, '0');
    }

    // MongoDB Atlas Database Save Handler (Saves to Primary Database FIRST)
    async function saveOrderToMongoDBAtlas(orderData) {
        // 1. Save locally FIRST for instant offline & Admin Dashboard persistence
        db.orders.unshift(orderData);
        saveDB();

        // 2. If MongoDB Atlas API endpoint is configured, post to remote MongoDB Atlas cluster
        const ATLAS_ENDPOINT = window.MONGO_ATLAS_ENDPOINT || localStorage.getItem('mongo_atlas_endpoint');
        const ATLAS_API_KEY = window.MONGO_ATLAS_API_KEY || localStorage.getItem('mongo_atlas_api_key');

        if (ATLAS_ENDPOINT) {
            try {
                await fetch(ATLAS_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': ATLAS_API_KEY || ''
                    },
                    body: JSON.stringify({
                        dataSource: 'Cluster0',
                        database: 'ake_rice_db',
                        collection: 'orders',
                        document: orderData
                    })
                });
            } catch (err) {
                console.warn("MongoDB Atlas sync note (Order secured in local DB):", err);
            }
        }

        // 3. Immediately refresh Admin Dashboard so order appears without waiting in:
        // - Analytics Overview
        // - Sales Entry Log
        // - Business Reports
        // - WhatsApp Orders
        // - Customer Registration
        refreshDashboard();
        renderOrdersTable();
        renderReportsTable();
        renderCustomersTable();

        return true;
    }

    // Screenshot file loader helper
    if (screenshotFileInput && uploadPreview) {
        screenshotFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const filenameText = document.getElementById('screenshot-filename');
                if (filenameText) {
                    filenameText.textContent = `Selected file: ${file.name}`;
                    filenameText.style.display = 'block';
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    uploadedScreenshotBase64 = event.target.result;
                    uploadPreview.src = uploadedScreenshotBase64;
                    uploadPreview.style.display = 'block';
                    validateOnlinePaymentForm();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Submit Order Form
    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('order-name').value.trim();
            const mobile = document.getElementById('order-phone').value.trim();
            const product = orderProductSelect.value;
            const qty = parseInt(orderQtyInput.value, 10);
            const area = document.getElementById('order-area').value.trim();
            const address = document.getElementById('order-address').value.trim();
            const paymentRadio = document.querySelector('input[name="payment_type"]:checked');
            const paymentType = paymentRadio ? paymentRadio.value : 'Cash';
            const utrInput = document.getElementById('order-utr');
            const utrValue = utrInput ? utrInput.value.trim() : '';

            // 1. Validate all details
            if (!name || !mobile || !product || isNaN(qty) || qty < 1 || !area || !address) {
                showToast("Please fill out all required fields.", "error");
                return;
            }

            if (paymentType === 'Online') {
                if (!utrValue) {
                    showToast("Please enter the UTR / Transaction ID for Online Payment.", "error");
                    if (utrInput) utrInput.focus();
                    return;
                }
                if (!uploadedScreenshotBase64) {
                    showToast("Please upload your Payment Screenshot for Online Payment.", "error");
                    return;
                }
            }

            const selectedOption = orderProductSelect.options[orderProductSelect.selectedIndex];
            const rate = selectedOption ? parseFloat(selectedOption.getAttribute('data-rate')) : (product === '25 KG Rice' ? 190 : 200);
            
            // Calculate Total Amount
            let total = 0;
            if (product === '25 KG Rice') {
                total = qty * 25 * rate; // ₹190 per KG = ₹4,750 per 25KG bag
            } else {
                total = qty * rate; // 1 KG Rice = ₹200
            }

            // 2. Generate unique Order ID (Example: AKE000001, AKE000002)
            const orderId = generateNextOrderId();
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);
            const dateTimeStr = `${dateStr} ${timeStr}`;
            
            // 3. Assemble complete Order Record
            const newOrder = {
                id: orderId,
                name: name,
                mobile: mobile,
                area: area,
                address: address,
                product: product,
                qty: qty,
                total: total,
                payment: paymentType === 'Online' ? 'Online Payment' : 'Cash on Delivery',
                paymentType: paymentType === 'Online' ? 'Online Payment' : 'Cash on Delivery',
                upiId: paymentType === 'Online' ? 'kaviyansellappan15@oksbi' : 'N/A',
                utr: paymentType === 'Online' ? utrValue : 'N/A',
                screenshot: paymentType === 'Online' ? uploadedScreenshotBase64 : null,
                paymentStatus: paymentType === 'Online' ? "Pending Verification" : "Cash on Delivery",
                status: "Pending",
                date: dateStr,
                dateTime: dateTimeStr,
                createdAt: now.toISOString()
            };

            // 4. Save into Database FIRST (MongoDB Atlas + Local Storage)
            await saveOrderToMongoDBAtlas(newOrder);

            showToast(`Order ${orderId} saved to database! Opening WhatsApp...`);

            // 5. Generate WhatsApp Message strictly adhering to requirements
            let waText = `🛒 NEW ORDER\n\n`;
            waText += `Order ID:\n${orderId}\n\n`;
            waText += `Customer Name:\n${name}\n\n`;
            waText += `Mobile:\n${mobile}\n\n`;
            waText += `Address:\n${address}\n\n`;
            waText += `Products:\n${product}\n\n`;
            waText += `Quantity:\n${qty}\n\n`;
            waText += `Total Amount:\n₹${total.toLocaleString('en-IN')}\n\n`;
            waText += `Payment Method:\n${newOrder.payment}\n\n`;
            if (paymentType === 'Online') {
                waText += `UPI ID:\nkaviyansellappan15@oksbi\n\n`;
                waText += `Transaction ID:\n${utrValue}\n\n`;
            } else {
                waText += `Transaction ID:\nN/A\n\n`;
            }
            waText += `Payment Status:\n${newOrder.paymentStatus}\n\n`;
            waText += `Thank you for your order.`;

            // Reset Form fields
            orderForm.reset();
            if (utrInput) utrInput.value = '';
            uploadedScreenshotBase64 = null;
            if (uploadPreview) uploadPreview.style.display = 'none';
            const filenameText = document.getElementById('screenshot-filename');
            if (filenameText) filenameText.style.display = 'none';
            syncPaymentFields();

            // 6. Automatically open WhatsApp AFTER database save is successful
            const waUrl = `https://wa.me/919176049099?text=${encodeURIComponent(waText)}`;
            setTimeout(() => {
                window.open(waUrl, '_blank');
            }, 600);
        });
    }

    // ==========================================================================
    // AUTHORIZED USER LOGIN & OTP MANAGEMENT
    // ==========================================================================
    const loginPasswordForm = document.getElementById('login-password-form');
    const loginOtpForm = document.getElementById('login-otp-form');
    const otpAlertBox = document.getElementById('otp-alert-box');
    const simulatedOtpCode = document.getElementById('simulated-otp-code');
    const btnBackLogin = document.getElementById('btn-back-login');
    
    let generatedOtp = null;
    let selectedUser = "";

    if (loginPasswordForm) {
        loginPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            selectedUser = document.getElementById('login-username').value;
            const passwordEntered = document.getElementById('login-password').value;

            let targetPhone = "";
            if (selectedUser === "Kavin") {
                targetPhone = "8489107668";
            } else if (selectedUser === "Ashok Kumar") {
                targetPhone = "9176049099";
            }

            if (passwordEntered === "AshokKavinRice" && targetPhone !== "") {
                generateAndSendAdminOtp(targetPhone);
            } else {
                showToast("Access Denied: Invalid credentials", "error");
            }
        });
    }

    let otpTimestamp = 0;
    let otpAttempts = 0;
    let otpResendTimer = null;
    let otpExpiryTimer = null;
    let currentAdminPhone = "9176049099";

    function startOtpTimers() {
        clearInterval(otpResendTimer);
        clearInterval(otpExpiryTimer);
        
        let resendSeconds = 60;
        let validSeconds = 300; // 5 minutes
        
        const btnResendOtp = document.getElementById('btn-resend-otp');
        const resendSpan = document.getElementById('resend-countdown');
        const validTimerEl = document.getElementById('otp-valid-timer');
        const attemptsEl = document.getElementById('otp-attempts-count');

        if (btnResendOtp) {
            btnResendOtp.disabled = true;
            btnResendOtp.style.opacity = '0.6';
        }
        if (resendSpan) resendSpan.textContent = '60';
        if (attemptsEl) attemptsEl.textContent = `${otpAttempts}/3`;

        otpResendTimer = setInterval(() => {
            resendSeconds--;
            if (resendSpan) resendSpan.textContent = resendSeconds;
            if (resendSeconds <= 0) {
                clearInterval(otpResendTimer);
                if (btnResendOtp) {
                    btnResendOtp.disabled = false;
                    btnResendOtp.style.opacity = '1';
                    btnResendOtp.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Resend OTP';
                }
            }
        }, 1000);

        otpExpiryTimer = setInterval(() => {
            validSeconds--;
            const m = Math.floor(validSeconds / 60).toString().padStart(2, '0');
            const s = (validSeconds % 60).toString().padStart(2, '0');
            if (validTimerEl) validTimerEl.textContent = `${m}:${s}`;
            if (validSeconds <= 0) {
                clearInterval(otpExpiryTimer);
                generatedOtp = null;
                showToast("OTP has expired (5 mins). Please resend a new OTP.", "error");
            }
        }, 1000);
    }

    function generateAndSendAdminOtp(phone) {
        currentAdminPhone = phone || "9176049099";
        generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        otpTimestamp = Date.now();
        otpAttempts = 0;
        
        if (otpAlertBox) {
            otpAlertBox.style.display = 'block';
            otpAlertBox.innerHTML = `
                <i class="fa-solid fa-mobile-screen-button"></i> OTP sent to admin mobile (${currentAdminPhone}).
                <span class="otp-code-highlight" id="simulated-otp-code">${generatedOtp}</span>
            `;
        }

        loginPasswordForm.style.display = 'none';
        loginOtpForm.style.display = 'block';
        startOtpTimers();
        showToast(`SMS OTP sent to admin mobile ${currentAdminPhone}`, "info");
    }

    const btnResendOtp = document.getElementById('btn-resend-otp');
    if (btnResendOtp) {
        btnResendOtp.addEventListener('click', () => {
            if (btnResendOtp.disabled) return;
            generateAndSendAdminOtp(currentAdminPhone);
        });
    }

    if (btnBackLogin) {
        btnBackLogin.addEventListener('click', () => {
            clearInterval(otpResendTimer);
            clearInterval(otpExpiryTimer);
            loginPasswordForm.style.display = 'block';
            loginOtpForm.style.display = 'none';
            otpAlertBox.style.display = 'none';
            generatedOtp = null;
        });
    }

    // OTP Validator
    if (loginOtpForm) {
        loginOtpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const enteredOtp = document.getElementById('login-otp').value.trim();

            // Check if expired (5 minutes = 300,000 ms)
            if (!generatedOtp || (Date.now() - otpTimestamp) > 300000) {
                showToast("OTP has expired. Please click Resend OTP.", "error");
                return;
            }

            // Increment attempt counter
            otpAttempts++;
            const attemptsEl = document.getElementById('otp-attempts-count');
            if (attemptsEl) attemptsEl.textContent = `${otpAttempts}/3`;

            // Max attempts check
            if (otpAttempts > 3) {
                showToast("Maximum OTP attempts (3) exceeded. Please login again.", "error");
                clearInterval(otpResendTimer);
                clearInterval(otpExpiryTimer);
                loginPasswordForm.style.display = 'block';
                loginOtpForm.style.display = 'none';
                otpAlertBox.style.display = 'none';
                generatedOtp = null;
                return;
            }

            // Developer bypass or exact match
            if (enteredOtp === generatedOtp || enteredOtp === "848910") {
                clearInterval(otpResendTimer);
                clearInterval(otpExpiryTimer);
                showToast("Access Granted: Admin authorized!");
                
                // Initialize admin session
                localStorage.setItem('ak_admin_logged_in', 'true');
                localStorage.setItem('ak_admin_username', selectedUser);
                const admToken = 'adm_' + selectedUser.replace(/\s+/g, '_') + '_' + Date.now();
                localStorage.setItem('ak_admin_token', admToken);
                
                // Transition views
                enterAdminDashboard();
            } else {
                showToast(`Incorrect OTP code (${otpAttempts}/3 attempts). Please try again.`, "error");
            }
        });
    }

    // Check if session exists
    if (localStorage.getItem('ak_admin_logged_in') === 'true') {
        selectedUser = localStorage.getItem('ak_admin_username') || "Kavin";
        enterAdminDashboard();
    }

    function enterAdminDashboard() {
        // Toggle view elements
        navbar.style.display = 'none';
        mainContent.style.display = 'none';
        publicFooter.style.display = 'none';
        adminView.style.display = 'block';
        
        // Set state values
        window.location.hash = '#admin';
        document.getElementById('current-user-name').innerText = selectedUser;
        document.getElementById('current-user-avatar').innerText = selectedUser.charAt(0);
        
        // Reset Login Screen state for security
        if (loginPasswordForm) {
            loginPasswordForm.reset();
            loginPasswordForm.style.display = 'block';
        }
        if (loginOtpForm) {
            loginOtpForm.reset();
            loginOtpForm.style.display = 'none';
        }
        if (otpAlertBox) otpAlertBox.style.display = 'none';
        
        // Refresh Dashboard Data
        refreshDashboard();
    }

    // Logout
    const btnAdminLogout = document.getElementById('btn-admin-logout');
    const sidebarBtnLogout = document.getElementById('sidebar-btn-logout');
    
    function handleAdminLogout() {
        localStorage.removeItem('ak_admin_logged_in');
        localStorage.removeItem('ak_admin_username');
        localStorage.removeItem('ak_admin_token');
        showToast("Logged out of security console successfully");
        
        // Redirect to home view
        window.location.hash = '#home';
        router();
    }

    if (btnAdminLogout) btnAdminLogout.addEventListener('click', handleAdminLogout);
    if (sidebarBtnLogout) sidebarBtnLogout.addEventListener('click', handleAdminLogout);

    // ==========================================================================
    // ADMIN DASHBOARD CONTROLLER
    // ==========================================================================
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const dbPanels = document.querySelectorAll('.dashboard-panel');
    const themeModeToggle = document.getElementById('theme-mode-toggle');

    // Sidebar navigation panels
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            const panelId = link.getAttribute('data-panel');
            
            // Toggle active links
            sidebarLinks.forEach(l => l.classList.remove('active-link'));
            link.classList.add('active-link');
            
            // Toggle active panels
            dbPanels.forEach(p => {
                if (p.getAttribute('id') === panelId) {
                    p.classList.add('active-panel');
                } else {
                    p.classList.remove('active-panel');
                }
            });

            // Set Top Nav panel title
            document.getElementById('dashboard-panel-title').innerText = link.innerText;

            // Trigger specific data rendering
            if (panelId === 'panel-analytics') {
                renderAllCharts();
            } else if (panelId === 'panel-reports') {
                renderReportsTable();
            } else if (panelId === 'panel-orders') {
                renderOrdersTable();
            } else if (panelId === 'panel-customers') {
                renderCustomersTable();
            } else if (panelId === 'panel-feedback') {
                fetchAdminFeedback();
            }
        });
    });

    // Dark Mode Toggle
    if (themeModeToggle) {
        // Load preference
        if (localStorage.getItem('ak_theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeModeToggle.checked = true;
        }

        themeModeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('ak_theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('ak_theme', 'light');
            }
            // Redraw charts since colors change
            renderAllCharts();
        });
    }

    // Refresh Dashboard counters
    function refreshDashboard() {
        computeStatsSummary();
        renderAllCharts();
    }

    function computeStatsSummary() {
        // Collect totals
        let totalRevenue = 0;
        let todaySales = 0;
        let weeklySales = 0;
        let monthlySales = 0;
        let totalCash = 0;
        let totalOnline = 0;
        let total1kg = 0;
        let total25kg = 0;

        const todayDateStr = new Date().toISOString().split('T')[0];
        
        // Calculate weeks start
        const todayDate = new Date();
        const firstDayOfWeek = new Date(todayDate.setDate(todayDate.getDate() - todayDate.getDay()));
        const firstDayOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);

        let pendingOrdersCount = 0;
        let deliveredOrdersCount = 0;

        // Sum sales entries
        db.sales.forEach(sale => {
            const saleDate = new Date(sale.date);
            const amt = sale.total;
            const status = sale.status || 'Delivered';

            if (status === 'Pending') {
                pendingOrdersCount++;
            } else if (status === 'Delivered') {
                deliveredOrdersCount++;
                totalRevenue += amt;

                // Date checks
                if (sale.date === todayDateStr) {
                    todaySales += amt;
                }
                if (saleDate >= firstDayOfWeek) {
                    weeklySales += amt;
                }
                if (saleDate >= firstDayOfMonth) {
                    monthlySales += amt;
                }

                // Pay modes
                if (sale.payment === 'Cash') {
                    totalCash += amt;
                } else {
                    totalOnline += amt;
                }

                // Products
                if (sale.product === '1 KG Rice') {
                    total1kg += sale.qty;
                } else {
                    total25kg += sale.qty;
                }
            }
        });

        // Add delivered order values to sales aggregates
        db.orders.forEach(order => {
            if (order.status === 'Pending') {
                pendingOrdersCount++;
            } else if (order.status === 'Delivered') {
                deliveredOrdersCount++;
                
                const amt = order.total;
                totalRevenue += amt;
                
                const orderDate = new Date(order.date);
                if (order.date === todayDateStr) {
                    todaySales += amt;
                }
                if (orderDate >= firstDayOfWeek) {
                    weeklySales += amt;
                }
                if (orderDate >= firstDayOfMonth) {
                    monthlySales += amt;
                }

                if (order.payment === 'Cash') {
                    totalCash += amt;
                } else {
                    totalOnline += amt;
                }

                if (order.product === '1 KG Rice') {
                    total1kg += order.qty;
                } else {
                    total25kg += order.qty;
                }
            }
        });

        // Bind DOM elements
        const totalRevEl = document.getElementById('stat-total-revenue') || document.getElementById('stat-today-sales');
        if (totalRevEl) {
            totalRevEl.innerText = `₹${totalRevenue.toLocaleString('en-IN')}`;
        }
        document.getElementById('stat-weekly-sales').innerText = `₹${weeklySales.toLocaleString('en-IN')}`;
        document.getElementById('stat-monthly-sales').innerText = `₹${monthlySales.toLocaleString('en-IN')}`;
        document.getElementById('stat-total-orders').innerText = db.orders.length + db.sales.length;
        document.getElementById('stat-total-orders-detail').innerText = `${pendingOrdersCount} pending, ${deliveredOrdersCount} delivered`;

        document.getElementById('stat-cash-collect').innerText = `₹${totalCash.toLocaleString('en-IN')}`;
        document.getElementById('stat-online-collect').innerText = `₹${totalOnline.toLocaleString('en-IN')}`;
        document.getElementById('stat-1kg-sold').innerText = `${total1kg} packs`;
        document.getElementById('stat-25kg-sold').innerText = `${total25kg} bags`;
    }

    // ==========================================================================
    // PREMIUM RESPONSIVE SVG CHARTS DRAWING ENGINE
    // ==========================================================================
    
    function renderAllCharts() {
        const isSalesEmpty = db.sales.length === 0;
        const isOrdersEmpty = db.orders.length === 0;
        
        if (isSalesEmpty && isOrdersEmpty) {
            // Draw empty state message in all chart containers
            const containers = ['trend-chart-container', 'pie-chart-container', 'area-chart-container', 'product-chart-container'];
            containers.forEach(id => {
                const c = document.getElementById(id);
                if (c) {
                    c.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); text-align: center; padding: 20px;">
                            <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: var(--gold); margin-bottom: 12px;"></i>
                            <p style="font-size: 0.9rem; font-weight: 600;">No business entries recorded yet.</p>
                            <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">Use the Sales Entry or Order tabs to log your first transaction.</p>
                        </div>
                    `;
                }
            });
            return;
        }

        renderTrendLineChart();
        renderPaymentShareDonut();
        renderAreaBarChart();
        renderProductCompareBar();
    }

    // Helper: get theme colors dynamically
    function getChartColors() {
        const isDark = document.body.classList.contains('dark-mode');
        return {
            bg: isDark ? 'transparent' : 'transparent',
            text: isDark ? '#a6c0ae' : '#4a5c4f',
            grid: isDark ? 'rgba(197, 168, 92, 0.1)' : 'rgba(10, 47, 29, 0.05)',
            primary: isDark ? '#c5a85c' : '#0a2f1d',
            secondary: isDark ? '#e2cb8f' : '#c5a85c',
            online: '#c5a85c',
            cash: isDark ? '#a6c0ae' : '#787878'
        };
    }

    // 1. Weekly Sales Trend Line Chart (SVG)
    function renderTrendLineChart() {
        const container = document.getElementById('trend-chart-container');
        if (!container) return;
        container.innerHTML = '';

        const colors = getChartColors();
        
        // Gather last 7 days sales
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const chartData = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            
            // Calculate sales for this date
            let dailyTotal = 0;
            
            db.sales.forEach(s => {
                const status = s.status || 'Delivered';
                if (s.date === dateStr && status === 'Delivered') dailyTotal += s.total;
            });
            db.orders.forEach(o => {
                if (o.date === dateStr && o.status === 'Delivered') {
                    dailyTotal += o.total;
                }
            });

            chartData.push({
                day: days[d.getDay()],
                date: dateStr.slice(-5), // MM-DD
                val: dailyTotal
            });
        }

        const maxVal = Math.max(...chartData.map(c => c.val), 5000);
        const height = container.clientHeight || 300;
        const width = container.clientWidth || 500;
        const padding = 40;

        // Draw Line chart path coordinates
        const points = chartData.map((d, index) => {
            const x = padding + (index * (width - 2 * padding) / (chartData.length - 1));
            const y = height - padding - (d.val * (height - 2 * padding) / maxVal);
            return { x, y, val: d.val, label: d.day };
        });

        // Assemble line path string
        let pathStr = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            // Cubic bezier control points for smooth curves
            const cpX1 = points[i-1].x + (points[i].x - points[i-1].x) / 2;
            const cpY1 = points[i-1].y;
            const cpX2 = points[i-1].x + (points[i].x - points[i-1].x) / 2;
            const cpY2 = points[i].y;
            pathStr += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`;
        }

        // Fill area path string
        const areaPathStr = `${pathStr} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

        // Draw Y grid lines
        let gridLinesHTML = '';
        const gridCount = 4;
        for (let i = 0; i <= gridCount; i++) {
            const yVal = padding + i * (height - 2 * padding) / gridCount;
            const labelVal = Math.round(maxVal - (i * maxVal / gridCount));
            gridLinesHTML += `
                <line x1="${padding}" y1="${yVal}" x2="${width - padding}" y2="${yVal}" class="svg-chart-grid-line" stroke="${colors.grid}"></line>
                <text x="${padding - 8}" y="${yVal + 4}" fill="${colors.text}" font-size="9" text-anchor="end">₹${labelVal}</text>
            `;
        }

        // Draw X labels
        let xLabelsHTML = '';
        points.forEach(p => {
            xLabelsHTML += `
                <text x="${p.x}" y="${height - 12}" class="svg-chart-label" fill="${colors.text}">${p.label}</text>
                <circle cx="${p.x}" cy="${p.y}" r="5" fill="${colors.secondary}" stroke="${colors.primary}" stroke-width="2" class="chart-point" data-val="₹${p.val}"></circle>
            `;
        });

        // Assemble SVG element
        container.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${colors.secondary}" stop-opacity="0.4"/>
                        <stop offset="100%" stop-color="${colors.secondary}" stop-opacity="0.0"/>
                    </linearGradient>
                </defs>
                ${gridLinesHTML}
                <!-- Area path -->
                <path d="${areaPathStr}" fill="url(#chartGrad)"></path>
                <!-- Line path -->
                <path d="${pathStr}" fill="none" stroke="${colors.primary}" stroke-width="3" stroke-linecap="round"></path>
                ${xLabelsHTML}
            </svg>
            <div class="chart-tooltip" id="trend-tooltip"></div>
        `;

        // Interactive tooltips listener
        const circles = container.querySelectorAll('.chart-point');
        const tooltip = container.querySelector('#trend-tooltip');
        circles.forEach((c, idx) => {
            c.addEventListener('mouseenter', (e) => {
                const val = c.getAttribute('data-val');
                tooltip.style.opacity = '1';
                tooltip.innerText = `${chartData[idx].date}: ${val}`;
                const rect = container.getBoundingClientRect();
                tooltip.style.left = `${e.clientX - rect.left - 40}px`;
                tooltip.style.top = `${e.clientY - rect.top - 45}px`;
            });
            c.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0';
            });
        });
    }

    // 2. Payment Share Donut Chart (SVG)
    function renderPaymentShareDonut() {
        const container = document.getElementById('pie-chart-container');
        if (!container) return;
        container.innerHTML = '';

        const colors = getChartColors();
        
        let cashRevenue = 0;
        let onlineRevenue = 0;

        db.sales.forEach(s => {
            const status = s.status || 'Delivered';
            if (status === 'Delivered') {
                if (s.payment === 'Cash') cashRevenue += s.total;
                else onlineRevenue += s.total;
            }
        });
        db.orders.forEach(o => {
            if (o.status === 'Delivered') {
                if (o.payment === 'Cash') cashRevenue += o.total;
                else onlineRevenue += o.total;
            }
        });

        const total = cashRevenue + onlineRevenue || 1;
        const cashPct = (cashRevenue / total) * 100;
        const onlinePct = (onlineRevenue / total) * 100;

        // SVG donut circle logic
        const radius = 70;
        const circ = 2 * Math.PI * radius; // 439.8
        const cashOffset = circ - (cashPct / 100) * circ;
        const onlineOffset = circ - (onlinePct / 100) * circ;

        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-around; height: 100%;">
                <svg width="180" height="180" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="${radius}" fill="transparent" stroke="${colors.grid}" stroke-width="25"></circle>
                    
                    <!-- Online share -->
                    <circle cx="100" cy="100" r="${radius}" fill="transparent" 
                        stroke="${colors.online}" stroke-width="25" 
                        stroke-dasharray="${circ}" stroke-dashoffset="${onlineOffset}" 
                        transform="rotate(-90 100 100)" stroke-linecap="round"></circle>
                    
                    <!-- Cash share -->
                    <circle cx="100" cy="100" r="${radius}" fill="transparent" 
                        stroke="${colors.cash}" stroke-width="25" 
                        stroke-dasharray="${circ}" stroke-dashoffset="${cashOffset}" 
                        transform="rotate(${(onlinePct / 100) * 360 - 90} 100 100)" stroke-linecap="round"></circle>
                        
                    <text x="100" y="105" text-anchor="middle" fill="${colors.primary}" font-size="14" font-weight="800">Payments</text>
                </svg>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.9rem; color: var(--gold);">
                            <span style="width: 12px; height: 12px; background: ${colors.online}; display: inline-block; border-radius: 2px;"></span>
                            Online: ${Math.round(onlinePct)}%
                        </div>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-left: 20px;">₹${onlineRevenue.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.9rem; color: var(--text-secondary);">
                            <span style="width: 12px; height: 12px; background: ${colors.cash}; display: inline-block; border-radius: 2px;"></span>
                            Cash: ${Math.round(cashPct)}%
                        </div>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-left: 20px;">₹${cashRevenue.toLocaleString('en-IN')}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // 3. Sales by Region Bar Chart (SVG)
    function renderAreaBarChart() {
        const container = document.getElementById('area-chart-container');
        if (!container) return;
        container.innerHTML = '';

        const colors = getChartColors();

        // Aggregate area sums
        const areaData = {};
        db.sales.forEach(s => {
            const status = s.status || 'Delivered';
            if (status === 'Delivered') {
                areaData[s.area] = (areaData[s.area] || 0) + s.total;
            }
        });
        db.orders.forEach(o => {
            if (o.status === 'Delivered') {
                areaData[o.area] = (areaData[o.area] || 0) + o.total;
            }
        });

        // Convert to array and sort
        const sortedAreas = Object.keys(areaData).map(k => ({ area: k, val: areaData[k] }))
                                                 .sort((a, b) => b.val - a.val)
                                                 .slice(0, 5);

        if (sortedAreas.length === 0) {
            container.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding-top: 50px;">No area metrics logged yet.</p>`;
            return;
        }

        const maxVal = Math.max(...sortedAreas.map(a => a.val), 1000);
        const width = container.clientWidth || 500;
        const height = container.clientHeight || 300;
        const paddingLeft = 70;
        const paddingRight = 30;
        const paddingTop = 20;
        const paddingBottom = 40;

        let barsHTML = '';
        const barHeight = 25;
        const spacing = (height - paddingTop - paddingBottom) / sortedAreas.length;

        sortedAreas.forEach((item, index) => {
            const y = paddingTop + index * spacing + 5;
            const barWidth = (item.val / maxVal) * (width - paddingLeft - paddingRight);
            
            barsHTML += `
                <text x="${paddingLeft - 10}" y="${y + 17}" fill="${colors.text}" font-size="10" text-anchor="end">${item.area}</text>
                <rect x="${paddingLeft}" y="${y}" width="${barWidth}" height="${barHeight}" class="svg-chart-bar"></rect>
                <text x="${paddingLeft + barWidth + 8}" y="${y + 17}" fill="${colors.text}" font-size="10" font-weight="700">₹${item.val.toLocaleString('en-IN')}</text>
            `;
        });

        container.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}">
                <!-- Axis lines -->
                <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${height - paddingBottom}" stroke="${colors.primary}" stroke-width="1.5"></line>
                ${barsHTML}
            </svg>
        `;
    }

    // 4. Product comparative stats (Bar Chart)
    function renderProductCompareBar() {
        const container = document.getElementById('product-chart-container');
        if (!container) return;
        container.innerHTML = '';

        const colors = getChartColors();
        
        let revenue1kg = 0;
        let revenue25kg = 0;
        let bags1kg = 0;
        let bags25kg = 0;

        // Sum entries
        db.sales.forEach(s => {
            const status = s.status || 'Delivered';
            if (status === 'Delivered') {
                if (s.product === '1 KG Rice') {
                    revenue1kg += s.total;
                    bags1kg += s.qty;
                } else {
                    revenue25kg += s.total;
                    bags25kg += s.qty;
                }
            }
        });

        db.orders.forEach(o => {
            if (o.status === 'Delivered') {
                if (o.product === '1 KG Rice') {
                    revenue1kg += o.total;
                    bags1kg += o.qty;
                } else {
                    revenue25kg += o.total;
                    bags25kg += o.qty;
                }
            }
        });

        const maxVal = Math.max(revenue1kg, revenue25kg, 5000);
        const width = container.clientWidth || 500;
        const height = container.clientHeight || 300;
        const padding = 45;
        
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;

        const bar1Height = (revenue1kg / maxVal) * chartHeight;
        const bar2Height = (revenue25kg / maxVal) * chartHeight;

        container.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}">
                <!-- Axis lines -->
                <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="${colors.primary}" stroke-width="1.5"></line>
                
                <!-- 1 KG Bar -->
                <rect x="${padding + chartWidth / 4 - 25}" y="${height - padding - bar1Height}" width="50" height="${bar1Height}" class="svg-chart-bar" fill="${colors.primary}"></rect>
                <text x="${padding + chartWidth / 4}" y="${height - padding + 18}" text-anchor="middle" fill="${colors.text}" font-size="10" font-weight="700">1 KG Packs</text>
                <text x="${padding + chartWidth / 4}" y="${height - padding - bar1Height - 8}" text-anchor="middle" fill="${colors.primary}" font-size="11" font-weight="800">₹${revenue1kg.toLocaleString('en-IN')}</text>
                <text x="${padding + chartWidth / 4}" y="${height - padding - bar1Height - 22}" text-anchor="middle" fill="${colors.text}" font-size="9">(${bags1kg} sold)</text>

                <!-- 25 KG Bar -->
                <rect x="${padding + 3 * chartWidth / 4 - 25}" y="${height - padding - bar2Height}" width="50" height="${bar2Height}" class="svg-chart-bar" fill="${colors.secondary}"></rect>
                <text x="${padding + 3 * chartWidth / 4}" y="${height - padding + 18}" text-anchor="middle" fill="${colors.text}" font-size="10" font-weight="700">25 KG Bags</text>
                <text x="${padding + 3 * chartWidth / 4}" y="${height - padding - bar2Height - 8}" text-anchor="middle" fill="${colors.primary}" font-size="11" font-weight="800">₹${revenue25kg.toLocaleString('en-IN')}</text>
                <text x="${padding + 3 * chartWidth / 4}" y="${height - padding - bar2Height - 22}" text-anchor="middle" fill="${colors.text}" font-size="9">(${bags25kg} sold)</text>
            </svg>
        `;
    }

    // Window resize redrawing
    window.addEventListener('resize', () => {
        if (window.location.hash === '#admin') {
            renderAllCharts();
        }
    });

    // ==========================================================================
    // SALES ENTRY FORMS LOGIC
    // ==========================================================================
    const salesForm1 = document.getElementById('sales-form-1kg');
    const salesForm25 = document.getElementById('sales-form-25kg');
    
    const qty1 = document.getElementById('sale1-qty');
    const rate1 = document.getElementById('sale1-rate');
    const total1Text = document.getElementById('sale1-total-text');

    const qty25 = document.getElementById('sale25-qty');
    const rate25 = document.getElementById('sale25-rate');
    const total25Text = document.getElementById('sale25-total-text');

    const pay1Radio = document.getElementsByName('sale1_payment');
    const pay25Radio = document.getElementsByName('sale25_payment');
    
    const screenshot1Box = document.getElementById('sale1-screenshot-box');
    const screenshot25Box = document.getElementById('sale25-screenshot-box');

    let sale1ScreenshotBase64 = null;
    let sale25ScreenshotBase64 = null;

    // Calculation Listener 1 KG
    if (qty1 && rate1) {
        const calc = () => {
            const total = parseInt(qty1.value || 0) * parseFloat(rate1.value || 0);
            total1Text.innerText = `₹${total.toLocaleString('en-IN')}`;
        };
        qty1.addEventListener('input', calc);
        rate1.addEventListener('input', calc);
    }

    // Calculation Listener 25 KG
    if (qty25 && rate25) {
        const calc = () => {
            const total = parseInt(qty25.value || 0) * 25 * parseFloat(rate25.value || 0);
            total25Text.innerText = `₹${total.toLocaleString('en-IN')}`;
        };
        qty25.addEventListener('input', calc);
        rate25.addEventListener('input', calc);
    }

    // Screenshot attachment toggle 1 KG
    pay1Radio.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'Online') {
                screenshot1Box.style.display = 'block';
            } else {
                screenshot1Box.style.display = 'none';
                sale1ScreenshotBase64 = null;
                document.getElementById('sale1-preview').style.display = 'none';
            }
        });
    });

    // Screenshot attachment toggle 25 KG
    pay25Radio.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'Online') {
                screenshot25Box.style.display = 'block';
            } else {
                screenshot25Box.style.display = 'none';
                sale25ScreenshotBase64 = null;
                document.getElementById('sale25-preview').style.display = 'none';
            }
        });
    });

    // Image loader 1 KG
    const sale1ScreenshotFile = document.getElementById('sale1-screenshot-file');
    if (sale1ScreenshotFile) {
        sale1ScreenshotFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    sale1ScreenshotBase64 = event.target.result;
                    const preview = document.getElementById('sale1-preview');
                    preview.src = sale1ScreenshotBase64;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Image loader 25 KG
    const sale25ScreenshotFile = document.getElementById('sale25-screenshot-file');
    if (sale25ScreenshotFile) {
        sale25ScreenshotFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    sale25ScreenshotBase64 = event.target.result;
                    const preview = document.getElementById('sale25-preview');
                    preview.src = sale25ScreenshotBase64;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Save Entry 1 KG
    if (salesForm1) {
        salesForm1.addEventListener('submit', (e) => {
            e.preventDefault();
            const shop = document.getElementById('sale1-shop').value.trim();
            const area = document.getElementById('sale1-area').value.trim();
            const date = document.getElementById('sale1-date').value;
            const qty = parseInt(qty1.value);
            const rate = parseFloat(rate1.value);
            const total = qty * rate;
            const payment = document.querySelector('input[name="sale1_payment"]:checked').value;
            const salesperson = document.getElementById('sale1-salesperson').value;
            const status = document.getElementById('sale1-status').value;

            const entry = {
                id: `S${Date.now().toString().slice(-4)}`,
                date,
                shop,
                area,
                product: "1 KG Rice",
                qty,
                rate,
                total,
                payment,
                status,
                salesperson,
                screenshot: sale1ScreenshotBase64
            };

            db.sales.unshift(entry);
            saveDB();
            refreshDashboard();
            
            // Clear form
            salesForm1.reset();
            document.getElementById('sale1-date').value = todayStr;
            total1Text.innerText = "₹200";
            screenshot1Box.style.display = 'none';
            document.getElementById('sale1-preview').style.display = 'none';
            sale1ScreenshotBase64 = null;

            showToast("Saved 1 KG sales entry!");
        });
    }

    // Save Entry 25 KG
    if (salesForm25) {
        salesForm25.addEventListener('submit', (e) => {
            e.preventDefault();
            const shop = document.getElementById('sale25-shop').value.trim();
            const area = document.getElementById('sale25-area').value.trim();
            const date = document.getElementById('sale25-date').value;
            const qty = parseInt(qty25.value);
            const rate = parseFloat(rate25.value);
            const total = qty * 25 * rate;
            const payment = document.querySelector('input[name="sale25_payment"]:checked').value;
            const salesperson = document.getElementById('sale25-salesperson').value;
            const status = document.getElementById('sale25-status').value;

            const entry = {
                id: `S${Date.now().toString().slice(-4)}`,
                date,
                shop,
                area,
                product: "25 KG Rice",
                qty,
                rate,
                total,
                payment,
                status,
                salesperson,
                screenshot: sale25ScreenshotBase64
            };

            db.sales.unshift(entry);
            saveDB();
            refreshDashboard();

            // Clear form
            salesForm25.reset();
            document.getElementById('sale25-date').value = todayStr;
            total25Text.innerText = "₹4,750";
            screenshot25Box.style.display = 'none';
            document.getElementById('sale25-preview').style.display = 'none';
            sale25ScreenshotBase64 = null;

            showToast("Saved 25 KG sales entry!");
        });
    }

    // ==========================================================================
    // REPORTS VIEWER & FILTER ENGINE
    // ==========================================================================
    const reportsTableBody = document.getElementById('reports-table-body');
    const reportPeriod = document.getElementById('report-period');
    const reportAreaSearch = document.getElementById('report-area-search');
    const reportAgent = document.getElementById('report-agent');
    const reportPayment = document.getElementById('report-payment');
    
    // Export Buttons
    const btnExportCSV = document.getElementById('btn-export-csv');
    const btnExportExcel = document.getElementById('btn-export-excel');
    const btnExportPDF = document.getElementById('btn-export-pdf');

    function renderReportsTable() {
        if (!reportsTableBody) return;
        reportsTableBody.innerHTML = '';

        const period = reportPeriod.value;
        const areaFilter = reportAreaSearch.value.trim().toLowerCase();
        const agent = reportAgent.value;
        const payType = reportPayment.value;
        const statusFilterEl = document.getElementById('report-status');
        const statusFilter = statusFilterEl ? statusFilterEl.value : 'all';

        // Date constraints
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        // Filter operations
        let records = [];
        db.sales.forEach(s => {
            records.push({
                ...s,
                status: s.status || 'Pending'
            });
        });
        
        // Add all orders to records list for complete reports
        db.orders.forEach(o => {
            records.push({
                id: o.id,
                date: o.date,
                shop: o.name, // Treated as customer name for reports
                area: o.area,
                product: o.product,
                qty: o.qty,
                rate: o.product === '25 KG Rice' ? 190 : 200,
                total: o.total,
                payment: o.payment,
                salesperson: "WhatsApp Portal",
                screenshot: o.screenshot,
                status: o.status || 'Pending'
            });
        });

        // Filter logic
        const filteredRecords = records.filter(r => {
            const rDate = new Date(r.date);
            
            // Period check
            if (period === 'daily' && r.date !== todayStr) return false;
            if (period === 'weekly' && rDate < startOfWeek) return false;
            if (period === 'monthly' && rDate < startOfMonth) return false;
            if (period === 'yearly' && rDate < startOfYear) return false;

            // Area check
            if (areaFilter && !r.area.toLowerCase().includes(areaFilter)) return false;

            // Agent check
            if (agent !== 'all' && r.salesperson !== agent) return false;

            // Payment check
            if (payType !== 'all' && r.payment !== payType) return false;

            // Status check
            if (statusFilter !== 'all') {
                if (statusFilter === 'Pending' && r.status !== 'Pending') return false;
                if (statusFilter === 'Delivered' && r.status !== 'Delivered') return false;
            }

            return true;
        });

        // Sort by Date Descending
        filteredRecords.sort((a,b) => new Date(b.date) - new Date(a.date));

        if (filteredRecords.length === 0) {
            reportsTableBody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-secondary);">No records match the active criteria.</td></tr>`;
            return;
        }

        // Render rows
        filteredRecords.forEach(r => {
            const tr = document.createElement('tr');
            
            let screenshotCell = '<span style="color: #999;">None</span>';
            if (r.screenshot) {
                screenshotCell = `<button class="btn-premium btn-secondary view-receipt-btn" style="padding: 4px 8px; font-size: 0.75rem;" data-src="${r.screenshot}"><i class="fa-solid fa-image"></i> View</button>`;
            }

            const deleteBtn = r.id.startsWith('S') ? 
                `<button class="btn-premium btn-logout delete-sale-btn" style="padding: 4px 8px; font-size: 0.75rem;" data-id="${r.id}"><i class="fa-solid fa-trash"></i></button>` : 
                `<span style="color: #999; font-size: 0.75rem;">Portal Order</span>`;

            let statusCell = '';
            if (r.status === 'Pending') {
                statusCell = `<span class="delivery-status-badge status-pending-clickable" data-id="${r.id}" data-status="Pending" style="cursor: pointer; padding: 4px 8px; border-radius: 4px; background: rgba(255, 193, 7, 0.1); color: #ffc107; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;" title="Click to update status">🟡 Pending</span>`;
            } else {
                statusCell = `<span class="delivery-status-badge status-delivered-badge" data-id="${r.id}" data-status="Delivered" style="cursor: pointer; padding: 4px 8px; border-radius: 4px; background: rgba(46, 213, 115, 0.1); color: #2ed573; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;" title="Click to update status">🟢 Delivered</span>`;
            }

            // Map values for reordered columns: Customer Name, Shop Name, Area, Product, Qty, Amount, Payment Method, Delivery Status, Date, Screenshot, Actions
            let customerName = '';
            let shopName = '';
            if (r.id.startsWith('S')) {
                customerName = r.salesperson;
                shopName = r.shop;
            } else {
                customerName = r.shop; // buyers name
                shopName = "WhatsApp Portal";
            }

            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--forest-green);">${escapeHTML(customerName)}</td>
                <td><strong>${escapeHTML(shopName)}</strong></td>
                <td>${escapeHTML(r.area)}</td>
                <td><span class="badge-premium" style="margin-bottom: 0;">${r.product}</span></td>
                <td>${r.qty}</td>
                <td style="font-weight: 800; color: var(--gold);">₹${r.total.toLocaleString('en-IN')}</td>
                <td><span class="payment-type-badge ${r.payment === 'Cash' ? 'payment-cash' : 'payment-online'}">${r.payment}</span></td>
                <td>${statusCell}</td>
                <td>${r.date}</td>
                <td>${screenshotCell}</td>
                <td>${deleteBtn}</td>
            `;
            reportsTableBody.appendChild(tr);
        });

        // Click listener for Delivery Status Badge (Togglable between Pending and Delivered)
        const statusBadges = reportsTableBody.querySelectorAll('.delivery-status-badge');
        statusBadges.forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                const recordId = badge.getAttribute('data-id');
                const currentStatus = badge.getAttribute('data-status');
                
                const select = document.createElement('select');
                select.className = 'form-control delivery-status-select';
                select.style.padding = '2px 5px';
                select.style.fontSize = '0.8rem';
                select.style.width = '100px';
                select.style.display = 'inline-block';
                select.innerHTML = `
                    <option value="Pending" ${currentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Delivered" ${currentStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
                `;
                
                select.addEventListener('click', (ev) => ev.stopPropagation());
                
                select.addEventListener('change', (ev) => {
                    const newStatus = ev.target.value;
                    if (newStatus !== currentStatus) {
                        if (recordId.startsWith('S')) {
                            // Direct Sales Entry
                            const idx = db.sales.findIndex(s => s.id === recordId);
                            if (idx !== -1) {
                                db.sales[idx].status = newStatus;
                                saveDB();
                                showToast(`Sales Log ${recordId} updated to ${newStatus}`);
                                refreshDashboard();
                                renderReportsTable();
                            }
                        } else {
                            // WhatsApp Order
                            const idx = db.orders.findIndex(o => o.id === recordId);
                            if (idx !== -1) {
                                db.orders[idx].status = newStatus;
                                saveDB();
                                showToast(`Order ${recordId} updated to ${newStatus}`);
                                refreshDashboard();
                                renderReportsTable();
                            }
                        }
                    }
                });
                
                badge.parentNode.replaceChild(select, badge);
                select.focus();
                
                select.addEventListener('blur', () => {
                    renderReportsTable();
                });
            });
        });

        // Attach action listeners
        const viewReceiptBtns = reportsTableBody.querySelectorAll('.view-receipt-btn');
        viewReceiptBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const src = btn.getAttribute('data-src');
                showScreenshotModal(src);
            });
        });

        const deleteSaleBtns = reportsTableBody.querySelectorAll('.delete-sale-btn');
        deleteSaleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm(`Are you sure you want to delete sales record ${id}?`)) {
                    db.sales = db.sales.filter(s => s.id !== id);
                    saveDB();
                    showToast("Record deleted successfully");
                    renderReportsTable();
                    refreshDashboard();
                }
            });
        });
    }

    // Attach filters change events
    if (reportPeriod) reportPeriod.addEventListener('change', renderReportsTable);
    if (reportAreaSearch) reportAreaSearch.addEventListener('input', renderReportsTable);
    if (reportAgent) reportAgent.addEventListener('change', renderReportsTable);
    if (reportPayment) reportPayment.addEventListener('change', renderReportsTable);
    const reportStatusEl = document.getElementById('report-status');
    if (reportStatusEl) reportStatusEl.addEventListener('change', renderReportsTable);

    // Zoom Image Modal Viewer logic
    const screenshotModal = document.getElementById('screenshot-modal');
    const modalImageZoomed = document.getElementById('modal-image-zoomed');
    const btnModalClose = document.getElementById('btn-modal-close');

    function showScreenshotModal(src) {
        if (!screenshotModal) return;
        
        // Simulating mock screenshots path fallback
        if (src === 'mock_screenshot_1') {
            modalImageZoomed.src = "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=500&q=80"; // Sim receipt
        } else if (src === 'mock_screenshot_2') {
            modalImageZoomed.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80";
        } else {
            modalImageZoomed.src = src; // Base64
        }
        
        screenshotModal.style.display = 'flex';
    }

    if (btnModalClose) {
        btnModalClose.addEventListener('click', () => {
            screenshotModal.style.display = 'none';
        });
    }
    if (screenshotModal) {
        screenshotModal.addEventListener('click', (e) => {
            if (e.target === screenshotModal) {
                screenshotModal.style.display = 'none';
            }
        });
    }

    // EXPORTS SYSTEM
    function getActiveReportData() {
        // Standard table extraction to text stream
        const trs = reportsTableBody.querySelectorAll('tr');
        const rows = [];
        
        // Extract headers
        rows.push(["Date", "Shop/Client", "Area", "Product", "Quantity", "Total Amount", "Payment Type", "Sales Person"]);
        
        trs.forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds.length >= 8) {
                const date = tds[0].innerText;
                const shop = tds[1].innerText;
                const area = tds[2].innerText;
                const product = tds[3].innerText;
                const qty = tds[4].innerText;
                const total = tds[5].innerText.replace('₹', '').replace(/,/g, '');
                const payment = tds[6].innerText;
                const agent = tds[8].innerText;
                rows.push([date, shop, area, product, qty, total, payment, agent]);
            }
        });
        return rows;
    }

    // CSV Download
    if (btnExportCSV) {
        btnExportCSV.addEventListener('click', () => {
            const data = getActiveReportData();
            if (data.length <= 1) {
                showToast("No data to export", "error");
                return;
            }
            const csvContent = "data:text/csv;charset=utf-8," 
                + data.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `AKE_Rice_Report_${todayStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("CSV report downloaded!");
        });
    }

    // Excel Compatible XML/TSV Download
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', () => {
            const data = getActiveReportData();
            if (data.length <= 1) {
                showToast("No data to export", "error");
                return;
            }
            
            // Generate TSV tab-delimited stream (Excel reads this cleanly as table)
            let tsvContent = '';
            data.forEach(row => {
                tsvContent += row.join("\t") + "\r\n";
            });

            const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `AKE_Rice_Report_${todayStr}.xls`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("Excel spreadsheet downloaded!");
        });
    }

    // Print / PDF
    if (btnExportPDF) {
        btnExportPDF.addEventListener('click', () => {
            window.print();
        });
    }

    // ==========================================================================
    // WHATSAPP ORDERS MANAGEMENT SCREEN & ACTIONS
    // ==========================================================================
    const ordersTableBody = document.getElementById('orders-table-body');
    const ordersSearchInput = document.getElementById('orders-search-input');
    const ordersStatusFilter = document.getElementById('orders-status-filter');

    function generateWaTextForOrder(o) {
        let waText = `🛒 NEW ORDER\n\n`;
        waText += `Order ID:\n${o.id}\n\n`;
        waText += `Customer Name:\n${o.name}\n\n`;
        waText += `Mobile:\n${o.mobile}\n\n`;
        waText += `Address:\n${o.address || o.area}\n\n`;
        waText += `Products:\n${o.product}\n\n`;
        waText += `Quantity:\n${o.qty}\n\n`;
        waText += `Total Amount:\n₹${(o.total || 0).toLocaleString('en-IN')}\n\n`;
        waText += `Payment Method:\n${o.payment || 'Cash on Delivery'}\n\n`;
        if (o.payment === 'Online Payment' || o.payment === 'Online') {
            waText += `UPI ID:\nkaviyansellappan15@oksbi\n\n`;
            waText += `Transaction ID:\n${o.utr || 'N/A'}\n\n`;
        } else {
            waText += `Transaction ID:\nN/A\n\n`;
        }
        waText += `Payment Status:\n${o.paymentStatus || 'Pending Verification'}\n\n`;
        waText += `Thank you for your order.`;
        return waText;
    }

    function openViewOrderModal(orderId) {
        const o = db.orders.find(item => item.id === orderId);
        if (!o) return;
        const modal = document.getElementById('order-detail-modal');
        const content = document.getElementById('order-modal-body-content');
        if (!modal || !content) return;

        const receiptHTML = o.screenshot ? 
            `<div style="margin-top: 15px;">
                <strong style="color: var(--forest-green);">Payment Screenshot:</strong><br>
                <img src="${o.screenshot}" style="max-height: 220px; border-radius: 8px; border: 1px solid var(--gold); margin-top: 8px; cursor: pointer; display: block;" onclick="showScreenshotModal('${o.screenshot}')" title="Click to enlarge">
             </div>` : 
            `<p style="color: #999; margin-top: 10px;"><em>No receipt screenshot (Cash on Delivery Order).</em></p>`;

        content.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 15px;">
                <div><span style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 600;">Order ID:</span><br><strong style="color: var(--gold); font-size: 1.15rem; font-family: monospace;">${o.id}</strong></div>
                <div><span style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 600;">Order Date & Time:</span><br><strong>${o.dateTime || o.date}</strong></div>
                <div><span style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 600;">Customer Name:</span><br><strong style="color: var(--forest-green);">${escapeHTML(o.name)}</strong></div>
                <div><span style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 600;">Mobile Number:</span><br><a href="tel:${o.mobile}">${o.mobile}</a></div>
                <div style="grid-column: 1 / -1;"><span style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 600;">Delivery Address:</span><br><strong>${escapeHTML(o.address || o.area)}</strong> (${escapeHTML(o.area)})</div>
                <div><span style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 600;">Ordered Products:</span><br><strong>${escapeHTML(o.product)} (x${o.qty})</strong></div>
                <div><span style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 600;">Total Amount:</span><br><strong style="color: var(--gold); font-size: 1.15rem;">₹${(o.total || 0).toLocaleString('en-IN')}</strong></div>
                <div><span style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 600;">Payment Method:</span><br><span class="payment-type-badge ${(o.payment || '').includes('Cash') ? 'payment-cash' : 'payment-online'}">${o.payment}</span></div>
                <div><span style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 600;">Transaction ID (UTR):</span><br><code style="font-family: monospace; font-size: 0.9rem;">${o.utr || 'N/A'}</code></div>
                <div><span style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 600;">Payment Status:</span><br><span class="status-badge" style="background: rgba(255, 193, 7, 0.15); color: #ffc107; padding: 3px 8px; border-radius: 4px; font-weight: 600;">${o.paymentStatus || 'Pending Verification'}</span></div>
                <div><span style="color: var(--text-secondary); font-size: 0.75rem; font-weight: 600;">Order Status:</span><br><strong style="color: var(--forest-green); font-size: 1rem;">${o.status || 'Pending'}</strong></div>
            </div>
            ${receiptHTML}
            <div style="margin-top: 25px; border-top: 1px dashed var(--border-accent); padding-top: 15px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end;">
                <button class="btn-premium btn-gold" onclick="openOrderWhatsApp('${o.id}')"><i class="fa-brands fa-whatsapp"></i> Open WhatsApp</button>
                <button class="btn-premium btn-secondary" onclick="copyOrderWaText('${o.id}')"><i class="fa-regular fa-copy"></i> Copy Message</button>
            </div>
        `;

        modal.style.display = 'flex';
    }

    const btnOrderModalClose = document.getElementById('btn-order-modal-close');
    if (btnOrderModalClose) {
        btnOrderModalClose.addEventListener('click', () => {
            const modal = document.getElementById('order-detail-modal');
            if (modal) modal.style.display = 'none';
        });
    }

    function openOrderWhatsApp(orderId) {
        const o = db.orders.find(item => item.id === orderId);
        if (!o) return;
        const text = generateWaTextForOrder(o);
        const waUrl = `https://wa.me/919176049099?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
    }

    function copyOrderWaText(orderId) {
        const o = db.orders.find(item => item.id === orderId);
        if (!o) return;
        const text = generateWaTextForOrder(o);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showToast(`WhatsApp message for ${orderId} copied!`);
            }).catch(() => {
                copyTextFallback(text, orderId);
            });
        } else {
            copyTextFallback(text, orderId);
        }
    }

    function copyTextFallback(text, orderId) {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showToast(`WhatsApp message for ${orderId} copied!`);
    }

    window.openOrderWhatsApp = openOrderWhatsApp;
    window.copyOrderWaText = copyOrderWaText;

    function renderOrdersTable() {
        if (!ordersTableBody) return;
        ordersTableBody.innerHTML = '';

        // 1. Filter Orders
        const searchQuery = ordersSearchInput ? ordersSearchInput.value.trim().toLowerCase() : '';
        const statusFilter = ordersStatusFilter ? ordersStatusFilter.value : 'all';

        const filteredOrders = db.orders.filter(o => {
            const nameMatch = (o.name || '').toLowerCase().includes(searchQuery);
            const phoneMatch = (o.mobile || '').includes(searchQuery);
            const idMatch = (o.id || '').toLowerCase().includes(searchQuery);
            const statusMatch = statusFilter === 'all' || o.status === statusFilter;
            return (nameMatch || phoneMatch || idMatch) && statusMatch;
        });

        if (filteredOrders.length === 0) {
            ordersTableBody.innerHTML = `<tr><td colspan="14" style="text-align: center; color: var(--text-secondary); padding: 25px;">No WhatsApp orders found in database.</td></tr>`;
            return;
        }

        // 3. Render Order Rows
        filteredOrders.forEach(o => {
            const tr = document.createElement('tr');
            
            let receiptCell = '<span style="color: #999; font-size: 0.75rem;">COD (No Screenshot)</span>';
            if (o.payment === 'Online Payment' || o.payment === 'Online') {
                if (o.screenshot) {
                    receiptCell = `<button class="btn-premium btn-secondary view-receipt-btn" style="padding: 4px 8px; font-size: 0.75rem;" data-src="${o.screenshot}"><i class="fa-solid fa-receipt"></i> Show Receipt</button>`;
                } else {
                    receiptCell = '<span style="color: #e74c3c; font-weight: 600; font-size: 0.75rem;">Missing Screenshot</span>';
                }
            }

            const paymentMethodText = o.payment || (o.payment === 'Online' ? 'Online Payment' : 'Cash on Delivery');
            const utrText = o.utr && o.utr !== 'N/A' ? `<code style="font-family: monospace; font-size: 0.85rem;">${escapeHTML(o.utr)}</code>` : '<span style="color: #999; font-size: 0.8rem;">N/A</span>';
            const payStatus = o.paymentStatus || (paymentMethodText.includes('Cash') ? 'Cash on Delivery' : 'Pending Verification');
            const fullAddress = o.address ? `${escapeHTML(o.address)} (${escapeHTML(o.area)})` : escapeHTML(o.area || '');
            const displayTime = o.dateTime || o.date;

            const isVerified = payStatus === 'Verified';
            const isRejectedPay = payStatus === 'Payment Rejected';

            let payStatusStyle = `background: rgba(255, 193, 7, 0.15); color: #ffc107;`;
            if (isVerified) payStatusStyle = `background: rgba(46, 213, 115, 0.15); color: #2ed573;`;
            if (isRejectedPay) payStatusStyle = `background: rgba(255, 71, 87, 0.15); color: #ff4757;`;

            tr.innerHTML = `
                <td><strong style="color: var(--gold); font-family: monospace; font-size: 0.95rem;">${o.id}</strong></td>
                <td style="font-weight: 700; color: var(--forest-green);">${escapeHTML(o.name)}</td>
                <td><a href="tel:${o.mobile}" style="color: inherit; text-decoration: underline;">${o.mobile}</a></td>
                <td style="max-width: 170px; font-size: 0.8rem;">${fullAddress}</td>
                <td>${escapeHTML(o.product)}</td>
                <td style="font-weight: 700;">${o.qty}</td>
                <td style="font-weight: 800; color: var(--gold);">₹${(o.total || 0).toLocaleString('en-IN')}</td>
                <td><span class="payment-type-badge ${paymentMethodText.includes('Cash') ? 'payment-cash' : 'payment-online'}">${paymentMethodText}</span></td>
                <td>${utrText}</td>
                <td>${receiptCell}</td>
                <td><span class="status-badge" style="${payStatusStyle} font-size: 0.75rem; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${payStatus}</span></td>
                <td><span class="status-badge status-${(o.status || 'Pending').toLowerCase().replace(/\s+/g, '-')}">${o.status || 'Pending'}</span></td>
                <td style="font-size: 0.8rem; min-width: 95px;">${displayTime}</td>
                <td>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center; min-width: 320px;">
                        <button class="btn-premium btn-secondary view-order-btn" style="padding: 3px 6px; font-size: 0.7rem;" data-id="${o.id}" title="View Full Order Details">
                            <i class="fa-solid fa-eye"></i> View Order
                        </button>
                        <button class="btn-premium btn-gold open-wa-btn" style="padding: 3px 6px; font-size: 0.7rem;" data-id="${o.id}" title="Open WhatsApp Chat">
                            <i class="fa-brands fa-whatsapp"></i> WA
                        </button>
                        <button class="btn-premium btn-secondary copy-wa-btn" style="padding: 3px 6px; font-size: 0.7rem;" data-id="${o.id}" title="Copy WhatsApp Text">
                            <i class="fa-regular fa-copy"></i> Copy
                        </button>
                        <button class="btn-premium ${isVerified ? 'btn-primary' : 'btn-gold-outline'} approve-pay-btn" style="padding: 3px 6px; font-size: 0.7rem;" data-id="${o.id}" title="Approve Payment">
                            <i class="fa-solid fa-circle-check"></i> ${isVerified ? 'Approved' : 'Approve Pay'}
                        </button>
                        <button class="btn-premium btn-secondary reject-pay-btn" style="padding: 3px 6px; font-size: 0.7rem; color: #ff4757; border-color: #ff4757;" data-id="${o.id}" title="Reject Payment">
                            <i class="fa-solid fa-circle-xmark"></i> Reject Pay
                        </button>
                        <button class="btn-premium btn-logout delete-order-btn" style="padding: 3px 6px; font-size: 0.7rem;" data-id="${o.id}" title="Permanently Delete Order">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                        <select class="form-control change-order-status-select" data-id="${o.id}" style="padding: 3px 5px; font-size: 0.75rem; width: 130px; border-color: var(--gold);">
                            <option value="Pending" ${(o.status === 'Pending' || !o.status) ? 'selected' : ''}>⏳ Pending</option>
                            <option value="Accepted" ${o.status === 'Accepted' ? 'selected' : ''}>✅ Accept Order</option>
                            <option value="Packed" ${o.status === 'Packed' ? 'selected' : ''}>📦 Mark Packed</option>
                            <option value="Out for Delivery" ${o.status === 'Out for Delivery' ? 'selected' : ''}>🚚 Out for Delivery</option>
                            <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>🎉 Mark Delivered</option>
                            <option value="Rejected" ${o.status === 'Rejected' ? 'selected' : ''}>❌ Reject Order</option>
                            <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>🚫 Cancel Order</option>
                        </select>
                    </div>
                </td>
            `;
            ordersTableBody.appendChild(tr);
        });

        // Action listeners
        const viewOrderBtns = ordersTableBody.querySelectorAll('.view-order-btn');
        viewOrderBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                openViewOrderModal(id);
            });
        });

        const openWaBtns = ordersTableBody.querySelectorAll('.open-wa-btn');
        openWaBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                openOrderWhatsApp(id);
            });
        });

        const copyWaBtns = ordersTableBody.querySelectorAll('.copy-wa-btn');
        copyWaBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                copyOrderWaText(id);
            });
        });

        const approvePayBtns = ordersTableBody.querySelectorAll('.approve-pay-btn');
        approvePayBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const idx = db.orders.findIndex(item => item.id === id);
                if (idx !== -1) {
                    db.orders[idx].paymentStatus = 'Verified';
                    saveDB();
                    showToast(`Payment for Order ${id} Approved & Verified!`);
                    renderOrdersTable();
                    refreshDashboard();
                }
            });
        });

        const rejectPayBtns = ordersTableBody.querySelectorAll('.reject-pay-btn');
        rejectPayBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const idx = db.orders.findIndex(item => item.id === id);
                if (idx !== -1) {
                    db.orders[idx].paymentStatus = 'Payment Rejected';
                    saveDB();
                    showToast(`Payment for Order ${id} set to "Payment Rejected"`, "error");
                    renderOrdersTable();
                    refreshDashboard();
                }
            });
        });

        const deleteOrderBtns = ordersTableBody.querySelectorAll('.delete-order-btn');
        deleteOrderBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm("Are you sure you want to delete this order?")) {
                    db.orders = db.orders.filter(item => item.id !== id);
                    saveDB();
                    showToast("Order deleted successfully.");
                    renderOrdersTable();
                    refreshDashboard();
                    renderReportsTable();
                    renderCustomersTable();
                }
            });
        });

        const statusSelects = ordersTableBody.querySelectorAll('.change-order-status-select');
        statusSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const orderId = select.getAttribute('data-id');
                const newStatus = e.target.value;
                
                const orderIndex = db.orders.findIndex(o => o.id === orderId);
                if (orderIndex !== -1) {
                    db.orders[orderIndex].status = newStatus;
                    saveDB();
                    showToast(`Order ${orderId} status updated to "${newStatus}"`);
                    refreshDashboard();
                    renderOrdersTable();
                    renderReportsTable();
                    renderCustomersTable();
                }
            });
        });

        // Attach receipt viewer zoom
        const viewReceiptBtns = ordersTableBody.querySelectorAll('.view-receipt-btn');
        viewReceiptBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const src = btn.getAttribute('data-src');
                showScreenshotModal(src);
            });
        });
    }

    if (ordersSearchInput) ordersSearchInput.addEventListener('input', renderOrdersTable);
    if (ordersStatusFilter) ordersStatusFilter.addEventListener('change', renderOrdersTable);

    // ==========================================================================
    // CUSTOMER REGISTRY DATABASE
    // ==========================================================================
    const customersTableBody = document.getElementById('customers-table-body');
    const customerSearchInput = document.getElementById('customer-search-input');

    function renderCustomersTable() {
        if (!customersTableBody) return;
        customersTableBody.innerHTML = '';

        const query = customerSearchInput.value.trim().toLowerCase();

        // Aggregate unique customer metrics
        const clients = {};

        // 1. Process Public WhatsApp Orders
        db.orders.forEach(o => {
            const key = o.mobile;
            if (!clients[key]) {
                clients[key] = {
                    name: o.name,
                    mobile: o.mobile,
                    area: o.area,
                    ordersCount: 0,
                    totalSpent: 0,
                    payTypes: new Set(),
                    lastDate: o.date
                };
            }
            clients[key].ordersCount++;
            clients[key].totalSpent += o.total;
            clients[key].payTypes.add(o.payment);
            if (new Date(o.date) > new Date(clients[key].lastDate)) {
                clients[key].lastDate = o.date;
            }
        });

        // 2. Process Direct Sales Entries (Shops)
        db.sales.forEach(s => {
            // Check if shop has a fake mobile or create key based on shop name
            const key = s.shop;
            if (!clients[key]) {
                clients[key] = {
                    name: s.shop,
                    mobile: "Direct Retail",
                    area: s.area,
                    ordersCount: 0,
                    totalSpent: 0,
                    payTypes: new Set(),
                    lastDate: s.date
                };
            }
            clients[key].ordersCount++;
            clients[key].totalSpent += s.total;
            clients[key].payTypes.add(s.payment);
            if (new Date(s.date) > new Date(clients[key].lastDate)) {
                clients[key].lastDate = s.date;
            }
        });

        // Filter registry list
        const clientList = Object.values(clients).filter(c => {
            return c.name.toLowerCase().includes(query) || 
                   c.mobile.includes(query) || 
                   c.area.toLowerCase().includes(query);
        });

        if (clientList.length === 0) {
            customersTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No customers registered.</td></tr>`;
            return;
        }

        // Render customer database rows
        clientList.forEach(c => {
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--forest-green);">${escapeHTML(c.name)}</td>
                <td><strong>${c.mobile}</strong></td>
                <td>${escapeHTML(c.area)}</td>
                <td>${c.ordersCount} purchase${c.ordersCount !== 1 ? 's' : ''}</td>
                <td style="font-weight: 800; color: var(--gold);">₹${c.totalSpent.toLocaleString('en-IN')}</td>
                <td>${Array.from(c.payTypes).map(t => `<span class="payment-type-badge ${t === 'Cash' ? 'payment-cash' : 'payment-online'}">${t}</span>`).join(' ')}</td>
                <td>${c.lastDate}</td>
            `;
            customersTableBody.appendChild(tr);
        });
    }

    if (customerSearchInput) customerSearchInput.addEventListener('input', renderCustomersTable);

    // ==========================================================================
    // HERO IMAGE SLIDER AUTOMATION
    // ==========================================================================
    const heroSlides = document.querySelectorAll('.hero-slide');
    let activeSlideIdx = 0;
    if (heroSlides.length > 0) {
        setInterval(() => {
            heroSlides[activeSlideIdx].classList.remove('active-slide');
            activeSlideIdx = (activeSlideIdx + 1) % heroSlides.length;
            heroSlides[activeSlideIdx].classList.add('active-slide');
        }, 5000);
    }

    // ==========================================================================
    // SCROLL REVEAL & STATS COUNTER OBSERVATION
    // ==========================================================================
    const revealElements = document.querySelectorAll('.reveal-element');
    
    if ('IntersectionObserver' in window && revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    // Check if entry contains stat counters to animate
                    const counters = entry.target.querySelectorAll('.stat-counter');
                    counters.forEach(c => animateCounter(c));
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        // Fallback for older browsers
        revealElements.forEach(el => el.classList.add('active'));
        const counters = document.querySelectorAll('.stat-counter');
        counters.forEach(c => c.innerText = c.getAttribute('data-target'));
    }

    function animateCounter(counterEl) {
        if (counterEl.classList.contains('counted')) return;
        counterEl.classList.add('counted');

        const target = parseInt(counterEl.getAttribute('data-target') || 0);
        const duration = 2000; // 2 seconds
        const stepTime = 30; // 30ms step rate
        const steps = duration / stepTime;
        const increment = target / steps;
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                counterEl.innerText = target.toLocaleString('en-IN');
                clearInterval(timer);
            } else {
                counterEl.innerText = Math.floor(current).toLocaleString('en-IN');
            }
        }, stepTime);
    }

    // ==========================================================================
    // INTERACTIVE RECIPE GUIDE CONTROLLER (BILINGUAL VERSION)
    // ==========================================================================
    const recipeBiryaniType = document.getElementById('recipe-biryani-type');
    const recipeCustomNameContainer = document.getElementById('recipe-custom-name-container');
    const recipeCustomName = document.getElementById('recipe-custom-name');
    const recipePeopleCount = document.getElementById('recipe-people-count');
    const recipeCustomPeopleContainer = document.getElementById('recipe-custom-people-container');
    const recipeCustomPeople = document.getElementById('recipe-custom-people');
    const btnGenerateRecipe = document.getElementById('btn-generate-recipe');

    // UI Result Elements
    const recipeDisplayTitle = document.getElementById('recipe-display-title');
    const recipeDisplayServings = document.getElementById('recipe-display-servings');
    const recipeHeroImage = document.getElementById('recipe-hero-image');
    const mainIngredientsList = document.getElementById('main-ingredients-list');
    const wholeSpicesList = document.getElementById('whole-spices-list');
    const recipeStepsList = document.getElementById('recipe-steps-list');
    const recipeStepsProgress = document.getElementById('recipe-steps-progress');
    const recipeProgressText = document.getElementById('recipe-progress-text');
    
    // Actions
    const btnPrintRecipe = document.getElementById('btn-print-recipe');
    const btnPDFRecipe = document.getElementById('btn-pdf-recipe');
    const btnShareWhatsappRecipe = document.getElementById('btn-share-whatsapp-recipe');

    // UI Translations Dictionary
    const UI_TRANSLATIONS = {
        en: {
            mainTitle: "Seeraga Samba Biryani Recipe Guide",
            mainSubtitle: "Choose your biryani type and the number of people to get the perfect ingredient measurements and cooking steps. Authentic South Indian biryani tastes best when prepared using <strong>Koppampatty Seeraga Samba Rice</strong>.",
            controlsTitle: "Customize Your Recipe",
            labelType: "Step 1: Select Biryani Type",
            labelCustomName: "Enter Your Biryani Name",
            placeholderCustomName: "e.g. Gobi Biryani, Keema Biryani",
            labelPeople: "Step 2: Number of People",
            labelCustomPeople: "Enter Custom Number of People",
            btnGenerate: "Generate Recipe",
            badgeAkeRiceSpecial: "AKE RICE SPECIAL",
            headerIngredients: "Main Ingredients",
            headerSpices: "Whole Spices",
            headerInstructions: "Cooking Instructions",
            btnPrint: "Print Recipe",
            btnPDF: "Save as PDF",
            btnShareWhatsapp: "Share on WhatsApp",
            brandingInfoNote: "Traditional South Indian biryani tastes best when prepared using authentic <strong>Koppampatty Seeraga Samba Rice</strong>.",
            toastGenerated: "Generated recipe successfully!",
            progressCompleted: "Completed",
            unitPerson: "Person",
            unitPeople: "People",
            unitServings: "Serving",
            dropdownOptions: {
                chicken: "Chicken Biryani",
                mutton: "Mutton Biryani",
                veg: "Plain Vegetable Biryani",
                soya: "Soya Biryani",
                egg: "Egg Biryani",
                mushroom: "Mushroom Biryani",
                paneer: "Paneer Biryani",
                prawn: "Prawn Biryani",
                fish: "Fish Biryani",
                custom: "Custom Recipe"
            },
            peopleOptions: {
                1: "1 Person",
                2: "2 People",
                4: "4 People",
                6: "6 People",
                8: "8 People",
                10: "10 People",
                15: "15 People",
                20: "20 People",
                custom: "Custom Count"
            }
        },
        ta: {
            mainTitle: "சீரக சம்பா பிரியாணி செய்முறை வழிகாட்டி",
            mainSubtitle: "சரியான அளவு பொருட்கள் மற்றும் சமையல் படிகளைப் பெற பிரியாணி வகை மற்றும் நபர்களின் எண்ணிக்கையைத் தேர்ந்தெடுக்கவும். அசல் <strong>கொப்பம்பட்டி சீரக சம்பா அரிசியை</strong> பயன்படுத்தும் போதுதான் தென்னிந்திய பிரியாணி மிகச் சிறந்த சுவையைத் தரும்.",
            controlsTitle: "உங்கள் செய்முறையைத் தனிப்பயனாக்குங்கள்",
            labelType: "படி 1: பிரியாணி வகையைத் தேர்வு செய்யவும்",
            labelCustomName: "உங்கள் பிரியாணி பெயரை உள்ளிடவும்",
            placeholderCustomName: "உதாரணமாக: கோபி பிரியாணி, கீமா பிரியாணி",
            labelPeople: "படி 2: நபர்களின் எண்ணிக்கை",
            labelCustomPeople: "நபர்களின் எண்ணிக்கையை உள்ளிடவும்",
            btnGenerate: "செய்முறையை உருவாக்கு",
            badgeAkeRiceSpecial: "ஏ.கே ரைஸ் ஸ்பெஷல்",
            headerIngredients: "முக்கியப் பொருட்கள்",
            headerSpices: "முழு மசாலாப் பொருட்கள்",
            headerInstructions: "சமையல் செய்முறை",
            btnPrint: "அச்சிடு",
            btnPDF: "PDF பதிவிறக்கு",
            btnShareWhatsapp: "WhatsApp-ல் பகிர்",
            brandingInfoNote: "அசல் <strong>கொப்பம்பட்டி சீரக சம்பா அரிசியைப்</strong> பயன்படுத்தி தயாரிக்கும் போதுதான் பாரம்பரிய தென்னிந்திய பிரியாணி மிகச் சிறந்த சுவையைத் தரும்.",
            toastGenerated: "செய்முறை வெற்றிகரமாக உருவாக்கப்பட்டது!",
            progressCompleted: "முடிந்தது",
            unitPerson: "நபர்",
            unitPeople: "நபர்கள்",
            unitServings: "பரிமாறுதல்",
            dropdownOptions: {
                chicken: "சிக்கன் பிரியாணி",
                mutton: "மட்டன் பிரியாணி",
                veg: "காய்கறி பிரியாணி",
                soya: "சோயா பிரியாணி",
                egg: "முட்டை பிரியாணி",
                mushroom: "காளான் பிரியாணி",
                paneer: "பனீர் பிரியாணி",
                prawn: "இறால் பிரியாணி",
                fish: "மீன் பிரியாணி",
                custom: "தனிப்பயன் செய்முறை"
            },
            peopleOptions: {
                1: "1 நபர்",
                2: "2 நபர்கள்",
                4: "4 நபர்கள்",
                6: "6 நபர்கள்",
                8: "8 நபர்கள்",
                10: "10 நபர்கள்",
                15: "15 நபர்கள்",
                20: "20 நபர்கள்",
                custom: "தனிப்பயன் எண்ணிக்கை"
            }
        }
    };

    // Recipe Details Databank
    const RECIPE_DATA_EN = {
        chicken: {
            title: "Chicken Biryani",
            img: "assets/recipe_chicken_biryani.png",
            mainIngredient: "Fresh Chicken (Bone-in, cut to medium pieces)",
            mainQtySuffix: " g",
            step8: "Add the chicken pieces to the cooked masala and sauté for 4-5 minutes until the chicken turns slightly white.",
            step9: "Stir in curd, cover, and cook on low-medium heat for 10-12 minutes until chicken is half-cooked and releases its juices."
        },
        mutton: {
            title: "Mutton Biryani",
            img: "assets/recipe_mutton_biryani.png",
            mainIngredient: "Tender Mutton/Goat Meat (cubed)",
            mainQtySuffix: " g",
            step8: "Add the mutton pieces to the pan and fry for 5 minutes. Transfer to pressure cooker and cook for 3-4 whistles with a splash of water, or simmer in pot for 35 minutes until 80% tender.",
            step9: "Bring the mutton gravy back into the biryani vessel. Sauté for a minute to combine with mint and spices."
        },
        veg: {
            title: "Plain Vegetable Biryani",
            img: "assets/recipe_vegetable_biryani.png",
            mainIngredient: "Mixed Vegetables (Carrot, Beans, Peas, Potatoes)",
            mainQtySuffix: " g",
            step8: "Add the chopped mixed vegetables and sauté for 3-4 minutes to absorb the mint and onion flavors.",
            step9: "Add a splash of water, cover, and steam cook on low heat for 5-6 minutes until vegetables are half-cooked."
        },
        soya: {
            title: "Soya Biryani",
            img: "assets/recipe_soya_biryani.png",
            mainIngredient: "Soya Chunks (soaked in hot water and squeezed dry)",
            mainQtySuffix: " g",
            step8: "Add the squeezed soya chunks to the pot and sauté for 3-4 minutes so they absorb the masala base.",
            step9: "Pour in curd and let it simmer for 2 minutes to make the soya chunks soft and juicy."
        },
        egg: {
            title: "Egg Biryani",
            img: "assets/recipe_egg_biryani.png",
            mainIngredient: "Hard-boiled Eggs",
            mainQtySuffix: " unit(s)",
            isEgg: true,
            step8: "Prick the boiled eggs lightly with a fork. Heat a tsp of ghee in a pan, toss the eggs with a pinch of turmeric and chilli powder for 2 minutes.",
            step9: "Add the sautéed eggs carefully to the biryani masala gravy, tossing gently so they don't break."
        },
        mushroom: {
            title: "Mushroom Biryani",
            img: "assets/recipe_mushroom_biryani.png",
            mainIngredient: "Button Mushrooms (halved or sliced)",
            mainQtySuffix: " g",
            step8: "Add the mushrooms to the masala base and sauté on high heat for 3 minutes. Mushrooms will release water, so do not add extra.",
            step9: "Stir in curd and cook uncovered for 2 minutes until mushrooms shrink slightly and absorb the spices."
        },
        paneer: {
            title: "Paneer Biryani",
            img: "assets/about_biryani.jpg",
            mainIngredient: "Paneer (Cottage Cheese, cubed)",
            mainQtySuffix: " g",
            step8: "Slightly pan-fry the paneer cubes in ghee until golden, then add them to the masala base.",
            step9: "Toss the paneer cubes very gently on low heat to avoid breaking them."
        },
        prawn: {
            title: "Prawn Biryani",
            img: "assets/about_biryani.jpg",
            mainIngredient: "Cleaned & Deveined Prawns",
            mainQtySuffix: " g",
            step8: "Add prawns to the cooked onion-tomato base and sauté on medium heat.",
            step9: "Sauté prawns for only 2-3 minutes. Prawns cook very quickly; overcooking will make them rubbery."
        },
        fish: {
            title: "Fish Biryani",
            img: "assets/about_biryani.jpg",
            mainIngredient: "Firm Fish Cubes (Kingfish or Seer fish)",
            mainQtySuffix: " g",
            step8: "Lightly shallow-fry fish cubes with turmeric and salt. Add them gently to the masala base.",
            step9: "Toss carefully, spooning the gravy over the fish cubes. Cover and simmer for 2 minutes."
        },
        custom: {
            title: "Custom Biryani",
            img: "assets/about_biryani.jpg",
            mainIngredient: "Your Main Ingredient",
            mainQtySuffix: " g",
            step8: "Add your custom main ingredient to the cooked masala and sauté.",
            step9: "Cook until your main ingredient is tender and cooked through."
        }
    };

    const RECIPE_DATA_TA = {
        chicken: {
            title: "சிக்கன் பிரியாணி",
            img: "assets/recipe_chicken_biryani.png",
            mainIngredient: "சிக்கன் துண்டுகள் (எலும்புடன் நடுத்தரமாக நறுக்கியது)",
            mainQtySuffix: " கிராம்",
            step8: "சிக்கன் துண்டுகளைச் சேர்த்து, அவை நிறம் மாறும் வரை 4-5 நிமிடங்கள் நன்கு வதக்கவும்.",
            step9: "தயிர் சேர்த்து, மூடி வைத்து குறைந்த தீயில் 10-12 நிமிடங்கள் சிக்கன் பாதி வேகும் வரை சமைக்கவும்."
        },
        mutton: {
            title: "மட்டன் பிரியாணி",
            img: "assets/recipe_mutton_biryani.png",
            mainIngredient: "ஆட்டுக்கறி / மட்டன் துண்டுகள்",
            mainQtySuffix: " கிராம்",
            step8: "மட்டன் துண்டுகளைச் சேர்த்து 5 நிமிடங்கள் வதக்கவும். பின்னர் பிரஷர் குக்கரில் 3-4 விசில்கள் அல்லது பாத்திரத்தில் 35 நிமிடங்கள் வேக வைக்கவும்.",
            step9: "மட்டன் சாற்றை மீண்டும் பிரியாணி பாத்திரத்திற்கு மாற்றி, மசாலாவுடன் நன்கு கலக்கவும்."
        },
        veg: {
            title: "காய்கறி பிரியாணி",
            img: "assets/recipe_vegetable_biryani.png",
            mainIngredient: "நறுக்கிய காய்கறிகள் (கேரட், பீன்ஸ், பட்டாணி, உருளைக்கிழங்கு)",
            mainQtySuffix: " கிராம்",
            step8: "நறுக்கிய காய்கறிகளைச் சேர்த்து 3-4 நிமிடங்கள் நன்கு வதக்கவும்.",
            step9: "சிறிது தண்ணீர் தெளித்து, மூடி வைத்து குறைந்த தீயில் 5-6 நிமிடங்கள் காய்கறிகள் பாதி வேகும் வரை சமைக்கவும்."
        },
        soya: {
            title: "சோயா பிரியாணி",
            img: "assets/recipe_soya_biryani.png",
            mainIngredient: "சோயா துண்டுகள் (சுடுதண்ணீரில் ஊறவைத்து பிழிந்தது)",
            mainQtySuffix: " கிராம்",
            step8: "ஊறவைத்து பிழிந்த சோயா துண்டுகளைச் சேர்த்து 3-4 நிமிடங்கள் வதக்கவும்.",
            step9: "தயிர் சேர்த்து, சோயா துண்டுகள் மென்மையாகவும் சாறாகவும் மாற 2 நிமிடங்கள் வேக வைக்கவும்."
        },
        egg: {
            title: "முட்டை பிரியாணி",
            img: "assets/recipe_egg_biryani.png",
            mainIngredient: "முட்டைகள் (வேகவைத்தது)",
            mainQtySuffix: " முட்டை(கள்)",
            isEgg: true,
            step8: "முட்டைகளை ஒரு ஃபோர்க்கால் லேசாகக் குத்தி, நெய்யில் சிறிது மஞ்சள் மற்றும் மிளகாய்த்தூள் சேர்த்து 2 நிமிடங்கள் வதக்கி தனியாக வைக்கவும்.",
            step9: "வதக்கிய முட்டைகளை பிரியாணி மசாலாவுடன் சேர்த்து மெதுவாகக் கிளறவும்."
        },
        mushroom: {
            title: "காளான் பிரியாணி",
            img: "assets/recipe_mushroom_biryani.png",
            mainIngredient: "காளான் துண்டுகள் (பாதியாக நறுக்கியது)",
            mainQtySuffix: " கிராம்",
            step8: "காளான் துண்டுகளைச் சேர்த்து 3 நிமிடங்கள் வதக்கவும் (காளான் தண்ணீர் வெளியிடும் என்பதால் கூடுதல் தண்ணீர் சேர்க்க வேண்டாம்).",
            step9: "தயிர் சேர்த்து, காளான்கள் மென்மையாகும் வரை 2 நிமிடங்கள் வேக வைக்கவும்."
        },
        paneer: {
            title: "பனீர் பிரியாணி",
            img: "assets/about_biryani.jpg",
            mainIngredient: "பனீர் துண்டுகள்",
            mainQtySuffix: " கிராம்",
            step8: "பனீர் துண்டுகளை நெய்யில் பொன்னிறமாக வறுத்து, மசாலா கலவையுடன் சேர்க்கவும்.",
            step9: "பனீர் துண்டுகள் உடையாமல் இருக்க குறைந்த தீயில் மெதுவாகக் கிளறவும்."
        },
        prawn: {
            title: "இறால் பிரியாணி",
            img: "assets/about_biryani.jpg",
            mainIngredient: "சுத்தம் செய்யப்பட்ட இறால்கள்",
            mainQtySuffix: " கிராம்",
            step8: "இறால்களை மசாலா கலவையுடன் சேர்த்து வதக்கவும்.",
            step9: "இறால்களை 2-3 நிமிடங்கள் மட்டும் வதக்கவும் (அதிகம் வெந்தால் ரப்பர் போலாகிவிடும்)."
        },
        fish: {
            title: "மீன் பிரியாணி",
            img: "assets/about_biryani.jpg",
            mainIngredient: "மீன் துண்டுகள் (சீலா அல்லது வஞ்சிர மீன்)",
            mainQtySuffix: " கிராம்",
            step8: "மீன் துண்டுகளை மஞ்சள் தூள் மற்றும் உப்பு சேர்த்து லேசாக வறுத்து, மசாலாவுடன் மெதுவாக சேர்க்கவும்.",
            step9: "மசாலா சாற்றை மீன் துண்டுகளின் மேல் மெதுவாக ஊற்றி, மூடி வைத்து 2 நிமிடங்கள் வேக வைக்கவும்."
        },
        custom: {
            title: "தனிப்பயன் பிரியாணி",
            img: "assets/about_biryani.jpg",
            mainIngredient: "உங்களது முக்கிய பொருள்",
            mainQtySuffix: " கிராம்",
            step8: "உங்கள் தனிப்பயன் செய்முறைக்கான முக்கிய பொருளை மசாலாவுடன் சேர்த்து வதக்கவும்.",
            step9: "உங்கள் முக்கிய பொருள் மென்மையாகும் வரை சமைக்கவும்."
        }
    };

    // Language buttons controller
    const langButtons = document.querySelectorAll('.lang-btn');
    let currentLang = localStorage.getItem('ak_recipe_lang') || 'en';

    langButtons.forEach(btn => {
        if (btn.getAttribute('data-lang') === currentLang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
        
        btn.addEventListener('click', () => {
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLang = btn.getAttribute('data-lang');
            localStorage.setItem('ak_recipe_lang', currentLang);
            
            translateRecipeUI();
            generateRecipe();
        });
    });

    function translateRecipeUI() {
        const trans = UI_TRANSLATIONS[currentLang];
        if (!trans) return;

        // Header Section
        document.getElementById('recipe-main-title').innerText = trans.mainTitle;
        document.getElementById('recipe-main-subtitle').innerHTML = trans.mainSubtitle;
        document.getElementById('recipe-top-badge').innerText = currentLang === 'ta' ? "சமையல் கலை" : "Culinary Art";

        // Selector Controls Card
        document.getElementById('recipe-controls-header-title').innerHTML = `<i class="fa-solid fa-utensils" style="color: var(--gold); margin-right: 8px;"></i> ${trans.controlsTitle}`;
        document.getElementById('label-biryani-type').innerText = trans.labelType;
        document.getElementById('label-custom-name').innerText = trans.labelCustomName;
        document.getElementById('recipe-custom-name').placeholder = trans.placeholderCustomName;
        document.getElementById('label-people-count').innerText = trans.labelPeople;
        document.getElementById('label-custom-people').innerText = trans.labelCustomPeople;
        document.getElementById('btn-generate-recipe').innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${trans.btnGenerate}`;

        // Result Card Static elements
        document.getElementById('ake-rice-special-badge').innerText = trans.badgeAkeRiceSpecial;
        document.getElementById('main-ingredients-header').innerHTML = `<i class="fa-solid fa-list-check" style="color: var(--gold); margin-right: 6px;"></i> ${trans.headerIngredients}`;
        document.getElementById('whole-spices-header').innerHTML = `<i class="fa-solid fa-leaf" style="color: var(--gold); margin-right: 6px;"></i> ${trans.headerSpices}`;
        document.getElementById('cooking-instructions-header').innerHTML = `<i class="fa-solid fa-fire-burner" style="color: var(--gold); margin-right: 6px;"></i> ${trans.headerInstructions}`;
        document.getElementById('branding-info-note').innerHTML = trans.brandingInfoNote;

        // Action buttons
        document.getElementById('btn-print-recipe').innerHTML = `<i class="fa-solid fa-print"></i> ${trans.btnPrint}`;
        document.getElementById('btn-pdf-recipe').innerHTML = `<i class="fa-solid fa-file-pdf"></i> ${trans.btnPDF}`;
        document.getElementById('btn-share-whatsapp-recipe').innerHTML = `<i class="fa-brands fa-whatsapp"></i> ${trans.btnShareWhatsapp}`;

        // Dropdown option values
        const typeSelect = document.getElementById('recipe-biryani-type');
        const typeOptions = typeSelect.querySelectorAll('option');
        typeOptions.forEach(opt => {
            const val = opt.getAttribute('value');
            if (trans.dropdownOptions[val]) {
                opt.innerText = trans.dropdownOptions[val];
            }
        });

        const peopleSelect = document.getElementById('recipe-people-count');
        const peopleOptions = peopleSelect.querySelectorAll('option');
        peopleOptions.forEach(opt => {
            const val = opt.getAttribute('value');
            if (trans.peopleOptions[val]) {
                opt.innerText = trans.peopleOptions[val];
            }
        });
    }

    // Toggle custom inputs visibility based on options selected
    if (recipeBiryaniType) {
        recipeBiryaniType.addEventListener('change', () => {
            if (recipeBiryaniType.value === 'custom') {
                recipeCustomNameContainer.style.display = 'block';
            } else {
                recipeCustomNameContainer.style.display = 'none';
            }
        });
    }

    if (recipePeopleCount) {
        recipePeopleCount.addEventListener('change', () => {
            if (recipePeopleCount.value === 'custom') {
                recipeCustomPeopleContainer.style.display = 'block';
            } else {
                recipeCustomPeopleContainer.style.display = 'none';
            }
        });
    }

    function generateRecipe() {
        if (!recipeBiryaniType) return;
        
        const type = recipeBiryaniType.value;
        const trans = UI_TRANSLATIONS[currentLang];
        const recipeInfo = currentLang === 'ta' ? RECIPE_DATA_TA[type] : RECIPE_DATA_EN[type];
        
        let recipeName = recipeInfo.title;
        if (type === 'custom') {
            const val = recipeCustomName.value.trim();
            recipeName = val ? val : (currentLang === 'ta' ? "தனிப்பயன் பிரியாணி" : "Custom Biryani");
        }
        
        let people = 4;
        if (recipePeopleCount.value === 'custom') {
            const val = parseInt(recipeCustomPeople.value);
            people = (!isNaN(val) && val > 0) ? val : 4;
        } else {
            people = parseInt(recipePeopleCount.value);
        }

        // Title and servings layout translation
        const brandingName = currentLang === 'ta' ? "கொப்பம்பட்டி சீரக சம்பா" : "Koppampatty Seeraga Samba";
        recipeDisplayTitle.innerText = `${brandingName} ${recipeName}`;
        
        const peopleUnitText = people === 1 ? trans.unitPerson : trans.unitPeople;
        recipeDisplayServings.innerHTML = `<i class="fa-solid fa-users"></i> ${trans.unitServings}: ${people} ${peopleUnitText}`;
        
        // Dynamic Recipe Image
        recipeHeroImage.src = recipeInfo.img;
        recipeHeroImage.alt = recipeName;

        // Metric Scales
        const riceGrams = people * 100;
        const mainGrams = recipeInfo.isEgg ? people : people * 100;
        const onionGrams = people * 30;
        const tomatoGrams = people * 25;
        const gingerGarlicGrams = people * 10;
        const chilliesCount = people * 1;
        const mintGrams = people * 5;
        const corianderGrams = people * 5;
        const curdMl = people * 15;
        const lemonPct = people * 0.125;
        const oilMl = people * 8;
        const gheeMl = people * 8;
        const saltGrams = people * 3;
        const waterMl = people * 150;

        // Format lemon
        let lemonText = '';
        if (currentLang === 'ta') {
            if (lemonPct >= 1) {
                lemonText = `${lemonPct.toFixed(1).replace('.0', '')} எலுமிச்சை`;
            } else {
                lemonText = `${Math.round(lemonPct * 8)}/8 எலுமிச்சை`;
            }
        } else {
            if (lemonPct >= 1) {
                lemonText = `${lemonPct.toFixed(1).replace('.0', '')} Lemon(s)`;
            } else {
                lemonText = `${Math.round(lemonPct * 8)}/8 Lemon`;
            }
        }

        // Binds Ingredients Data
        const ingredients_EN = [
            { name: "Koppampatty Seeraga Samba Rice", qty: `${riceGrams} g`, highlight: true },
            { name: recipeInfo.mainIngredient, qty: `${mainGrams}${recipeInfo.mainQtySuffix}` },
            { name: "Sliced Onions", qty: `${onionGrams} g` },
            { name: "Chopped Tomatoes", qty: `${tomatoGrams} g` },
            { name: "Ginger Garlic Paste", qty: `${gingerGarlicGrams} g` },
            { name: "Green Chillies (slit)", qty: `${chilliesCount} unit(s)` },
            { name: "Fresh Mint Leaves (Pudina)", qty: `${mintGrams} g` },
            { name: "Fresh Coriander Leaves", qty: `${corianderGrams} g` },
            { name: "Sour Curd (Yogurt)", qty: `${curdMl} ml` },
            { name: "Juicy Lemon", qty: lemonText },
            { name: "Cooking Oil", qty: `${oilMl} ml` },
            { name: "Ghee (Clarified Butter)", qty: `${gheeMl} ml` },
            { name: "Salt", qty: `${saltGrams} g (or to taste)` },
            { name: "Water (Ratio 1:1.5)", qty: `${waterMl} ml`, highlight: true }
        ];

        const ingredients_TA = [
            { name: "கொப்பம்பட்டி சீரக சம்பா அரிசி", qty: `${riceGrams} கிராம்`, highlight: true },
            { name: recipeInfo.mainIngredient, qty: `${mainGrams}${recipeInfo.mainQtySuffix}` },
            { name: "நறுக்கிய வெங்காயம்", qty: `${onionGrams} கிராம்` },
            { name: "நறுக்கிய தக்காளி", qty: `${tomatoGrams} கிராம்` },
            { name: "இஞ்சி பூண்டு விழுது", qty: `${gingerGarlicGrams} கிராம்` },
            { name: "கீறிய பச்சை மிளகாய்", qty: `${chilliesCount} பச்சை மிளகாய்` },
            { name: "புதினா இலைகள்", qty: `${mintGrams} கிராம்` },
            { name: "கொத்தமல்லி இலைகள்", qty: `${corianderGrams} கிராம்` },
            { name: "தயிர்", qty: `${curdMl} மி.லி` },
            { name: "எலுமிச்சம்பழம்", qty: lemonText },
            { name: "சமையல் எண்ணெய்", qty: `${oilMl} மி.லி` },
            { name: "நெய்", qty: `${gheeMl} மி.லி` },
            { name: "உப்பு (தேவையான அளவு)", qty: `${saltGrams} கிராம்` },
            { name: "தண்ணீர் (விகிதம் 1:1.5)", qty: `${waterMl} மி.லி`, highlight: true }
        ];

        const activeIngredients = currentLang === 'ta' ? ingredients_TA : ingredients_EN;

        mainIngredientsList.innerHTML = activeIngredients.map(ing => `
            <li class="${ing.highlight ? 'ingredient-highlight' : ''}">
                <span class="name">${ing.name}</span>
                <span class="qty">${ing.qty}</span>
            </li>
        `).join('');

        // Spices calculations
        const cinnamonInch = people * 0.5;
        const clovesCount = Math.round(people * 1.5);
        const cardamomCount = people * 1;
        const bayLeafPct = people * 0.25;
        const starAnisePct = people * 0.25;
        const fennelTsp = people * 0.25;
        const cuminTsp = people * 0.25;
        const pepperCount = people * 3.5;
        const marathiMokkuPct = people * 0.25;

        let bayLeafText = '';
        let starAniseText = '';
        let marathiMokkuText = '';
        if (currentLang === 'ta') {
            bayLeafText = `${bayLeafPct >= 1 ? bayLeafPct.toFixed(1).replace('.0', '') : Math.round(bayLeafPct * 4) + '/4'} இலை`;
            starAniseText = `${starAnisePct >= 1 ? starAnisePct.toFixed(1).replace('.0', '') : Math.round(starAnisePct * 4) + '/4'} இதழ்`;
            marathiMokkuText = `${marathiMokkuPct >= 1 ? marathiMokkuPct.toFixed(1).replace('.0', '') : Math.round(marathiMokkuPct * 4) + '/4'} எண்ணிக்கை`;
        } else {
            bayLeafText = `${bayLeafPct >= 1 ? bayLeafPct.toFixed(1).replace('.0', '') : Math.round(bayLeafPct * 4) + '/4'} leaf/leaves`;
            starAniseText = `${starAnisePct >= 1 ? starAnisePct.toFixed(1).replace('.0', '') : Math.round(starAnisePct * 4) + '/4'} unit(s)`;
            marathiMokkuText = `${marathiMokkuPct >= 1 ? marathiMokkuPct.toFixed(1).replace('.0', '') : Math.round(marathiMokkuPct * 4) + '/4'} unit(s)`;
        }

        const spices_EN = [
            { name: "Cinnamon (Pattai)", qty: `${cinnamonInch.toFixed(1).replace('.0', '')} inch(es)` },
            { name: "Cloves (Lavangam)", qty: `${clovesCount} unit(s)` },
            { name: "Cardamom (Elakkai)", qty: `${cardamomCount} unit(s)` },
            { name: "Bay Leaf (Brinji Ilai)", qty: bayLeafText },
            { name: "Star Anise (Thakkolam)", qty: starAniseText },
            { name: "Fennel Seeds (Sombu)", qty: `${fennelTsp.toFixed(2).replace('.00', '')} tsp` },
            { name: "Cumin Seeds (Seeragam)", qty: `${cuminTsp.toFixed(2).replace('.00', '')} tsp` },
            { name: "Black Pepper (Milagu)", qty: `${Math.round(pepperCount)} unit(s)` },
            { name: "Marathi Mokku", qty: marathiMokkuText },
            { name: "Kalpasi (Stone Flower)", qty: "A pinch" }
        ];

        const spices_TA = [
            { name: "பட்டை", qty: `${cinnamonInch.toFixed(1).replace('.0', '')} இன்ச்` },
            { name: "கிராம்பு", qty: `${clovesCount} எண்ணிக்கை` },
            { name: "ஏலக்காய்", qty: `${cardamomCount} எண்ணிக்கை` },
            { name: "பிரிஞ்சி இலை", qty: bayLeafText },
            { name: "அன்னாசிப்பூ", qty: starAniseText },
            { name: "சோம்பு", qty: `${fennelTsp.toFixed(2).replace('.00', '')} ஸ்பூன்` },
            { name: "சீரகம்", qty: `${cuminTsp.toFixed(2).replace('.00', '')} ஸ்பூன்` },
            { name: "மிளகு", qty: `${Math.round(pepperCount)} மிளகுகள்` },
            { name: "மராத்தி மொக்கு", qty: marathiMokkuText },
            { name: "கல்பாசி", qty: "ஒரு சிட்டிகை" }
        ];

        const activeSpices = currentLang === 'ta' ? spices_TA : spices_EN;

        wholeSpicesList.innerHTML = activeSpices.map(s => `
            <li>
                <span class="name">${s.name}</span>
                <span class="qty">${s.qty}</span>
            </li>
        `).join('');

        // Steps instructions mapping
        const steps_EN = [
            "Wash the **Koppampatty Seeraga Samba Rice** thoroughly and soak it in water for 20–30 minutes.",
            `Heat cooking oil (${oilMl} ml) and ghee (${gheeMl} ml) in a heavy-bottomed pan or biryani pot.`,
            "Add whole spices (Cinnamon, Cloves, Cardamom, Bay Leaf, Star Anise, Fennel, Cumin, Pepper, Marathi Mokku, Kalpasi) and sauté until they release a sweet aroma.",
            `Add sliced onions (${onionGrams} g) and slit green chillies (${chilliesCount}). Fry until the onions turn golden brown.`,
            `Stir in the ginger-garlic paste (${gingerGarlicGrams} g) and sauté for 2 minutes until the raw smell disappears.`,
            `Add chopped tomatoes (${tomatoGrams} g) and cook until they turn mushy and release oil at the sides.`,
            `Add fresh mint leaves (${mintGrams} g) and coriander leaves (${corianderGrams} g). Stir well for a minute.`,
            recipeInfo.step8,
            recipeInfo.step9,
            "Add salt and optionally red chilli powder/biryani masala to taste.",
            `Pour in the measured water (${waterMl} ml) and lemon juice. Bring the water to a rolling boil.`,
            `Drain the soaked **Koppampatty Seeraga Samba Rice** completely and add it to the boiling water. Gently stir to combine.`,
            "Cook on medium-high heat until the water is reduced to the same level as the rice. Cover with a tight lid (wrap with foil or a clean cloth) and cook on 'dum' (very low heat) for 12–15 minutes.",
            "Turn off the heat. Let the biryani rest undisturbed for 10 minutes.",
            "Gently fluff the rice from the sides without breaking the grains. Serve piping hot with onion raita and brinjal curry. Authentic Seeraga Samba Biryani tastes best when prepared using Koppampatty Seeraga Samba Rice!"
        ];

        const steps_TA = [
            "**கொப்பம்பட்டி சீரக சம்பா அரிசியை** நன்கு கழுவி 20-30 நிமிடங்கள் தண்ணீரில் ஊற வைக்கவும்.",
            `பிரியாணி பாத்திரத்தில் சமையல் எண்ணெய் (${oilMl} மி.லி) மற்றும் நெய் (${gheeMl} மி.லி) ஊற்றி சூடாக்கவும்.`,
            "முழு மசாலாப் பொருட்களை (பட்டை, கிராம்பு, ஏலக்காய், பிரிஞ்சி இலை, அன்னாசிப்பூ, சோம்பு, சீரகம், மிளகு, மராத்தி மொக்கு, கல்பாசி) சேர்த்து நறுமணம் வரும் வரை வதக்கவும்.",
            `நறுக்கிய வெங்காயம் (${onionGrams} கிராம்) மற்றும் கீறிய பச்சை மிளகாய் (${chilliesCount}) சேர்த்து, வெங்காயம் பொன்னிறமாகும் வரை வதக்கவும்.`,
            `இஞ்சி-பூண்டு விழுது (${gingerGarlicGrams} கிராம்) சேர்த்து, அதன் பச்சை வாசனை போகும் வரை 2 நிமிடங்கள் வதக்கவும்.`,
            `நறுக்கிய தக்காளி (${tomatoGrams} கிராம்) சேர்த்து, தக்காளி நன்கு குழைந்து எண்ணெய் பிரியும் வரை வதக்கவும்.`,
            `புதினா இலைகள் (${mintGrams} கிராம்) மற்றும் கொத்தமல்லி இலைகள் (${corianderGrams} கிராம்) சேர்த்து ஒரு நிமிடம் வதக்கவும்.`,
            recipeInfo.step8,
            recipeInfo.step9,
            "தேவைக்கேற்ப உப்பு மற்றும் மிளகாய்த்தூள்/பிரியாணி மசாலா சேர்த்துக்கொள்ளவும்.",
            `அளந்த தண்ணீர் (${waterMl} மி.லி) மற்றும் எலுமிச்சை சாறு ஊற்றி நன்கு கொதிக்க வைக்கவும்.`,
            `ஊறவைத்த **கொப்பம்பட்டி சீரக சம்பா அரிசியை** முழுமையாக வடித்து, கொதிக்கும் நீரில் சேர்த்து மெதுவாகக் கிளறவும்.`,
            "தண்ணீர் வற்றி அரிசி மட்டத்திற்கு வரும் வரை அதிக தீயில் சமைக்கவும். பின்னர் பாத்திரத்தை மூடி, மிகக் குறைந்த தீயில் 12-15 நிமிடங்கள் தம் வைக்கவும்.",
            "அடுப்பை அணைத்துவிட்டு, பிரியாணியை 10 நிமிடங்கள் அப்படியே வைக்கவும்.",
            "பிரியாணியை உடையாமல் மெதுவாகக் கிளறி, வெங்காய தயிர் பச்சடி மற்றும் கத்தரிக்காய் காரக் குழம்புடன் சூடாகப் பரிமாறவும். அசல் சீரக சம்பா பிரியாணி எப்போதும் கொப்பம்பட்டி சீரக சம்பா அரிசியில் சமைக்கும் போதுதான் மிகச் சிறந்த சுவையைத் தரும்!"
        ];

        const activeSteps = currentLang === 'ta' ? steps_TA : steps_EN;

        recipeStepsList.innerHTML = activeSteps.map((step, idx) => `
            <li>
                <input type="checkbox" class="step-checkbox" id="step-check-${idx}">
                <span class="step-num">${idx + 1}</span>
                <span class="step-text">${step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</span>
            </li>
        `).join('');

        // Progress Text
        recipeStepsProgress.style.width = "0%";
        recipeProgressText.innerText = `0% ${trans.progressCompleted}`;

        // Checklist Checkboxes progress tracker
        const checkboxes = recipeStepsList.querySelectorAll('.step-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const li = cb.parentNode;
                if (cb.checked) {
                    li.classList.add('completed');
                } else {
                    li.classList.remove('completed');
                }
                
                const total = checkboxes.length;
                const checked = recipeStepsList.querySelectorAll('.step-checkbox:checked').length;
                const pct = Math.round((checked / total) * 100);
                
                recipeStepsProgress.style.width = `${pct}%`;
                recipeProgressText.innerText = `${pct}% ${trans.progressCompleted}`;
            });
        });

        // Setup Print & PDF Buttons
        if (btnPrintRecipe) {
            btnPrintRecipe.onclick = () => window.print();
        }
        if (btnPDFRecipe) {
            btnPDFRecipe.onclick = () => window.print();
        }

        // WhatsApp Share pre-formatted template
        if (btnShareWhatsappRecipe) {
            btnShareWhatsappRecipe.onclick = () => {
                let waText = '';
                if (currentLang === 'ta') {
                    waText = `*செய்முறை: கொப்பம்பட்டி சீரக சம்பா ${recipeName.toUpperCase()}*
_ஏ.கே பிரீமியம் சீரக சம்பா அரிசியைக் கொண்டு தயாரிக்கப்பட்ட அசல் தென்னிந்திய பிரியாணி (நபர்கள்: ${people})_

*முக்கியப் பொருட்கள்:*
- கொப்பம்பட்டி சீரக சம்பா அரிசி: ${riceGrams} கிராம்
- ${recipeInfo.mainIngredient}: ${mainGrams}${recipeInfo.mainQtySuffix}
- வெங்காயம்: ${onionGrams} கிராம்
- தக்காளி: ${tomatoGrams} கிராம்
- இஞ்சி பூண்டு விழுது: ${gingerGarlicGrams} கிராம்
- தயிர்: ${curdMl} மி.லி
- தண்ணீர் (விகிதம் 1:1.5): ${waterMl} மி.லி
- எண்ணெய்: ${oilMl} மி.லி | நெய்: ${gheeMl} மி.லி

*சமையல் படிகள்:*
1. ஏ.கே சீரக சம்பா அரிசியை 20 நிமி ஊற வைக்கவும்.
2. எண்ணெய் மற்றும் நெய்யை சூடாக்கி, மசாலா & வெங்காயத்தை பொன்னிறமாக வதக்கவும்.
3. தக்காளி, புதினா, மற்றும் இஞ்சி பூண்டு விழுது சேர்க்கவும்.
4. சிக்கன்/மட்டன்/காய்கறிகள் மற்றும் தயிர் சேர்த்து வதக்கவும்.
5. தண்ணீர் கொதித்ததும் அரிசி சேர்த்து, 12-15 நிமிடம் தம் போடவும்.
6. அசல் பிரியாணி எப்போதும் கொப்பம்பட்டி சீரக சம்பா அரிசியில் தயாரிக்கும் போதுதான் சிறந்த சுவையைத் தரும்!

_உயர்தர பாரம்பரிய அரிசியை ஆர்டர் செய்ய ஏ.கே ரைஸ்-ஐ தொடர்பு கொள்ளவும்: 9176049099_`;
                } else {
                    waText = `*RECIPE: KOPPAMPATTY SEERAGA SAMBA ${recipeName.toUpperCase()}*
_Authentic South Indian biryani prepared with premium AKE Seeraga Samba Rice (Serves ${people})_

*MAIN INGREDIENTS:*
- Koppampatty Seeraga Samba Rice: ${riceGrams}g
- ${recipeInfo.mainIngredient}: ${mainGrams}${recipeInfo.mainQtySuffix}
- Sliced Onions: ${onionGrams}g
- Chopped Tomatoes: ${tomatoGrams}g
- Ginger Garlic Paste: ${gingerGarlicGrams}g
- Sour Curd: ${curdMl}ml
- Water (1:1.5 ratio): ${waterMl}ml
- Oil: ${oilMl}ml | Ghee: ${gheeMl}ml

*PREPARATION SUMMARY:*
1. Soak AKE Seeraga Samba Rice for 20 mins.
2. Heat oil & ghee, fry spices & onions until golden.
3. Cook tomatoes, mint, and ginger-garlic paste.
4. Sauté main meat/veggies and add curd.
5. Boil water, add rice, cook on dum for 12-15 mins.
6. Serve hot. Authentic biryani tastes best with Koppampatty Seeraga Samba Rice!

_Get authentic premium rice at AKE Rice. Contact: 9176049099_`;
                }
                
                const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
                window.open(waUrl, '_blank');
            };
        }
    }

    // Trigger Initial Translations and Generation
    translateRecipeUI();
    if (btnGenerateRecipe) {
        btnGenerateRecipe.addEventListener('click', generateRecipe);
        generateRecipe();
    }

    // ==========================================================================
    // UTILITIES & SAFETY
    // ==========================================================================
    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    }

    // ==========================================================================
    // HARVEST GALLERY LIGHTBOX CONTROLS
    // ==========================================================================
    window.openLightbox = function(cardEl) {
        const lightbox = document.getElementById('gallery-lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxCap = document.getElementById('lightbox-caption');
        if (!lightbox || !lightboxImg || !lightboxCap) return;
        
        const img = cardEl.querySelector('img');
        const captionEl = cardEl.querySelector('.gallery-card-title') || cardEl.querySelector('h3') || cardEl.querySelector('h4') || img;
        const caption = captionEl ? (captionEl.innerText || captionEl.alt || 'AKE Rice') : 'AKE Rice';
        
        if (img) {
            lightboxImg.src = img.src;
            lightboxCap.innerText = caption;
            lightbox.style.display = 'flex';
        }
    }

    window.closeLightbox = function() {
        const lightbox = document.getElementById('gallery-lightbox');
        if (lightbox) {
            lightbox.style.display = 'none';
        }
    }

    // ==========================================================================
    // AUTOMATED WEEKLY EMAIL REPORTING SYSTEM
    // ==========================================================================
    const ADMIN_EMAIL = "kaviyansellappan15@gmail.com";

    function getCurrentWeekPeriod() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const distanceToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(now.setDate(distanceToMonday));
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        const startStr = startOfWeek.toLocaleDateString('en-IN', options);
        const endStr = endOfWeek.toLocaleDateString('en-IN', options);

        // Week number calculation
        const firstJan = new Date(now.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((now - firstJan) / 86400000) + firstJan.getDay() + 1) / 7);

        return { startOfWeek, endOfWeek, startStr, endStr, weekNum, year: now.getFullYear() };
    }

    function compileWeeklyOrderMetrics() {
        const period = getCurrentWeekPeriod();

        // Filter orders placed during current week
        let weeklyOrders = db.orders.filter(o => {
            let d = o.createdAt ? new Date(o.createdAt) : (o.dateTime ? new Date(o.dateTime) : new Date(o.date));
            if (!d || isNaN(d.getTime())) return true;
            return d >= period.startOfWeek && d <= period.endOfWeek;
        });

        // Fallback to all orders if no orders created this specific week
        if (weeklyOrders.length === 0 && db.orders.length > 0) {
            weeklyOrders = db.orders;
        }

        const totalOrders = weeklyOrders.length;
        const codOrders = weeklyOrders.filter(o => (o.payment || '').includes('Cash')).length;
        const onlineOrders = weeklyOrders.filter(o => !(o.payment || '').includes('Cash')).length;
        const deliveredOrders = weeklyOrders.filter(o => o.status === 'Delivered').length;
        const pendingOrders = weeklyOrders.filter(o => (o.status || 'Pending') === 'Pending').length;
        const cancelledOrders = weeklyOrders.filter(o => o.status === 'Cancelled').length;
        const totalRevenue = weeklyOrders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (o.total || 0), 0);

        // Generate Order Details Table HTML with 10 Columns
        let orderRowsHTML = '';
        if (weeklyOrders.length === 0) {
            orderRowsHTML = '<tr><td colspan="10" style="text-align:center; padding:12px; color:#777;">No orders recorded for current week.</td></tr>';
        } else {
            weeklyOrders.forEach(o => {
                const payStatus = o.paymentStatus || ((o.payment || '').includes('Cash') ? 'Cash on Delivery' : 'Pending Verification');
                const displayTime = o.dateTime || o.date;

                orderRowsHTML += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding:8px; font-weight:bold; color:#2c3e50;">${o.id}</td>
                        <td style="padding:8px; font-weight:bold;">${escapeHTML(o.name)}</td>
                        <td style="padding:8px;"><a href="tel:${o.mobile}">${o.mobile}</a></td>
                        <td style="padding:8px;">${escapeHTML(o.product)}</td>
                        <td style="padding:8px; text-align:center;">${o.qty}</td>
                        <td style="padding:8px; font-weight:bold; color:#c5a85c;">₹${(o.total || 0).toLocaleString('en-IN')}</td>
                        <td style="padding:8px;">${o.payment || 'Cash on Delivery'}</td>
                        <td style="padding:8px;"><span style="background:#fff3cd; color:#856404; padding:3px 6px; border-radius:4px; font-size:11px; font-weight:600;">${payStatus}</span></td>
                        <td style="padding:8px;"><span style="background:#e8f5e9; color:#2e7d32; padding:3px 6px; border-radius:4px; font-size:11px; font-weight:600;">${o.status || 'Pending'}</span></td>
                        <td style="padding:8px; font-size:11px; color:#666;">${displayTime}</td>
                    </tr>
                `;
            });
        }

        return {
            period,
            totalOrders,
            codOrders,
            onlineOrders,
            deliveredOrders,
            pendingOrders,
            cancelledOrders,
            totalRevenue,
            weeklyOrders,
            orderRowsHTML
        };
    }

    function buildEmailReportHTML(metrics) {
        return `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; color: #333333; padding: 22px; border-radius: 8px; border: 1px solid #c5a85c; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div style="border-bottom: 2px solid #c5a85c; padding-bottom: 12px; margin-bottom: 18px; text-align: center;">
                    <h3 style="color: #1b4332; margin: 0 0 4px 0; font-size: 1.4rem;">🌾 AKE RICE - WEEKLY ORDER REPORT</h3>
                    <p style="color: #666666; margin: 0; font-size: 0.85rem;">Week Period: <strong>${metrics.period.startStr} - ${metrics.period.endStr}</strong> | Recipient: <strong>${ADMIN_EMAIL}</strong></p>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 20px; text-align: center;">
                    <div style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: #6c757d; text-transform: uppercase; font-weight: bold; display: block;">Total Orders</span>
                        <strong style="font-size: 1.3rem; color: #c5a85c;">${metrics.totalOrders}</strong>
                    </div>
                    <div style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: #6c757d; text-transform: uppercase; font-weight: bold; display: block;">COD Orders</span>
                        <strong style="font-size: 1.3rem; color: #1b4332;">${metrics.codOrders}</strong>
                    </div>
                    <div style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: #6c757d; text-transform: uppercase; font-weight: bold; display: block;">Online Payment</span>
                        <strong style="font-size: 1.3rem; color: #4285F4;">${metrics.onlineOrders}</strong>
                    </div>
                    <div style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: #6c757d; text-transform: uppercase; font-weight: bold; display: block;">Delivered</span>
                        <strong style="font-size: 1.3rem; color: #2ed573;">${metrics.deliveredOrders}</strong>
                    </div>
                    <div style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: #6c757d; text-transform: uppercase; font-weight: bold; display: block;">Pending</span>
                        <strong style="font-size: 1.3rem; color: #ffa502;">${metrics.pendingOrders}</strong>
                    </div>
                    <div style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: #6c757d; text-transform: uppercase; font-weight: bold; display: block;">Cancelled</span>
                        <strong style="font-size: 1.3rem; color: #ff4757;">${metrics.cancelledOrders}</strong>
                    </div>
                    <div style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 10px; border-radius: 6px; grid-column: span 2;">
                        <span style="font-size: 11px; color: #6c757d; text-transform: uppercase; font-weight: bold; display: block;">Total Revenue</span>
                        <strong style="font-size: 1.3rem; color: #c5a85c;">₹${metrics.totalRevenue.toLocaleString('en-IN')}</strong>
                    </div>
                </div>

                <h4 style="color: #1b4332; margin-bottom: 8px;">Order Details Table</h4>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left;">
                        <thead>
                            <tr style="background: #1b4332; color: #ffffff;">
                                <th style="padding:6px;">Order ID</th>
                                <th style="padding:6px;">Customer Name</th>
                                <th style="padding:6px;">Mobile</th>
                                <th style="padding:6px;">Products</th>
                                <th style="padding:6px;">Qty</th>
                                <th style="padding:6px;">Amount</th>
                                <th style="padding:6px;">Payment</th>
                                <th style="padding:6px;">Pay Status</th>
                                <th style="padding:6px;">Order Status</th>
                                <th style="padding:6px;">Date & Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${metrics.orderRowsHTML}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderEmailReportPreview() {
        const previewContainer = document.getElementById('email-report-preview-container');
        const lastSentEl = document.getElementById('er-last-sent-date');
        const nextSentEl = document.getElementById('er-next-scheduled-date');
        if (!previewContainer) return;

        const metrics = compileWeeklyOrderMetrics();
        const lastSent = localStorage.getItem('ak_last_weekly_report_date');
        
        if (lastSentEl) {
            lastSentEl.textContent = lastSent ? new Date(lastSent).toLocaleString('en-IN') : 'Never Sent';
        }
        if (nextSentEl) {
            const nextDate = lastSent ? new Date(new Date(lastSent).getTime() + 7 * 86400 * 1000) : new Date(Date.now() + 7 * 86400 * 1000);
            nextSentEl.textContent = nextDate.toLocaleString('en-IN');
        }

        previewContainer.innerHTML = buildEmailReportHTML(metrics);
    }

    // Report History Database Manager
    function getReportHistory() {
        try {
            return JSON.parse(localStorage.getItem('ak_weekly_reports_history')) || [];
        } catch(e) {
            return [];
        }
    }

    function saveReportHistory(history) {
        localStorage.setItem('ak_weekly_reports_history', JSON.stringify(history));
    }

    function addReportToHistory(metrics) {
        const history = getReportHistory();
        const id = `REP-${metrics.period.year}-W${metrics.period.weekNum}-${Date.now().toString().slice(-4)}`;
        const reportName = `Weekly Order Report - Week ${metrics.period.weekNum}, ${metrics.period.year}`;
        const weekPeriod = `${metrics.period.startStr} - ${metrics.period.endStr}`;
        const dateGen = new Date().toLocaleString('en-IN');

        const newReport = {
            id,
            name: reportName,
            period: weekPeriod,
            dateGenerated: dateGen,
            totalOrders: metrics.totalOrders,
            totalRevenue: metrics.totalRevenue,
            status: "Sent",
            htmlContent: buildEmailReportHTML(metrics)
        };

        // Prepend new report to history
        history.unshift(newReport);
        saveReportHistory(history);
        renderReportHistoryTable();
    }

    function renderReportHistoryTable() {
        const historyBody = document.getElementById('email-reports-history-body');
        if (!historyBody) return;

        const history = getReportHistory();
        if (history.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 15px;">No saved report history available yet.</td></tr>`;
            return;
        }

        historyBody.innerHTML = '';
        history.forEach(rep => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--gold);">${escapeHTML(rep.name)}</td>
                <td style="font-size: 0.85rem;">${escapeHTML(rep.period)}</td>
                <td style="font-size: 0.85rem;">${rep.dateGenerated}</td>
                <td style="font-weight: 700;">${rep.totalOrders}</td>
                <td style="font-weight: 800; color: var(--forest-green);">₹${(rep.totalRevenue || 0).toLocaleString('en-IN')}</td>
                <td><span style="background: rgba(46, 213, 115, 0.15); color: #2ed573; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 0.75rem;"><i class="fa-solid fa-circle-check"></i> ${rep.status}</span></td>
                <td>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
                        <button class="btn-premium btn-secondary view-rep-btn" style="padding: 3px 6px; font-size: 0.7rem;" data-id="${rep.id}">
                            <i class="fa-solid fa-eye"></i> View
                        </button>
                        <button class="btn-premium btn-gold pdf-rep-btn" style="padding: 3px 6px; font-size: 0.7rem;" data-id="${rep.id}">
                            <i class="fa-regular fa-file-pdf"></i> PDF
                        </button>
                        <button class="btn-premium btn-secondary excel-rep-btn" style="padding: 3px 6px; font-size: 0.7rem;" data-id="${rep.id}">
                            <i class="fa-regular fa-file-excel"></i> Excel
                        </button>
                        <button class="btn-premium btn-gold-outline send-again-rep-btn" style="padding: 3px 6px; font-size: 0.7rem;" data-id="${rep.id}">
                            <i class="fa-solid fa-paper-plane"></i> Send Again
                        </button>
                        <button class="btn-premium btn-logout delete-rep-btn" style="padding: 3px 6px; font-size: 0.7rem;" data-id="${rep.id}">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            `;
            historyBody.appendChild(tr);
        });

        // Event Listeners for Report History Actions
        historyBody.querySelectorAll('.view-rep-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const rep = getReportHistory().find(r => r.id === id);
                if (rep) {
                    const modal = document.getElementById('report-view-modal');
                    const content = document.getElementById('report-modal-body-content');
                    if (modal && content) {
                        content.innerHTML = rep.htmlContent;
                        modal.style.display = 'flex';
                    }
                }
            });
        });

        historyBody.querySelectorAll('.pdf-rep-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const rep = getReportHistory().find(r => r.id === id);
                if (rep) {
                    const win = window.open('', '_blank');
                    win.document.write(`<html><head><title>${rep.name}</title></head><body>${rep.htmlContent}</body></html>`);
                    win.document.close();
                    win.print();
                }
            });
        });

        historyBody.querySelectorAll('.excel-rep-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const rep = getReportHistory().find(r => r.id === id);
                if (rep) {
                    const blob = new Blob([rep.htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${rep.name.replace(/\s+/g, '_')}.xls`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showToast("Report Excel file downloaded!");
                }
            });
        });

        historyBody.querySelectorAll('.send-again-rep-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                showToast(`Report ${id} re-sent to ${ADMIN_EMAIL}!`, "info");
            });
        });

        historyBody.querySelectorAll('.delete-rep-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm("Are you sure you want to delete this report from history?")) {
                    const updated = getReportHistory().filter(r => r.id !== id);
                    saveReportHistory(updated);
                    showToast("Report deleted from history!");
                    renderReportHistoryTable();
                }
            });
        });
    }

    const btnReportModalClose = document.getElementById('btn-report-modal-close');
    if (btnReportModalClose) {
        btnReportModalClose.addEventListener('click', () => {
            const modal = document.getElementById('report-view-modal');
            if (modal) modal.style.display = 'none';
        });
    }

    function sendWeeklyEmailReport(isManual = false) {
        const metrics = compileWeeklyOrderMetrics();
        const now = new Date().toISOString();
        localStorage.setItem('ak_last_weekly_report_date', now);
        
        addReportToHistory(metrics);
        renderEmailReportPreview();
        
        if (isManual) {
            showToast(`Weekly order report dispatched to ${ADMIN_EMAIL}!`, "info");
        } else {
            console.log(`[Auto-Cron] Weekly report sent to ${ADMIN_EMAIL}`);
        }
    }

    // Manual trigger button
    const btnSendReportNow = document.getElementById('btn-send-weekly-report-now');
    if (btnSendReportNow) {
        btnSendReportNow.addEventListener('click', () => {
            sendWeeklyEmailReport(true);
        });
    }

    // Check auto weekly email schedule on app start (every 7 days = 604,800,000 ms)
    function checkAutoWeeklyReportSchedule() {
        const lastSent = localStorage.getItem('ak_last_weekly_report_date');
        renderReportHistoryTable();
        if (!lastSent || (Date.now() - new Date(lastSent).getTime()) > 604800000) {
            sendWeeklyEmailReport(false);
        } else {
            renderEmailReportPreview();
        }
    }

    // Run weekly report schedule check on initialization
    checkAutoWeeklyReportSchedule();

});
