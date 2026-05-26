/**
 * Format a backend error payload for display in admin dialogs.
 *
 * The backend returns `{ status: false, error: "<Error.name>", reason: "<message>" }`.
 * Internal-only deployment — surfacing the exception name (DBException,
 * SqliteError, …) alongside the message helps admins diagnose issues without
 * having to dig through server logs.
 *
 * Usage:
 *   const msg = formatBackendError(body, '저장에 실패했어요.');
 *   if (msg) setDialogError(msg);
 *
 * Also covers thrown/network failures via `formatThrownError(err, fallback)`.
 */

export function formatBackendError(body, fallback) {
    if (body && typeof body === 'object') {
        const name = typeof body.error === 'string' && body.error.trim() ? body.error.trim() : '';
        const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : '';
        if (name && reason) return `${name}: ${reason}`;
        if (reason) return reason;
        if (name) return name;
    }
    return fallback || '서버 오류가 발생했어요.';
}

export function formatThrownError(err, fallback) {
    if (err instanceof Error) {
        const name = err.name && err.name !== 'Error' ? err.name : '';
        const msg = err.message || '';
        if (name && msg) return `${name}: ${msg}`;
        if (msg) return msg;
        if (name) return name;
    }
    return fallback || '서버와 통신할 수 없어요.';
}
