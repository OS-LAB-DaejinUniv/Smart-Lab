/**
 * @brief Authentication routes.
 * @description Handles login, token verification, refresh, and credential management.
 *   Tokens come in pairs: a short-lived `access` token and a 3-day `refresh` token,
 *   distinguished by the `typ` claim. All authenticated requests use the
 *   `Authorization: Bearer <token>` header.
 */

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const runtimeConfig = require('../runtimeConfig');
const { requireAuth, parseBearer } = require('../middleware/auth');

const router = express.Router();

const ACCESS_TTL = '30m';
const REFRESH_TTL = '3d';

function issueTokenPair(username, accessip) {
	const accessToken = jwt.sign(
		{ username, accessip, typ: 'access' },
		config.webUICreds.jwtSecret,
		{ expiresIn: ACCESS_TTL }
	);
	const refreshToken = jwt.sign(
		{ username, accessip, typ: 'refresh' },
		config.webUICreds.jwtSecret,
		{ expiresIn: REFRESH_TTL }
	);
	return { accessToken, refreshToken };
}

// Format a Date as "YYYY-MM-DD HH:MM" in server local time, the same shape
// the preauth link generator hashes.
function formatTimeMinute(d) {
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// passwordless preauth login. The caller computes
//   sha256(jwtSecret + "YYYY-MM-DD HH:MM")
// and posts it here. We re-hash the same shape for now-1min/now/now+1min and
// accept the request if any match — that ±1 minute window absorbs the gap
// between when the link was generated and when it is clicked. On match we
// issue the same access/refresh pair as a normal signin.
router.post('/preauth', (req, res) => {
	try {
		const { hash } = req.body || {};
		if (!hash || typeof hash !== 'string') {
			return res.status(400).json({ status: false, reason: 'MissingHash' });
		}

		const secret = config.webUICreds.jwtSecret;
		const now = new Date();
		const candidates = [-1, 0, 1].map((delta) => {
			const t = new Date(now.getTime() + delta * 60_000);
			return crypto.createHash('sha256').update(secret + formatTimeMinute(t)).digest('hex');
		});

		// Timing-safe comparison: equal-length compare for each candidate.
		const provided = Buffer.from(String(hash).toLowerCase(), 'utf8');
		const matched = candidates.some((c) => {
			const cb = Buffer.from(c, 'utf8');
			return cb.length === provided.length && crypto.timingSafeEqual(cb, provided);
		});

		if (!matched) {
			console.warn(`[preauth] rejected from ${req.ip}`);
			return res.status(401).json({ status: false, reason: 'InvalidPreauth' });
		}

		const { accessToken, refreshToken } = issueTokenPair(config.webUICreds.username, req.ip);
		console.log(`[preauth] issued tokens for ${req.ip}`);
		res.json({ status: true, accessToken, refreshToken });
	} catch (err) {
		console.error('[preauth] failed:', err);
		res.status(500).json({ status: false });
	}
});

// management console login
router.post('/signin', (req, res) => {
	try {
		const { username: corrUsername, password: corrPassword } = config.webUICreds;
		const { username, password } = req.body;
		const accessip = req.ip;

		if ((username !== corrUsername) || (password !== corrPassword)) {
			res.status(401);
			return res.json({ status: false });
		}

		const { accessToken, refreshToken } = issueTokenPair(username, accessip);
		res.json({ status: true, accessToken, refreshToken });
	} catch (err) {
		console.error('[mgmtSignin] Sign-in failed:', err);
		res.status(500).json({ status: false });
	}
});

// verify access token validity (middleware already populates req.authed)
router.get('/token/verify', (req, res) => {
	if (req.authed) {
		res.json({ status: true });
	} else {
		res.status(401).json({ status: false });
	}
});

// refresh tokens — accepts refresh token via Authorization header,
// returns a freshly-issued access + refresh pair (rotation).
router.post('/token/refresh', (req, res) => {
	try {
		const token = parseBearer(req.headers.authorization);
		if (!token) {
			return res.status(401).json({ status: false, reason: 'MissingRefreshToken' });
		}

		const decoded = jwt.verify(token, config.webUICreds.jwtSecret);
		if (decoded.typ !== 'refresh') {
			return res.status(401).json({ status: false, reason: 'InvalidRefreshToken' });
		}

		const { accessToken, refreshToken } = issueTokenPair(decoded.username, decoded.accessip);
		res.json({ status: true, accessToken, refreshToken });
	} catch (err) {
		console.error('[token/refresh] Failed:', err.message);
		res.status(401).json({ status: false, reason: 'InvalidRefreshToken' });
	}
});

// change password (requires current password verification)
router.post('/password/change', requireAuth, (req, res) => {
	try {
		const { currentPassword, newUsername, newPassword } = req.body;
		const { password: corrPassword } = config.webUICreds;

		// verify current password
		if (currentPassword !== corrPassword) {
			return res.status(401).json({ status: false, reason: 'InvalidCurrentPassword' });
		}

		// validate new password
		if (!newPassword || newPassword.length < 4) {
			return res.status(400).json({ status: false, reason: 'PasswordTooShort' });
		}

		if (newUsername) config.webUICreds.username = newUsername;
		config.webUICreds.password = newPassword;
		runtimeConfig.save();

		console.log('[password/change] Credentials updated successfully');
		res.json({ status: true });
	} catch (err) {
		console.error('[password/change] Error:', err);
		res.status(500).json({ status: false });
	}
});

module.exports = router;
