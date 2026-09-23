/* ============================================
   ADMIN.JS - ETCH Admin Dashboard Scripts
   ============================================ */

(function () {
    'use strict';

    let adminSession = null;
    function readAdminSession() { return adminSession; }
    function clearAdminSession() {
        adminSession = null;
        for (const storage of [sessionStorage, localStorage]) storage.removeItem('etch_admin_session');
    }

    // ============================================
    // 0. LOAD SHARED ADMIN COMPONENTS
    // ============================================
    function getAdminSidebarHTML() { return EtchComponents.getAdminSidebarHTML; }

    function getAdminTopbarHTML() { return EtchComponents.getAdminTopbarHTML; }

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
            if (href && EtchUI.pageName(new URL(href, window.location.href).pathname) === EtchUI.pageName(currentPath)) {
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

    async function protectAdminRoutes() {
        const result = await EtchSupabase.requireAdmin();
        if (!result.authenticated) {
            clearAdminSession();
            window.location.replace('/admin/auth/signin.html');
            return false;
        }
        window.ETCH_ADMIN = result;
        adminSession = { email: result.user.email, name: result.profile.full_name || 'Admin' };
        return true;
    }

    function bindSignOut() {
        const signOutLink = document.querySelector('.admin-sidebar-nav .sign-out');
        if (!signOutLink) return;

        signOutLink.addEventListener('click', async function (event) {
            event.preventDefault();
            const { error } = await EtchSupabase.signOut();
            if (error) { EtchDialog.alert('Sign out failed. Please try again.'); return; }
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
        if (!await protectAdminRoutes()) return;

        const permissions = { editor:['editorial'], reviewer:['moderation','applications','verification'], admin:['editorial','moderation','applications','verification','users','audit','analytics'], super_admin:['editorial','moderation','applications','verification','users','audit','analytics','roles'] };
        window.ETCH_PERMISSIONS = permissions[window.ETCH_ADMIN.profile.role] || [];
        const page = EtchUI.pageName();
        if(page==='index' && ['editor','reviewer'].includes(window.ETCH_ADMIN.profile.role)){
            location.replace(window.ETCH_ADMIN.profile.role==='editor'?'/admin/admin_masterclass.html':'/admin/applications.html');return;
        }
        const requiredPages = {media_library:'editorial',newsletter:'users',partners:'users',marketplace_categories:'users',create_article:'editorial',admin_masterclass:'editorial',author:'editorial',category:'editorial',create_author:'editorial',create_category:'editorial',users:'users',verification:'verification',listings:'moderation',reports:'moderation',applications:'applications',audit:'audit',analytics:'analytics'};
        const required = requiredPages[page];
        if (required && !window.ETCH_PERMISSIONS.includes(required)) {
            document.body.replaceChildren(Object.assign(document.createElement('p'),{textContent:'Your staff role does not have access to this page.'}));
            return;
        }
        // Load UI components after auth cleared
        await loadAdminComponents();
        for(const link of document.querySelectorAll('.admin-sidebar-nav a')) {
            const required = requiredPages[EtchUI.pageName(new URL(link.href).pathname)];
            if(required && !window.ETCH_PERMISSIONS.includes(required)) link.hidden=true;
        }
        document.querySelector('.admin-sidebar-profile strong')?.replaceChildren(window.ETCH_ADMIN.profile.full_name || 'Staff');
        document.querySelector('.admin-sidebar-profile .info span')?.replaceChildren(window.ETCH_ADMIN.profile.role.replaceAll('_',' '));
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
