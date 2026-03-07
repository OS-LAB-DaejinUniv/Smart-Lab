/**
 * @brief Advertisement routes.
 * @description Handles ad image list, retrieval, upload, reorder, and deletion.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4 } = require('uuid');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const readJSONFile = require('../utils/readJSONFile');
const writeObjectAsJSON = require('../utils/writeObjectAsJSON');
const cacheFlush = require('../utils/cacheFlush');
const checkImageType = require('../utils/checkImageType');

module.exports = function (io) {
	const router = express.Router();

	// setup multer for ad image upload
	const uploadAd = multer({
		storage: multer.diskStorage({
			destination(req, file, done) {
				done(null, config.adImageDir);
			},
			filename(req, file, done) {
				const ext = path.extname(file.originalname).toLowerCase() || '.png';
				done(null, v4() + ext);
			}
		}),
		limits: { fileSize: 2 * (1024 ** 10) },
		fileFilter: (req, file, done) => checkImageType(file, done)
	});

	// 1. get ad image list
	router.get('/list', (req, res) => {
		try {
			const adConfig = readJSONFile(config.adImageDir, 'config.json');
			res.json(adConfig);
		} catch (err) {
			console.error(`[getAdConfig] Error: ${err}`);
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// 2. get specific ad image
	router.get('/:imageId', (req, res) => {
		const imageId = req.params.imageId;
		// Find image file with any supported extension
		const supportedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
		let filePath = null;
		
		for (const ext of supportedExts) {
			const candidate = path.resolve(config.adImageDir, imageId + ext);
			if (fs.existsSync(candidate)) {
				filePath = candidate;
				break;
			}
		}
		
		// Also check if imageId already has extension
		if (!filePath) {
			const directPath = path.resolve(config.adImageDir, imageId);
			if (fs.existsSync(directPath)) {
				filePath = directPath;
			}
		}
		
		if (!filePath) {
			return res.status(404).json({ status: false, reason: 'Image not found' });
		}
		
		// sendFile의 콜백으로 에러 처리 (비동기 에러는 try-catch로 잡히지 않음)
		res.sendFile(filePath, (err) => {
			if (err && !res.headersSent) {
				console.error(`[getImageById] sendFile error: ${err}`);
				res.status(500).json({ status: false, reason: err.message });
			}
			console.log(`[getAdById] Successfully served image: ${path.basename(filePath)}`);
		});
	});

	// 3. upload new ad image
	router.post('/upload', requireAuth, uploadAd.single('inputImage'), (req, res) => {
		try {
			if (!req.file) {
				throw new Error('MulterFailed');
			}

			const adConfig = readJSONFile(config.adImageDir, 'config.json');
			adConfig.list.push(req.file.filename.split('.')[0]);
			writeObjectAsJSON(config.adImageDir, 'config.json', adConfig);

			console.log('[uploadNewAd] Successfully uploaded image:',
				`${req.file.originalname} -> ${req.file.filename}`);

			res.json({ status: true });
			io.emit('reqFrontendRefresh');

		} catch (err) {
			console.error(`[uploadNewAd] ${err}`);
			res.json({ status: false });
		}
	});

	// 4. reorder ad images
	router.post('/reorder', requireAuth, (req, res) => {
		try {
			const current = readJSONFile(config.adImageDir, 'config.json').list;
			const reordered = req.body.adList;

			if ((new Set(current).size) !== (new Set(reordered).size)) {
				throw new Error('InconsistantAdList');
			}

			current.forEach(imageId => {
				if (reordered.indexOf(imageId) === -1) {
					throw new Error('InconsistantAdList');
				}
			});

			writeObjectAsJSON(config.adImageDir, 'config.json', { list: reordered });
			console.log('[reorderAdList] successfully updated ad/config.json');

			if (req.body.rmcache) {
				io.emit('reqFrontendRefresh');
				cacheFlush(config.nextCacheDir);
			}

			res.json({ status: true });
			
		} catch (err) {
			console.error(`[reorderAdList] Error: ${err}`);
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// 5. delete ad image
	router.post('/remove/:imageId(*)', requireAuth, (req, res) => {
		try {
			const select = req.params.imageId;
			const current = readJSONFile(config.adImageDir, 'config.json').list;
			const removedList = current.filter(item => item !== select);

			// Find and delete image file with any supported extension
			const supportedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
			let deleted = false;
			for (const ext of supportedExts) {
				const filePath = path.resolve(config.adImageDir, select + ext);
				if (fs.existsSync(filePath)) {
					fs.rmSync(filePath);
					deleted = true;
					break;
				}
			}
			
			if (!deleted) {
				console.warn('[deleteAdImage] File not found, but removing from config:', select);
			}

			writeObjectAsJSON(config.adImageDir, 'config.json', { list: removedList });
			console.log('[deleteAdImage] Successfully deleted image:', select);

			if (req.body.rmcache) {
				io.emit('reqFrontendRefresh');
				cacheFlush(config.nextCacheDir);
			}

			res.json({ status: true });
		} catch (err) {
			console.error(`[deleteAdImage] Error: ${err}`);
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	return router;
};
