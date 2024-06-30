/* 장치 제어를 위한 내부 API 엔드포인트 지정 */
const config = {
    arduino: {
        path: '/dev/ttyACM0',
        baudRate: 115200
    },
    doorLock: "http://api.portal.oslab/v1/doorlock/toggle",
    airSensor: "http://api.portal.oslab/v1/airquality/getTemp",
    updateUserStatus: "http://api.portal.oslab/v1/user/updateStatus",
};

module.exports = config;