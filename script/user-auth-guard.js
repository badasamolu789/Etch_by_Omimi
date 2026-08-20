/* ============================================
   USER-AUTH-GUARD.JS - Protect Dashboard Pages
   ============================================ */

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        redirectTo: '/user/auth/signin.html',
        loginUrl: '/user/auth/signin.html',
    };

    // ============================================
    // AUTH GUARD
    // ============================================
    async function guard() {
        // Wait for DOM and Supabase to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initGuard);
        } else {
            initGuard();
        }
    }

    async function initGuard() {
        // Check if EtchSupabase is available
        if (typeof EtchSupabase === 'undefined') {
            console.error('EtchSupabase not loaded. Cannot protect page.');
            redirectToLogin();
            return;
        }

        // Check authentication
        const result = await EtchSupabase.requireAuth({
            redirectTo: CONFIG.redirectTo
        });

        if (!result.authenticated) {
            console.warn('Unauthorized access attempt. Redirecting to login...');
            redirectToLogin();
            return;
        }

        // User is authenticated - store user data for the page
        window.ETCH_USER = result.user;
        window.ETCH_PROFILE = result.profile;

        // Dispatch custom event for other scripts to use
        window.dispatchEvent(new CustomEvent('etch:auth:ready', {
            detail: {
                user: result.user,
                profile: result.profile
            }
        }));

        console.log('%c✅ Authorized access', 'color: #99A96A; font-weight: bold;', result.user.email);
    }

    // ============================================
    // REDIRECT TO LOGIN
    // ============================================
    function redirectToLogin() {
        // Store the current URL to redirect back after login
        const currentUrl = window.location.pathname + window.location.search;
        sessionStorage.setItem('etch_redirect_after_login', currentUrl);

        // Redirect to login
        window.location.href = CONFIG.loginUrl;
    }

    // ============================================
    // SIGN OUT HANDLER
    // ============================================
    async function signOut() {
        if (typeof EtchSupabase === 'undefined') {
            console.error('EtchSupabase not loaded');
            return { error: new Error('Auth system not initialized') };
        }

        const { error } = await EtchSupabase.signOut();
        if (error) {
            console.error('Sign out error:', error);
            return { error };
        }

        // Clear stored user data
        window.ETCH_USER = null;
        window.ETCH_PROFILE = null;

        // Redirect to login
        window.location.href = CONFIG.loginUrl;

        return { error: null };
    }

    // ============================================
    // EXPOSE PUBLIC API
    // ============================================
    window.EtchAuthGuard = {
        guard,
        signOut,
        redirectToLogin,
    };

    // ============================================
    // AUTO-INITIALIZE
    // ============================================
    guard();

})();