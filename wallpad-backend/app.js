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
const cacheFlush = require('./utils/cacheFlush');
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
	limits: { fileSize: 2 * (1024 ** 2) },
	fileFilter: (req, file, done) => checkImageType(file, done)
});

// express middlewares
app.use(express.json());
app.use((req, res, next) => {
	const originHeader = req.header.origin;

	if (originHeader) {
		const changedOrigin = new URL(originHeader);
		changedOrigin.port = config.webUICreds.frontendPort;
		res.setHeader('Access-Control-Allow-Origin', changedOrigin.origin);
		// console.log('post요청인가?', origin.origin);

	} else {
		const origin = new URL('http://' + req.headers.host);
		origin.port = config.webUICreds.frontendPort;
		res.setHeader('Access-Control-Allow-Origin', origin.origin);
		// console.log('get요청인가?', origin.origin)
	}

	res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	next();
});
app.use((req, res, next) => {
	try {
		const token = (() => {
			if (req.method == 'GET') {
				return req.headers.authorization;

			} else if (req.method == 'POST') {
				return req.body.token;
			};
		})();

		jwt.verify(token, config.webUICreds.jwtSecret, err => {
			req.authed = (!err) ? true : false;
			console.log('[tokenValidator]', req.authed);
		});

	} catch (err) {
		console.error('[tokenValidator] Error:', err);

		// res.status(500);
		// res.json({ status: false, reason: 'tokenValidatorError' });

	} finally {
		next();
	}
});

// init wallpad
(async () => {
	// find device which matched with configured device number.
	const deviceList = await autoDetect().list();
	const isDeviceFound = deviceList.find(device => {
		if (device.serialNumber == config.arduino.deviceSerial) {
			console.log(`Assigned path ${device.path} for Arduino board (Serial: ${config.arduino.deviceSerial}).`);

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
		console.log(`Socket.IO server started on port ${config.socketioConf.port}.`);
	});

	// ** belows are websocket api request handlers. **
	io.on('connection', (wallpad) => {
		console.log('Wallpad frontend connected.');

		// responses list of all members with its current status. 
		wallpad.on('getMemberStat', () => {
			console.log('Received WebSocket request: getMemberStat');

			const list = db.selectMembers();

			wallpad.emit('getMemberStatResp', list); // Send the array directly
		});

		// print reason as client disconnectd.
		wallpad.on('disconnect', (reason) => {
			console.log('Wallpad frontend disconnected. Reason: ' + reason);
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
			console.error(`[getAdConfig] Error: ${err}`);

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
			// if (!req.authed) throw new Error('InvalidToken');

			// if multer retruned an error.
			if (!req.file) {
				throw new Error('MulterFailed');
			}

			// verify and update ad/config.json
			const adConfig = readJSONFile(config.adImageDir, 'config.json');
			adConfig.list.push(req.file.filename.split('.')[0]);

			// update ad/config.json
			writeObjectAsJSON(config.adImageDir, 'config.json', adConfig);

			console.log('[uploadNewAd] Successfully uploaded image:',
				`${req.file.originalname} -> ${req.file.filename}`);

			res.json({ status: true });

		} catch (err) {
			console.error(`[uploadNewAd] ${err}`);

			res.json({ status: false });
		}
	});

	// 4. update ad/config.json
	app.post('/wallpad/ad/reorder', (req, res) => {
		try {
			if (!req.authed) throw new Error('InvalidToken');

			// load current and reordered list.
			const current = readJSONFile(config.adImageDir, 'config.json').list;
			const reordered = req.body.adList;

			// verify equality of length of the current and reordered list.
			if ((new Set(current).size) != (new Set(reordered).size)) {
				throw new Error('InconsistantAdList');
			}

			// verify reordered list includes all elements of the current list.
			current.forEach(imageId => {
				if (reordered.indexOf(imageId) == -1) {
					throw new Error('InconsistantAdList');
				}
			});

			// update ad/config.json
			writeObjectAsJSON(config.adImageDir, 'config.json', { list: reordered });
			console.log('[reorderAdList] successfully updated ad/config.json');

			// flush cache and refresh screen if field exists.
			if (req.body.rmcache) {
				io.emit('reqFrontendRefresh');
				cacheFlush(config.nextCacheDir);
			}

			res.json({ status: true });

		} catch (err) {
			console.error(`[reorderAdList] Error: ${err}`);

			res.status(500);
			res.json({ status: false });
		}
	});

	// 5. delete image
	app.post('/wallpad/ad/remove/:imageId(*)', (req, res) => {
		try {
			// if (!req.authed) throw new Error('InvalidToken');

			const select = req.params.imageId;

			// load current and reordered list.
			const current = readJSONFile(config.adImageDir, 'config.json').list;
			const removedList = current.reduce((acc, item) => {
				if (item != select) acc.push(item);
				return acc;
			}, []);

			// delete image file on directory.
			const filePath = path.resolve(config.adImageDir, select + '.png');
			fs.rmSync(filePath);

			// update ad/config.json
			writeObjectAsJSON(config.adImageDir, 'config.json', { list: removedList });
			console.log('[deleteAdImage] Successfully deleted image:', select);

			// flush cache and refresh screen if field exists.
			if (req.body.rmcache) {
				io.emit('reqFrontendRefresh');
				cacheFlush(config.nextCacheDir);
			}

			res.json({ status: true });

		} catch (err) {
			console.error(`[deleteAdImage] Error: ${err}`);

			res.status(500);
			res.json({ status: false });
		}
	});

	/* HTTP APIs used on wallpad management console. */

	// refresh wallpad
	app.post('/wallpad/refresh', (req, res) => {
		console.log('Received HTTP request:', req.path);

		try {
			if (!req.authed) throw new Error('InvalidToken');

			const { rmcache } = req.body;

			if (rmcache) {
				cacheFlush(config.nextCacheDir);
			}

			io.emit('reqFrontendRefresh');
			res.json({
				status: true
			});

		} catch (err) {
			console.error('Failed to flush next cache: ', err.toString());
			res.status(500);
			res.json({
				status: false,
				reason: err
			})
		}
	});

	// reboot wallpad
	app.post('/wallpad/reboot', (req, res) => {
		console.log('Received HTTP request:', req.path);

		try {
			if (!req.authed) throw new Error('InvalidToken');

			execSync(config.rebootCommand);
			res.json({
				status: true
			});

		} catch (err) {
			console.error('Failed to execute reboot command: ', err.toString());
			res.status(500);
			res.json({
				status: false,
				reason: err
			})
		}
	});

	// poweroff wallpad
	app.post('/wallpad/poweroff', (req, res) => {
		console.log('Received HTTP request:', req.path);

		try {
			if (!req.authed) throw new Error('InvalidToken');

			execSync(config.poweroffCommand);
			res.json({
				status: true
			});

		} catch (err) {
			console.error('Failed to execute poweroff command: ', err.toString());
			res.status(500);
			res.json({
				status: false,
				reason: err
			})
		}
	});

	// returns cpu temperature
	app.get('/wallpad/cputemp', (req, res) => {
		console.log('Received HTTP request:', req.path);

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
			console.error('Failed to read CPU temperature: ', err.toString());
			res.status(500);
			res.json({
				status: false,
				reason: err
			})
		}
	});

	// returns system uptime
	app.get('/wallpad/uptime', (req, res) => {
		console.log('Received HTTP request:', req.path);

		try {
			const uptime = parseInt(
				require('os').uptime()
			);
			res.json({
				status: true,
				uptime
			});

		} catch (err) {
			console.error('Failed to retrieve system uptime: ', err.toString());
			res.status(500);
			res.json({
				status: false,
				reason: err
			})
		}
	});

	// returns card scan history
	app.post('/wallpad/management/card/history', (req, res) => {
		const page = (() => {
			if (typeof parseInt(req.query.page) != 'number') {
				return new Error('InvalidPage');
			}
			return req.query.page;
		})();
		// const amount = (() => {
		// 	if (!req.query.amount || !(10 <= req.query.amount <= 30)) {
		// 		return new Error('InvalidAmount');
		// 	}
		// 	return req.query.amount;
		// })();
		const amount = 10;

		console.log('Received HTTP request:', req.path);
		console.log('Page number:', page, 'Amount:', amount);

		try {
			if (!req.authed) throw new Error('InvalidToken');

			const rows = db.getHistory(req.body.filter);

			res.json({
				status: true,
				rows
			});

		} catch (err) {
			console.error('Failed to retrieve card scan history: ', err.toString());

			res.status(500);
			res.json({
				status: false,
				reason: err
			});
		}
	});

	// returns member list
	app.get('/wallpad/management/member/list', (req, res) => {
		console.log('Received HTTP request:', req.path);

		try {
			if (!req.authed) throw new Error('InvalidToken');

			const rows = db.selectMembers();

			res.json({
				status: true,
				rows
			});

		} catch (err) {
			console.error('Failed to retrieve member list: ', err.toString());
			res.status(500);
			res.json({
				status: false,
				reason: err
			})
		}
	});

	// returns member status code caption
	app.get('/wallpad/management/member/statuscaption', (req, res) => {
		console.log('Received HTTP request:', req.path);

		try {
			if (!req.authed) throw new Error('InvalidToken');

			const caption = config.memberStatusCaption;

			res.json({
				status: true,
				caption
			});

		} catch (err) {
			console.error('Failed to read config.memberStatusCaption: ', err.toString());
			res.status(500);
			res.json({
				status: false,
				reason: err
			})
		}
	});

	// returns specific member info
	app.get('/wallpad/management/member/:UUID(*)', (req, res) => {
		console.log('Received HTTP request:', req.path);

		try {
			if (!req.authed) throw new Error('InvalidToken');

			const query = req.params.UUID;
			const row = db.selectMemberByUUID(query);

			res.json({
				status: true,
				row
			});

		} catch (err) {
			console.error('Failed to retrieve member information: ', err.toString());
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
			console.log('[mgmtSignin] Sign-in failed:', err);

			res.status(500);
			res.json({ status: false });
		}
	});

	// returns all of member status
	app.get('/wallpad/member/statusall', (req, res) => {
		try {
			const statusAll = db.selectMembers();

			res.json(statusAll);
		
		} catch (err) {
			console.log('[statusall] Error:', err);
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
			console.log('[verifyManagementToken] Error:', err);

			res.status(500);
			res.json({ status: false });
		}
	});

	// belows are callbacks for cleanup.
	process.on('exit', () => db.close());
})();
