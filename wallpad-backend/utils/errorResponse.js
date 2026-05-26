/**
 * Standard error payload for management API responses. Internal-only network,
 * so we surface the exception name (e.g. "DBException", "SqliteError",
 * "TypeError") alongside the message — handy when an admin needs to file a
 * bug, but we still avoid leaking a full stack trace.
 *
 *   { status: false, error: "<Error.name>", reason: "<Error.message>" }
 */
function errorResponse(err, fallbackReason) {
    const safe = err instanceof Error ? err : null;
    return {
        status: false,
        error: safe && safe.name ? safe.name : 'Error',
        reason: (safe && safe.message) || fallbackReason || 'Unknown error',
    };
}

module.exports = errorResponse;
