const sqls = {
    member: 'SELECT * FROM members',
    getStatus: 'SELECT status FROM members WHERE uuid = (?)',
    updateStatus : 'UPDATE members SET status = (?) WHERE uuid = (?)',
    getName: 'SELECT name FROM members WHERE uuid = (?)',
    addHistory: 'INSERT INTO history (uuid, type, at) VALUES (?, ?, ?)'
};

module.exports = sqls;