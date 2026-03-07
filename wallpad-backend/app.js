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
const { extractToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// route modules
const adRoutes = require('./routes/ad');
const systemRoutes = require('./routes/system');
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/member');
const extensionRoutes = require('./routes/extension');

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
	const cfgSerial = runtimeConfig.get('arduinoDeviceSerial') || config.arduino.deviceSerial;
	config.arduino.deviceSerial = cfgSerial;
	const deviceList = await autoDetect().list();
	const isDeviceFound = deviceList.find(device => {
		if (device.serialNumber == config.arduino.deviceSerial) {
			console.log(`Found id card reader with serial ${config.arduino.deviceSerial}: ${device.path}`);
			config.arduino.path = device.path;
			return true;
		}
	});

	if (!isDeviceFound) throw new Error('deviceNotFound');

	// create depending instances
	const db = new DB(dbconn);
	const arduino = new SerialPort(config.arduino);
	const io = new Server(server, config.socketioConf);

	// create Wallpad instance
	const wallpad = new Wallpad(db, arduino, io);

	// passes all serialport events to wallpad
	arduino.on('data', data => wallpad.serialEventHandler(data));

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

		// receive screenshot data from frontend
		socket.on('screenshotData', (data) => {
			try {
				if (data && data.image) {
					const base64Data = data.image.replace(/^data:image\/png;base64,/, '');
					const screenshotPath = path.join(__dirname, 'screenshot.png');
					fs.writeFileSync(screenshotPath, base64Data, 'base64');
					console.log('[Screenshot] Saved screenshot.png');
				}
			} catch (err) {
				console.error('[Screenshot] Failed to save:', err.message);
			}
		});

		socket.on('disconnect', (reason) => {
			console.log('Wallpad frontend disconnected. Reason: ' + reason);
		});
	});

	// ** Mount route modules **
	app.use('/wallpad/ad', adRoutes(io));
	app.use('/wallpad', systemRoutes(io));
	app.use('/wallpad/management', authRoutes);
	app.use('/wallpad/management/member', memberRoutes(db, io));
	app.use('/wallpad/management/extension', extensionRoutes());

	// SSE endpoint: watch screenshot.png for changes
	app.get('/wallpad/screenshot/stream', (req, res) => {
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'Access-Control-Allow-Origin': '*'
		});

		const screenshotPath = path.join(__dirname, 'screenshot.png');
		let lastMtime = null;

		// check initial state
		try {
			if (fs.existsSync(screenshotPath)) {
				lastMtime = fs.statSync(screenshotPath).mtimeMs;
				const imgData = fs.readFileSync(screenshotPath).toString('base64');
				res.write(`event: screenshot\ndata: ${JSON.stringify({ image: imgData, mtime: lastMtime })}\n\n`);
			}
		} catch (e) { /* ignore */ }

		const interval = setInterval(() => {
			try {
				if (!fs.existsSync(screenshotPath)) return;
				const stat = fs.statSync(screenshotPath);
				if (lastMtime !== stat.mtimeMs) {
					lastMtime = stat.mtimeMs;
					const imgData = fs.readFileSync(screenshotPath).toString('base64');
					res.write(`event: screenshot\ndata: ${JSON.stringify({ image: imgData, mtime: lastMtime })}\n\n`);
				}
			} catch (e) { /* ignore read errors */ }
		}, 500);

		req.on('close', () => {
			clearInterval(interval);
		});
	});

	// trigger screenshot capture
	app.post('/wallpad/screenshot/capture', (req, res) => {
		try {
			io.emit('screenshot');
			res.json({ status: true });
		} catch (err) {
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// Card test mode API: waits for card and returns UUID
	// Uses Server-Sent Events (SSE) to keep connection alive and handle disconnect
	app.get('/wallpad/card/test', (req, res) => {
		// Check auth token from query param or header
		const token = req.query.token || req.headers.authorization;
		if (!token) {
			return res.status(401).json({ status: false, reason: 'Unauthorized' });
		}

		try {
			const jwt = require('jsonwebtoken');
			const config = require('./config');
			jwt.verify(token, config.webUICreds.jwtSecret);
		} catch (err) {
			return res.status(401).json({ status: false, reason: 'Invalid token' });
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
			res.status(500).json({ status: false, reason: err.message });
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
			res.status(500).json({ status: false });
		}
	});

	// public config endpoint (title, adTransitionRate for frontend)
	app.get('/wallpad/config/public', (req, res) => {
		try {
			const cfg = runtimeConfig.getAll();
			res.json({
				status: true,
				title: cfg.title,
				adTransitionRate: cfg.adTransitionRate,
				memberStatusCaption: cfg.memberStatusCaption,
				arduinoDeviceSerial: cfg.arduinoDeviceSerial || config.arduino.deviceSerial
			});
		} catch (err) {
			console.error('[config/public]', err);
			res.status(500).json({ status: false });
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
			if (arduinoDeviceSerial !== undefined && typeof arduinoDeviceSerial === 'string' && arduinoDeviceSerial.trim()) {
				runtimeConfig.set('arduinoDeviceSerial', arduinoDeviceSerial.trim());
				config.arduino.deviceSerial = arduinoDeviceSerial.trim();
			}

			res.json({ status: true });
		} catch (err) {
			console.error('[config/save]', err);
			res.status(500).json({ status: false });
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
			res.status(500).json({ status: false });
		}
	});

	// error handler (must be last)
	app.use(errorHandler);

	// cleanup
	process.on('exit', () => dbconn.close());
})();
