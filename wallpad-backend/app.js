const config = require('./config');
const Wallpad = require('./Wallpad');
const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const { SerialPort } = require('serialport');
const { autoDetect } = require('@serialport/bindings-cpp');
const Database = require('better-sqlite3');
const DB = require('./DB');
const runtimeConfig = require('./runtimeConfig');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

// middleware
const cors = require('./middleware/cors');
const { extractToken, parseBearer } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const errorResponse = require('./utils/errorResponse');

// route modules
const adRoutes = require('./routes/ad');
const systemRoutes = require('./routes/system');
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/member');
const extensionRoutes = require('./routes/extension');
const logoRoutes = require('./routes/logo');

const dbconn = new Database(config.dbPath, config.dbConf);
const app = express();
const server = http.createServer(app);

// express middlewares
app.use(express.json());
app.use(cors);
app.use(extractToken);

// init wallpad
(async () => {
	// find device which matched with configured device number.
	// Missing/unconfigured readers degrade gracefully: the service runs without
	// a serial connection so admins can still log in, manage members, and pick
	// a serial number from /wallpad/usb-devices once the reader is plugged in.
	const deviceList = await autoDetect().list();
	let arduino = null;
	const configuredSerial = config.arduino.deviceSerial;
	const matchedDevice = configuredSerial
		? deviceList.find(d => d.serialNumber == configuredSerial)
		: null;

	if (matchedDevice) {
		console.log(`Found id card reader with serial ${configuredSerial}: ${matchedDevice.path}`);
		config.arduino.path = matchedDevice.path;
	} else {
		if (!configuredSerial) {
			console.warn('[arduino] No deviceSerial configured — running without a card reader.');
		} else {
			console.warn(`[arduino] Device with serial "${configuredSerial}" not found — running without a card reader.`);
		}
		const candidates = deviceList.filter(d => d.serialNumber);
		if (candidates.length === 0) {
			console.warn('[arduino] No USB serial devices are currently connected.');
		} else {
			console.warn('[arduino] Currently connected USB serial devices:');
			candidates.forEach(d => {
				console.warn(`  - path=${d.path}, serialNumber=${d.serialNumber}`);
			});
		}
	}

	// create depending instances
	const db = new DB(dbconn);
	if (matchedDevice) {
		arduino = new SerialPort(config.arduino);
	}
	const io = new Server(server, config.socketioConf);

	// create Wallpad instance
	const wallpad = new Wallpad(db, arduino, io);

	// passes all serialport events to wallpad
	if (arduino) {
		arduino.on('data', data => wallpad.serialEventHandler(data));
	}

	server.listen(config.socketioConf.port, "0.0.0.0", () => {
		console.log(`Socket.IO server started on port ${config.socketioConf.port}.`);
	});

	// ** WebSocket event handlers **
	io.on('connection', (socket) => {
		console.log('Wallpad frontend connected.');

		socket.on('getMemberStat', () => {
			console.log('Received WebSocket request: getMemberStat');
			const list = db.selectMembers();
			const displayOrder = runtimeConfig.get('memberDisplayOrder') || [];

			// sort by display order
			const ordered = [];
			displayOrder.forEach(uuid => {
				const member = list.find(m => m.uuid === uuid);
				if (member) ordered.push(member);
			});
			list.forEach(m => {
				if (!displayOrder.includes(m.uuid)) ordered.push(m);
			});

			socket.emit('getMemberStatResp', ordered);
		});

		socket.on('getAdTransitionRate', () => {
			const rate = runtimeConfig.get('adTransitionRate') || 8000;
			socket.emit('adTransitionRateResp', { rate });
		});

		socket.on('disconnect', (reason) => {
			console.log('Wallpad frontend disconnected. Reason: ' + reason);
		});
	});

	// reconcile ad manifest against actual files on disk
	adRoutes.reconcileAdManifest();

	// seed the light wallpad logo from the legacy frontend public asset if none exists.
	// The dark variant is intentionally not seeded — admins upload a dedicated dark logo.
	(() => {
		try {
			if (logoRoutes.findLogoFile('light')) return;
			const legacy = path.resolve(__dirname, '..', 'wallpad-frontend', 'public', 'logo.png');
			if (fs.existsSync(legacy)) {
				if (!fs.existsSync(logoRoutes.LOGO_DIR)) {
					fs.mkdirSync(logoRoutes.LOGO_DIR, { recursive: true });
				}
				fs.copyFileSync(legacy, path.join(logoRoutes.LOGO_DIR, 'logo-light.png'));
				runtimeConfig.set('logoUpdatedAt', Date.now());
				console.log('[logo] seeded default light logo from wallpad-frontend/public/logo.png');
			}
		} catch (err) {
			console.error('[logo] seed failed:', err);
		}
	})();

	// schedule daily frontend refresh per config.scheduledRefresh
	let scheduledRefreshTimer = null;
	function scheduleNextRefresh() {
		if (scheduledRefreshTimer) { clearTimeout(scheduledRefreshTimer); scheduledRefreshTimer = null; }
		const cfg = config.scheduledRefresh;
		if (!cfg || !cfg.enabled || !/^\d{2}:\d{2}$/.test(cfg.time || '')) return;
		const [hh, mm] = cfg.time.split(':').map(Number);
		if (hh > 23 || mm > 59) return;
		const next = new Date();
		next.setHours(hh, mm, 0, 0);
		if (next <= new Date()) next.setDate(next.getDate() + 1);
		scheduledRefreshTimer = setTimeout(() => {
			io.emit('reqFrontendRefresh');
			console.log(`[scheduledRefresh] emitted at ${new Date().toISOString()}`);
			scheduleNextRefresh();
		}, next.getTime() - Date.now());
		console.log(`[scheduledRefresh] next at ${next.toISOString()}`);
	}
	scheduleNextRefresh();

	// ** Mount route modules **
	app.use('/wallpad/ad', adRoutes(io));
	app.use('/wallpad/logo', logoRoutes(io));
	app.use('/wallpad', systemRoutes(io));
	app.use('/wallpad/management', authRoutes);
	app.use('/wallpad/management/member', memberRoutes(db, io));
	app.use('/wallpad/management/extension', extensionRoutes());


	// Lists USB serial devices currently visible to the OS.
	app.get('/wallpad/usb-devices', async (req, res) => {
		if (!req.authed) return res.status(401).json({ status: false });
		try {
			const list = await autoDetect().list();
			const devices = list
				.filter(d => d.serialNumber)
				.map(d => ({
					path: d.path,
					serialNumber: d.serialNumber,
					manufacturer: d.manufacturer || null,
					productId: d.productId || null,
					vendorId: d.vendorId || null,
				}));
			res.json({
				status: true,
				devices,
				configured: config.arduino.deviceSerial || '',
				connected: arduino !== null,
			});
		} catch (err) {
			console.error('[usb-devices]', err);
			res.status(500).json(errorResponse(err));
		}
	});

	// Card test mode API: waits for card and returns UUID
	// Uses Server-Sent Events (SSE) to keep connection alive and handle disconnect
	app.get('/wallpad/card/test', (req, res) => {
		// EventSource cannot send custom headers; accept access token via query as fallback.
		const token = parseBearer(req.headers.authorization) || req.query.token;
		if (!token) {
			return res.status(401).json({ status: false, reason: 'Unauthorized' });
		}

		try {
			const decoded = jwt.verify(token, config.webUICreds.jwtSecret);
			if (decoded.typ !== 'access') {
				return res.status(401).json({ status: false, reason: 'Invalid token' });
			}
		} catch (err) {
			return res.status(401).json({ status: false, reason: 'Invalid token' });
		}

		// No card reader attached — fail fast rather than hanging the SSE stream.
		if (!arduino) {
			return res.status(503).json({ status: false, reason: 'NoCardReader' });
		}

		// Check if card test mode is already active
		if (wallpad.isCardTestModeActive()) {
			return res.status(409).json({ status: false, reason: 'Card test already in progress' });
		}

		// Set SSE headers for keep-alive
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'Access-Control-Allow-Origin': '*'
		});

		// Send initial event to confirm connection
		res.write(`event: connected\ndata: ${JSON.stringify({ status: true, message: 'Waiting for card...' })}\n\n`);

		// Enable card test mode and wait for card
		wallpad.enableCardTestMode()
			.then(uuid => {
				// Card read successfully
				res.write(`event: cardRead\ndata: ${JSON.stringify({ status: true, uuid })}\n\n`);
				res.end();
			})
			.catch(err => {
				res.write(`event: error\ndata: ${JSON.stringify({ status: false, reason: err.message })}\n\n`);
				res.end();
			});

		// Handle client disconnect
		req.on('close', () => {
			console.log('[Card Test] Client disconnected, disabling test mode');
			wallpad.disableCardTestMode();
		});
	});

	// card history endpoint (must match frontend URL: /wallpad/management/card/history)
	app.post('/wallpad/management/card/history', (req, res) => {
		try {
			if (!req.authed) return res.status(401).json({ status: false });

			const page = Math.max(1, parseInt(req.body.page) || 1);
			const limit = [10, 20].includes(parseInt(req.body.limit)) ? parseInt(req.body.limit) : 10;
			const offset = (page - 1) * limit;

			const { rows, total } = db.getHistory(req.body.filter, limit, offset);
			const totalPages = Math.ceil(total / limit);

			res.json({
				status: true,
				rows,
				pagination: { page, limit, total, totalPages }
			});
		} catch (err) {
			console.error('Failed to retrieve card scan history:', err.toString());
			res.status(500).json(errorResponse(err));
		}
	});

	// public member status endpoint (for main wallpad display)
	app.get('/wallpad/member/statusall', (req, res) => {
		try {
			const rows = db.selectMembers();
			const displayOrder = runtimeConfig.get('memberDisplayOrder') || [];

			const ordered = [];
			displayOrder.forEach(uuid => {
				const member = rows.find(m => m.uuid === uuid);
				if (member) ordered.push(member);
			});
			rows.forEach(m => {
				if (!displayOrder.includes(m.uuid)) ordered.push(m);
			});

			res.json(ordered);
		} catch (err) {
			console.error('[statusall]', err);
			res.status(500).json(errorResponse(err));
		}
	});

	// public config endpoint (title, adTransitionRate for frontend)
	app.get('/wallpad/config/public', (req, res) => {
		try {
			const cfg = runtimeConfig.getAll();
			const hasLight = !!logoRoutes.findLogoFile('light');
			const hasDark = !!logoRoutes.findLogoFile('dark');
			res.json({
				status: true,
				title: cfg.title,
				adTransitionRate: cfg.adTransitionRate,
				memberStatusCaption: runtimeConfig.getMemberStatusCaption(),
				arduinoDeviceSerial: config.arduino.deviceSerial,
				scheduledRefresh: cfg.scheduledRefresh,
				theme: cfg.theme,
				clockStyle: cfg.clockStyle,
				logoUrls: {
					light: hasLight ? '/wallpad/logo/light' : null,
					dark: hasDark ? '/wallpad/logo/dark' : null,
				},
				logoVersion: cfg.logoUpdatedAt || 0,
				webhookUrls: Array.isArray(cfg.webhookUrls) ? cfg.webhookUrls : []
			});
		} catch (err) {
			console.error('[config/public]', err);
			res.status(500).json(errorResponse(err));
		}
	});

	// save config endpoint (requires auth)
	app.post('/wallpad/management/config', (req, res) => {
		try {
			if (!req.authed) return res.status(401).json({ status: false });

			const { title, adTransitionRate, memberStatusCaption } = req.body;

			if (title !== undefined) {
				runtimeConfig.set('title', title);
			}
			if (adTransitionRate !== undefined) {
				const rate = parseInt(adTransitionRate);
				if (rate >= 1000 && rate <= 60000) {
					runtimeConfig.set('adTransitionRate', rate);
					// broadcast to connected frontends
					io.emit('adTransitionRateResp', { rate });
				}
			}
			if (memberStatusCaption !== undefined && Array.isArray(memberStatusCaption)) {
				runtimeConfig.set('memberStatusCaption', memberStatusCaption);
			}

			const { arduinoDeviceSerial } = req.body;
			if (arduinoDeviceSerial !== undefined && typeof arduinoDeviceSerial === 'string') {
				// Empty string is allowed and means "no reader configured" — the
				// backend will boot without a serial connection in that state.
				config.arduino.deviceSerial = arduinoDeviceSerial.trim();
				runtimeConfig.save();
			}

			const { scheduledRefresh } = req.body;
			if (scheduledRefresh && typeof scheduledRefresh === 'object') {
				const enabled = !!scheduledRefresh.enabled;
				const time = typeof scheduledRefresh.time === 'string' && /^\d{2}:\d{2}$/.test(scheduledRefresh.time)
					? scheduledRefresh.time
					: '00:00';
				config.scheduledRefresh = { enabled, time };
				runtimeConfig.save();
				scheduleNextRefresh();
			}

			const { clockStyle } = req.body;
			if (clockStyle !== undefined) {
				if (clockStyle === 'flip' || clockStyle === 'normal') {
					runtimeConfig.set('clockStyle', clockStyle);
					io.emit('clockStyleUpdate', clockStyle);
				} else {
					return res.status(400).json({
						status: false,
						error: 'InvalidPayload',
						reason: 'clockStyle must be "flip" or "normal"'
					});
				}
			}

			const { theme } = req.body;
			if (theme && typeof theme === 'object') {
				const mode = ['light', 'dark', 'auto'].includes(theme.mode) ? theme.mode : 'light';
				const isTime = (v) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
				const prev = config.theme || {};
				const next = {
					mode,
					darkStart: isTime(theme.darkStart) ? theme.darkStart : (prev.darkStart || '19:00'),
					darkEnd: isTime(theme.darkEnd) ? theme.darkEnd : (prev.darkEnd || '07:00'),
				};
				config.theme = next;
				runtimeConfig.save();
				// push to live wallpad screens so toggling doesn't require a reload
				io.emit('themeUpdate', next);
			}

			// webhookUrls — validate each entry with `new URL()`. Reject the
			// whole save on the first invalid one so admins notice typos
			// instead of silently dropping them.
			const { webhookUrls } = req.body;
			if (webhookUrls !== undefined) {
				if (!Array.isArray(webhookUrls)) {
					return res.status(400).json({
						status: false,
						error: 'InvalidPayload',
						reason: 'webhookUrls must be an array'
					});
				}
				const cleaned = [];
				for (let i = 0; i < webhookUrls.length; i++) {
					const raw = webhookUrls[i];
					if (typeof raw !== 'string') continue;
					const trimmed = raw.trim();
					if (!trimmed) continue;
					try {
						// eslint-disable-next-line no-new
						new URL(trimmed);
					} catch {
						return res.status(400).json({
							status: false,
							error: 'InvalidWebhookUrl',
							reason: `${i + 1}번째 URL이 올바르지 않아요: ${trimmed}`
						});
					}
					cleaned.push(trimmed);
				}
				runtimeConfig.set('webhookUrls', cleaned);
			}

			io.emit('reqFrontendRefresh');
			res.json({ status: true });
		} catch (err) {
			console.error('[config/save]', err);
			res.status(500).json(errorResponse(err));
		}
	});

	// history latest (test endpoint)
	app.get('/history/latest', (req, res) => {
		try {
			res.json({
				status: true,
				message: { history: db.getHistoryLatest() }
			});
		} catch (err) {
			console.error('/history/latest', err);
			res.status(500).json(errorResponse(err));
		}
	});

	// error handler (must be last)
	app.use(errorHandler);

	// cleanup
	process.on('exit', () => dbconn.close());
})();
