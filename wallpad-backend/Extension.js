class Extension {
    constructor(config, handler) {
        const {
            enabled = throwError('`enabled` is required'),
            activatedStatus = throwError('`activatedStatus` is required'),
            activatedIndex = throwError('`activatedIndex` is required'),
        } = config;
        this.enabled = enabled;
        this.activatedStatus = activatedStatus;
        this.activatedIndex = activatedIndex;
        this.handler = typeof handler !== 'function' ?
            throwError('type of `handler` must be a function') :
            handler;

        function throwError(message) {
            throw new Error(message);
        }
    }
}

module.exports = Extension;