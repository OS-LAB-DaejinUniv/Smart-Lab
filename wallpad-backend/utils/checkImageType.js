const path = require('path');

function checkImageType(file, done) {
    const allowedExts = /png/;

    const isAllowedExt = allowedExts.test(path.extname(file.originalname).toLowerCase());
    const isAllowedMIME = allowedExts.test(file.mimetype);

    if (isAllowedExt && isAllowedMIME) {
        console.log('[utils/checkImageType.js] passed all tests.');
        return done(null, true);
        
    } else {
        console.log('[utils/checkImageType.js] failed tests.');
        return done(null, false);
    }
}

module.exports = checkImageType;