const path = require('path');
const fs = require('fs');

function writeObjectAsJSON(jsonDir, jsonName, object, charset = 'utf-8') {
    try {
        const filePath = path.resolve(jsonDir, jsonName);
        object = JSON.stringify(object);
        
        fs.writeFileSync(filePath, object, charset);

    } catch (err) {
        console.error('[utils/writeObjectAsJSON.js]', err);
    }
};

module.exports = writeObjectAsJSON;