import { backendPort } from './backend';

export const getAccessToken = () =>
    (typeof window !== 'undefined' ? window.localStorage.getItem('token') : '') || '';
export const getRefreshToken = () =>
    (typeof window !== 'undefined' ? window.localStorage.getItem('refreshToken') : '') || '';

export function setTokens({ accessToken, refreshToken }) {
    if (typeof window === 'undefined') return;
    if (accessToken) window.localStorage.setItem('token', accessToken);
    if (refreshToken) window.localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('refreshToken');
}

// Exchange a preauth hash (from `/settings?preauth=...`) for a token pair.
// The backend re-hashes (jwtSecret + "YYYY-MM-DD HH:MM") for now ±1 minute
// and accepts the first match. Returns true on success (tokens stored).
export async function tryPreauth(hash) {
    if (!hash || typeof window === 'undefined') return false;
    try {
        const url = new URL('/wallpad/management/preauth', `http://${location.hostname}:${backendPort}`);
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash }),
        });
        const body = await res.json().catch(() => ({}));
        if (body && body.status && body.accessToken) {
            setTokens({ accessToken: body.accessToken, refreshToken: body.refreshToken });
            return true;
        }
        return false;
    } catch (err) {
        console.error('[tryPreauth] failed', err);
        return false;
    }
}

let _refreshInFlight = null;
export async function refreshAccessToken() {
    if (_refreshInFlight) return _refreshInFlight;
    const refresh = getRefreshToken();
    if (!refresh) return null;

    const url = new URL('/wallpad/management/token/refresh', `http://${location.hostname}:${backendPort}`);
    _refreshInFlight = fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${refresh}` }
    })
        .then(res => res.json())
        .then(body => {
            if (body && body.status && body.accessToken) {
                setTokens({ accessToken: body.accessToken, refreshToken: body.refreshToken });
                return body.accessToken;
            }
            return null;
        })
        .catch(() => null)
        .finally(() => { _refreshInFlight = null; });
    return _refreshInFlight;
}

/**
 * fetch wrapper that attaches `Authorization: Bearer <accessToken>` and,
 * on a 401 response, transparently refreshes once and retries.
 */
export async function authFetch(input, init = {}) {
    const buildInit = (token) => ({
        ...init,
        headers: {
            ...(init.headers || {}),
            'Authorization': `Bearer ${token}`
        }
    });

    let token = getAccessToken();
    let resp = await fetch(input, buildInit(token));
    if (resp.status !== 401) return resp;

    const newToken = await refreshAccessToken();
    if (!newToken) return resp;
    return fetch(input, buildInit(newToken));
}

export function signoutHandler() {
    if (typeof window !== 'undefined') {
        clearTokens();
        window.location.href = '/settings/signin';
    }
}
