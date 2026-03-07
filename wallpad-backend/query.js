const query = {
    memberList: 'SELECT * FROM members',
    selectMember: 'SELECT * FROM members WHERE uuid = (?)',
    updateStatus: 'UPDATE members SET status = (?) WHERE uuid = (?)',
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
     * Build a safe WHERE clause for UUID filtering using placeholders.
     * @param {string[]} uuids - array of UUID strings
     * @returns {{ clause: string, params: string[] }}
     */
    buildUUIDFilter(uuids = []) {
        if (uuids.length === 0) {
            return { clause: ' WHERE 1=0', params: [] };
        }
        const placeholders = uuids.map(() => '?').join(', ');
        return {
            clause: ` WHERE uuid IN (${placeholders})`,
            params: uuids
        };
    }
};

module.exports = query;