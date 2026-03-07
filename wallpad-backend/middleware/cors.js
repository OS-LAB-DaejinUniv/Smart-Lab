/**
 * @brief CORS middleware for Express.
 * @description Dynamically sets Access-Control-Allow-Origin based on request origin.
 */

const config = require('../config');

function cors(req, res, next) {
	const originHeader = req.headers.origin;

	if (originHeader) {
		try {
			const changedOrigin = new URL(originHeader);
			changedOrigin.port = config.webUICreds.frontendPort;
			res.setHeader('Access-Control-Allow-Origin', changedOrigin.origin);
		} catch {
			res.setHeader('Access-Control-Allow-Origin', '*');
		}
	} else {
		try {
			const origin = new URL('http://' + req.headers.host);
			origin.port = config.webUICreds.frontendPort;
			res.setHeader('Access-Control-Allow-Origin', origin.origin);
		} catch {
			res.setHeader('Access-Control-Allow-Origin', '*');
		}
	}

	res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	// handle preflight
	if (req.method === 'OPTIONS') {
		return res.sendStatus(204);
	}

	next();
}

module.exports = cors;
