/* ============================================
   GLOBAL.JS - ETCH Shared Functionality
   ============================================ */

(function () {
    'use strict';

    // ============================================
    // 0. INJECT SHARED COMPONENTS
    // ============================================
    function injectComponents() {
        // Header HTML (from component/header.html)
        var headerHTML = [
            '<!-- ============================================ -->',
            '<!-- SHARED HEADER -->',
            '<!-- ============================================ -->',
            '<header class="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-ink/80 backdrop-blur-xl border-b border-border/40 dark:border-white/10 transition-colors duration-300">',
            '    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">',
            '        <div class="flex items-center justify-between h-16 md:h-20">',
            '            <!-- Logo -->',
            '            <a href="index.html" class="flex items-center gap-2 group">',
            '                <img src="/assets/logo.png" alt="ETCH logo" class="h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-110" />',
            '                <div>',
            '                    <span class="font-display text-2xl font-bold text-ink dark:text-white">ETCH</span>',
            '                    <span class="block -mt-1 text-[10px] font-medium text-olive tracking-widest uppercase">by OMIMI</span>',
            '                </div>',
            '            </a>',
            '            <!-- Desktop Navigation -->',
            '            <nav class="hidden lg:flex items-center gap-8" aria-label="Main navigation">',
            '                <a href="explore.html" class="text-sm font-medium text-slate dark:text-gray-400 hover:text-ink dark:hover:text-white transition-colors duration-200" data-nav-link>Explore</a>',
            '                <a href="products.html" class="text-sm font-medium text-slate dark:text-gray-400 hover:text-ink dark:hover:text-white transition-colors duration-200" data-nav-link>Marketplace</a>',
            '                <a href="masterclass.html" class="text-sm font-medium text-slate dark:text-gray-400 hover:text-ink dark:hover:text-white transition-colors duration-200" data-nav-link>Masterclass</a>',
            '                <a href="about.html" class="text-sm font-medium text-slate dark:text-gray-400 hover:text-ink dark:hover:text-white transition-colors duration-200" data-nav-link>About</a>',
            '                <a href="contact.html" class="text-sm font-medium text-slate dark:text-gray-400 hover:text-ink dark:hover:text-white transition-colors duration-200" data-nav-link>Contact</a>',
            '            </nav>',
            '            <!-- Right Actions -->',
            '            <div class="flex items-center gap-3">',
            '                <!-- Search -->',
            '                <div class="hidden md:flex items-center gap-2 px-3 py-2 bg-stone dark:bg-white/5 rounded-xl border border-border/40 dark:border-white/10 focus-within:border-olive focus-within:ring-2 focus-within:ring-olive/20 transition-all duration-200 search-input">',
            '                    <svg class="w-4 h-4 text-slate/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>',
            '                    <input type="text" placeholder="Search marketplace..." class="bg-transparent border-none outline-none text-sm text-ink dark:text-white placeholder:text-slate/40 w-40 lg:w-56" />',
            '                    <kbd class="hidden lg:block text-[10px] font-medium text-slate/40 bg-white/50 dark:bg-ink/50 px-1.5 py-0.5 rounded">\u2318K</kbd>',
            '                </div>',
            '                <!-- Theme Toggle -->',
            '                <button id="themeToggle" class="theme-toggle p-2 rounded-xl text-slate dark:text-gray-400 hover:bg-stone dark:hover:bg-white/10 transition-all duration-300" aria-label="Toggle theme">',
            '                    <svg class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>',
            '                    <svg class="w-5 h-5 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>',
            '                </button>',
            '                <!-- Auth Buttons -->',
            '                <a href="user/auth/signin.html" class="hidden sm:inline-block px-4 py-2 text-sm font-medium text-slate dark:text-gray-300 hover:text-ink dark:hover:text-white transition-colors duration-200">Sign In</a>',
            '                <a href="user/auth/signup.html" class="px-5 py-2 text-sm font-medium bg-olive text-white rounded-xl hover:bg-olive-dark hover:shadow-lg hover:shadow-olive/20 transition-all duration-300 hover:-translate-y-0.5">Get Started</a>',
            '                <!-- Mobile Menu Toggle -->',
            '                <button id="mobileMenuToggle" class="lg:hidden p-2 text-ink dark:text-white hover:text-olive transition-colors duration-200" aria-label="Toggle menu">',
            '                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>',
            '                </button>',
            '            </div>',
            '        </div>',
            '    </div>',
            '    <!-- Mobile Menu -->',
            '    <div id="mobileMenu" class="mobile-menu lg:hidden hidden bg-white dark:bg-ink border-t border-border/40 dark:border-white/10 px-4 py-6 space-y-4 transition-all duration-300">',
            '        <div class="search-input flex items-center gap-2 px-3 py-2 bg-stone dark:bg-white/5 rounded-xl border border-border/40 dark:border-white/10">',
            '            <svg class="w-4 h-4 text-slate/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>',
            '            <input type="text" placeholder="Search..." class="bg-transparent border-none outline-none text-sm text-ink dark:text-white placeholder:text-slate/40 w-full" />',
            '        </div>',
            '        <a href="explore.html" class="mobile-menu-link block text-ink dark:text-white font-medium hover:text-olive transition-colors duration-200">Explore</a>',
            '        <a href="products.html" class="mobile-menu-link block text-ink dark:text-white font-medium hover:text-olive transition-colors duration-200">Marketplace</a>',
            '        <a href="masterclass.html" class="mobile-menu-link block text-ink dark:text-white font-medium hover:text-olive transition-colors duration-200">Masterclass</a>',
            '        <a href="about.html" class="mobile-menu-link block text-ink dark:text-white font-medium hover:text-olive transition-colors duration-200">About</a>',
            '        <a href="contact.html" class="mobile-menu-link block text-ink dark:text-white font-medium hover:text-olive transition-colors duration-200">Contact</a>',
            '        <div class="pt-4 border-t border-border/40 dark:border-white/10 flex flex-col gap-3">',
            '            <a href="user/auth/signin.html" class="text-center px-4 py-3 text-sm font-medium text-slate dark:text-gray-300 hover:text-ink dark:hover:text-white transition-colors duration-200">Sign In</a>',
            '            <a href="user/auth/signup.html" class="text-center px-4 py-3 text-sm font-medium bg-olive text-white rounded-xl hover:bg-olive-dark transition-all duration-300">Get Started</a>',
            '        </div>',
            '    </div>',
            '</header>'
        ].join('\n');

        var footerHTML = [
            '<!-- ============================================ -->',
            '<!-- SHARED FOOTER -->',
            '<!-- ============================================ -->',
            '<footer class="bg-ink text-white/70">',
            '    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">',
            '        <div class="grid md:grid-cols-4 gap-8">',
            '            <!-- Brand -->',
            '            <div class="col-span-1 md:col-span-2">',
            '                <div class="flex items-center gap-2 mb-4">',
            '                    <img src="/assets/logo.png" alt="ETCH logo" class="h-8 w-8 object-contain" />',
            '                    <div>',
            '                        <span class="font-display text-2xl font-bold text-white">ETCH</span>',
            '                        <span class="block -mt-1 text-[10px] font-medium text-olive tracking-widest uppercase">by OMIMI</span>',
            '                    </div>',
            '                </div>',
            '                <p class="text-sm max-w-sm">A premium creative marketplace for scripts, storyboards, music, and design \u2014 all available for licensing.</p>',
            '                <div class="flex items-center gap-4 mt-4">',
            '                    <a href="#" class="text-white/50 hover:text-white transition-colors duration-200" aria-label="Twitter"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg></a>',
            '                    <a href="#" class="text-white/50 hover:text-white transition-colors duration-200" aria-label="Instagram"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg></a>',
            '                    <a href="#" class="text-white/50 hover:text-white transition-colors duration-200" aria-label="LinkedIn"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg></a>',
            '                </div>',
            '            </div>',
            '            <!-- Marketplace Links -->',
            '            <div>',
            '                <h4 class="text-white font-semibold mb-4">Marketplace</h4>',
            '                <ul class="space-y-2 text-sm">',
            '                    <li><a href="explore.html" class="hover:text-white transition-colors duration-200">Explore</a></li>',
            '                    <li><a href="products.html" class="hover:text-white transition-colors duration-200">All assets</a></li>',
            '                    <li><a href="products.html?category=script" class="hover:text-white transition-colors duration-200">Scripts</a></li>',
            '                    <li><a href="products.html?category=music" class="hover:text-white transition-colors duration-200">Music</a></li>',
            '                </ul>',
            '            </div>',
            '            <!-- Company Links -->',
            '            <div>',
            '                <h4 class="text-white font-semibold mb-4">Company</h4>',
            '                <ul class="space-y-2 text-sm">',
            '                    <li><a href="about.html" class="hover:text-white transition-colors duration-200">About</a></li>',
            '                    <li><a href="contact.html" class="hover:text-white transition-colors duration-200">Contact</a></li>',
            '                    <li><a href="#" class="hover:text-white transition-colors duration-200">Terms</a></li>',
            '                    <li><a href="#" class="hover:text-white transition-colors duration-200">Privacy</a></li>',
            '                </ul>',
            '            </div>',
            '        </div>',
            '        <!-- Bottom Bar -->',
            '        <div class="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">',
            '            <span>\u00a9 2026 ETCH by OMIMI. All rights reserved.</span>',
            '            <span class="flex items-center gap-2">',
            '                <span class="w-2 h-2 rounded-full bg-olive animate-pulse"></span>',
            '                <span class="text-white/60">Marketplace is live</span>',
            '            </span>',
            '        </div>',
            '    </div>',
            '</footer>'
        ].join('\n');

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
        var sidebarHTML = [
            '<!-- ============================================ -->',
            '<!-- USER SIDEBAR - Shared across user pages -->',
            '<!-- ============================================ -->',
            '<aside class="user-sidebar" id="userSidebar">',
            '',
            '    <!-- Brand -->',
            '    <div class="user-sidebar-brand">',
            '        <img src="/assets/logo.png" alt="ETCH logo" />',
            '        <div>',
            '            <span>ETCH</span>',
            '            <small>Creator Hub</small>',
            '        </div>',
            '    </div>',
            '',
            '    <!-- Profile -->',
            '    <div class="user-sidebar-profile">',
            '        <div class="avatar">',
            '            DK',
            '            <span class="status-dot"></span>',
            '        </div>',
            '        <div class="info">',
            '            <strong>Daniel K.</strong>',
            '            <span>',
            '                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />',
            '                </svg>',
            '                Verified Creator',
            '            </span>',
            '        </div>',
            '    </div>',
            '',
            '    <!-- Navigation -->',
            '    <nav class="user-sidebar-nav" aria-label="Creator navigation">',
            '',
            '        <!-- Overview -->',
            '        <a href="user/dashboard.html" class="active">',
            '            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                <rect x="3" y="3" width="7" height="7" rx="1" />',
            '                <rect x="14" y="3" width="7" height="7" rx="1" />',
            '                <rect x="3" y="14" width="7" height="7" rx="1" />',
            '                <rect x="14" y="14" width="7" height="7" rx="1" />',
            '            </svg>',
            '            Overview',
            '            <span class="badge primary">Studio</span>',
            '        </a>',
            '',
            '        <!-- Storefront -->',
            '        <a href="user/storefront.html">',
            '            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />',
            '                <line x1="3" y1="6" x2="21" y2="6" />',
            '                <path d="M16 10a4 4 0 01-8 0" />',
            '            </svg>',
            '            Storefront',
            '            <span class="badge live">Live</span>',
            '        </a>',
            '',
            '        <!-- Listings -->',
            '        <a href="user/listings.html">',
            '            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                <rect x="3" y="4" width="18" height="18" rx="2" />',
            '                <line x1="16" y1="2" x2="16" y2="6" />',
            '                <line x1="8" y1="2" x2="8" y2="6" />',
            '                <line x1="3" y1="10" x2="21" y2="10" />',
            '            </svg>',
            '            Listings',
            '            <span class="badge primary">12</span>',
            '        </a>',
            '',
            '        <!-- Upload -->',
            '        <a href="user/upload.html">',
            '            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />',
            '                <polyline points="17 8 12 3 7 8" />',
            '                <line x1="12" y1="3" x2="12" y2="15" />',
            '            </svg>',
            '            Upload',
            '            <span class="badge" style="font-size:0.5625rem;color:var(--color-text-muted);">+ New</span>',
            '        </a>',
            '',
            '        <!-- Licensing -->',
            '        <a href="user/licensing.html">',
            '            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                <path d="M9 12l2 2 4-4" />',
            '                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />',
            '            </svg>',
            '            Licensing',
            '            <span class="badge warning">5</span>',
            '        </a>',
            '',
            '        <!-- Messages -->',
            '        <a href="user/messages.html">',
            '            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />',
            '            </svg>',
            '            Messages',
            '            <span class="badge danger">6</span>',
            '        </a>',
            '',
            '        <!-- Earnings -->',
            '        <a href="user/earnings.html">',
            '            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                <circle cx="12" cy="12" r="10" />',
            '                <path d="M8 12h8M12 8v8" />',
            '            </svg>',
            '            Earnings',
            '            <span class="badge primary">$0</span>',
            '        </a>',
            '',
            '        <!-- Divider -->',
            '        <div class="nav-divider"></div>',
            '',
            '        <!-- Analytics -->',
            '        <a href="user/analytics.html">',
            '            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                <path d="M21 12v-2a5 5 0 00-5-5H8a5 5 0 00-5 5v2" />',
            '                <circle cx="12" cy="16" r="5" />',
            '                <path d="M12 11v5M9 13l3 3 3-3" />',
            '            </svg>',
            '            Analytics',
            '            <span class="badge" style="font-size:0.5625rem;color:var(--color-text-muted);">Insights</span>',
            '        </a>',
            '',
            '        <!-- Settings -->',
            '        <a href="user/settings.html">',
            '            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                <circle cx="12" cy="12" r="3" />',
            '                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />',
            '            </svg>',
            '            Settings',
            '        </a>',
            '',
            '        <!-- Divider -->',
            '        <div class="nav-divider"></div>',
            '',
            '        <!-- Sign Out -->',
            '        <a href="user/auth/signin.html" class="sign-out">',
            '            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />',
            '                <polyline points="16 17 21 12 16 7" />',
            '                <line x1="21" y1="12" x2="9" y2="12" />',
            '            </svg>',
            '            Sign Out',
            '        </a>',
            '    </nav>',
            '',
            '    <!-- Footer -->',
            '    <div class="user-sidebar-footer">',
            '        <div class="health-card">',
            '            <div class="header">',
            '                <span>\u2728</span>',
            '                <p>Studio Health</p>',
            '            </div>',
            '            <div class="progress">',
            '                <div class="bar">',
            '                    <div class="fill" style="width:85%;"></div>',
            '                </div>',
            '                <span>85%</span>',
            '            </div>',
            '            <p class="note">Your storefront is performing above average</p>',
            '        </div>',
            '    </div>',
            '</aside>',
            '',
            '<!-- Sidebar Overlay -->',
            '<div class="sidebar-overlay" id="sidebarOverlay"></div>'
        ].join('\n');

        var topbarHTML = [
            '<!-- ============================================ -->',
            '<!-- USER TOPBAR - Shared across user pages -->',
            '<!-- ============================================ -->',
            '<header class="user-topbar">',
            '',
            '    <!-- Left Side -->',
            '    <div class="user-topbar-left">',
            '        <button class="mobile-menu-btn" data-sidebar-toggle aria-label="Toggle sidebar">',
            '            <span></span>',
            '            <span></span>',
            '            <span></span>',
            '        </button>',
            '',
            '        <div class="greeting">',
            '            <p class="eyebrow">',
            '                <span class="dot"></span>',
            '                Creator Dashboard',
            '            </p>',
            '            <h1 id="pageTitle">Overview</h1>',
            '        </div>',
            '    </div>',
            '',
            '    <!-- Right Side -->',
            '    <div class="user-topbar-right">',
            '',
            '        <!-- Search -->',
            '        <div class="search-input">',
            '            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />',
            '            </svg>',
            '            <input type="text" placeholder="Search listings..." />',
            '            <span class="shortcut">\u2318K</span>',
            '        </div>',
            '',
            '        <!-- Quick Actions -->',
            '        <button class="action-btn" aria-label="Quick actions">',
            '            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />',
            '            </svg>',
            '        </button>',
            '',
            '        <!-- Notifications -->',
            '        <button class="action-btn notif-btn" aria-label="Notifications">',
            '            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />',
            '            </svg>',
            '            <span class="count">3</span>',
            '        </button>',
            '',
            '        <!-- Add Listing -->',
            '        <a href="user/upload.html" class="btn-primary-small">',
            '            Add Listing',
            '        </a>',
            '',
            '        <!-- User Menu -->',
            '        <button class="user-btn" aria-label="User menu">',
            '            <div class="avatar">DK</div>',
            '            <div class="info">',
            '                <strong>Daniel K.</strong>',
            '                <span>',
            '                    <span class="dot"></span>',
            '                    Screenwriter',
            '                </span>',
            '            </div>',
            '            <svg class="chevron w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">',
            '                <polyline points="6 9 12 15 18 9" />',
            '            </svg>',
            '        </button>',
            '    </div>',
            '</header>'
        ].join('\n');

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

    // Inject components on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            injectComponents();
            injectUserComponents();
            loadSiteSettings();
        });
    } else {
        injectComponents();
        injectUserComponents();
        loadSiteSettings();
    }

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
                            a.href = url;
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
        if (theme === 'dark') {
            html.classList.add('dark');
            html.setAttribute('data-theme', 'dark');
        } else {
            html.classList.remove('dark');
            html.setAttribute('data-theme', 'light');
        }
        localStorage.setItem('theme', theme);
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
    document.addEventListener('submit', function (e) {
        var form = e.target.closest('form[data-handle-submit]');
        if (form) {
            e.preventDefault();

            var successEl = form.querySelector('[data-success-message]');
            if (successEl) {
                successEl.classList.remove('hidden');
                successEl.classList.add('animate-slide-up');
            }

            form.reset();

            setTimeout(function () {
                if (successEl) {
                    successEl.classList.add('hidden');
                    successEl.classList.remove('animate-slide-up');
                }
            }, 5000);
        }
    });

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
            if (href && href.endsWith(currentPage)) {
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