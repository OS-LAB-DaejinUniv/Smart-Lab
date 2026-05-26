/**
 * Centralized status-change pipeline shared by the card-tag path
 * (Wallpad.#done) and the admin API (routes/member.js POST /:UUID/status).
 *
 *   1. Look up the member (so caller can pass either a pre-fetched member
 *      object or just the uuid).
 *   2. Hand off to db.updateUserStatus, which performs the same-status
 *      guard atomically in SQL. If the new status matches the existing
 *      one, this returns `{ changed: false }` and the rest is skipped.
 *   3. Fire admin-registered webhooks (non-blocking, fire-and-forget).
 *   4. Emit the `success` SCEvent so the wallpad display lights up.
 *
 * Extension execution is *not* part of this pipeline — it stays inline in
 * the card path (Wallpad.#triggerRunTasks) so admin-initiated changes
 * don't unexpectedly spawn extension workers.
 */

const SCEvent = require('../SCEvent');
const { UserStatus } = require('../WallpadStatus');
const fireWebhooks = require('./fireWebhooks');

function statusToEventName(statusInt) {
    return statusInt === 1 ? UserStatus.CLOCKIN : UserStatus.CLOCKOUT;
}

/**
 * @param {object} deps - { db, io, runtimeConfig }
 * @param {object} args - { uuid, newStatus, source, member?, eventExtras? }
 *   - source: 'card' | 'admin' — included in webhook payload
 *   - member: optional pre-fetched member row (avoids a second SELECT)
 *   - eventExtras: extra fields merged into the emitted SCEvent
 *     (e.g. timesTaken from the card path)
 * @returns {{ changed: boolean, member?: object, previousStatus?: number }}
 */
function applyStatusChange(deps, args) {
    const { db, io, runtimeConfig } = deps;
    const { uuid, newStatus, source, eventExtras } = args;

    const member = args.member || db.selectMemberByUUID(uuid);
    const previousStatus = member.status;

    const result = db.updateUserStatus(uuid, newStatus, new Date());
    if (!result.changed) {
        return { changed: false, member, previousStatus };
    }

    const captions = runtimeConfig.get('memberStatusCaption') || [];
    const webhookUrls = runtimeConfig.get('webhookUrls') || [];

    fireWebhooks(webhookUrls, {
        uuid,
        name: member.name,
        position: member.position,
        status: newStatus,
        statusCaption: captions[newStatus] || null,
        previousStatus,
        source,
        at: Date.now(),
    });

    io.emit('success', new SCEvent({
        status: statusToEventName(newStatus),
        name: member.name,
        ...(eventExtras || {}),
    }));

    return { changed: true, member, previousStatus };
}

module.exports = applyStatusChange;
