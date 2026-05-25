const WallpadStatus = {
    IDLE: 'IDLE',
    BUSY: 'BUSY',
};

const UserStatus = {
    CLOCKIN: 'clockin',
    CLOCKOUT: 'clockout'
};

const CardHistoryType = {
    CLOCKIN: 0,
    CLOCKOUT: 1,
    SYSTEM_REGISTRATION: 9
};

Object.freeze(WallpadStatus);
Object.freeze(UserStatus);
Object.freeze(CardHistoryType);

module.exports = { WallpadStatus, UserStatus, CardHistoryType };