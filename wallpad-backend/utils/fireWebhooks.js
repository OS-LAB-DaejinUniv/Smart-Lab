/**
 * Fan-out non-blocking POSTs to admin-registered webhook URLs.
 *
 * Fire-and-forget: each request has a 3s abort budget and failures are
 * logged but never thrown back to the caller. A status update must never
 * be held up (or rolled back) because an external endpoint is slow or
 * unreachable.
 */
module.exports = function fireWebhooks(urls, payload) {
    if (!Array.isArray(urls) || urls.length === 0) return;

    const body = JSON.stringify(payload);
    for (const url of urls) {
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: AbortSignal.timeout(3000),
        }).catch(err => {
            console.warn(`[webhook] ${url}: ${err && err.message ? err.message : err}`);
        });
    }
};
