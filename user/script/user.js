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

    // ============================================
    // 9. LIVE DASHBOARD DATA
    // ============================================
    function formatCurrency(value) {
        const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
        return '$' + safeValue.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    function getInitials(name) {
        if (!name) return 'ET';
        const parts = String(name).trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return 'ET';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function setText(selector, value) {
        const el = document.querySelector(selector);
        if (el) el.textContent = value;
    }

    function setAvatarPreview(url, target) {
        if (!target) return;
        if (url) {
            target.innerHTML = '<img src="' + url + '" alt="Profile" class="w-full h-full object-cover rounded-inherit" />';
            target.style.background = 'transparent';
            target.style.borderRadius = 'inherit';
        } else {
            target.textContent = getInitials(window.ETCH_PROFILE?.full_name || window.ETCH_PROFILE?.username || 'Creator');
            target.style.background = 'linear-gradient(135deg, rgba(153,169,106,0.18), rgba(78,205,196,0.15))';
            target.innerHTML = target.textContent;
        }
    }

    async function loadLiveDashboardData() {
        if (typeof EtchSupabase === 'undefined') return;

        const { user, error: userError } = await EtchSupabase.getCurrentUser();
        if (userError || !user) return;

        const { profile } = await EtchSupabase.getProfile(user.id);
        if (profile) {
            window.ETCH_PROFILE = profile;
            if (profile.full_name) {
                document.querySelectorAll('[data-user-name]').forEach(function (el) {
                    el.textContent = profile.full_name;
                });
            }
            if (profile.username) {
                document.querySelectorAll('[data-user-username]').forEach(function (el) {
                    el.textContent = '@' + profile.username;
                });
            }
            if (profile.bio) {
                document.querySelectorAll('[data-user-bio]').forEach(function (el) {
                    el.textContent = profile.bio;
                });
            }
            if (profile.avatar_url) {
                document.querySelectorAll('.avatar').forEach(function (avatar) {
                    if (!avatar.closest('[data-skip-profile-image]')) {
                        avatar.innerHTML = '<img src="' + profile.avatar_url + '" alt="Profile" class="w-full h-full object-cover rounded-inherit" />';
                        avatar.style.background = 'transparent';
                    }
                });
            }
        }

        const { data: listings = [] } = await EtchSupabase.getListings({ creatorId: user.id, limit: 50 }).catch(() => ({ data: [] }));

        const totalListings = listings.length;
        const activeListings = listings.filter(function (item) {
            const status = String(item.status || '').toLowerCase();
            return status === 'published' || status === 'active' || status === 'review';
        }).length;
        const draftListings = listings.filter(function (item) {
            const status = String(item.status || '').toLowerCase();
            return status === 'draft';
        }).length;
        const totalRevenue = listings.reduce(function (sum, item) {
            const value = Number(item.price || item.amount || item.total_value || 0);
            return sum + (Number.isFinite(value) ? value : 0);
        }, 0);
        const totalViews = listings.reduce(function (sum, item) {
            const value = Number(item.views || item.total_views || item.view_count || 0);
            return sum + (Number.isFinite(value) ? value : 0);
        }, 0);
        const listingViewRate = totalListings ? Math.round((activeListings / totalListings) * 100) : 0;

        const page = window.location.pathname.split('/').pop() || 'dashboard.html';

        const setValue = function (id, value) {
            const el = id ? document.getElementById(id) : null;
            if (el) {
                el.textContent = value;
            }
        };

        if (page === 'dashboard.html') {
            const values = document.querySelectorAll('.stat-card .value');
            if (values.length >= 4) {
                values[0].textContent = '$0';
                values[1].textContent = String(activeListings);
                values[2].textContent = String(totalListings);
                values[3].textContent = totalViews.toLocaleString();
            }
            setValue('dashboardRevenueValue', '$0');
            setValue('dashboardPublishedValue', String(activeListings));
            setValue('dashboardListingsValue', String(totalListings));
            setValue('dashboardViewsValue', totalViews.toLocaleString());
        }

        if (page === 'listings.html') {
            const values = document.querySelectorAll('.stat-card .value');
            if (values.length >= 4) {
                values[0].textContent = String(totalListings);
                values[1].textContent = String(activeListings);
                values[2].textContent = String(Math.max(0, totalListings - activeListings));
                values[3].textContent = totalViews.toLocaleString();
            }
            setValue('listingTotalsValue', String(totalListings));
            setValue('listingPublishedValue', String(activeListings));
            setValue('listingDraftsValue', String(draftListings));
            setValue('listingViewsValue', totalViews.toLocaleString());
        }

        if (page === 'earnings.html') {
            const values = document.querySelectorAll('.stat-card .value');
            if (values.length >= 4) {
                values[0].textContent = formatCurrency(totalRevenue);
                values[1].textContent = '$0';
                values[2].textContent = '0';
                values[3].textContent = '$0';
            }
            setValue('earningsRevenueValue', '$0');
            setValue('earningsPendingValue', '$0');
            setValue('earningsSalesValue', '0');
            setValue('earningsNetValue', '$0');
        }

        if (page === 'analytics.html') {
            const values = document.querySelectorAll('.stat-card .value');
            if (values.length >= 4) {
                values[0].textContent = totalViews.toLocaleString();
                values[1].textContent = '0';
                values[2].textContent = '0%';
                values[3].textContent = '$0';
            }
            setValue('analyticsViewsValue', totalViews.toLocaleString());
            setValue('analyticsVisitorsValue', '0');
            setValue('analyticsEngagementValue', '0%');
            setValue('analyticsRevenueValue', '$0');
        }

        if (page === 'storefront.html') {
            setValue('storefrontViewsValue', totalViews.toLocaleString());
            setValue('storefrontFeaturedValue', String(Math.min(totalListings, 6)));
            setValue('storefrontFollowersValue', '0');
            setValue('storefrontRatingValue', '0');
        }
    }

    async function initProfileUpload() {
        const uploadInput = document.getElementById('profileImageInput');
        const uploadButton = document.querySelector('[data-profile-upload]');
        const removeButton = document.querySelector('[data-profile-remove]');
        const avatarPreview = document.querySelector('[data-profile-avatar]');

        if (!uploadButton || !uploadInput) return;

        uploadButton.addEventListener('click', function () {
            uploadInput.click();
        });

        uploadInput.addEventListener('change', async function () {
            const file = uploadInput.files && uploadInput.files[0];
            if (!file) return;

            const { user } = await EtchSupabase.getCurrentUser();
            if (!user) return;

            const fileExt = (file.name.split('.').pop() || 'png').toLowerCase();
            const filePath = 'profiles/' + user.id + '/avatar.' + fileExt;
            const uploadResult = await EtchSupabase.uploadFile('avatars', filePath, file, { upsert: true });

            if (uploadResult.error) {
                console.error('Avatar upload failed:', uploadResult.error);
                return;
            }

            const publicUrl = EtchSupabase.getPublicUrl('avatars', filePath);
            if (publicUrl) {
                await EtchSupabase.updateProfile(user.id, { avatar_url: publicUrl });
                setAvatarPreview(publicUrl, avatarPreview || document.querySelector('.avatar'));
                document.querySelectorAll('.avatar').forEach(function (avatar) {
                    if (!avatar.closest('[data-skip-profile-image]')) {
                        avatar.innerHTML = '<img src="' + publicUrl + '" alt="Profile" class="w-full h-full object-cover rounded-inherit" />';
                        avatar.style.background = 'transparent';
                    }
                });
            }
        });

        if (removeButton) {
            removeButton.addEventListener('click', async function () {
                const { user } = await EtchSupabase.getCurrentUser();
                if (!user) return;
                await EtchSupabase.updateProfile(user.id, { avatar_url: null });
                if (avatarPreview) {
                    avatarPreview.innerHTML = getInitials(window.ETCH_PROFILE?.full_name || window.ETCH_PROFILE?.username || 'Creator');
                    avatarPreview.style.background = 'linear-gradient(135deg, rgba(153,169,106,0.18), rgba(78,205,196,0.15))';
                }
                document.querySelectorAll('.avatar').forEach(function (avatar) {
                    if (!avatar.closest('[data-skip-profile-image]')) {
                        avatar.textContent = getInitials(window.ETCH_PROFILE?.full_name || window.ETCH_PROFILE?.username || 'Creator');
                        avatar.style.background = 'linear-gradient(135deg, rgba(153,169,106,0.18), rgba(78,205,196,0.15))';
                    }
                });
            });
        }
    }

    async function initLiveUploadForm() {
        const form = document.querySelector('form[data-handle-submit]');
        if (!form || typeof EtchSupabase === 'undefined') return;

        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            const { user } = await EtchSupabase.getCurrentUser();
            if (!user) return;

            const formData = new FormData(form);
            const title = String(formData.get('title') || '').trim();
            const category = String(formData.get('category') || '').trim();
            const price = Number(formData.get('price') || 0);
            const status = String(formData.get('status') || 'draft');
            const description = String(formData.get('description') || '').trim();
            const coverUrl = String(formData.get('cover_url') || '').trim();
            const previewUrl = String(formData.get('preview_url') || '').trim();
            const rightsSummary = String(formData.get('rights_summary') || '').trim();
            const files = form.querySelector('input[type="file"]')?.files || [];

            let finalCover = coverUrl;
            if (files.length > 0) {
                const file = files[0];
                const filePath = 'listings/' + user.id + '/' + Date.now() + '-' + file.name.replace(/\s+/g, '-');
                const uploaded = await EtchSupabase.uploadFile('listing-media', filePath, file, { upsert: true });
                if (uploaded.error) {
                    console.error('Listing image upload failed:', uploaded.error);
                    return;
                }
                finalCover = EtchSupabase.getPublicUrl('listing-media', filePath) || coverUrl;
            }

            const payload = {
                creator_id: user.id,
                title,
                category,
                price,
                status,
                description,
                cover_url: finalCover,
                preview_url: previewUrl,
                rights_summary: rightsSummary,
                created_at: new Date().toISOString(),
            };

            const result = await EtchSupabase.createListing(payload);
            if (result.error) {
                console.error('Create listing failed:', result.error);
                return;
            }

            const successEl = document.getElementById('formSuccess');
            if (successEl) {
                successEl.classList.remove('hidden');
                successEl.classList.add('animate-slide-up');
            }
            form.reset();
        });
    }

    // ============================================
    // 10. INITIALIZE REAL USER DATA
    // ============================================
    loadLiveDashboardData();
    initProfileUpload();
    initLiveUploadForm();

})();