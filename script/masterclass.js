/* ============================================
   MASTERCLASS.JS - ETCH Masterclass Landing Page
   ============================================ */

(function () {
    'use strict';

    // ============================================
    // CONFIG
    // ============================================
    const CONFIG = {
        articlesLimit: 6,
    };

    // ============================================
    // HELPERS
    // ============================================
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function getInitials(name) {
        if (!name) return 'ET';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function escapeHtml(str) { return EtchUI.escapeHtml(str); }

    // ============================================
    // EMPTY STATE
    // ============================================
    function getEmptyState(title, message) {
        return `
            <div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-olive/10 to-lavender/10 flex items-center justify-center mb-4">
                    <svg class="w-10 h-10 text-olive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
                <h3 class="font-display text-xl font-bold text-ink dark:text-white mb-2">${escapeHtml(title)}</h3>
                <p class="text-sm text-slate/60 dark:text-gray-500 max-w-sm">${escapeHtml(message)}</p>
            </div>
        `;
    }

    // ============================================
    // RENDER FEATURED ARTICLE
    // ============================================
    function renderFeaturedArticle(article) {
        const container = document.getElementById('featuredArticle');
        if (!container) return;

        if (!article) {
            container.innerHTML = `
                <div class="bg-white dark:bg-ink rounded-2xl border border-border dark:border-white/10 p-4">
                    <div class="w-full h-56 bg-stone dark:bg-white/5 rounded-lg flex flex-col items-center justify-center text-slate dark:text-gray-500 gap-3">
                        <svg class="w-12 h-12 text-slate/30 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p class="text-sm dark:text-gray-500">No featured article yet.</p>
                    </div>
                </div>
            `;
            return;
        }

        const category = article.category?.name || 'Masterclass';
        const author = article.author?.name || 'Etch Editorial';
        const imageMarkup = article.featured_image
            ? `<img src="${escapeHtml(EtchUI.safeUrl(article.featured_image))}" alt="${escapeHtml(article.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />`
            : `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-olive/15 via-stone to-lavender/10 text-olive">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>`;

        container.innerHTML = `
            <a href="${EtchUI.escapeHtml(EtchUI.articleUrl(article.slug))}"
                class="group block bg-white dark:bg-ink rounded-2xl border border-border dark:border-white/10 overflow-hidden hover:border-olive/40 hover:shadow-2xl transition-all duration-500">
                <div class="relative h-56 overflow-hidden">
                    ${imageMarkup}
                    <span class="absolute top-4 left-4 px-3 py-1 bg-white/90 dark:bg-ink/90 backdrop-blur-sm rounded-full text-xs font-medium text-olive">
                        ${escapeHtml(category)}
                    </span>
                </div>
                <div class="p-6">
                    <h3 class="font-display text-xl font-bold text-ink dark:text-white group-hover:text-olive transition-colors duration-200 leading-snug">
                        ${escapeHtml(article.title)}
                    </h3>
                    <p class="text-sm text-slate/60 dark:text-gray-500 mt-2 line-clamp-2">${escapeHtml(article.excerpt || '')}</p>
                    <div class="flex items-center gap-3 mt-4 pt-4 border-t border-border/60 dark:border-white/10">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-olive/20 to-emerald-500/20 flex items-center justify-center text-xs font-bold text-olive">
                            ${escapeHtml(getInitials(author))}
                        </div>
                        <div class="text-xs">
                            <p class="font-medium text-ink dark:text-white">${escapeHtml(author)}</p>
                            <p class="text-slate/40 dark:text-gray-500">${formatDate(article.published_at)} · ${Number(article.reading_time) || 5} min read</p>
                        </div>
                    </div>
                </div>
            </a>
        `;
    }

    // ============================================
    // RENDER LATEST ARTICLES
    // ============================================
    function renderLatestArticles(articles) {
        const grid = document.getElementById('latestGrid');
        if (!grid) return;

        if (!articles.length) {
            grid.innerHTML = getEmptyState(
                'No articles yet',
                'The Masterclass is being prepared. Check back soon for creative insights and guides.'
            );
            return;
        }

        grid.innerHTML = articles.map(article => {
            const category = article.category?.name || 'Masterclass';
            const author = article.author?.name || 'Etch Editorial';
            const imageMarkup = article.featured_image
                ? `<img src="${escapeHtml(EtchUI.safeUrl(article.featured_image))}" alt="${escapeHtml(article.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />`
                : `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-olive/15 via-stone to-lavender/10 text-olive">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>`;

            return `
                <a href="${EtchUI.escapeHtml(EtchUI.articleUrl(article.slug))}"
                    class="group bg-white dark:bg-ink rounded-2xl border border-border dark:border-white/10 overflow-hidden hover:border-olive/40 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
                    <div class="relative h-48 overflow-hidden">
                        ${imageMarkup}
                        <span class="absolute top-3 left-3 px-2.5 py-0.5 bg-white/90 dark:bg-ink/90 backdrop-blur-sm rounded-full text-[10px] font-medium text-olive">
                            ${escapeHtml(category)}
                        </span>
                    </div>
                    <div class="p-5">
                        <h3 class="font-semibold text-ink dark:text-white group-hover:text-olive transition-colors duration-200 leading-snug line-clamp-2">
                            ${escapeHtml(article.title)}
                        </h3>
                        <p class="text-sm text-slate/60 dark:text-gray-500 mt-2 line-clamp-2">${escapeHtml(article.excerpt || '')}</p>
                        <div class="flex items-center gap-2 mt-4 text-xs text-slate/40 dark:text-gray-500">
                            <span>${escapeHtml(author)}</span>
                            <span>·</span>
                            <span>${formatDate(article.published_at)}</span>
                            <span>·</span>
                            <span>${Number(article.reading_time) || 5} min</span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
    }

    // ============================================
    // RENDER CATEGORIES
    // ============================================
    function renderCategories(categories) {
        const container = document.getElementById('categoryList');
        if (!container) return;

        if (!categories.length) {
            container.innerHTML = `
                <span class="text-sm text-slate/60 dark:text-gray-500">Categories will appear here once articles are published.</span>
            `;
            return;
        }

        container.innerHTML = categories.map(cat => `
            <a href="masterclass.html?category=${encodeURIComponent(cat.id)}"
                class="px-4 py-2 bg-stone dark:bg-white/5 rounded-full text-sm text-slate dark:text-gray-400 hover:bg-olive/10 hover:text-olive transition-colors duration-200">
                ${escapeHtml(cat.name)}
            </a>
        `).join('');
    }

    // ============================================
    // LOAD DATA
    // ============================================
    async function loadMasterclass() {
        if (typeof EtchSupabase === 'undefined') {
            console.error('EtchSupabase not loaded');
            renderFeaturedArticle(null);
            renderLatestArticles([]);
            renderCategories([]);
            return;
        }

        try {
            const categoryId = new URLSearchParams(window.location.search).get('category') || undefined;
            const [featuredResult, articlesResult, categoriesResult] = await Promise.all([
                EtchSupabase.getArticles({ status: 'published', featured: true, categoryId, limit: 1, summary: true }),
                EtchSupabase.getArticles({ status: 'published', categoryId, limit: CONFIG.articlesLimit, summary: true }),
                EtchSupabase.getCategories({ status: 'active' }),
            ]);
            for (const result of [featuredResult, articlesResult, categoriesResult]) {
                if (result.error) throw result.error;
            }
            renderFeaturedArticle(featuredResult.data?.[0] || null);
            renderLatestArticles(articlesResult.data || []);
            renderCategories(categoriesResult.data || []);
        } catch (error) {
            console.error('Error loading masterclass:', error);
            renderFeaturedArticle(null);
            const grid = document.getElementById('latestGrid');
            if (grid) grid.innerHTML = getEmptyState('Unable to load articles', 'Please refresh to try again.');
            renderCategories([]);
        }
    }

    // ============================================
    // INIT
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadMasterclass);
    } else {
        loadMasterclass();
    }

})();