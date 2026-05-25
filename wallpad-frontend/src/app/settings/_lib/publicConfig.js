import { backendOrigin } from './backend';

export const DEFAULT_TITLE = 'OS Lab Smart Wallpad';

export async function fetchPublicConfig() {
    try {
        const res = await fetch(`${backendOrigin()}/wallpad/config/public`);
        const body = await res.json();
        if (!body || !body.status) return null;
        return body;
    } catch (err) {
        console.error('[publicConfig] fetch failed', err);
        return null;
    }
}
