const packageJSON = require('../../../../package');

export const backendPort = packageJSON.config.socketioPort;

export const backendOrigin = () =>
    typeof window !== 'undefined' ? `http://${location.hostname}:${backendPort}` : '';
