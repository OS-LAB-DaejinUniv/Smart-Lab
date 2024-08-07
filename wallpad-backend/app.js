const config = require('./config');
const Wallpad = require('./Wallpad');
const express = require('express');
const http = require('http');
const { SerialPort } = require('serialport');
const { autoDetect } = require('@serialport/bindings-cpp');
const Database = require('better-sqlite3');
const DB = require('./DB');
const dbconn = new Database(config.dbPath, config.dbConf);
const { Server } = require('socket.io');
const app = express();
app.use(express.json({ extended: true }));
const server = http.createServer(app);

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

	app.post('/wallpad/refresh', (req, res) => {
		const { isDeleteCache } = req.body;
		console.log('body', isDeleteCache);
		console.log('Got a HTTP request: /wallpad/refresh');

		io.emit('reqFrontendRefresh');
		res.json({ status: true });
	});

	// belows are callbacks for cleanup.
	process.on('exit', () => db.close());
})();