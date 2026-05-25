/**
 * @brief Wallpad logo (lab logo image) routes.
 * @description GET serves the currently stored logo for a given theme variant;
 *   POST /:variant/upload replaces that variant. Files are stored as
 *   assets/logo-<variant>.<ext> with one extension per variant at a time.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const config = require('../config');
const runtimeConfig = require('../runtimeConfig');
const { requireAuth } = require('../middleware/auth');
const checkImageType = require('../utils/checkImageType');

const SUPPORTED_LOGO_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const LOGO_DIR = path.resolve(__dirname, '..', 'assets');
const VARIANTS = ['light', 'dark'];

function logoFilePath(variant, ext) {
	return path.join(LOGO_DIR, `logo-${variant}${ext}`);
}

function findLogoFile(variant) {
	for (const ext of SUPPORTED_LOGO_EXTS) {
		const candidate = logoFilePath(variant, ext);
		if (fs.existsSync(candidate)) return candidate;
	}
	return null;
}

function removeAllLogos(variant) {
	for (const ext of SUPPORTED_LOGO_EXTS) {
		const candidate = logoFilePath(variant, ext);
		if (fs.existsSync(candidate)) fs.rmSync(candidate);
	}
}

module.exports = function (io) {
	const router = express.Router();

	const uploadLogo = multer({
		storage: multer.memoryStorage(),
		limits: { fileSize: 8 * 1024 * 1024 },
		fileFilter: (req, file, done) => checkImageType(file, done),
	});

	// serve the light logo (kept for backward compatibility with any caller
	// still hitting /wallpad/logo without a variant suffix)
	router.get('/', (req, res) => {
		const filePath = findLogoFile('light');
		if (!filePath) return res.status(404).json({ status: false, reason: 'NoLogo' });
		res.sendFile(filePath, (err) => {
			if (err && !res.headersSent) {
				console.error('[logo.get] sendFile error:', err);
				res.status(500).json({ status: false, reason: err.message });
			}
		});
	});

	// serve a specific theme variant
	router.get('/:variant(light|dark)', (req, res) => {
		const filePath = findLogoFile(req.params.variant);
		if (!filePath) return res.status(404).json({ status: false, reason: 'NoLogo' });
		res.sendFile(filePath, (err) => {
			if (err && !res.headersSent) {
				console.error('[logo.get] sendFile error:', err);
				res.status(500).json({ status: false, reason: err.message });
			}
		});
	});

	// upload (replace) a specific theme variant of the logo
	router.post('/:variant(light|dark)/upload', requireAuth, uploadLogo.single('inputImage'), (req, res) => {
		try {
			if (!req.file) throw new Error('MulterFailed');
			const variant = req.params.variant;
			if (!VARIANTS.includes(variant)) throw new Error('UnknownVariant');

			if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });

			const ext = (path.extname(req.file.originalname) || '.png').toLowerCase();
			if (!SUPPORTED_LOGO_EXTS.includes(ext)) throw new Error('UnsupportedExt');

			removeAllLogos(variant);
			const dest = logoFilePath(variant, ext);
			fs.writeFileSync(dest, req.file.buffer);

			runtimeConfig.set('logoUpdatedAt', Date.now());

			console.log(`[logo.upload] saved ${path.basename(dest)} (${req.file.size} bytes)`);
			io.emit('reqFrontendRefresh');
			res.json({ status: true });
		} catch (err) {
			console.error('[logo.upload] failed:', err);
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	return router;
};

module.exports.findLogoFile = findLogoFile;
module.exports.LOGO_DIR = LOGO_DIR;
