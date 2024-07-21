const config = {
    arduino: {
        deviceSerial: '95735343633351D030F0',
        baudRate: 115200
    },
    socketioConf: {
        port: 5000,
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    },
    taskScriptDir: './SCUserPrefTasks/',
    dbPath: 'wallpad.db',
    dbConf: {
        fileMustExist: true
    },
    updateUserStatus: "http://api.oslab:8080/user/updateStatus",
};

module.exports = config;