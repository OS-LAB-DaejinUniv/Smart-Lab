/**
 * @brief System management routes.
 * @description Handles refresh, reboot, poweroff, CPU temp, uptime, status, emoji, message.
 */

const express = require('express');
const fs = require('fs');
const { execSync } = require('child_process');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const cacheFlush = require('../utils/cacheFlush');
const SCEvent = require('../SCEvent');

module.exports = function (io) {
	const router = express.Router();

	// refresh wallpad
	router.post('/refresh', requireAuth, (req, res) => {
		try {
			const { rmcache } = req.body;
			if (rmcache) {
				cacheFlush(config.nextCacheDir);
			}
			io.emit('reqFrontendRefresh');
			res.json({ status: true });
		} catch (err) {
			console.error('Failed to flush next cache:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// reboot wallpad
	router.post('/reboot', requireAuth, (req, res) => {
		try {
			execSync(config.rebootCommand);
			res.json({ status: true });
		} catch (err) {
			console.error('Failed to execute reboot command:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// restart backend only (via PM2)
	router.post('/restart-backend', requireAuth, (req, res) => {
		try {
			res.json({ status: true });
			// delay slightly so the response is sent before process restarts
			setTimeout(() => {
				execSync(config.pm2RestartCommand);
			}, 500);
		} catch (err) {
			console.error('Failed to execute PM2 restart command:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// poweroff wallpad
	router.post('/poweroff', requireAuth, (req, res) => {
		try {
			execSync(config.poweroffCommand);
			res.json({ status: true });
		} catch (err) {
			console.error('Failed to execute poweroff command:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// CPU temperature
	router.get('/cputemp', (req, res) => {
		try {
			const cmdResp = execSync(config.tempCommand);
			const temp = parseFloat((cmdResp / 1000).toFixed(1));
			res.json({ status: true, temp });
		} catch (err) {
			console.error('Failed to read CPU temperature:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// system uptime
	router.get('/uptime', (req, res) => {
		try {
			const uptime = parseInt(require('os').uptime());
			res.json({ status: true, uptime });
		} catch (err) {
			console.error('Failed to retrieve system uptime:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// frontend socket connection status
	router.get('/status', (req, res) => {
		try {
			res.json({
				status: true,
				frontendConnected: io.engine.clientsCount > 0
			});
		} catch (err) {
			console.error('[status]', err);
			res.status(500).json({ status: false });
		}
	});

	// list emojis
	router.get('/emoji', (req, res) => {
		try {
			const list = fs.readdirSync(config.emojiDir)
				.filter(file => file.endsWith('.png'));
			res.json({ status: true, list });
		} catch (err) {
			console.error('[emoji]', err);
			res.status(500).json({ status: false });
		}
	});

	// show custom message on wallpad screen
	router.post('/message', (req, res) => {
		try {
			const { title, message } = req.body;
			const duration = parseInt(req.body.duration);

			if (!title || !message || !duration)
				throw new Error('Invalid Parameter(s)');
			if ((duration < 1) || (duration >= 10 * 1000))
				throw new Error('Duration range is 1-9999');

			const content = Object.assign(
				new SCEvent({ status: 'success', duration }),
				{ custom: { title, message, duration } }
			);

			io.emit('success', content);
			console.log(`[message] Showing custom messagebox: ${title} / ${message} / ${duration}`);
			res.json({ status: true });
		} catch (err) {
			console.error('[message]', err);
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	return router;
};
