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
    taskScriptDir: './SCUserPrefTasks/',
    dbPath: 'wallpad.db',
    dbConf: {
        fileMustExist: true
    },
    updateUserStatus: "http://api.oslab:8080/user/updateStatus",
};

module.exports = config;