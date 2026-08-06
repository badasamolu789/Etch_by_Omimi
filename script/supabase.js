/* ============================================
   SUPABASE.JS - ETCH Supabase Client & Auth Helpers
   ============================================ */

const EtchSupabase = (function () {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    // These are set via window.__ETCH_SUPABASE__ config
    // defined in each page's inline script tag
    const CONFIG = {
        url: window.__ETCH_SUPABASE__?.url || '',
        anonKey: window.__ETCH_SUPABASE__?.anonKey || '',
    };

    let supabaseClient = null;

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        if (!CONFIG.url || !CONFIG.anonKey) {
            console.warn('%c⚠️ Supabase not configured. Set window.__ETCH_SUPABASE__', 'color: #C9A54C; font-weight: bold;');
            return null;
        }

        if (typeof supabase === 'undefined') {
            console.error('%c❌ Supabase client library not loaded. Add: <script src="https://unpkg.com/@supabase/supabase-js@2"></script>', 'color: #B25555; font-weight: bold;');
            return null;
        }

        try {
            supabaseClient = supabase.createClient(CONFIG.url, CONFIG.anonKey, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true,
                },
            });
            console.log('%c🔐 Supabase Auth Initialized', 'color: #99A96A; font-weight: bold;');
            return supabaseClient;
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            return null;
        }
    }

    // ============================================
    // GET CLIENT
    // ============================================
    function getClient() {
        if (!supabaseClient) {
            return init();
        }
        return supabaseClient;
    }

    // ============================================
    // AUTH: SIGN UP
    // ============================================
    async function signUp(email, password, fullName) {
        const client = getClient();
        if (!client) return { error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        username: 'creator_' + Math.random().toString(36).substring(2, 8),
                    },
                },
            });

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('Sign up error:', error.message);
            return { data: null, error };
        }
    }

    // ============================================
    // AUTH: SIGN IN (Email/Password)
    // ============================================
    async function signIn(email, password) {
        const client = getClient();
        if (!client) return { error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('Sign in error:', error.message);
            return { data: null, error };
        }
    }

    // ============================================
    // AUTH: SIGN OUT
    // ============================================
    async function signOut() {
        const client = getClient();
        if (!client) return { error: new Error('Supabase not initialized') };

        try {
            const { error } = await client.auth.signOut();
            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Sign out error:', error.message);
            return { error };
        }
    }

    // ============================================
    // AUTH: PASSWORD RESET (Send reset email)
    // ============================================
    async function resetPassword(email) {
        const client = getClient();
        if (!client) return { error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/user/auth/reset-password.html',
            });

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('Password reset error:', error.message);
            return { data: null, error };
        }
    }

    // ============================================
    // AUTH: UPDATE PASSWORD
    // ============================================
    async function updatePassword(newPassword) {
        const client = getClient();
        if (!client) return { error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('Update password error:', error.message);
            return { data: null, error };
        }
    }

    // ============================================
    // AUTH: GET CURRENT USER
    // ============================================
    async function getCurrentUser() {
        const client = getClient();
        if (!client) return { user: null, error: new Error('Supabase not initialized') };

        try {
            const { data: { user }, error } = await client.auth.getUser();
            if (error) throw error;
            return { user, error: null };
        } catch (error) {
            return { user: null, error };
        }
    }

    // ============================================
    // AUTH: GET SESSION
    // ============================================
    async function getSession() {
        const client = getClient();
        if (!client) return { session: null, error: new Error('Supabase not initialized') };

        try {
            const { data: { session }, error } = await client.auth.getSession();
            if (error) throw error;
            return { session, error: null };
        } catch (error) {
            return { session: null, error };
        }
    }

    // ============================================
    // AUTH: ON AUTH STATE CHANGE
    // ============================================
    function onAuthStateChange(callback) {
        const client = getClient();
        if (!client) {
            console.warn('Supabase not initialized, cannot listen to auth state changes');
            return { data: { subscription: { unsubscribe: () => { } } } };
        }

        return client.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    }

    // ============================================
    // PROFILE: GET PROFILE
    // ============================================
    async function getProfile(userId) {
        const client = getClient();
        if (!client) return { profile: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return { profile: data, error: null };
        } catch (error) {
            return { profile: null, error };
        }
    }

    // ============================================
    // PROFILE: UPDATE PROFILE
    // ============================================
    async function updateProfile(userId, updates) {
        const client = getClient();
        if (!client) return { error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('profiles')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return { profile: data, error: null };
        } catch (error) {
            return { profile: null, error };
        }
    }

    // ============================================
    // AUTH GUARD: PROTECT DASHBOARD PAGES
    // ============================================
    async function requireAuth(options = {}) {
        const client = getClient();
        if (!client) {
            console.warn('Supabase not initialized');
            return { authenticated: false, redirect: options.redirectTo || '../auth/signin.html' };
        }

        try {
            const { session, error } = await client.auth.getSession();

            if (error || !session) {
                return {
                    authenticated: false,
                    redirect: options.redirectTo || '../auth/signin.html',
                    error: error || new Error('No active session')
                };
            }

            // Get user profile
            const { profile } = await getProfile(session.user.id);

            return {
                authenticated: true,
                user: session.user,
                profile: profile,
                redirect: null
            };
        } catch (error) {
            return {
                authenticated: false,
                redirect: options.redirectTo || '../auth/signin.html',
                error: error
            };
        }
    }

    // ============================================
    // PUBLIC API
    // ============================================
    const api = {
        init,
        getClient,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        getCurrentUser,
        getSession,
        onAuthStateChange,
        getProfile,
        updateProfile,
        requireAuth,
    };

    window.EtchSupabase = api;
    return api;
})();
