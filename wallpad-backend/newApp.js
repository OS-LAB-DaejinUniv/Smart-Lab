const config = require('./config')
const Wallpad = require('./Wallpad')
const express = require('express')
const http = require('http')
const { SerialPort } = require('serialport')
const Database = require('better-sqlite3')
const DB = require('./DB')
const dbconn = new Database(config.dbPath, config.dbConf)
const { Server } = require('socket.io')
const app = express()
const server = http.createServer(app)
const db = new DB(dbconn);
const arduino = new SerialPort(config.arduino);
const io = new Server(server, config.socketioConf);
const SCUserPref = require('./SCUserPref')

server.listen(config.socketioConf.port, () => {
    console.log(`Started Socket.IO server on port ${config.socketioConf.port}.`);
});

const wallpad = new Wallpad(db, arduino, io);

arduino.on('data', data => wallpad.serialEventHandler(data));

process.on('exit', () => db.close());

// websocket api handlers
io.on('connection', (wallpad) => {
	console.log('Wallpad frontend has connected.');

	// responses list of all members with its current status. 
	wallpad.on('getMemberStat', () => {
		console.log('Got a websocket request: getMemberStat');

		const list = db.selectMembers();
		
        wallpad.emit('getMemberStatResp', list); // Send the array directly
	});
});