/**
 * @brief Deserialize extra data on tagged smartcard as object.
 * @details Object key is assigned as task script file name (if corresponding nibble is setted as 0x1),
 * and its value is assigned as `true`.
 * @author Jay Kang
 * @date July 17, 2024
 * @version 0.1
 */

const config = require('./config')
const fs = require('fs')

class SCUserPref {
    static taskNames = fs.readdirSync(config.taskScriptDir)
        .filter(file => file.match(/\.json$/));

    static taskList = Object.values(SCUserPref.taskNames).map((file) => {
        return JSON.parse(fs.readFileSync(config.taskScriptDir + file));
    });

    constructor(userSettings) {
        this.prefs = {};

        Object.values(SCUserPref.taskList).forEach((task) => {
            const setAs = (userSettings[task.index] == '1') || false;

            if (!setAs) {
                return;

            } else {
                this.prefs[task.name] = task;
            }
        });
    }

    async runTasks() {
        try {
            for (const [taskName, enabled] of Object.entries(this.prefs)) {
                switch (enabled.task.type) {
                    case 'request':
                        const resp = await fetch(enabled.task.endpoint, {
                            method: enabled.task.method || '',
                            headers: enabled.task.header || '',
                            body: enabled.task.body || ''
                        }).then((res) => res.json());

                        // verify response includes expected attribute and value.
                        Object.keys(enabled.task.expected).forEach((attr) => {
                            if (!(`${resp[attr]}` == enabled.task.expected[attr])) {
                                throw new Error(
                                    `[SCUserPref.runTasks] response is differ as expected.\n`
                                    + `expected attr: ${attr}, value: ${enabled.task.expected[attr]}(expected) / ${resp[attr]}(got)`
                                );
                            }
                        })

                        console.log(`[SCUserPref.runTasks] ${taskName}`);
                }
            }
        
        } catch (err) {
            console.log(`[SCUserPref.runTasks] error: ${err}`);
        }
    }
}

module.exports = SCUserPref;