/* ============================================
   USER.JS - ETCH User Dashboard Scripts
   ============================================ */

(function initialize() {
    'use strict';
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
        return;
    }

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
            if (href && EtchUI.pageName(new URL(href, window.location.href).pathname) === EtchUI.pageName(currentPath)) {
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
            const img = document.createElement('img');
            img.src = EtchUI.safeUrl(url);
            img.alt = 'Profile';
            img.className = 'w-full h-full object-cover rounded-inherit';
            target.replaceChildren(img);
            target.style.background = 'transparent';
            target.style.borderRadius = 'inherit';
        } else {
            target.textContent = getInitials(window.ETCH_PROFILE?.full_name || window.ETCH_PROFILE?.username || 'Creator');
            target.style.background = 'linear-gradient(135deg, rgba(153,169,106,0.18), rgba(78,205,196,0.15))';
            target.textContent = target.textContent;
        }
    }

    async function loadLiveDashboardData() {
        if (typeof EtchSupabase === 'undefined') return;

        const auth = await (window.ETCH_AUTH_READY || EtchSupabase.requireAuth());
        if (!auth.authenticated) return;
        const { user, profile } = auth;
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
                        setAvatarPreview(profile.avatar_url, avatar);
                        avatar.style.background = 'transparent';
                    }
                });
            }
        }

        const { data: stats, error: statsError } = await EtchSupabase.getCreatorStats();
        if (statsError || !stats) {
            document.querySelectorAll('[id$="Value"]').forEach(el => { el.textContent = '—'; });
            return;
        }
        const totalListings = Number(stats.total || 0);
        const activeListings = Number(stats.published || 0);
        const draftListings = Number(stats.draft || 0);
        const totalViews = Number(stats.views || 0);
        const page = EtchUI.pageName() + '.html';

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
            setValue('dashboardRevenueValue', '—');
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
                values[0].textContent = '—';
                values[1].textContent = '$0';
                values[2].textContent = '0';
                values[3].textContent = '$0';
            }
            setValue('earningsRevenueValue', '—');
            setValue('earningsPendingValue', '—');
            setValue('earningsSalesValue', '—');
            setValue('earningsNetValue', '—');
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
            setValue('analyticsVisitorsValue', '—');
            setValue('analyticsEngagementValue', '—');
            setValue('analyticsRevenueValue', '—');
        }

        if (page === 'storefront.html') {
            setValue('storefrontViewsValue', totalViews.toLocaleString());
            setValue('storefrontFeaturedValue', String(Math.min(totalListings, 6)));
            setValue('storefrontFollowersValue', '—');
            setValue('storefrontRatingValue', '—');
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
                const saved = await EtchSupabase.updateProfile(user.id, { avatar_url: publicUrl });
                if (saved.error) { alert('Your photo could not be saved. Please try again.'); return; }
                setAvatarPreview(publicUrl, avatarPreview || document.querySelector('.avatar'));
                document.querySelectorAll('.avatar').forEach(function (avatar) {
                    if (!avatar.closest('[data-skip-profile-image]')) {
                        setAvatarPreview(publicUrl, avatar);
                        avatar.style.background = 'transparent';
                    }
                });
            }
        });

        if (removeButton) {
            removeButton.addEventListener('click', async function () {
                const { user } = await EtchSupabase.getCurrentUser();
                if (!user) return;
                const saved = await EtchSupabase.updateProfile(user.id, { avatar_url: null });
                if (saved.error) { alert('Your photo could not be removed. Please try again.'); return; }
                if (avatarPreview) {
                    avatarPreview.textContent = getInitials(window.ETCH_PROFILE?.full_name || window.ETCH_PROFILE?.username || 'Creator');
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
        const form = document.querySelector('form[data-listing-form]');
        if (!form || typeof EtchSupabase === 'undefined') return;
        let pending = false;
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            if (pending || !form.reportValidity()) return;
            // Snapshot before authentication or any other asynchronous operation.
            const formData = new FormData(form);
            const file = form.querySelector('input[type="file"]')?.files[0];
            const buttons = [...form.querySelectorAll('button[type="submit"]')];
            const errorEl = document.getElementById('formError');
            const successEl = document.getElementById('formSuccess');
            const selection = document.getElementById('uploadSelection');
            errorEl.classList.add('hidden');
            successEl?.classList.add('hidden');
            pending = true;
            buttons.forEach(button => { button.disabled = true; });
            let uploadedPath = null;
            let saved = false;
            try {
                const payload = Object.fromEntries(['title', 'category', 'status', 'description', 'rights_summary']
                    .map(key => [key, String(formData.get(key) || '').trim()]));
                payload.price = Number(formData.get('price') || 0);
                if (!payload.title || !payload.category || !Number.isFinite(payload.price) || payload.price < 0) {
                    throw new Error('Enter a title, category, and valid price.');
                }
                for (const key of ['cover_url', 'preview_url']) {
                    const raw = String(formData.get(key) || '').trim();
                    payload[key] = EtchUI.safeUrl(raw);
                    if (raw && !payload[key]) throw new Error('Use an HTTP or HTTPS URL.');
                }
                if (file && (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 10 * 1024 * 1024)) {
                    throw new Error('Choose a JPG, PNG, WebP, or GIF cover image under 10 MB.');
                }
                const { user, error } = await EtchSupabase.getCurrentUser();
                if (error || !user) throw new Error('Please sign in again before saving.');
                payload.creator_id = user.id;
                if (file) {
                    selection.textContent = 'Uploading cover image…';
                    const path = 'listings/' + user.id + '/' + crypto.randomUUID() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
                    const result = await EtchSupabase.uploadFile('listing-media', path, file);
                    if (result.error) throw result.error;
                    uploadedPath = path;
                    payload.cover_url = EtchSupabase.getPublicUrl('listing-media', path);
                }
                selection.textContent = 'Saving listing…';
                const result = await EtchSupabase.createListing(payload);
                if (result.error) throw result.error;
                saved = true;
                form.reset();
                selection.textContent = '';
                successEl?.classList.remove('hidden');
            } catch (error) {
                errorEl.textContent = error.message || 'Unable to save. Your inputs have been kept; please try again.';
                errorEl.classList.remove('hidden');
                selection.textContent = '';
            } finally {
                if (uploadedPath && !saved) {
                    const cleanup = await EtchSupabase.removeFile('listing-media', uploadedPath);
                    if (cleanup.error) console.error('Unable to remove unused upload:', cleanup.error);
                }
                pending = false;
                buttons.forEach(button => { button.disabled = false; });
            }
        });
    }

    loadLiveDashboardData();
    initProfileUpload();
    initLiveUploadForm();
})();
