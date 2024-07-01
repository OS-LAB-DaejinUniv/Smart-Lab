const config = require('./config');
const express = require('express');
const http = require('http');
const Sound = require('node-aplay');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');

const arduino = new SerialPort(config.arduino);
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"]
	}
});

let buffer = '';
let now = null; // 사용내역 기록 완료 응답을 받기 전 인증된 사용자 정보를 임시 보관

// 각 사용내역 타입에 대한 설명 문자열
const logType = {
	'01': '출근',
	'02': '퇴근'
};

// retrieved from https://stackoverflow.com/questions/34309988/byte-array-to-hex-string-conversion-in-javascript
function toHexString(byteArray) {
	return Array.from(byteArray, function (byte) {
		return ('0' + (byte & 0xFF).toString(16)).slice(-2);
	}).join('')
}

// regular expression for pattern matching on buffer.
const authedUser = new RegExp(/AUTHED_[0-9A-F]{96}/);
const processed = new RegExp(/OK/);
const notosid = new RegExp(/NOT_OSID/);
const crypto = new RegExp(/MISMATCHED_CRYPTOGRAM/);
const rfLost = new RegExp(/RF_DROP/);

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
			const match = authedUser.exec(buffer) || '';
			return match.toString().substring('AUTHED_'.length);
		})();		
		const ok = processed.exec(buffer);
		const unsupported = notosid.exec(buffer);
		const cryptoFailed = crypto.exec(buffer);
		const RFDrop = rfLost.exec(buffer);

		if (authed) {
			// authed(48-byte): decrypted challenge(16-byte) + UUID of smartcard(16-byte) + personal preferences(16-byte)
			const uuid = authed.substring(16 * 2, 32 * 2); 
			const extra = authed.substring(32 * 2, 48 * 2);
			buffer = '';

			// prepare new usage history data saved on card.
			const time = parseInt(new Date().getTime() / 1000).toString(16);
			const processType = '01';

			// hex string to buffer
			const timeByte = Buffer.from(time, 'hex');
			const typeByte = Buffer.from(processType, 'hex');

			// usage history(5-byte): time(4-byte) + usage type(1-byte)
			const newLog = Buffer.concat([timeByte, typeByte]);

			console.log(`${new Date().toLocaleString('ko-KR')} 인식 UUID: ${uuid}`);

			arduino.write(newLog);

			// will be used on "else if (ok)" as it receives 'OK' from arduino.
			now = { uuid: uuid, type: processType, history: newLog, extra: extra };

		} else if (ok) {
			// read personal preferences settings on smartcard.
			const userPref = {
				lightOnAtFirst: null,
				lightOffWhenLeave: null,
				unlockDoorAtFirst: null,
				lockDoorWhenLeave: null
			};

			Object.keys(userPref).forEach((key, idx) => {
				userPref[key] = (now.extra[idx] == '1') ? true : false;
			});

			console.log(`${new Date().toLocaleString('ko-KR')} ${logType[now.type]} → ${now.uuid} (${toHexString(now.history)})`);
			console.log(`<스마트카드 개인 설정>\n첫 출근시 전등 켜기: ${userPref.lightOnAtFirst}\n마지막 퇴근시 전등 끄기: ${userPref.lightOffWhenLeave}\n첫 출근시 도어락 해제: ${userPref.unlockDoorAtFirst}\n마지막 퇴근시 도어락 잠금: ${userPref.lockDoorWhenLeave}`);

			// send final result through socket.io
			io.emit('success', now);
			now = null;

			playSFX(true);

		} else if (unsupported) {
			console.log('Unsupported card.');
			io.emit('error', { why: 'unsupported' });

			playSFX(false);

		} else if (cryptoFailed) {
			console.log('Cryptogram mismatched.');
			io.emit('error', { why: 'invalidCrypto' });

			playSFX(false);

		} else if (RFDrop) {
			console.log('Signal dropped.');
			io.emit('error', { why: 'RFDrop' });

			playSFX(false);
		}
	} catch (e) {
		console.log(`${new Date().toLocaleString('ko-KR')} 오류 발생 ${e}`);
	}

});

server.listen(5000, () => {
	console.log(`${new Date().toLocaleString('ko-KR')} Socket.IO 서버를 시작했습니다.`);
});
