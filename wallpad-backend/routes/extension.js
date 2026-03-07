/**
 * @brief Extension management routes.
 * @description List, read, create, update, and delete extension scripts.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');

module.exports = function () {
	const router = express.Router();
	const extDir = path.resolve(config.taskScriptDir);

	// list all .js extension files
	router.get('/list', requireAuth, (req, res) => {
		try {
			const files = fs.readdirSync(extDir)
				.filter(f => f.endsWith('.js'))
				.sort();
			res.json({ status: true, files });
		} catch (err) {
			console.error('[extension/list]', err);
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// read a specific extension file
	router.get('/read/:filename', requireAuth, (req, res) => {
		try {
			const filename = req.params.filename;

			// prevent directory traversal
			if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
				return res.status(400).json({ status: false, reason: 'Invalid filename' });
			}
			if (!filename.endsWith('.js')) {
				return res.status(400).json({ status: false, reason: 'Only .js files allowed' });
			}

			const filePath = path.join(extDir, filename);
			if (!fs.existsSync(filePath)) {
				return res.status(404).json({ status: false, reason: 'File not found' });
			}

			const content = fs.readFileSync(filePath, 'utf-8');
			res.json({ status: true, filename, content });
		} catch (err) {
			console.error('[extension/read]', err);
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// create or update an extension file
	router.post('/save', requireAuth, (req, res) => {
		try {
			const { filename, content } = req.body;

			if (!filename || typeof content !== 'string') {
				return res.status(400).json({ status: false, reason: 'Missing filename or content' });
			}
			// prevent directory traversal
			if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
				return res.status(400).json({ status: false, reason: 'Invalid filename' });
			}
			if (!filename.endsWith('.js')) {
				return res.status(400).json({ status: false, reason: 'Only .js files allowed' });
			}

			const filePath = path.join(extDir, filename);
			fs.writeFileSync(filePath, content, 'utf-8');
			res.json({ status: true });
		} catch (err) {
			console.error('[extension/save]', err);
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// rename an extension file
	router.post('/rename', requireAuth, (req, res) => {
		try {
			const { oldFilename, newFilename } = req.body;

			if (!oldFilename || !newFilename) {
				return res.status(400).json({ status: false, reason: 'Missing oldFilename or newFilename' });
			}
			for (const fn of [oldFilename, newFilename]) {
				if (fn.includes('..') || fn.includes('/') || fn.includes('\\')) {
					return res.status(400).json({ status: false, reason: 'Invalid filename' });
				}
				if (!fn.endsWith('.js')) {
					return res.status(400).json({ status: false, reason: 'Only .js files allowed' });
				}
			}

			const oldPath = path.join(extDir, oldFilename);
			const newPath = path.join(extDir, newFilename);

			if (!fs.existsSync(oldPath)) {
				return res.status(404).json({ status: false, reason: 'Original file not found' });
			}
			if (fs.existsSync(newPath)) {
				return res.status(409).json({ status: false, reason: 'A file with the new name already exists' });
			}

			fs.renameSync(oldPath, newPath);
			res.json({ status: true });
		} catch (err) {
			console.error('[extension/rename]', err);
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// delete an extension file
	router.post('/delete', requireAuth, (req, res) => {
		try {
			const { filename } = req.body;

			if (!filename) {
				return res.status(400).json({ status: false, reason: 'Missing filename' });
			}
			if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
				return res.status(400).json({ status: false, reason: 'Invalid filename' });
			}
			if (!filename.endsWith('.js')) {
				return res.status(400).json({ status: false, reason: 'Only .js files allowed' });
			}

			const filePath = path.join(extDir, filename);
			if (!fs.existsSync(filePath)) {
				return res.status(404).json({ status: false, reason: 'File not found' });
			}

			fs.unlinkSync(filePath);
			res.json({ status: true });
		} catch (err) {
			console.error('[extension/delete]', err);
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	return router;
};
