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
    webUICreds: {
        username: "admin",
        password: "password",
        jwtSecret: "change-this-secret-to-yours",
        frontendPort: 3000,
        permitConcurrentLogin: false,
        allowedIPs: [
            "0.0.0.0"
        ]
    },
    taskScriptDir: './SCUserPrefTasks/',
    nextCacheDir: '../wallpad-frontend/.next/cache',
    adImageDir: './assets/ad',
    dbPath: 'wallpad.db',
    dbConf: {
        fileMustExist: true
    },
    updateUserStatus: "http://api.oslab:8080/user/updateStatus",
};

module.exports = config;