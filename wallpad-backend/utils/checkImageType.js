const path = require('path');

function checkImageType(file, done) {
    const allowedExts = /\.(png|jpe?g|gif|webp)$/i;
    const allowedMIME = /^image\/(png|jpe?g|gif|webp)$/;

    const isAllowedExt = allowedExts.test(file.originalname);
    const isAllowedMIME = allowedMIME.test(file.mimetype);

    if (isAllowedExt && isAllowedMIME) {
        console.log('[utils/checkImageType.js] passed all tests.');
        return done(null, true);
        
    } else {
        console.log('[utils/checkImageType.js] failed tests:', file.originalname, file.mimetype);
        return done(null, false);
    }
}

module.exports = checkImageType;