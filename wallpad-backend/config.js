const config = {
    arduino: {
        path: '/dev/ttyACM0',
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
        0: '부재중',
        1: '재실',
    },
    dbPath: 'wallpad.db',
    dbConf: {
        fileMustExist: true
    },
    doorLock: "http://api.oslab:8080/doorlock/unlock",
    lightSwitch: null,
    updateUserStatus: "http://api.oslab:8080/user/updateStatus",
};

module.exports = config;