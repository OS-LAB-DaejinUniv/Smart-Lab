const config = require('./config');
const Wallpad = require('./Wallpad');
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { SerialPort } = require('serialport');
const { autoDetect } = require('@serialport/bindings-cpp');
const Database = require('better-sqlite3');
const DB = require('./DB');
const dbconn = new Database(config.dbPath, config.dbConf);
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);

// express middlewares
app.use(express.json());
app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
	next();
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

	server.listen(config.socketioConf.port, () => {
		console.log(`Started Socket.IO server on port ${config.socketioConf.port}.`);
	});

	// belows are websocket api handlers.
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

	// belows are express api handlers.
	app.post('/wallpad/refresh', (req, res) => {
		const { rmcache } = req.body;

		console.log('Got a HTTP request: /wallpad/refresh');

		try {
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
			console.error('failed to flush next cache: ', err);
			res.status(500);
			res.json({
				status: false,
				reason: err
			})
		}
	});

	/* APIs related to wallpad advertisement. */
	
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
			console.log('[getImageById]', imageId);

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



	// belows are callbacks for cleanup.
	process.on('exit', () => db.close());
})();