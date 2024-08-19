const query = {
    memberList:   'SELECT * FROM members',
    selectMember: 'SELECT * FROM members WHERE uuid = (?)',
    updateStatus: 'UPDATE members SET status = (?) WHERE uuid = (?)',
    addHistory: 'INSERT INTO history (uuid, type, at) VALUES (?, ?, ?)',
    getLastIn:  'SELECT at FROM history WHERE uuid = (?) AND type = 1 ORDER BY "at" DESC LIMIT 1',
    getLastOut: 'SELECT at FROM history WHERE uuid = (?) AND type = 0 ORDER BY "at" DESC LIMIT 1',
    getHistory: 'SELECT * FROM history ORDER BY "at" DESC LIMIT 15'
};

module.exports = query;