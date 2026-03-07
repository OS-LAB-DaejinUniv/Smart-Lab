/**
 * @brief Unified configuration manager.
 * @description All configuration is stored in config.json.
 *   This module loads, caches, and provides access to configuration.
 *   The cache object is exported directly for backward compatibility with config.xxx access patterns.
 */

const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.resolve(__dirname, 'config.json');

const DEFAULTS = {
	title: '리눅스 클라우드 컴퓨팅 심화 실습실',
	arduino: {
		deviceSerial: '95735343633351D030F0',
		baudRate: 115200
	},
	socketioConf: {
		port: 5000,
		cors: {
			origin: '*',
			methods: ['GET', 'POST']
		}
	},
	webUICreds: {
		username: 'admin',
		password: 'password',
		jwtSecret: 'change-this-secret-to-yours',
		frontendPort: 3000,
		permitConcurrentLogin: false,
		allowedIPs: ['0.0.0.0']
	},
	memberStatusCaption: ['부재중', '재실', '수업', '자리비움', '휴학'],
	memberDisplayOrder: [],
	adTransitionRate: 8000,
	taskScriptDir: './extensions/',
	nextCacheDir: '../wallpad-frontend/.next/cache',
	adImageDir: './assets/ad',
	dbPath: 'wallpad.db',
	dbConf: {
		fileMustExist: true
	},
	emojiDir: '../wallpad-frontend/public/emoji',
	taskScriptTimeout: 3000,
	rebootCommand: 'sudo reboot',
	poweroffCommand: 'sudo poweroff',
	pm2RestartCommand: 'pm2 restart wallpad-backend',
	tempCommand: 'cat /sys/class/thermal/thermal_zone0/temp',
	updateUserStatus: 'http://api.oslab:8080/user/updateStatus',
	apiToken: {
		enabled: false,
		tokens: []
	},
	credentials: {
		username: null,
		password: null
	}
};

/**
 * Deep merge two objects (source into target).
 */
function deepMerge(target, source) {
	for (const key of Object.keys(source)) {
		if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
			if (!target[key] || typeof target[key] !== 'object') {
				target[key] = {};
			}
			deepMerge(target[key], source[key]);
		} else {
			target[key] = source[key];
		}
	}
	return target;
}

/**
 * Load the config.json file. Creates it with defaults if it doesn't exist.
 */
function load() {
	try {
		if (!fs.existsSync(CONFIG_PATH)) {
			fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULTS, null, 2), 'utf-8');
			console.log('[config] Created config.json with defaults.');
			return JSON.parse(JSON.stringify(DEFAULTS));
		}
		const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
		const parsed = JSON.parse(raw);
		// deep merge with defaults so new keys are always present
		const merged = JSON.parse(JSON.stringify(DEFAULTS));
		deepMerge(merged, parsed);
		return merged;
	} catch (err) {
		console.error('[config] Failed to load config.json, using defaults:', err);
		return JSON.parse(JSON.stringify(DEFAULTS));
	}
}

/**
 * Save the entire config object to config.json.
 */
function save(configObj) {
	try {
		fs.writeFileSync(CONFIG_PATH, JSON.stringify(configObj, null, 2), 'utf-8');
	} catch (err) {
		console.error('[config] Failed to save config.json:', err);
		throw err;
	}
}

// In-memory cache - the actual config object
const _cache = load();

// Attach utility methods to the cache object
Object.defineProperties(_cache, {
	get: {
		value: function(key) {
			return key ? this[key] : { ...this };
		},
		enumerable: false
	},
	set: {
		value: function(key, value) {
			this[key] = value;
			save(this);
		},
		enumerable: false
	},
	save: {
		value: function() {
			save(this);
		},
		enumerable: false
	},
	reload: {
		value: function() {
			const fresh = load();
			for (const key of Object.keys(this)) {
				if (typeof this[key] !== 'function') delete this[key];
			}
			Object.assign(this, fresh);
		},
		enumerable: false
	},
	getAll: {
		value: function() {
			const result = {};
			for (const key of Object.keys(this)) {
				result[key] = this[key];
			}
			return result;
		},
		enumerable: false
	}
});

// Export the cache object directly for backward compatibility
// Usage: config.arduino.deviceSerial (direct access)
// Usage: config._set('title', 'new title') (set and persist)
// Usage: config._save() (persist current state)
module.exports = _cache;
