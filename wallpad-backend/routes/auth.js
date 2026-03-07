/**
 * @brief Authentication routes.
 * @description Handles login, token verification, and credential management.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const runtimeConfig = require('../runtimeConfig');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Helper to get current credentials (runtime overrides static config)
function getCredentials() {
	const runtimeCreds = runtimeConfig.get('credentials') || {};
	return {
		username: runtimeCreds.username || config.webUICreds.username,
		password: runtimeCreds.password || config.webUICreds.password
	};
}

// management console login
router.post('/signin', (req, res) => {
	try {
		const { username: corrUsername, password: corrPassword } = getCredentials();
		const { username, password } = req.body;
		const accessip = req.ip;

		if ((username !== corrUsername) || (password !== corrPassword)) {
			res.status(401);
			return res.json({ status: false });
		}

		const token = jwt.sign(
			{ username, accessip },
			config.webUICreds.jwtSecret,
			{ expiresIn: '30m' }
		);

		res.json({ status: true, token });
	} catch (err) {
		console.error('[mgmtSignin] Sign-in failed:', err);
		res.status(500).json({ status: false });
	}
});

// verify token validity
router.get('/token/verify', (req, res) => {
	try {
		const userToken = req.query.token || null;

		jwt.verify(userToken, config.webUICreds.jwtSecret, (err) => {
			if (!err) {
				res.json({ status: true });
			} else {
				res.status(401).json({ status: false });
			}
		});
	} catch (err) {
		console.error('[verifyManagementToken] Error:', err);
		res.status(500).json({ status: false });
	}
});

// renew (extend) token
router.post('/token/renew', requireAuth, (req, res) => {
	try {
		const userToken = req.body.token || req.headers.authorization;
		const decoded = jwt.verify(userToken, config.webUICreds.jwtSecret);

		const newToken = jwt.sign(
			{ username: decoded.username, accessip: decoded.accessip },
			config.webUICreds.jwtSecret,
			{ expiresIn: '30m' }
		);

		res.json({ status: true, token: newToken });
	} catch (err) {
		console.error('[token/renew] Failed:', err.message);
		res.status(401).json({ status: false });
	}
});

// change password (requires current password verification)
router.post('/password/change', requireAuth, (req, res) => {
	try {
		const { currentPassword, newUsername, newPassword } = req.body;
		const { password: corrPassword } = getCredentials();

		// verify current password
		if (currentPassword !== corrPassword) {
			return res.status(401).json({ status: false, reason: 'InvalidCurrentPassword' });
		}

		// validate new password
		if (!newPassword || newPassword.length < 4) {
			return res.status(400).json({ status: false, reason: 'PasswordTooShort' });
		}

		// update credentials in runtime config
		const currentCreds = runtimeConfig.get('credentials') || {};
		const updatedCreds = {
			username: newUsername || currentCreds.username || config.webUICreds.username,
			password: newPassword
		};
		runtimeConfig.set('credentials', updatedCreds);

		console.log('[password/change] Credentials updated successfully');
		res.json({ status: true });
	} catch (err) {
		console.error('[password/change] Error:', err);
		res.status(500).json({ status: false });
	}
});

module.exports = router;
