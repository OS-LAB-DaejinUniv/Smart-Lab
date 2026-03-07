/**
 * @brief Authentication middleware for Express routes.
 * @description Extracts JWT tokens from requests and provides route-level auth guard.
 * @author Smart-Lab
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Global middleware: extracts JWT token from Authorization header (GET)
 * or request body token field (POST), and sets req.authed accordingly.
 * Always calls next() — non-blocking.
 */
function extractToken(req, res, next) {
	try {
		const token = (() => {
			// Always check Authorization header first, then fall back to body token
			if (req.headers.authorization) {
				return req.headers.authorization;
			}
			if (req.method === 'POST') {
				return req.body?.token;
			}
		})();

		if (!token) {
			req.authed = false;
			return next();
		}

		jwt.verify(token, config.webUICreds.jwtSecret, (err) => {
			req.authed = !err;
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

module.exports = { extractToken, requireAuth };
