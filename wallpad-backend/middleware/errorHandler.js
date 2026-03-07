/**
 * @brief Centralized error handler middleware.
 * @description Catches unhandled errors in route handlers and returns consistent JSON.
 */

function errorHandler(err, req, res, _next) {
	console.error('[errorHandler]', err);

	const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
	res.status(statusCode);
	res.json({
		status: false,
		reason: err.message || 'InternalServerError'
	});
}

module.exports = errorHandler;
