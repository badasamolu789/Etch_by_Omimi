/* Shared, dependency-free rendering and routing helpers. */
(function () {
    'use strict';
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
    function safeUrl(value) {
        if (!value) return '';
        try {
            const url = new URL(String(value), window.location.origin);
            return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
        } catch { return ''; }
    }
    function pageName(path = window.location.pathname) {
        return path.replace(/\/+$/, '').split('/').pop().replace(/\.html$/, '') || 'index';
    }
    function listingUrl(listing) {
        const key = listing.slug ? 'slug' : 'id';
        return '/product-detail.html?' + new URLSearchParams({ [key]: listing[key] }).toString();
    }
    function articleUrl(slug, preview = false) {
        const params = new URLSearchParams({ slug });
        if (preview) params.set('preview', '1');
        return '/article.html?' + params.toString();
    }
    function setTheme(theme) {
        theme = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('theme', theme);
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }
    function pagination(total, size = 24) {
        const container = document.getElementById('pagination');
        if (!container) return;
        const url = new URL(window.location.href);
        const page = Math.max(1, Number.parseInt(url.searchParams.get('page'), 10) || 1);
        const pages = Math.max(1, Math.ceil(total / size));
        container.replaceChildren();
        for (const [label, target] of [['Previous', page - 1], ['Next', page + 1]]) {
            const control = document.createElement(target < 1 || target > pages ? 'span' : 'a');
            control.textContent = label;
            control.className = 'px-4 py-2 rounded-xl border border-border text-sm';
            if (control.tagName === 'A') {
                url.searchParams.set('page', target);
                control.href = url.pathname + url.search;
            } else control.setAttribute('aria-disabled', 'true');
            container.appendChild(control);
        }
        const label = document.createElement('span');
        label.textContent = `Page ${page} of ${pages}`;
        container.appendChild(label);
    }
    function marketFilters() {
        const params = new URLSearchParams(window.location.search);
        return { categories: params.getAll('category'), minPrice: params.get('minPrice'), maxPrice: params.get('maxPrice'), sort: params.get('sort') || 'latest' };
    }
    window.EtchUI = { escapeHtml, safeUrl, pageName, listingUrl, articleUrl, setTheme, pagination, marketFilters };
})();
