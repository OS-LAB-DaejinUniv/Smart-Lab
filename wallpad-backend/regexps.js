/**
 * @brief Regular expressions to matching pattern on buffer.
 * @author Jay Kang
 * @date July 7, 2024
 * @version 0.1
 */

const regexps = {
    // positive
    authedUser: new RegExp(/AUTHED_[0-9A-F]{96}/),
    processed: new RegExp(/OK/),
    
    // negative
    notosid: new RegExp(/NOT_OSID/),
    crypto: new RegExp(/MISMATCHED_CRYPTOGRAM/),
    rfLost: new RegExp(/RF_DROP/),

    // etc.
    tmoney_bal: new RegExp(/TM_B_[0-9A-F]{8}/)
};

module.exports = regexps;
