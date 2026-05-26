/**
 * Schedule a PM2-managed restart of this Node process.
 *
 * Used after admin-driven mutations that the running process cannot pick up
 * live — most notably extension file add/modify/delete/rename, since
 * extensions are loaded once at startup and cached by Node's require cache.
 *
 * The actual restart fires after `delayMs` so the caller's HTTP response
 * has time to flush before the process is killed; without that delay
 * clients would see ECONNRESET in place of the success payload.
 */

const { execSync } = require('child_process');
const config = require('../config');

module.exports = function scheduleBackendRestart(reason, delayMs = 500) {
    console.log(`[scheduleBackendRestart] queued (${delayMs}ms): ${reason}`);
    setTimeout(() => {
        console.log(`[scheduleBackendRestart] firing: ${reason}`);
        try {
            execSync(config.pm2RestartCommand);
        } catch (err) {
            console.error('[scheduleBackendRestart] pm2 restart failed, exiting so the process supervisor relaunches us:', err);
            // If we're not running under PM2 (dev, or PM2 isn't installed)
            // fall back to graceful exit. systemd / nodemon / a watcher
            // can bring us back; if nothing supervises us, the admin will
            // need to relaunch manually — but the alternative is leaving
            // the user stuck with stale extensions silently.
            process.exit(0);
        }
    }, delayMs);
};
