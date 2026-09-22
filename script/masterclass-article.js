/* ============================================
   MASTERCLASS-ARTICLE.JS - ETCH Article Detail Page
   ============================================ */

(function () {
    'use strict';

    function getSlugFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('slug') || '';
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    function getInitials(name) {
        if (!name) return 'ET';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function escapeHtml(str) { return EtchUI.escapeHtml(str); }

    function renderEmptyState(message = '') {
        const articleEl = document.getElementById('article');
        if (!articleEl) return;
        articleEl.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 text-center">
                <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-olive/10 to-lavender/10 flex items-center justify-center mb-4">
                    <svg class="w-10 h-10 text-olive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
                <h1 class="font-display text-2xl font-bold text-ink dark:text-white mb-2">${message ? 'Unable to load article' : 'Article not found'}</h1>
                <p class="text-sm text-slate/60 dark:text-gray-500 max-w-sm mb-6">
                    ${escapeHtml(message || 'The article you are looking for does not exist or may have been unpublished.')}
                </p>
                <a href="masterclass.html"
                    class="inline-flex items-center gap-2 px-6 py-3 bg-olive text-white rounded-2xl font-medium hover:bg-olive-dark transition-colors duration-200">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Masterclass
                </a>
            </div>
                 `;
    }

    function renderArticle(article) {
        const categoryEl = document.getElementById('articleCategory');
        const categoryPillEl = document.getElementById('articleCategoryPill');
        const titleEl = document.getElementById('articleTitle');
        const excerptEl = document.getElementById('articleExcerpt');
        const metaEl = document.getElementById('articleMeta');
        const imageEl = document.getElementById('articleImage');
        const contentEl = document.getElementById('articleContent');
        const authorCardEl = document.getElementById('articleAuthorCard');

        const categoryName = article.category?.name || 'Masterclass';
        const author = article.author?.name || 'Etch Editorial';

        if (categoryEl) { categoryEl.textContent = categoryName; }
        if (categoryPillEl) { categoryPillEl.textContent = categoryName; }
        if (titleEl) {
            titleEl.textContent = article.title;
            document.title = article.seo_title || `${article.title} | ETCH Masterclass`;
        }
        document.querySelector('meta[name="description"]')?.setAttribute('content', article.seo_description || article.excerpt || 'ETCH Masterclass article');
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
        const savedCanonical = EtchUI.safeUrl(article.canonical_url);
        canonical.href = savedCanonical && !new URL(savedCanonical).pathname.startsWith('/masterclass/article/')
            ? savedCanonical : new URL(EtchUI.articleUrl(article.slug), window.location.origin).href;
        for (const [name,value,attribute] of [
            ['keywords',article.seo_keywords || '', 'name'],
            ['og:title',article.seo_title || article.title,'property'],
            ['og:description',article.seo_description || article.excerpt || '', 'property'],
            ['og:image',EtchUI.safeUrl(article.featured_image),'property'],
            ['og:url',canonical.href,'property']
        ]) {
            let meta=document.querySelector(`meta[${attribute}="${name}"]`);
            if(!meta){meta=document.createElement('meta');meta.setAttribute(attribute,name);document.head.append(meta);}
            meta.content=value;
        }
        if (excerptEl) {
            excerptEl.textContent = article.excerpt || 'A practical perspective from the ETCH Masterclass.';
        }

        if (metaEl) {
            metaEl.innerHTML = `
                <div class="flex items-center gap-3 rounded-full border border-border dark:border-white/10 bg-white dark:bg-ink px-3 py-2 shadow-sm dark:shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
                    <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-olive/20 to-emerald-500/20 text-xs font-bold text-olive">
                        ${escapeHtml(getInitials(author))}
                    </div>
                    <div>
                        <p class="font-semibold text-ink dark:text-white">${escapeHtml(author)}</p>
                        <p class="text-xs text-slate/60 dark:text-gray-500">${formatDate(article.published_at)} · ${Number(article.reading_time) || 5} min read</p>
                    </div>
                </div>
                <span class="rounded-full border border-border dark:border-white/10 bg-white dark:bg-ink px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate/70 dark:text-gray-500">${escapeHtml(article.status || 'Published')}</span>
            `;
        }

        if (authorCardEl) {
            authorCardEl.innerHTML = `
                <div class="mt-4 flex items-center gap-3">
                    <div class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-olive/20 to-emerald-500/20 text-sm font-bold text-olive">
                        ${escapeHtml(getInitials(author))}
                    </div>
                    <div>
                        <p class="font-display text-2xl leading-none text-ink dark:text-white">${escapeHtml(author)}</p>
                        <p class="mt-1 text-sm text-slate/70 dark:text-gray-500">${escapeHtml(article.author?.role || 'ETCH editorial contributor')}</p>
                    </div>
                </div>
                <p class="mt-4 text-sm leading-relaxed text-slate/70 dark:text-gray-500">${escapeHtml(article.author?.bio || 'Writing on craft, career strategy, and the business of creating with intention.')}</p>
            `;
        }

        if (authorCardEl && EtchUI.safeUrl(article.author?.avatar_url)) {
            const avatar = authorCardEl.querySelector('.rounded-full');
            if (avatar) {
                const img = document.createElement('img');
                img.src = EtchUI.safeUrl(article.author.avatar_url);
                img.alt = author;
                img.className = 'w-full h-full rounded-full object-cover';
                avatar.replaceChildren(img);
            }
        }

        if (imageEl) {
            if (article.featured_image) {
                imageEl.innerHTML = `
                    <div class="overflow-hidden rounded-[24px]">
                        <img src="${escapeHtml(EtchUI.safeUrl(article.featured_image))}" alt="${escapeHtml(article.title)}" class="h-[420px] w-full object-cover md:h-[520px]" />
                    </div>
                `;
            } else {
                imageEl.innerHTML = `
                    <div class="flex h-[420px] w-full items-center justify-center rounded-[24px] border border-dashed border-border dark:border-white/10 bg-gradient-to-br from-olive/10 via-stone to-lavender/10 dark:via-ink/40 text-olive md:h-[520px]">
                        <div class="text-center">
                            <svg class="mx-auto mb-3 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p class="text-sm font-medium dark:text-gray-400">No featured image available</p>
                        </div>
                    </div>
                `;
            }
        }

        if (contentEl) {
            if (typeof DOMPurify === 'undefined') {
                contentEl.textContent = 'Article content could not be loaded safely. Please refresh to try again.';
                return;
            }
            contentEl.innerHTML = DOMPurify.sanitize(article.content || '<p>No content available.</p>', { USE_PROFILES: { html: true } });
        }
    }

    async function loadArticle() {
        const token = new URLSearchParams(location.hash.slice(1)).get('token');
        const slug = getSlugFromUrl();
        if (!slug && !token) { renderEmptyState(); return; }
        if (typeof EtchSupabase === 'undefined') {
            console.error('EtchSupabase not loaded');
            renderEmptyState();
            return;
        }
        try {
            let result;
            if (token) {
                const response = await EtchSupabase.getClient().functions.invoke('article-preview',{body:{action:'read',token}});
                result = {data:response.data?.article,error:response.error || (response.data?.error ? new Error(response.data.error) : null)};
            } else result = await EtchSupabase.getArticleBySlug(slug);
            const { data, error } = result;
            if (error) {
                if (error.code === 'PGRST116') renderEmptyState();
                else renderEmptyState('Please refresh to try again.');
                return;
            }
            if (!data) { renderEmptyState(); return; }
            if (data.status !== 'published') {
                const preview = new URLSearchParams(window.location.search).get('preview') === '1';
                const admin = preview ? await EtchSupabase.requireAdmin() : null;
                if (!token && !admin?.authenticated) { renderEmptyState(); return; }
                const robots = document.createElement('meta');
                robots.name = 'robots'; robots.content = 'noindex, nofollow'; document.head.appendChild(robots);
            }
            renderArticle(data);
            if (!token && data.status === 'published') window.EtchReport?.attach('article',data.id,document.getElementById('article'));
        } catch (error) {
            console.error('Error loading article:', error);
            renderEmptyState('Please refresh to try again.');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadArticle);
    } else {
        loadArticle();
    }

})();

