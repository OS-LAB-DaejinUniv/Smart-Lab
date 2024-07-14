class DBException extends Error {
    constructor(message, type) {
        super(message);
        this.name = type;
    }
}

module.exports = DBException;