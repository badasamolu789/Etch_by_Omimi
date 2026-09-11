(function () {
    const fallbackCategories = [{ name: 'Scripts', slug: 'script' }];

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[char]));
    }

    async function loadPublishedCategories() {
        if (!window.EtchSupabase?.getMarketplaceCategories) return fallbackCategories;
        const { data, error } = await window.EtchSupabase.getMarketplaceCategories({ status: 'published' });
        if (error || !data?.length) return fallbackCategories;
        return data;
    }

    function renderCategoryFilters(categories, selected) {
        const container = document.getElementById('marketplaceCategoryFilters');
        if (!container) return;

        container.innerHTML = categories.map(category => {
            const slug = escapeHtml(category.slug || 'script');
            const name = escapeHtml(category.name || 'Scripts');
            const checked = selected.includes(category.slug) ? ' checked' : '';
            return `
                <label class="flex items-center gap-3 text-sm text-slate dark:text-gray-400 hover:text-ink dark:hover:text-white cursor-pointer transition-colors duration-200">
                    <input type="checkbox" name="category" value="${slug}" class="w-4 h-4 rounded border-border dark:border-white/10 text-olive focus:ring-olive focus:ring-2 focus:ring-offset-0"${checked} />
                    ${name}
                    <span data-category-filter-count="${slug}" class="ml-auto text-xs text-slate/40">0</span>
                </label>
            `;
        }).join('');
    }

    async function initialize() {
        const params = new URLSearchParams(window.location.search);
        const selected = params.getAll('category');
        renderCategoryFilters(await loadPublishedCategories(), selected);
        const inputs = [...document.querySelectorAll('aside input[type="checkbox"]')];
        inputs.forEach(input => { input.checked = selected.includes(input.value); });
        const min = document.querySelector('aside input[placeholder="Min"]');
        const max = document.querySelector('aside input[placeholder="Max"]');
        if (min) { min.value = params.get('minPrice') || ''; min.min = '0'; }
        if (max) { max.value = params.get('maxPrice') || ''; max.min = '0'; }
        const sort = document.querySelector('select[data-market-sort]');
        if (sort) sort.value = params.get('sort') || 'latest';
        const navigate = clear => {
            const url = new URL(window.location.href);
            for (const key of ['category', 'minPrice', 'maxPrice', 'page', 'sort']) url.searchParams.delete(key);
            if (!clear) {
                if (!min?.reportValidity() || !max?.reportValidity()) return;
                if (min.value && max.value && Number(min.value) > Number(max.value)) {
                    max.setCustomValidity('Maximum price must be at least the minimum.');
                    max.reportValidity(); max.setCustomValidity(''); return;
                }
                inputs.filter(input => input.checked).forEach(input => url.searchParams.append('category', input.value));
                if (min.value !== '') url.searchParams.set('minPrice', min.value);
                if (max.value !== '') url.searchParams.set('maxPrice', max.value);
                if (sort) url.searchParams.set('sort', sort.value);
            }
            window.location.assign(url.pathname + url.search);
        };
        const buttons = [...document.querySelectorAll('aside button')];
        buttons.find(button => /Apply Filters/.test(button.textContent))?.addEventListener('click', () => navigate(false));
        buttons.find(button => /Clear\s+all/.test(button.textContent))?.addEventListener('click', () => navigate(true));
        sort?.addEventListener('change', () => navigate(false));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
    else initialize();
})();
