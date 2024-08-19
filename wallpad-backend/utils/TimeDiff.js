/**
 * @brief A class which calculates difference of time from now from given unix time (miliseconds).
 * @author Jay Kang
 * @date Aug 13, 2024
 * @version 0.1
 */

class TimeDiff {
    // unit definitions
    static unit = {
        day: 60 * 60 * 24,
        hour: 60 * 60,
        min: 60
    }

    constructor(time) {
        try {
            if (time >= new Date().getTime()) {
                console.error('`time` must be less then now.');
                throw new Error('InvalidRange');
            }

            const now = parseInt(new Date().getTime() / 1000);
            const target = now - parseInt(new Date(time).getTime() / 1000);

            this.day = parseInt(target / TimeDiff.unit.day);
            this.hour = parseInt((target % TimeDiff.unit.day) / TimeDiff.unit.hour);
            this.min = parseInt(((target % TimeDiff.unit.day) % TimeDiff.unit.hour) / TimeDiff.unit.min);
            this.sec = parseInt(((target % TimeDiff.unit.day) % TimeDiff.unit.hour) % TimeDiff.unit.min);

        } catch (err) {
            console.error('[utils/TimeDiff.js]', err);
        }

    }
}

module.exports = TimeDiff;