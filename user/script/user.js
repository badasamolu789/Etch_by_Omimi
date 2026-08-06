/* ============================================
   USER.JS - ETCH User Dashboard Scripts
   ============================================ */

(function () {
    'use strict';

    // ============================================
    // 1. SIDEBAR TOGGLE
    // ============================================
    const sidebarToggle = document.querySelector('[data-sidebar-toggle]');
    const sidebar = document.querySelector('.user-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    function toggleSidebar() {
        if (!sidebar) return;
        sidebar.classList.toggle('open');
        if (overlay) {
            overlay.classList.toggle('open');
        }
        document.body.classList.toggle('sidebar-open');
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    if (overlay) {
        overlay.addEventListener('click', toggleSidebar);
    }

    // Close sidebar on escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    });

    // ============================================
    // 2. ACTIVE NAV LINK
    // ============================================
    function setActiveNavLink() {
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll('.user-sidebar-nav a:not(.sign-out)');

        links.forEach(function (link) {
            const href = link.getAttribute('href');
            if (href && currentPath.includes(href)) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    setActiveNavLink();

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
    function animateStatCards() {
        const statCards = document.querySelectorAll('.stat-card .value');

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

    animateStatCards();

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
    function initChart() {
        const chartContainer = document.querySelector('[data-chart]');
        if (!chartContainer) return;

        // This is a placeholder for chart libraries
        // You can integrate Chart.js or other libraries here
        console.log('Chart container found:', chartContainer);
    }

    initChart();

    // ============================================
    // 8. DRAG AND DROP FOR LISTINGS
    // ============================================
    let dragItem = null;

    document.querySelectorAll('[data-draggable]').forEach(function (item) {
        item.addEventListener('dragstart', function (e) {
            dragItem = this;
            this.style.opacity = '0.5';
        });

        item.addEventListener('dragend', function () {
            this.style.opacity = '1';
        });
    });

    document.querySelectorAll('[data-dropzone]').forEach(function (zone) {
        zone.addEventListener('dragover', function (e) {
            e.preventDefault();
            this.style.borderColor = 'var(--color-primary)';
        });

        zone.addEventListener('dragleave', function () {
            this.style.borderColor = 'var(--color-border)';
        });

        zone.addEventListener('drop', function (e) {
            e.preventDefault();
            this.style.borderColor = 'var(--color-border)';

            if (dragItem) {
                this.appendChild(dragItem);
                dragItem = null;
            }
        });
    });

})();