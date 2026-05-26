/**
 * @brief Centralized error handler middleware.
 * @description Catches unhandled errors in route handlers and returns a
 *   consistent JSON payload. The payload includes the exception *name* and
 *   *message* so the admin UI can surface useful diagnostics without us
 *   leaking a full stack trace.
 */

const errorResponse = require('../utils/errorResponse');

function errorHandler(err, req, res, _next) {
	console.error('[errorHandler]', err);

	const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
	res.status(statusCode);
	res.json(errorResponse(err));
}

module.exports = errorHandler;
