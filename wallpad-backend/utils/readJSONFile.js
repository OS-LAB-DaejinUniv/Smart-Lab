const path = require('path');
const fs = require('fs');

function readJSONFile(jsonDir, jsonName) {
    try {
        const filePath = path.resolve(jsonDir, jsonName);
        const file = fs.readFileSync(filePath).toString();

        return JSON.parse(file);

    } catch (err) {
        console.error('[utils/readJSONFile.js]', err);
    }
};

module.exports = readJSONFile;