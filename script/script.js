/* ============================================
   GLOBAL.JS - ETCH Shared Functionality
   ============================================ */

(function initialize() {
    'use strict';

    // ============================================
    // 0. INJECT SHARED COMPONENTS
    // ============================================
    function injectComponents() {
        // Header HTML (from component/header.html)
        var headerHTML = EtchComponents.headerHTML;

        var footerHTML = EtchComponents.footerHTML;

        // Inject header
        var headerEl = document.getElementById('header');
        if (headerEl) {
            headerEl.innerHTML = headerHTML;
        }

        // Inject footer
        var footerEl = document.getElementById('footer');
        if (footerEl) {
            footerEl.innerHTML = footerHTML;
        }

        // Reinitialize Lucide icons after injection
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }

    // ============================================
    // 0b. INJECT USER DASHBOARD COMPONENTS (sidebar & topbar)
    // ============================================
    function injectUserComponents() {
        var sidebarHTML = EtchComponents.sidebarHTML;

        var topbarHTML = EtchComponents.topbarHTML;

        // Inject sidebar
        var sidebarEl = document.getElementById('userSidebar');
        if (sidebarEl) {
            sidebarEl.innerHTML = sidebarHTML;
        }

        // Inject topbar
        var topbarEl = document.getElementById('userTopbar');
        if (topbarEl) {
            topbarEl.innerHTML = topbarHTML;
        }

        // Reinitialize Lucide icons after injection
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }

    // These scripts are loaded after the component placeholders. Keep injection
    // synchronous so page scripts can immediately access their topbar elements.
    injectComponents();
    injectUserComponents();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSiteSettings, { once: true });
    } else loadSiteSettings();

    // ============================================
    // 0c. LOAD SITE SETTINGS (social links, contact info)
    // ============================================
    function loadSiteSettings() {
        if (typeof EtchSupabase === 'undefined' || !EtchSupabase.getSiteSettings) {
            return;
        }

        EtchSupabase.getSiteSettings().then(function (result) {
            if (result.error || !result.data) return;
            var settings = result.data;

            // Update footer social links
            var socialLinks = settings.social_links;
            if (socialLinks) {
                var links = typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks;
                var footerSocial = document.querySelector('footer .flex.items-center.gap-4.mt-4');
                if (footerSocial && links) {
                    var socialIcons = {
                        twitter: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>',
                        facebook: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 01-1.93.07 4.28 4.28 0 004 2.98 8.521 8.521 0 01-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/></svg>',
                        instagram: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
                        linkedin: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>'
                    };

                    footerSocial.innerHTML = '';
                    Object.keys(links).forEach(function (platform) {
                        var url = links[platform];
                        if (url && socialIcons[platform]) {
                            var a = document.createElement('a');
                            a.href = EtchUI.safeUrl(url);
                            a.target = '_blank';
                            a.rel = 'noopener noreferrer';
                            a.className = 'text-white/50 hover:text-white transition-colors duration-200';
                            a.setAttribute('aria-label', platform.charAt(0).toUpperCase() + platform.slice(1));
                            a.innerHTML = socialIcons[platform];
                            footerSocial.appendChild(a);
                        }
                    });
                }
            }
        }).catch(function (error) {
            console.warn('Failed to load site settings:', error);
        });
    }

    // ============================================
    // 1. THEME TOGGLE
    // ============================================
    var html = document.documentElement;

    function getTheme() {
        return localStorage.getItem('theme') || 'light';
    }

    function setTheme(theme) {
        EtchUI.setTheme(theme);
    }

    // Initialize theme
    setTheme(getTheme());

    // Toggle theme (delegated)
    document.addEventListener('click', function (e) {
        var toggle = e.target.closest('#themeToggle');
        if (toggle) {
            var currentTheme = getTheme();
            setTheme(currentTheme === 'dark' ? 'light' : 'dark');
        }
    });

    // ============================================
    // 2. MOBILE MENU
    // ============================================
    document.addEventListener('click', function (e) {
        var toggle = e.target.closest('#mobileMenuToggle');
        var mobileMenu = document.getElementById('mobileMenu');

        if (toggle && mobileMenu) {
            mobileMenu.classList.toggle('hidden');
            mobileMenu.classList.toggle('open');

            var expanded = toggle.getAttribute('aria-expanded') === 'true' ? 'false' : 'true';
            toggle.setAttribute('aria-expanded', expanded);
        }

        if (mobileMenu) {
            var link = e.target.closest('#mobileMenu a');
            if (link) {
                mobileMenu.classList.add('hidden');
                mobileMenu.classList.remove('open');
                var menuToggle = document.getElementById('mobileMenuToggle');
                if (menuToggle) {
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
            }

            var isMenuOpen = !mobileMenu.classList.contains('hidden');
            var isClickInside = mobileMenu.contains(e.target) || (e.target.closest('#mobileMenuToggle') !== null);

            if (isMenuOpen && !isClickInside) {
                mobileMenu.classList.add('hidden');
                mobileMenu.classList.remove('open');
                var menuToggle = document.getElementById('mobileMenuToggle');
                if (menuToggle) {
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
            }
        }
    });

    // ============================================
    // 3. SEARCH KEYBOARD SHORTCUT (\u2318K / Ctrl+K)
    // ============================================
    document.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            var searchInput = document.querySelector('.search-input input, input[type="text"][placeholder*="Search"]');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    });

    // ============================================
    // 4. SEARCH QUERY FROM URL & SEARCH NAVIGATION
    // ============================================
    function getSearchQuery() {
        var urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('q') || '';
    }

    function populateSearchQuery() {
        var query = getSearchQuery();
        if (query) {
            var searchInputs = document.querySelectorAll('.search-input input, input[type="text"][placeholder*="Search"]');
            searchInputs.forEach(function (input) {
                if (!input.value) {
                    input.value = query;
                }
            });

            var headers = document.querySelectorAll('.search-results-header, [data-search-term]');
            headers.forEach(function (header) {
                var span = header.querySelector('span');
                if (span) {
                    span.textContent = query;
                }
            });
        }
    }

    populateSearchQuery();

    // Search input Enter key navigation
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            var searchInput = e.target.closest('.search-input input');
            if (searchInput) {
                var query = searchInput.value.trim();
                if (query) {
                    e.preventDefault();
                    window.location.href = 'search.html?q=' + encodeURIComponent(query);
                }
            }
        }
    });

    // Search icon click navigation
    document.addEventListener('click', function (e) {
        var searchIcon = e.target.closest('.search-input svg, .search-input kbd');
        if (searchIcon) {
            var input = searchIcon.closest('.search-input') ? searchIcon.closest('.search-input').querySelector('input') : null;
            if (input) {
                var query = input.value.trim();
                if (query) {
                    window.location.href = 'search.html?q=' + encodeURIComponent(query);
                }
            }
        }
    });

    // ============================================
    // 5. SMOOTH SCROLL
    // ============================================
    document.addEventListener('click', function (e) {
        var anchor = e.target.closest('a[href^="#"]');
        if (anchor) {
            var target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });

    // ============================================
    // 6. PARALLAX EFFECT
    // ============================================
    function initParallax() {
        var hero = document.querySelector('.parallax-hero, .hero-section');
        if (!hero) return;

        window.addEventListener('scroll', function () {
            var scrolled = window.pageYOffset;
            var rate = scrolled * 0.5;
            var content = hero.querySelector('.parallax-content, .hero-content');
            if (content) {
                content.style.transform = 'translateY(' + (rate * 0.1) + 'px)';
            }
        });
    }

    initParallax();

    // ============================================
    // 7. FAQ ACCORDION
    // ============================================
    document.addEventListener('click', function (e) {
        var button = e.target.closest('.faq-toggle');
        if (button) {
            var content = button.nextElementSibling;
            var icon = button.querySelector('svg');

            if (content) {
                content.classList.toggle('hidden');
            }

            if (icon) {
                icon.classList.toggle('rotate-180');
            }

            var expanded = button.getAttribute('aria-expanded') === 'true' ? 'false' : 'true';
            button.setAttribute('aria-expanded', expanded);
        }
    });

    // ============================================
    // 8. FORM SUBMISSION HANDLING
    // ============================================
    // ============================================
    // 9. THUMBNAIL GALLERY
    // ============================================
    (function initGallery() {
        var thumbnails = document.querySelectorAll('.gallery-thumbnail');
        var mainImage = document.querySelector('.gallery-main img');

        if (!thumbnails.length || !mainImage) return;

        thumbnails.forEach(function (thumb) {
            thumb.addEventListener('click', function () {
                var src = this.dataset.image || (this.querySelector('img') ? this.querySelector('img').src : null);
                if (src) {
                    mainImage.src = src;

                    thumbnails.forEach(function (t) {
                        t.classList.remove('active', 'border-olive', 'ring-2', 'ring-olive');
                    });
                    this.classList.add('active', 'border-olive', 'ring-2', 'ring-olive');
                }
            });
        });
    })();

    // ============================================
    // 10. VIEW COUNTER ANIMATION
    // ============================================
    (function animateCounters() {
        var counters = document.querySelectorAll('.counter');

        counters.forEach(function (counter) {
            var target = parseInt(counter.dataset.target);
            var duration = 2000;
            var step = target / (duration / 16);
            var current = 0;

            var updateCounter = function () {
                current += step;
                if (current >= target) {
                    counter.textContent = target.toLocaleString();
                    return;
                }
                counter.textContent = Math.floor(current).toLocaleString();
                requestAnimationFrame(updateCounter);
            };

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        updateCounter();
                        observer.disconnect();
                    }
                });
            });

            observer.observe(counter);
        });
    })();

    // ============================================
    // 11. LAZY LOAD IMAGES
    // ============================================
    if ('IntersectionObserver' in window) {
        var lazyImages = document.querySelectorAll('img[data-src]');

        var imageObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        lazyImages.forEach(function (img) {
            imageObserver.observe(img);
        });
    }

    // ============================================
    // 12. TOOLTIP INITIALIZATION
    // ============================================
    document.querySelectorAll('[data-tooltip]').forEach(function (el) {
        var text = el.dataset.tooltip;
        var tooltip = document.createElement('span');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        el.appendChild(tooltip);

        el.addEventListener('mouseenter', function () {
            tooltip.style.display = 'block';
        });

        el.addEventListener('mouseleave', function () {
            tooltip.style.display = 'none';
        });
    });

    // ============================================
    // 13. RESPONSIVE TABLE WRAPPER
    // ============================================
    document.querySelectorAll('table').forEach(function (table) {
        var wrapper = document.createElement('div');
        wrapper.className = 'table-wrap';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });

    // ============================================
    // 14. ACTIVE NAV LINK HIGHLIGHTING
    // ============================================
    (function highlightActiveNav() {
        var currentPage = window.location.pathname.split('/').pop() || 'index.html';

        document.querySelectorAll('[data-nav-link]').forEach(function (link) {
            var href = link.getAttribute('href');
            if (href && EtchUI.pageName(new URL(href, window.location.href).pathname) === EtchUI.pageName(currentPage)) {
                link.classList.add('text-olive');
                link.classList.remove('text-slate', 'dark:text-gray-400');
            }
        });
    })();

    // ============================================
    // 15. CONSOLE WELCOME MESSAGE
    // ============================================
    console.log('%c ETCH by OMIMI ', 'background: #99A96A; color: white; font-size: 18px; font-weight: bold; padding: 8px 16px; border-radius: 4px;');
    console.log('%c Premium Creative Marketplace', 'color: #6C6C6C; font-size: 14px;');

})();