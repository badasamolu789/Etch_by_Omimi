/* ============================================
   ADMIN.JS - ETCH Admin Dashboard Scripts
   ============================================ */

(function () {
    'use strict';

    const ADMIN_SESSION_KEY = 'etch_admin_session';
    const ADMIN_EMAIL = 'etchadmin@gmail.com';

    function readAdminSession() {
        const rawSession = sessionStorage.getItem(ADMIN_SESSION_KEY) || localStorage.getItem(ADMIN_SESSION_KEY);
        if (!rawSession) return null;

        try {
            const session = JSON.parse(rawSession);
            if (session?.email === ADMIN_EMAIL && session?.signedInAt) {
                return session;
            }
        } catch (error) {
            console.warn('Invalid admin session data was ignored.', error);
        }

        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem(ADMIN_SESSION_KEY);
        return null;
    }

    function clearAdminSession() {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem(ADMIN_SESSION_KEY);
        sessionStorage.removeItem('etch_admin_verified');
        sessionStorage.removeItem('etch_admin_remember');
    }

    // ============================================
    // 0. LOAD SHARED ADMIN COMPONENTS
    // ============================================
    function getAdminSidebarHTML() {
        return `
<aside class="admin-sidebar" id="adminSidebar">
    <div class="admin-sidebar-brand">
        <img src="/assets/logo.png" alt="ETCH logo" />
        <div>
            <span>ETCH</span>
            <small>Admin Hub</small>
        </div>
    </div>

    <div class="admin-sidebar-profile">
        <div class="avatar">SA<span class="status-dot"></span></div>
        <div class="info">
            <strong>Super Admin</strong>
            <span>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Platform Admin
            </span>
        </div>
    </div>

    <nav class="admin-sidebar-nav" aria-label="Admin navigation">
        <div class="nav-label">Main</div>
        <a href="/admin/index.html">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
            Dashboard <span class="badge primary">Live</span>
        </a>
        <a href="/admin/media_library.html">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Media Library
        </a>
        <a href="/admin/newsletter.html">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v9A2.5 2.5 0 0117.5 19h-11A2.5 2.5 0 014 16.5v-9zm0 0l8 6 8-6" /></svg>
            Newsletter <span class="badge primary">Live</span>
        </a>
        <a href="/admin/admin_masterclass.html">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Masterclass
        </a>
        <a href="/admin/category.html">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12v-2a5 5 0 00-5-5H8a5 5 0 00-5 5v2" /><circle cx="12" cy="16" r="5" /><path d="M12 11v5M9 13l3 3 3-3" /></svg>
            Categories
        </a>
        <a href="/admin/author.html">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Authors
        </a>

        <div class="nav-divider"></div>
        <div class="nav-label">Masterclass</div>
        <a href="/admin/admin_masterclass.html">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            Dashboard
        </a>
        <a href="/admin/admin_masterclass.html">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6M9 16h6" /></svg>
            Articles
        </a>
        <a href="/admin/category.html">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            Categories
        </a>
        <a href="/admin/author.html">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Authors
        </a>
        <a href="/admin/media_library.html">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Media
        </a>

        <div class="nav-divider"></div>
        <div class="nav-label">System</div>
        <a href="/admin/create_article.html">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-7.072 0m0 0a5 5 0 010-7.072m0 0l2.829 2.829m-2.829-2.829L3 3" /></svg>
            Create Article
        </a>
        <a href="/admin/create_category.html">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
            Create Category
        </a>
        <a href="/admin/create_author.html">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Create Author
        </a>
        <div class="nav-divider"></div>
        <a href="/admin/auth/signin.html" class="sign-out">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Sign Out
        </a>
    </nav>
</aside>
<div class="admin-sidebar-overlay" id="adminSidebarOverlay"></div>`;
    }

    function getAdminTopbarHTML() {
        return `
<header class="admin-topbar">
    <div class="admin-topbar-left">
        <button class="mobile-menu-btn" data-sidebar-toggle aria-label="Toggle sidebar"><span></span><span></span><span></span></button>
        <div class="greeting">
            <p class="eyebrow"><span class="dot"></span>Admin Panel</p>
            <h1 id="pageTitle">Dashboard</h1>
        </div>
    </div>
    <div class="admin-topbar-right">
        <div class="search-input">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search admin..." />
            <span class="shortcut">⌘K</span>
        </div>
        <button id="themeToggle" class="p-2 rounded-xl text-slate/60 dark:text-gray-500 hover:bg-white/60 dark:hover:bg-white/5 transition-all duration-300" aria-label="Toggle theme">
            <svg class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <svg class="w-5 h-5 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        </button>
        <button class="action-btn notif-btn" aria-label="Notifications">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            <span class="count">8</span>
        </button>
        <button class="user-btn" aria-label="User menu">
            <div class="avatar">SA</div>
            <div class="info"><strong>Super Admin</strong><span><span class="dot"></span>Platform Admin</span></div>
            <svg class="chevron w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
    </div>
</header>`;
    }

    async function loadAdminComponents() {
        const componentPlaceholders = document.querySelectorAll('[data-component="include"]');

        if (!componentPlaceholders.length) {
            return;
        }

        componentPlaceholders.forEach((placeholder) => {
            const src = placeholder.getAttribute('data-src');
            if (src?.includes('sidebar')) {
                placeholder.outerHTML = getAdminSidebarHTML();
            } else if (src?.includes('topbar')) {
                placeholder.outerHTML = getAdminTopbarHTML();
            }
        });

        // After loading components, set active nav link
        setTimeout(() => {
            setActiveNavLink();
        }, 0);
    }

    // ============================================
    // 1. SIDEBAR TOGGLE
    // ============================================
    function initializeSidebarInteractions() {
        const sidebarToggle = document.querySelector('[data-sidebar-toggle]');
        const sidebar = document.querySelector('.admin-sidebar');
        const overlay = document.querySelector('.admin-sidebar-overlay');

        function toggleSidebar() {
            if (!sidebar) return;
            sidebar.classList.toggle('open');
            if (overlay) {
                overlay.classList.toggle('open');
            }
            document.body.classList.toggle('sidebar-open');
        }

        if (sidebarToggle) {
            sidebarToggle.removeEventListener('click', toggleSidebar);
            sidebarToggle.addEventListener('click', toggleSidebar);
        }

        if (overlay) {
            overlay.removeEventListener('click', toggleSidebar);
            overlay.addEventListener('click', toggleSidebar);
        }

        document.removeEventListener('keydown', handleEscapeToggle);
        document.addEventListener('keydown', handleEscapeToggle);

        function handleEscapeToggle(e) {
            if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
                toggleSidebar();
            }
        }
    }

    // ============================================
    // 2. ACTIVE NAV LINK
    // ============================================
    function setActiveNavLink() {
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll('.admin-sidebar-nav a:not(.sign-out)');

        links.forEach(function (link) {
            const href = link.getAttribute('href');
            // Remove active class first
            link.classList.remove('active');

            // Add active class if path matches
            if (href && (currentPath === href || currentPath.includes(href.replace('.html', '')))) {
                link.classList.add('active');
            }
        });
    }

    // Add click handler to ensure active state updates
    function addActiveNavClickHandlers() {
        const links = document.querySelectorAll('.admin-sidebar-nav a:not(.sign-out)');

        links.forEach(function (link) {
            link.addEventListener('click', function () {
                // Remove active from all links
                links.forEach(l => l.classList.remove('active'));
                // Add active to clicked link
                this.classList.add('active');
            });
        });
    }

    function protectAdminRoutes() {
        if (window.location.pathname.includes('/admin/auth/signin.html')) {
            return;
        }

        if (!readAdminSession()) {
            clearAdminSession();
            window.location.href = '/admin/auth/signin.html';
        }
    }

    function bindSignOut() {
        const signOutLink = document.querySelector('.admin-sidebar-nav .sign-out');
        if (!signOutLink) return;

        signOutLink.addEventListener('click', async function (event) {
            event.preventDefault();
            clearAdminSession();
            window.location.href = '/admin/auth/signin.html';
        });
    }

    function initializeComponentControls() {
        document.querySelectorAll('[data-dropdown-toggle]').forEach(function (toggle) {
            if (toggle.dataset.adminBound === 'true') return;
            toggle.dataset.adminBound = 'true';

            toggle.addEventListener('click', function (e) {
                e.stopPropagation();
                const targetId = this.dataset.dropdownToggle;
                const target = document.getElementById(targetId);

                if (target) {
                    target.classList.toggle('open');
                }
            });
        });

        const notifBtn = document.querySelector('.notif-btn');
        const notifDropdown = document.querySelector('.notif-dropdown');

        if (notifBtn && notifDropdown && notifBtn.dataset.adminBound !== 'true') {
            notifBtn.dataset.adminBound = 'true';
            notifBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                notifDropdown.classList.toggle('open');
            });
        }
    }

    function updatePageChrome() {
        const title = document.getElementById('pageTitle');
        if (title) {
            title.textContent = document.body.dataset.pageTitle || document.title.split('|')[0].trim() || 'Dashboard';
        }

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }

        document.dispatchEvent(new CustomEvent('admin:components-ready'));
    }

    // ============================================
    // 4. TOPBAR: Show signed-in admin name & session badge
    // ============================================
    async function updateTopbarUserInfo() {
        const topbar = document.querySelector('.admin-topbar-right');
        if (!topbar) return;

        const userBtn = topbar.querySelector('.user-btn');
        const avatar = userBtn?.querySelector('.avatar');
        const infoName = userBtn?.querySelector('.info strong');
        const session = readAdminSession();
        const displayName = session?.name || 'Super Admin';

        infoName && (infoName.textContent = displayName);
        avatar && (avatar.textContent = initialsFrom(displayName));
        attachSessionBadge(userBtn, !!session);
    }

    function initialsFrom(name) {
        if (!name) return 'NA';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function attachSessionBadge(userBtn, valid) {
        if (!userBtn) return;
        let badge = userBtn.querySelector('.session-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'session-badge';
            badge.style.marginLeft = '10px';
            badge.style.padding = '4px 8px';
            badge.style.borderRadius = '999px';
            badge.style.fontSize = '12px';
            badge.style.fontWeight = '600';
            userBtn.appendChild(badge);
        }
        badge.textContent = valid ? 'Session OK' : 'No Session';
        badge.style.background = valid ? '#e6f4ea' : '#fee2e2';
        badge.style.color = valid ? '#166534' : '#7f1d1d';
    }

    async function initAdminApp() {
        // Protect routes first. Admin pages trust the session marker created by
        // the admin sign-in page, not Supabase's background refresh state.
        protectAdminRoutes();

        // Load UI components after auth cleared
        await loadAdminComponents();
        initializeSidebarInteractions();
        initializeComponentControls();
        setActiveNavLink();
        addActiveNavClickHandlers();
        bindSignOut();

        // Update topbar after the initial guard has accepted the page.
        await updateTopbarUserInfo();
        updatePageChrome();
    }

    initAdminApp();

    // ============================================
    // 3. DROPDOWN MENUS
    // ============================================
    document.querySelectorAll('[data-dropdown-toggle]').forEach(function (toggle) {
        toggle.addEventListener('click', function (e) {
            e.stopPropagation();
            const targetId = this.dataset.dropdownToggle;
            const target = document.getElementById(targetId);

            if (target) {
                target.classList.toggle('open');
            }
        });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', function () {
        document.querySelectorAll('.dropdown.open').forEach(function (dropdown) {
            dropdown.classList.remove('open');
        });
    });

    // ============================================
    // 4. STAT COUNTER ANIMATION
    // ============================================
    function animateAdminStats() {
        const statCards = document.querySelectorAll('.admin-stat-card .value');

        statCards.forEach(function (card) {
            const text = card.textContent;
            const numeric = parseFloat(text.replace(/[^0-9.]/g, ''));

            if (isNaN(numeric)) return;

            const observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        const duration = 1000;
                        const start = 0;
                        const end = numeric;
                        const startTime = performance.now();

                        function updateCounter(currentTime) {
                            const elapsed = currentTime - startTime;
                            const progress = Math.min(elapsed / duration, 1);
                            const current = start + (end - start) * progress;

                            if (text.includes('$')) {
                                card.textContent = '$' + Math.floor(current).toLocaleString();
                            } else if (text.includes('%')) {
                                card.textContent = Math.floor(current) + '%';
                            } else if (Number.isInteger(numeric)) {
                                card.textContent = Math.floor(current).toLocaleString();
                            } else {
                                card.textContent = current.toFixed(1);
                            }

                            if (progress < 1) {
                                requestAnimationFrame(updateCounter);
                            } else {
                                card.textContent = text;
                            }
                        }

                        requestAnimationFrame(updateCounter);
                        observer.disconnect();
                    }
                });
            });

            observer.observe(card);
        });
    }

    animateAdminStats();

    // ============================================
    // 5. TABLE SEARCH
    // ============================================
    document.querySelectorAll('[data-table-search]').forEach(function (input) {
        input.addEventListener('input', function () {
            const query = this.value.toLowerCase();
            const tableId = this.dataset.tableSearch;
            const table = document.getElementById(tableId);

            if (!table) return;

            const rows = table.querySelectorAll('tbody tr');

            rows.forEach(function (row) {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    });

    // ============================================
    // 6. NOTIFICATION DROPDOWN
    // ============================================
    const notifBtn = document.querySelector('.notif-btn');
    const notifDropdown = document.querySelector('.notif-dropdown');

    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            notifDropdown.classList.toggle('open');
        });

        // Close notification dropdown on outside click
        document.addEventListener('click', function (e) {
            if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
                notifDropdown.classList.remove('open');
            }
        });
    }

    // ============================================
    // 7. CHART INITIALIZATION
    // ============================================
    function initAdminChart() {
        const chartContainer = document.querySelector('[data-admin-chart]');
        if (!chartContainer) return;
        console.log('Admin chart container found:', chartContainer);
    }

    initAdminChart();

    // ============================================
    // 8. STATUS TOGGLE
    // ============================================
    document.querySelectorAll('[data-status-toggle]').forEach(function (toggle) {
        toggle.addEventListener('click', function () {
            const target = document.querySelector(this.dataset.statusToggle);
            if (target) {
                target.classList.toggle('active');
                const status = target.classList.contains('active') ? 'Active' : 'Inactive';
                const statusText = target.querySelector('.status-text');
                if (statusText) {
                    statusText.textContent = status;
                }
            }
        });
    });

})();
