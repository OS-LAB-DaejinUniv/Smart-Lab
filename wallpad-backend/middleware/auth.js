/**
 * @brief Authentication middleware for Express routes.
 * @description Extracts the access JWT from the Authorization header
 *   and sets req.authed accordingly. Body-based token fallback is intentionally
 *   not supported — all admin clients must send `Authorization: Bearer <token>`.
 * @author Smart-Lab
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

function parseBearer(headerValue) {
	if (!headerValue || typeof headerValue !== 'string') return null;
	const match = headerValue.match(/^Bearer\s+(.+)$/i);
	return match ? match[1].trim() : null;
}

/**
 * Global middleware: reads `Authorization: Bearer <token>` and sets req.authed.
 * Always calls next() — non-blocking; route-level requireAuth enforces 401.
 */
function extractToken(req, res, next) {
	try {
		const token = parseBearer(req.headers.authorization);
		if (!token) {
			req.authed = false;
			return next();
		}

		jwt.verify(token, config.webUICreds.jwtSecret, (err, decoded) => {
			req.authed = !err && decoded?.typ === 'access';
			next();
		});

	} catch (err) {
		console.error('[extractToken] Error:', err);
		req.authed = false;
		next();
	}
}

/**
 * Route-level middleware: returns 401 if req.authed is false.
 * Use as: app.post('/path', requireAuth, handler)
 */
function requireAuth(req, res, next) {
	if (!req.authed) {
		res.status(401);
		return res.json({ status: false, reason: 'InvalidToken' });
	}
	next();
}

module.exports = { extractToken, requireAuth, parseBearer };
