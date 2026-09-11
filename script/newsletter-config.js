/* All delivery is performed by the authenticated server function. */
window.__ETCH_NEWSLETTER__ = window.__ETCH_NEWSLETTER__ || { provider: 'supabase-function' };
window.sendNewsletterViaProvider = async function (options = {}) {
    const result = await EtchSupabase.sendNewsletterCampaign(options);
    return { success: result.sent, sent: result.count, error: result.error?.message, data: result.data };
};
