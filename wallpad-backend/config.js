const config = {
    arduino: {
        path: '/dev/ttyACM0',
        baudRate: 115200
    },
    socketioConf: {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    },
    positionCode: {
        0: '부원',
        1: '랩장'
    },
    statusCode: {
        0: '퇴근',
        1: '재실'
    },
    dbPath: 'wallpad.db',
    dbConf: {
        fileMustExist: true
    },
    doorLock: "http://api.oslab/v1/doorlock/unlock",
    airSensor: "http://api.oslab/v1/airquality/getTemp",
    updateUserStatus: "http://api.oslab/v1/user/updateStatus",
};

module.exports = config;