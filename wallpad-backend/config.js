const config = {
    arduino: {
        path: '/dev/ttyACM1',
        baudRate: 115200
    },
    socketioConf: {
        port: 5000,
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    },
    positionCode: {
        0: '부원',
        1: '랩장',
    },
    statusCode: {
        0: '퇴근',
        1: '재실',
    },
    dbPath: 'wallpad.db',
    dbConf: {
        fileMustExist: true
    },
    doorLock: "http://api.oslab/doorlock/unlock",
    lightSwitch: "http://api.oslab/lightswitch/set",
    updateUserStatus: "http://api.oslab/user/updateStatus",
};

module.exports = config;