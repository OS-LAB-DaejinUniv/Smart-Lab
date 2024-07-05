const config = require('./config');
const regexps = require('./regexps');
const sqls = require('./sqls');
const SCEvent = require('./SCEvent');
const SCData = require('./SCData');
const SCHisory = require('./SCHistory');
const SCUserPref = require('./SCUserPref');
const express = require('express');
const Database = require('better-sqlite3');
const db = new Database(config.dbPath, config.dbConf);
const http = require('http');
const Sound = require('node-aplay');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');

const app = express();
const server = http.createServer(app);
const arduino = new SerialPort(config.arduino);
const io = new Server(server, config.socketioConf);

let buffer = '';
let now = null; // 아두이노로부터 사용내역 기록 완료 응답을 받기 전 인증된 사용자 정보를 임시 보관

// retrieved from https://stackoverflow.com/questions/34309988/byte-array-to-hex-string-conversion-in-javascript
function toHexString(byteArray) {
	return Array.from(byteArray, function (byte) {
		return ('0' + (byte & 0xFF).toString(16)).slice(-2);
	}).join('')
}

const playSFX = (status) => {
	path = `./assets/${status ?
		'success' :
		'error'}.wav`

	new Sound(path).play();
};

io.on('connection', (wallpad) => {
	console.log(`${new Date().toLocaleString('ko-KR')} Wallpad frontend has connected.`);

	// responses list of all members with its current status. 
	wallpad.on('getMemberStat', () => {
		console.log(`${new Date().toLocaleString('ko-KR')} Got a websocket request: getMemberStat`);
		const userData = db.prepare(sqls.member);
		const all = userData.all();
		wallpad.emit('getMemberStatResp', all); // Send the array directly
	});
});

arduino.on('data', (data) => {
	try {
		buffer += data.toString();

		// arduino sends a single dot every second if it's working normally.
		if (data == '.') {
			buffer = '';
			now = null;
			return;
		}

		// trying to find meaningful data from serial buffer.
		const authed = (() => {
			const match = regexps.authedUser.exec(buffer) || '';
			return match.toString().substring('AUTHED_'.length);
		})();
		const ok = regexps.processed.exec(buffer);
		const unsupported = regexps.notosid.exec(buffer);
		const cryptoFailed = regexps.crypto.exec(buffer);
		const RFDrop = regexps.rfLost.exec(buffer);

		if (authed) {
			// parse response
			const scdata = new SCData(authed);
			buffer = '';

			// get current status by UUID.
			const currentState = db.prepare(sqls.getStatus)
				.get(scdata.uuid).status;

			const newState = currentState ? 0 : 1;

			// usage history(5-byte): time(4-byte) + usage type(1-byte)
			const newhist = new SCHisory(new Date(), newState);

			console.log(`${new Date().toLocaleString('ko-KR')} Detected UUID: ${scdata.uuid}`);

			arduino.write(newhist);

			// will be used on "else if (ok)" as it receives 'OK' from arduino.
			now = { uuid: scdata.uuid, history: newhist, type: newState, extra: scdata.extra };

		} else if (ok) {
			try {
				// loads personal preference settings on smartcard.
				const userPref = new SCUserPref(now.extra);

				// update member state if arduino responded.
				const stateUpdate = db.prepare(sqls.updateStatus)
					.run(now.type, now.uuid);

				// retrieves user name from db.
				const userName = db.prepare(sqls.getName)
					.get(now.uuid).name;

				// sends result through socket.io to frontend.
				io.emit('success', new SCEvent((now.type == 0) ? 'goHome' : 'arrival', userName));

				// belows are only for logging
				console.log(`${new Date().toLocaleString('ko-KR')} ${now.type ? '퇴근' : '재실'}처리 → ${now.uuid}(userName: ${userName}) (history: ${toHexString(now.history)})`);
				console.log(`${userPref}`);

				// plays sound effect.
				playSFX(true);

			} catch (e) { // not found such UUID.
				io.emit('error', new SCEvent('invalidCrypto'));
				console.log(e);
				console.log(`${new Date().toLocaleString('ko-KR')} ${now.uuid} 등록된 UUID가 아닙니다.`);

				// plays sound effect.
				playSFX(false);

			} finally {
				// resets `now` object.
				now = null;
			}

			// 히스토리 로그
			const time = new Date().getTime() / 1000;
			const historyUpdate = db.prepare(sqls.addHistory);
			const historyUpdateResult = historyUpdate.run(now.uuid, now.type, parseInt(time));


		} else if (unsupported) {
			console.log('Unsupported card.');
			io.emit('error', new SCEvent('unsupported'));

			playSFX(false);

		} else if (cryptoFailed) {
			console.log('Cryptogram mismatched.');
			io.emit('error', new SCEvent('invalidCrypto'));

			playSFX(false);

		} else if (RFDrop) {
			console.log('Signal dropped.');
			io.emit('error', new SCEvent('RFDrop'));

			playSFX(false);

		} else {
			return;
		}

	} catch (err) {
		console.error('❌ ' + err);
		playSFX(false);
	}
});

server.listen(config.socketioConf.port, () => {
	console.log(`${new Date().toLocaleString('ko-KR')} Started Socket.IO server on port ${config.socketioConf.port}..`);
});

process.on('exit', () => db.close());