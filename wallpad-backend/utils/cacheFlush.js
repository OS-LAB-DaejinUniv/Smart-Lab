const fs = require('fs');
const path = require('path');

function cacheFlush(dir) {
    fs.rmSync(path.resolve(dir), {
        recursive: true,
        force: true
    });
    console.log('flushed next.js cache.');
}

module.exports = cacheFlush;