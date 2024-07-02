// socket.io를 통해 프론트엔드에 전달할 카드 태그 이벤트 객체 정의
class SCEvent {
    constructor (status, name, why) {
        this.eventFired = true;

        this.status = status || null;
        this.name = name || null;
        this.why = why || null;

        if (this.status == null)
            throw new Error('`status` must be given for SCEvent.');
    }
}

module.exports = SCEvent;