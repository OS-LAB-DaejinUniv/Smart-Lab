/**
 * @brief An card tag event data class that includes what information should be seen on screen. 
 * @details Includes status, name, why (reason of the event). Frontend shows notification window based on this info.
 * @author Jay Kang
 * @date July 23, 2024
 * @version 0.1
 */

class SCEvent {
    constructor (status, name, why, duration = 3000) {
        // defines how long notification window lasts on the page.
        this.duration = duration;

        this.status = status || null;
        this.name = name || null;
        this.why = why || null;

        if (this.status == null) {
            throw new Error('`status` must be given for SCEvent.');
        }
    }
}

module.exports = SCEvent;