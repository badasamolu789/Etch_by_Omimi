/* ============================================
   SUPABASE.JS - ETCH Supabase Client & Auth Helpers
   ============================================ */

const EtchSupabase = (function () {
    'use strict';

    const DEFAULT_CONFIG = {
        url: 'https://cyoddvehzrmhubmislbb.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5b2RkdmVoenJtaHVibWlzbGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjI3MTQsImV4cCI6MjEwMDczODcxNH0.YaUyKP9f3tpKDny78_k_ka70zkFZe58GAFOo5oFFaFI',
    };

    // ============================================
    // CONFIGURATION
    // ============================================
    // These are set via window.__ETCH_SUPABASE__ config
    // defined in each page's inline script tag
    const CONFIG = {
        url: window.__ETCH_SUPABASE__?.url || DEFAULT_CONFIG.url,
        anonKey: window.__ETCH_SUPABASE__?.anonKey || DEFAULT_CONFIG.anonKey,
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

    async function countRows(tableName, options = {}) {
        const client = getClient();
        if (!client) return { count: 0, error: new Error('Supabase not initialized') };

        try {
            let query = client.from(tableName).select('*', { count: 'exact', head: true });

            if (options.filters && Array.isArray(options.filters)) {
                options.filters.forEach(({ field, value, operator = 'eq' }) => {
                    if (field && value !== undefined && value !== null) {
                        if (operator === 'eq') query = query.eq(field, value);
                        if (operator === 'neq') query = query.neq(field, value);
                        if (operator === 'gt') query = query.gt(field, value);
                        if (operator === 'gte') query = query.gte(field, value);
                        if (operator === 'lt') query = query.lt(field, value);
                        if (operator === 'lte') query = query.lte(field, value);
                    }
                });
            }

            const { count, error } = await query;
            if (error) throw error;
            return { count: count || 0, error: null };
        } catch (error) {
            return { count: 0, error };
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
    // STORAGE: FILE UPLOADS
    // ============================================
    async function uploadFile(bucketName, filePath, file, options = {}) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const normalizedPath = (filePath || '').replace(/^\/+/, '');
            const { data, error } = await client.storage.from(bucketName).upload(normalizedPath, file, {
                cacheControl: options.cacheControl || '3600',
                upsert: options.upsert ?? false,
                contentType: file?.type || 'application/octet-stream',
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function listFiles(bucketName, options = {}) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client.storage.from(bucketName).list(options.path || '', {
                limit: options.limit || 100,
                offset: options.offset || 0,
                sortBy: options.sortBy || { column: 'created_at', order: 'desc' },
            });

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return { data: [], error };
        }
    }

    async function removeFile(bucketName, filePaths) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const paths = (Array.isArray(filePaths) ? filePaths : [filePaths])
                .map(path => String(path || '').replace(/^\/+/, ''))
                .filter(Boolean);
            const { data, error } = await client.storage.from(bucketName).remove(paths);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    function getPublicUrl(bucketName, filePath) {
        const client = getClient();
        if (!client) return null;

        const normalizedPath = (filePath || '').replace(/^\/+/, '');
        const { data } = client.storage.from(bucketName).getPublicUrl(normalizedPath);
        return data?.publicUrl || null;
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
    // MASTERCLASS: AUTHORS
    // ============================================
    async function getAuthors(options = {}) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Supabase not initialized') };

        try {
            let query = client.from('masterclass_authors').select('*');

            if (options.status) {
                query = query.eq('status', options.status);
            }

            query = query.order('name', { ascending: true });

            const { data, error } = await query;
            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return { data: [], error };
        }
    }

    async function createAuthor(authorData) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('masterclass_authors')
                .insert(authorData)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function updateAuthor(id, updates) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('masterclass_authors')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function deleteAuthor(id) {
        const client = getClient();
        if (!client) return { error: new Error('Supabase not initialized') };

        try {
            const { error } = await client
                .from('masterclass_authors')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    }

    // ============================================
    // MASTERCLASS: CATEGORIES
    // ============================================
    async function getCategories(options = {}) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Supabase not initialized') };

        try {
            let query = client.from('masterclass_categories').select('*');

            if (options.status) {
                query = query.eq('status', options.status);
            }

            query = query.order('name', { ascending: true });

            const { data, error } = await query;
            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return { data: [], error };
        }
    }

    async function createCategory(categoryData) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('masterclass_categories')
                .insert(categoryData)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function updateCategory(id, updates) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('masterclass_categories')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function deleteCategory(id) {
        const client = getClient();
        if (!client) return { error: new Error('Supabase not initialized') };

        try {
            const { error } = await client
                .from('masterclass_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    }

    // ============================================
    // MASTERCLASS: ARTICLES
    // ============================================
    async function getArticles(options = {}) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Supabase not initialized') };

        try {
            let query = client
                .from('masterclass_articles')
                .select(options.summary ? 'id,slug,title,excerpt,featured_image,reading_time,status,published_at,is_featured,category:masterclass_categories(id,name),author:masterclass_authors(id,name)' : '*, category:masterclass_categories(*), author:masterclass_authors(*)', { count: 'exact' });

            if (options.status) {
                query = query.eq('status', options.status);
            }

            if (options.featured) {
                query = query.eq('is_featured', true);
            }

            if (options.categoryId) {
                query = query.eq('category_id', options.categoryId);
            }

            if (options.authorId) {
                query = query.eq('author_id', options.authorId);
            }

            if (options.search) {
                query = query.ilike('title', `%${options.search}%`);
            }

            if (options.limit) {
                const offset = Math.max(0, Number(options.offset) || 0);
                query = query.range(offset, offset + options.limit - 1);
            }

            query = query.order('published_at', { ascending: false, nullsFirst: false });

            const { data, error, count } = await query;
            if (error) throw error;
            return { data: data || [], count: count || 0, error: null };
        } catch (error) {
            return { data: [], error };
        }
    }

    async function getArticleBySlug(slug) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('masterclass_articles')
                .select('*, category:masterclass_categories(*), author:masterclass_authors(*)')
                .eq('slug', slug)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function createArticle(articleData) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('masterclass_articles')
                .insert(articleData)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function updateArticle(id, updates) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('masterclass_articles')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function deleteArticle(id) {
        const client = getClient();
        if (!client) return { error: new Error('Supabase not initialized') };

        try {
            const { error } = await client
                .from('masterclass_articles')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    }

    // ============================================
    // LISTINGS: LIVE CREATOR DATA
    // ============================================
    async function getListings(options = {}) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Supabase not initialized') };

        try {
            let query = client.from('listings').select('*, creator:profiles(id,full_name,username,avatar_url,bio)', { count: 'exact' });

            if (options.status) {
                query = query.eq('status', options.status);
            }

            if (options.categories?.length) query = query.in('category', options.categories);
            if (options.category && !options.categories?.length) {
                query = query.eq('category', options.category);
            }

            if (options.creatorId) {
                query = query.eq('creator_id', options.creatorId);
            }

            if (options.search) {
                query = query.ilike('title', `%${options.search}%`);
            }

            if (options.featured) {
                query = query.eq('is_featured', true);
            }

            for (const [key, operator] of [['minPrice', 'gte'], ['maxPrice', 'lte']]) {
                if (options[key] !== undefined && options[key] !== null && options[key] !== '') {
                    query = query[operator]('price', Number(options[key]));
                }
            }

            if (options.limit) {
                const offset = Math.max(0, Number(options.offset) || 0);
                query = query.range(offset, offset + options.limit - 1);
            }

            const order = { latest: ['created_at', false], price_asc: ['price', true], price_desc: ['price', false], views: ['views', false] }[options.sort] || ['created_at', false];
            query = query.order(order[0], { ascending: order[1] }).order('id', { ascending: false });

            const { data, error, count } = await query;
            if (error) throw error;
            return { data: data || [], count: count || 0, error: null };
        } catch (error) {
            return { data: [], error };
        }
    }

    // ============================================
    // LISTINGS: GET SINGLE LISTING BY SLUG
    // ============================================
    async function getListingBySlug(slug) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('listings')
                .select('*, creator:profiles(id,full_name,username,avatar_url,bio)')
                .eq('slug', slug)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    // ============================================
    // LISTINGS: GET SINGLE LISTING BY ID
    // ============================================
    async function getListingById(id) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('listings')
                .select('*, creator:profiles(id,full_name,username,avatar_url,bio)')
                .eq('id', id)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    // ============================================
    // LISTINGS: SEARCH
    // ============================================
    async function searchListings(query, options = {}) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Supabase not initialized') };

        try {
            let q = client.from('listings').select('*, creator:profiles(id,full_name,username,avatar_url,bio)', { count: 'exact' });

            if (options.status) {
                q = q.eq('status', options.status);
            } else {
                q = q.eq('status', 'published');
            }

            if (query) {
                const pattern = JSON.stringify('%' + String(query).replace(/[\\%_]/g, '\\$&') + '%');
                q = q.or(`title.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`);
            }

            if (options.categories?.length) q = q.in('category', options.categories);
            if (options.category && !options.categories?.length) {
                q = q.eq('category', options.category);
            }

            if (options.minPrice !== undefined && options.minPrice !== null && options.minPrice !== '') {
                q = q.gte('price', options.minPrice);
            }

            if (options.maxPrice !== undefined && options.maxPrice !== null && options.maxPrice !== '') {
                q = q.lte('price', options.maxPrice);
            }

            if (options.limit) {
                const offset = Math.max(0, Number(options.offset) || 0);
                q = q.range(offset, offset + options.limit - 1);
            }

            const order = { latest: ['created_at', false], price_asc: ['price', true], price_desc: ['price', false], views: ['views', false] }[options.sort] || ['created_at', false];
            q = q.order(order[0], { ascending: order[1] }).order('id', { ascending: false });

            const { data, error, count } = await q;
            if (error) throw error;
            return { data: data || [], count: count || 0, error: null };
        } catch (error) {
            return { data: [], error };
        }
    }

    // ============================================
    // STATS: GET REAL COUNTS FROM BACKEND
    // ============================================
    async function getStats() {
        const client = getClient();
        if (!client) return { stats: null, error: new Error('Supabase not initialized') };

        try {
            // Count published listings
            const { count: listingsCount, error: listingsError } = await client
                .from('listings')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'published');

            if (listingsError) throw listingsError;

            // Count creators (profiles with role = 'creator')
            const { count: creatorsCount, error: creatorsError } = await client
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'creator');

            if (creatorsError) throw creatorsError;

            // Count published masterclass articles
            const { count: articlesCount, error: articlesError } = await client
                .from('masterclass_articles')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'published');

            if (articlesError) throw articlesError;

            // Count newsletter subscribers
            const { count: subscribersCount, error: subscribersError } = await client
                .from('newsletter_subscribers')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            if (subscribersError) throw subscribersError;

            return {
                stats: {
                    listings: listingsCount || 0,
                    creators: creatorsCount || 0,
                    articles: articlesCount || 0,
                    subscribers: subscribersCount || 0,
                },
                error: null
            };
        } catch (error) {
            return { stats: null, error };
        }
    }

    // ============================================
    // LISTINGS: GET FEATURED
    // ============================================
    async function getFeaturedListings(limit = 4) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('listings')
                .select('*, creator:profiles(id,full_name,username,avatar_url,bio)')
                .eq('status', 'published')
                .eq('is_featured', true)
                .limit(limit)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return { data: [], error };
        }
    }

    async function subscribeToNewsletter(payload = {}) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        const email = String(payload.email || '').trim().toLowerCase();
        const name = String(payload.name || '').trim();

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return { data: null, error: new Error('Please enter a valid email address.') };
        }

        try {
            const { data, error } = await client.rpc('subscribe_to_newsletter', {
                subscriber_email: email, subscriber_name: name || null,
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function getNewsletterSubscribers(options = {}) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Supabase not initialized') };

        try {
            let query = client.from('newsletter_subscribers').select('*');

            if (options.activeOnly) {
                query = query.eq('is_active', true);
            }

            query = query.order('subscribed_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return { data: [], error };
        }
    }

    async function sendNewsletterCampaign(campaign = {}) {
        try {
            const { session, error } = await getSession();
            if (error || !session) throw error || new Error('Please sign in again.');
            const endpoint = window.__ETCH_NEWSLETTER__?.endpoint || CONFIG.url + '/functions/v1/send-newsletter';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', apikey: CONFIG.anonKey,
                    Authorization: 'Bearer ' + session.access_token },
                body: JSON.stringify({ subject: campaign.subject, message: campaign.message,
                    campaignId: campaign.campaignId }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                return { sent: false, count: result.sent || 0, data: result,
                    error: new Error(result.error || result.message || 'Newsletter delivery failed.') };
            }
            return { sent: true, count: result.sent, data: result, error: null };
        } catch (error) {
            return { sent: false, count: 0, error };
        }
    }

    async function submitContact(payload) {
        const client = getClient();
        if (!client) return { error: new Error('Supabase not initialized') };
        return client.from('contacts').insert({
            name: String(payload.name || '').trim(), email: String(payload.email || '').trim(),
            subject: String(payload.subject || '').trim(), message: String(payload.message || '').trim(),
        });
    }

    async function requireAdmin() {
        const result = await requireAuth();
        return { ...result, authenticated: result.authenticated && result.profile?.role === 'admin' };
    }

    // Fetch aggregates independently of the current listing page.
    async function getCreatorStats() {
        const client = getClient();
        if (!client) return { error: new Error('Supabase not initialized') };
        return client.rpc('creator_listing_stats');
    }

    async function createListing(listingData) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('listings')
                .insert(listingData)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function updateListing(id, updates) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('listings')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function deleteListing(id) {
        const client = getClient();
        if (!client) return { error: new Error('Supabase not initialized') };

        try {
            const { error } = await client
                .from('listings')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    }

    // ============================================
    // SITE SETTINGS: CONTACT INFO & SOCIAL LINKS
    // ============================================
    async function getSiteSettings() {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('site_settings')
                .select('*')
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function updateSiteSettings(updates) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('site_settings')
                .upsert(updates)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    // ============================================
    // HOMEPAGE PARTNERS: PRESS, SPONSORS, TRUST SIGNALS
    // ============================================
    async function getHomepagePartners(options = {}) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Supabase not initialized') };

        try {
            let query = client
                .from('homepage_partners')
                .select('*')
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (options.status) query = query.eq('status', options.status);
            if (options.limit) query = query.limit(Number(options.limit));

            const { data, error } = await query;
            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return { data: [], error };
        }
    }

    async function createHomepagePartner(partnerData) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('homepage_partners')
                .insert(partnerData)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function updateHomepagePartner(id, updates) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('homepage_partners')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function deleteHomepagePartner(id) {
        const client = getClient();
        if (!client) return { error: new Error('Supabase not initialized') };

        try {
            const { error } = await client
                .from('homepage_partners')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    }

    // ============================================
    // MARKETPLACE CATEGORIES
    // ============================================
    async function getMarketplaceCategories(options = {}) {
        const client = getClient();
        if (!client) return { data: [], error: new Error('Supabase not initialized') };

        try {
            let query = client
                .from('marketplace_categories')
                .select('*')
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (options.status) query = query.eq('status', options.status);
            if (options.limit) query = query.limit(Number(options.limit));

            const { data, error } = await query;
            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return { data: [], error };
        }
    }

    async function createMarketplaceCategory(categoryData) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('marketplace_categories')
                .insert(categoryData)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function updateMarketplaceCategory(id, updates) {
        const client = getClient();
        if (!client) return { data: null, error: new Error('Supabase not initialized') };

        try {
            const { data, error } = await client
                .from('marketplace_categories')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async function deleteMarketplaceCategory(id) {
        const client = getClient();
        if (!client) return { error: new Error('Supabase not initialized') };

        try {
            const { error } = await client
                .from('marketplace_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    }

    // ============================================
    // AUTH GUARD: PROTECT DASHBOARD PAGES
    // ============================================
    async function requireAuth(options = {}) {
        const client = getClient();
        if (!client) {
            console.warn('Supabase not initialized');
            return { authenticated: false, redirect: options.redirectTo || '/user/auth/signin.html' };
        }

        try {
            const { user, error } = await getCurrentUser();

            if (error || !user) {
                return {
                    authenticated: false,
                    redirect: options.redirectTo || '/user/auth/signin.html',
                    error: error || new Error('No active session')
                };
            }

            // Get user profile
            const { profile } = await getProfile(user.id);

            return {
                authenticated: true,
                user,
                profile: profile,
                redirect: null
            };
        } catch (error) {
            return {
                authenticated: false,
                redirect: options.redirectTo || '/user/auth/signin.html',
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
        countRows,
        getSession,
        onAuthStateChange,
        getProfile,
        updateProfile,
        uploadFile,
        listFiles,
        removeFile,
        getPublicUrl,
        requireAuth,
        requireAdmin,
        submitContact,
        getCreatorStats,
        getListings,
        getListingBySlug,
        getListingById,
        searchListings,
        getStats,
        getFeaturedListings,
        getSiteSettings,
        updateSiteSettings,
        getHomepagePartners,
        createHomepagePartner,
        updateHomepagePartner,
        deleteHomepagePartner,
        getMarketplaceCategories,
        createMarketplaceCategory,
        updateMarketplaceCategory,
        deleteMarketplaceCategory,
        subscribeToNewsletter,
        getNewsletterSubscribers,
        sendNewsletterCampaign,
        createListing,
        updateListing,
        deleteListing,
        // Masterclass: Authors
        getAuthors,
        createAuthor,
        updateAuthor,
        deleteAuthor,
        // Masterclass: Categories
        getCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        // Masterclass: Articles
        getArticles,
        getArticleBySlug,
        createArticle,
        updateArticle,
        deleteArticle,
    };

    window.EtchSupabase = api;
    return api;
})();
