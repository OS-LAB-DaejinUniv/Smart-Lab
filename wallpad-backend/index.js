const config = require('./config');
const regexps = require('./regexps');
const sqls = require('./sqls');
const SCEvent = require('./SCEvent');
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

// 각 사용내역 타입에 대한 설명
const logType = {
	0: '퇴근',
	1: '재실'
};

// retrieved from https://stackoverflow.com/questions/34309988/byte-array-to-hex-string-conversion-in-javascript
function toHexString(byteArray) {
	return Array.from(byteArray, function (byte) {
		return ('0' + (byte & 0xFF).toString(16)).slice(-2);
	}).join('')
}

const playSFX = (status) => {
	path = status ?
		'./assets/success.wav' :
		'./assets/error.wav';

	new Sound(path).play();
};

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
			// authed(48-byte): decrypted challenge(16-byte) + UUID of smartcard(16-byte) + personal preferences(16-byte)
			const uuid = authed.substring(16 * 2, 32 * 2);
			const extra = authed.substring(32 * 2, 48 * 2);
			buffer = '';

			// prepare new usage history data saved on card.
			const time = parseInt(new Date().getTime() / 1000).toString(16);
			const processType = 1;

			// hex string to buffer
			const timeByte = Buffer.from(time, 'hex');
			const typeByte = Buffer.from((processType + '').padStart(2, '0'), 'hex');

			// usage history(5-byte): time(4-byte) + usage type(1-byte)
			const newLog = Buffer.concat([timeByte, typeByte]);

			console.log(`${new Date().toLocaleString('ko-KR')} 인식 UUID: ${uuid}`);

			arduino.write(newLog);

			// will be used on "else if (ok)" as it receives 'OK' from arduino.
			now = { uuid: uuid, type: processType, history: newLog, extra: extra };

		} else if (ok) {
			// read personal preferences settings on smartcard.
			const userPref = new SCUserPref(now.extra);

			// retrieve user name from db.
			const userNameQuery = db.prepare(sqls.getName);
			const userName = userNameQuery.get(now.uuid).name;

			// send result through socket.io to frontend.
			io.emit('success', new SCEvent('arrival', userName));

			// belows are only for logging
			console.log(`${new Date().toLocaleString('ko-KR')} ${logType[now.type]} → ${now.uuid} (history: ${toHexString(now.history)})`);
			console.log(`스마트카드 개인 설정 읽음:\n` +
				`* 첫 출근시 전등 켬: ${userPref.lightOnAtFirst}\n` +
				`* 마지막 퇴근시 전등 끔: ${userPref.lightOffWhenLeave}\n` +
				`* 첫 출근시 도어락 해제: ${userPref.unlockDoorAtFirst}\n` +
				`* 마지막 퇴근시 도어락 잠금: ${userPref.lockDoorWhenLeave}`);

			// reset `now` object.
			now = null;

			// play sound effect.
			playSFX(true);


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
		}
	
	} catch (err) {
		console.error('오류: ' + err);
	}
});

server.listen(5000, () => {
	console.log(`${new Date().toLocaleString('ko-KR')} Socket.IO 서버를 시작했습니다.`);
});

process.on('exit', () => db.close());