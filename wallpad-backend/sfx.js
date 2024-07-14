/**
 * @brief Plays sound effect.
 * @details Plays sound effect.
 * @author Jay Kang
 * @date July 14, 2024
 * @version 0.1
 */

const Sound = require('node-aplay');

class sfx {
    static play = (type) => { // `type` must be either "true" or "false".
        new Sound(
            `./assets/${type}.wav`
        ).play();
    };
};

module.exports = sfx;