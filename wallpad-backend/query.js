const query = {
    memberList:   'SELECT * FROM members',
    selectMember: 'SELECT * FROM members WHERE uuid = (?)',
    updateStatus: 'UPDATE members SET status = (?) WHERE uuid = (?)',
    addHistory: 'INSERT INTO history (uuid, type, at) VALUES (?, ?, ?)',
    getLastIn:  'SELECT at FROM history WHERE uuid = (?) AND type = 1 ORDER BY "at" DESC LIMIT 1',
    getLastOut: 'SELECT at FROM history WHERE uuid = (?) AND type = 0 ORDER BY "at" DESC LIMIT 1',
};

module.exports = query;