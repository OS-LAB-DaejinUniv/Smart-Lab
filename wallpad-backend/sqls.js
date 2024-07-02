const sqls = {
    getName: 'SELECT name FROM members WHERE uuid = (?)',
    addHistory: 'INSERT INTO history (uuid, type, at) VALUES (?, ?, ?)'
};

module.exports = sqls;