/**
 * @brief Member management routes.
 * @description Handles member CRUD, display order, history with pagination.
 */

const express = require('express');
const config = require('../config');
const runtimeConfig = require('../runtimeConfig');
const { requireAuth } = require('../middleware/auth');
const SCEvent = require('../SCEvent');
const { UserStatus } = require('../WallpadStatus');

module.exports = function (db, io) {
	const router = express.Router();

	// returns member list (ordered by memberDisplayOrder from config.json)
	router.get('/list', requireAuth, (req, res) => {
		try {
			const rows = db.selectMembers();
			const displayOrder = runtimeConfig.get('memberDisplayOrder') || [];

			// sort by display order — members not in order list go to end
			const ordered = [];
			displayOrder.forEach(uuid => {
				const member = rows.find(m => m.uuid === uuid);
				if (member) ordered.push(member);
			});
			// append any members not in the display order
			rows.forEach(m => {
				if (!displayOrder.includes(m.uuid)) ordered.push(m);
			});

			res.json({ status: true, rows: ordered });
		} catch (err) {
			console.error('Failed to retrieve member list:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// returns member status code caption
	router.get('/statuscaption', requireAuth, (req, res) => {
		try {
			const caption = runtimeConfig.get('memberStatusCaption') || config.memberStatusCaption;
			res.json({ status: true, caption });
		} catch (err) {
			console.error('Failed to read memberStatusCaption:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// returns all member status (public endpoint for wallpad main screen)
	router.get('/statusall', (req, res) => {
		try {
			const rows = db.selectMembers();
			const displayOrder = runtimeConfig.get('memberDisplayOrder') || [];

			const ordered = [];
			displayOrder.forEach(uuid => {
				const member = rows.find(m => m.uuid === uuid);
				if (member) ordered.push(member);
			});
			rows.forEach(m => {
				if (!displayOrder.includes(m.uuid)) ordered.push(m);
			});

			res.json(ordered);
		} catch (err) {
			console.error('[statusall]', err);
			res.status(500).json({ status: false });
		}
	});

	// returns specific member info
	router.get('/:UUID(*)/last', requireAuth, (req, res) => {
		try {
			const uuid = req.params.UUID;
			const row = db.selectLastEventByUUID(uuid);
			res.json({ status: true, type: row.type, at: row.at });
		} catch (err) {
			console.error('Failed to retrieve last event:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// returns specific member info (must be after /last to avoid route collision)
	router.get('/:UUID(*)', requireAuth, (req, res) => {
		try {
			const uuid = req.params.UUID;
			const row = db.selectMemberByUUID(uuid);
			res.json({ status: true, row });
		} catch (err) {
			console.error('Failed to retrieve member information:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// add new member
	router.post('/', requireAuth, (req, res) => {
		try {
			const { name, uuid, position, emoji, github } = req.body;

			// validation
			if (!name || !uuid || position === undefined || !emoji) {
				throw new Error('MissingRequiredFields');
			}
			if (!/^[0-9A-Fa-f]{32}$/.test(uuid)) {
				throw new Error('InvalidUUID');
			}
			if (name.length > 10) {
				throw new Error('NameTooLong');
			}

			db.insertMember(uuid.toUpperCase(), name, parseInt(position), emoji, github || null);

			// add to display order
			const displayOrder = runtimeConfig.get('memberDisplayOrder') || [];
			displayOrder.push(uuid.toUpperCase());
			runtimeConfig.set('memberDisplayOrder', displayOrder);

			io.emit('reqFrontendRefresh');
			res.json({ status: true });
		} catch (err) {
			console.error('Failed to add member:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// update member field
	router.post('/:UUID(*)/update', requireAuth, (req, res) => {
		try {
			const oldUUID = req.params.UUID;
			const { field, value } = req.body;

			const allowedFields = ['name', 'position', 'emoji', 'github', 'uuid'];
			if (!allowedFields.includes(field)) {
				throw new Error('InvalidField');
			}
			if (value === undefined || value === null) {
				if (field !== 'github') {
					// allow clearing github by sending null/undefined
					throw new Error('MissingValue');
				}
			}

			// special validation per field
			if (field === 'uuid') {
				if (!/^[0-9A-Fa-f]{32}$/.test(value)) {
					throw new Error('InvalidUUID');
				}
			}
			if (field === 'name' && value.length > 10) {
				throw new Error('NameTooLong');
			}

			const finalValue = (field === 'uuid') ? value.toUpperCase() :
				(field === 'position') ? parseInt(value) : value;

			db.updateMemberField(oldUUID, field, finalValue);

			// if UUID changed, update display order
			if (field === 'uuid') {
				const displayOrder = runtimeConfig.get('memberDisplayOrder') || [];
				const idx = displayOrder.indexOf(oldUUID);
				if (idx !== -1) {
					displayOrder[idx] = finalValue;
					runtimeConfig.set('memberDisplayOrder', displayOrder);
				}
			}

			io.emit('reqFrontendRefresh');
			res.json({ status: true });
		} catch (err) {
			console.error('Failed to update member:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// delete member
	router.post('/:UUID(*)/delete', requireAuth, (req, res) => {
		try {
			const uuid = req.params.UUID;
			db.deleteMember(uuid);

			// remove from display order
			const displayOrder = runtimeConfig.get('memberDisplayOrder') || [];
			const filtered = displayOrder.filter(u => u !== uuid);
			runtimeConfig.set('memberDisplayOrder', filtered);

			io.emit('reqFrontendRefresh');
			res.json({ status: true });
		} catch (err) {
			console.error('Failed to delete member:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// change member status (like card tag: updates DB status + inserts history + emits socket)
	router.post('/:UUID(*)/status', requireAuth, (req, res) => {
		try {
			const uuid = req.params.UUID;
			const { status: newStatus } = req.body;

			if (newStatus === undefined || newStatus === null) {
				throw new Error('MissingStatus');
			}

			const statusInt = parseInt(newStatus);
			if (isNaN(statusInt) || statusInt < 0) {
				throw new Error('InvalidStatus');
			}

			// Same as card scan: update member status + insert history record
			db.updateUserStatus(uuid, statusInt, new Date());

			// Get member info for the notification
			const member = db.selectMemberByUUID(uuid);
			const statusCaption = runtimeConfig.get('memberStatusCaption') || config.memberStatusCaption;

			// Emit success event so the main display shows a notification popup
			io.emit('success', new SCEvent({
				status: statusInt === 1 ? UserStatus.ARRIVAL : UserStatus.LEAVE,
				name: member.name,
			}));

			// Notify frontend main display to refresh member list
			// io.emit('reqFrontendRefresh');

			res.json({ status: true });
		} catch (err) {
			console.error('Failed to change member status:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	// reorder members
	router.post('/reorder', requireAuth, (req, res) => {
		try {
			const { orderedUUIDs } = req.body;
			if (!Array.isArray(orderedUUIDs)) {
				throw new Error('InvalidOrderList');
			}

			runtimeConfig.set('memberDisplayOrder', orderedUUIDs);

			io.emit('reqFrontendRefresh');
			res.json({ status: true });
		} catch (err) {
			console.error('Failed to reorder members:', err.toString());
			res.status(500).json({ status: false, reason: err.message });
		}
	});

	return router;
};
