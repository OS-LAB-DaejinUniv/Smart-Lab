const query = {
    memberList: 'SELECT * FROM members',
    selectMember: 'SELECT * FROM members WHERE uuid = (?)',

    updateStatus : 'UPDATE members SET status = (?) WHERE uuid = (?)',
    addHistory: 'INSERT INTO history (uuid, type, at) VALUES (?, ?, ?)'
};

module.exports = query;