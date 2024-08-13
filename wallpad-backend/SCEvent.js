/**
 * @brief An card tag event data class that includes what information should be seen on screen. 
 * @details Includes status, name, why (reason of the event). Frontend shows notification window based on this info.
 * @author Jay Kang
 * @date July 23, 2024
 * @version 0.1
 */

class SCEvent {
    constructor ({ status, name, why, duration = 3000, timesTaken }) {
        // defines how long notification window lasts on the page.
        this.duration = duration;

        this.status = status || null;
        this.name = name || null;
        this.why = why || null;

        // total hours of working / taken to return.
        this.timesTaken = timesTaken;

        if (this.status == null) {
            throw new Error('`status` must be given for SCEvent.');
        }
    }
}

module.exports = SCEvent;