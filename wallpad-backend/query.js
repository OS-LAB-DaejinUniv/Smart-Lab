const query = {
    // `updated` is the timestamp of the member's most recent history entry
    // (last in/out scan), surfaced via a correlated subquery so callers can
    // show "마지막 상태 변동" without an extra round-trip. NULL for members
    // with no history yet.
    memberList: `
        SELECT m.*, (SELECT MAX(at) FROM history WHERE uuid = m.uuid) AS updated
        FROM members m
    `,
    selectMember: 'SELECT * FROM members WHERE uuid = (?)',
    // Guarded UPDATE: only writes when the new status differs from current.
    // Callers check `result.changes === 0` to detect "same-status, no-op"
    // requests so they can short-circuit downstream side effects (history
    // insert, socket emit, webhook, extensions, sfx).
    updateStatus: 'UPDATE members SET status = (?) WHERE uuid = (?) AND status <> (?)',
    addHistory: 'INSERT INTO history (uuid, type, at) VALUES (?, ?, ?)',
    getLastIn: 'SELECT at FROM history WHERE uuid = (?) AND type = 1 ORDER BY "at" DESC LIMIT 1',
    getLastOut: 'SELECT at FROM history WHERE uuid = (?) AND type = 0 ORDER BY "at" DESC LIMIT 1',

    // member CRUD
    insertMember: 'INSERT INTO members (uuid, name, position, status, emoji, github) VALUES (?, ?, ?, 0, ?, ?)',
    deleteMember: 'DELETE FROM members WHERE uuid = (?)',
    deleteHistoryByUUID: 'DELETE FROM history WHERE uuid = (?)',

    // dynamic member field update (built at runtime with whitelisted field names)
    updateMemberField: (field) => `UPDATE members SET "${field}" = (?) WHERE uuid = (?)`,

    // history queries with pagination (ORDER BY at DESC for newest first)
    getHistoryBase: 'SELECT * FROM history',
    getHistoryCount: 'SELECT COUNT(*) as total FROM history',
    historyOrderAndLimit: ' ORDER BY "at" DESC LIMIT ? OFFSET ?',

    /**
     * Build a safe WHERE clause for UUID + optional date-range filtering.
     * `range` is `{ from?, to? }` of millisecond epoch timestamps.
     * @param {string[]} uuids
     * @param {{ from?: number, to?: number }} [range]
     * @returns {{ clause: string, params: Array<string|number> }}
     */
    buildHistoryFilter(uuids = [], range = {}) {
        const where = [];
        const params = [];

        if (uuids.length === 0) {
            return { clause: ' WHERE 1=0', params: [] };
        }
        const placeholders = uuids.map(() => '?').join(', ');
        where.push(`uuid IN (${placeholders})`);
        params.push(...uuids);

        if (Number.isFinite(range.from)) {
            where.push('"at" >= ?');
            params.push(range.from);
        }
        if (Number.isFinite(range.to)) {
            where.push('"at" <= ?');
            params.push(range.to);
        }

        return {
            clause: ` WHERE ${where.join(' AND ')}`,
            params
        };
    },

    /**
     * Legacy alias kept for callers that only filter by UUID.
     * @deprecated use buildHistoryFilter instead.
     */
    buildUUIDFilter(uuids = []) {
        return this.buildHistoryFilter(uuids);
    }
};

module.exports = query;