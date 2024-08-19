const config = require('./config');
const Wallpad = require('./Wallpad');
const express = require('express');
const multer = require('multer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { v4 } = require('uuid');
const { SerialPort } = require('serialport');
const { autoDetect } = require('@serialport/bindings-cpp');
const Database = require('better-sqlite3');
const { execSync } = require('child_process');
const DB = require('./DB');
const dbconn = new Database(config.dbPath, config.dbConf);
const checkImageType = require('./utils/checkImageType');
const readJSONFile = require('./utils/readJSONFile');
const writeObjectAsJSON = require('./utils/writeObjectAsJSON');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);

// setup multer
const uploadAd = multer({
	storage: multer.diskStorage({
		destination(req, file, done) {
			done(null, config.adImageDir);
		},
		filename(req, file, done) {
			done(null, v4() + '.png');
		}
	}),
	limits: { fileSize: 2 * 1024 * 1024 },
	fileFilter: (req, file, done) => checkImageType(file, done)
});

// express middlewares
app.use(express.json());
app.use((req, res, next) => {
	const originHeader = req.header('origin');

	if (originHeader) {
		const changedOrigin = new URL(originHeader);
		changedOrigin.port = config.webUICreds.frontendPort;
		res.setHeader('Access-Control-Allow-Origin', changedOrigin.origin);
	}

	res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	next();
});
app.use((req, res, next) => {
	try {
		const { token } = req.body;

		jwt.verify(token, config.webUICreds.jwtSecret, (err) => {
			if (!err) {
				req.authed = true;

			} else {
				req.authed = false;
			}
		});

		next();

	} catch (err) {
		console.error('[tokenValidator] error:', err);

		res.status(500);
		res.json({ status: false, reason: 'tokenValidatorError' });
	}
});

// init wallpad
(async () => {
	// find device which matched with configured device number.
	const deviceList = await autoDetect().list();
	const isDeviceFound = deviceList.find(device => {
		if (device.serialNumber == config.arduino.deviceSerial) {
			console.log(`Assigned path ${device.path} for Arduino board ${config.arduino.deviceSerial}.`);

			// when if it founds..
			config.arduino.path = device.path;

			return true;
		}
	});

	if (!isDeviceFound) throw new Error('deviceNotFound');

	// create depending instance used by Wallpad class.
	const db = new DB(dbconn);
	const arduino = new SerialPort(config.arduino);
	const io = new Server(server, config.socketioConf);

	// create Wallpad instance.
	const wallpad = new Wallpad(db, arduino, io);

	// passes all serialport event to wallpad.
	arduino.on('data', data => wallpad.serialEventHandler(data));

	server.listen(config.socketioConf.port, "0.0.0.0", () => {
		console.log(`Started Socket.IO server on port ${config.socketioConf.port}.`);
	});

	// ** belows are websocket api handlers. **
	io.on('connection', (wallpad) => {
		console.log('Wallpad frontend has connected.');

		// responses list of all members with its current status. 
		wallpad.on('getMemberStat', () => {
			console.log('Got a websocket request: getMemberStat');

			const list = db.selectMembers();

			wallpad.emit('getMemberStatResp', list); // Send the array directly
		});

		// print reason as client disconnectd.
		wallpad.on('disconnect', (reason) => {
			console.log('Wallpad frontend has disconnected. reason: ' + reason);
		});
	});

	/* HTTP APIs related to wallpad advertisement. */

	// 1. get ad image list.
	app.get('/wallpad/ad/list', (req, res) => {
		try {
			const adConfig = (() => {
				const filePath = path.resolve(config.adImageDir, 'config.json');
				const file = fs.readFileSync(filePath).toString();

				return JSON.parse(file);
			})();

			res.json(adConfig);

		} catch (err) {
			console.error(`[getAdConfig] ${err}`);

			res.json(err);
		}
	});

	// 2. get specific ad image.
	app.get('/wallpad/ad/:imageId(*)', (req, res) => {
		try {
			const imageId = req.params.imageId;
			// console.log('[getImageById]', imageId);

			res.setHeader('Content-type', 'image/png');

			res.sendFile(
				path.resolve(config.adImageDir, imageId) + '.png'
			);

		} catch (err) {
			console.error(`[getImageById] ${err}`);

			res.status(500);
			res.json(err);
		}
	});

	// 3. upload new ad image.
	app.post('/wallpad/ad/upload', uploadAd.single('inputImage'), (req, res) => {
		try {
			// if multer retruned an error.
			if (!req.file) {
				throw new Error('MulterFailed');
			}

			// verify and update ad/config.json
			const adConfig = readJSONFile(config.adImageDir, 'config.json');
			adConfig.list.push(req.file.filename.split('.')[0]);
			
			// update ad/config.json
			writeObjectAsJSON(config.adImageDir, 'config.json', adConfig);

			console.log('[uploadNewAd] successfully uploaded a new image:',
				`${req.file.originalname} -> ${req.file.filename}`);

			res.json({ status: true });

		} catch (err) {
			console.error(`[uploadNewAd] ${err}`);

			res.json({ status: false });
		}
	});

	/* HTTP APIs used on wallpad management console. */

	// refresh wallpad
	app.post('/wallpad/refresh', (req, res) => {
		console.log('Got a HTTP request:', req.path);

		try {
			if (!req.authed) throw new Error('InvalidToken');

			const { rmcache } = req.body;

			if (rmcache) {
				fs.rmSync(path.resolve(config.nextCacheDir), {
					recursive: true,
					force: true
				});
				console.log('flushed next.js cache.');
			}

			io.emit('reqFrontendRefresh');
			res.json({
				status: true
			});

		} catch (err) {
			console.error('failed to flush next cache: ', err.toString());
			res.status(500);
			res.json({
				status: false,
				reason: err
			})
		}
	});

	// reboot wallpad
	app.post('/wallpad/reboot', (req, res) => {
		console.log('Got a HTTP request:', req.path);

		try {
			if (!req.authed) throw new Error('InvalidToken');

			execSync(config.rebootCommand);
			res.json({
				status: true
			});

		} catch (err) {
			console.error('failed to run reboot command: ', err.toString());
			res.status(500);
			res.json({
				status: false,
				reason: err
			})
		}
	});

	// returns cpu temperature
	app.get('/wallpad/cputemp', (req, res) => {
		console.log('Got a HTTP request:', req.path);

		try {
			const temp = (() => {
				const cmdResp = execSync(config.tempCommand);
				return parseFloat((cmdResp / 1000).toFixed(1));
			})();
			res.json({
				status: true,
				temp
			});

		} catch (err) {
			console.error('failed to run tempCommand: ', err.toString());
			res.status(500);
			res.json({
				status: false,
				reason: err
			})
		}
	});

	// returns card scan history
	app.get('/wallpad/management/card/history', (req, res) => {
		console.log('Got a HTTP request:', req.path);

		try {
			// if (!req.authed) throw new Error('InvalidToken');

			const rows = db.getHistory();

			res.json({
				status: true,
				rows
			});

		} catch (err) {
			console.error('failed to retrieve card history: ', err.toString());
			res.status(500);
			res.json({
				status: false,
				reason: err
			})
		}
	});

	// returns member list
	app.get('/wallpad/management/member/list', (req, res) => {
		console.log('Got a HTTP request:', req.path);

		try {
			// if (!req.authed) throw new Error('InvalidToken');

			const rows = db.selectMembers();

			res.json({
				status: true,
				rows
			});

		} catch (err) {
			console.error('failed to retrieve member list: ', err.toString());
			res.status(500);
			res.json({
				status: false,
				reason: err
			})
		}
	});

	// wallpad management console login
	app.post('/wallpad/management/signin', (req, res) => {
		try {
			const [corrUsername, corrPassword] = [config.webUICreds.username, config.webUICreds.password];
			const { username, password } = req.body;
			const accessip = req.ip;

			if ((username != corrUsername) || (password != corrPassword)) {
				res.status(401);
				res.json({ status: false });
				return;
			}

			const token = jwt.sign(
				{ username, accessip },
				config.webUICreds.jwtSecret,
				{ expiresIn: '30m' });

			res.json({ status: true, token });

		} catch (err) {
			console.log('[mgmtSignin] signin failed:', err);

			res.status(500);
			res.json({ status: false });
		}
	});

	// returns validity of token.
	app.get('/wallpad/management/token/verify', (req, res) => {
		try {
			const userToken = req.query.token || null;

			jwt.verify(userToken, config.webUICreds.jwtSecret, (err) => {
				if (!err) {
					res.json({ status: true });

				} else {
					res.status(401);
					res.json({ status: false });
				}
			});


		} catch (err) {
			console.log('[verifyManagementToken] error:', err);

			res.status(500);
			res.json({ status: false });
		}
	})

	// belows are callbacks for cleanup.
	process.on('exit', () => db.close());
})();