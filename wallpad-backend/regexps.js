/**
 * @brief Regular expressions to matching pattern on buffer.
 * @author Jay Kang
 * @date July 7, 2024
 * @version 0.1
 */

const regexps = {
    authedUser: new RegExp(/AUTHED_[0-9A-F]{96}/),
    processed: new RegExp(/OK/),
    // authFailed: new RegExp(/CLIENT_AUTH_ERROR/),
    notosid: new RegExp(/NOT_OSID/),
    crypto: new RegExp(/MISMATCHED_CRYPTOGRAM/),
    rfLost: new RegExp(/RF_DROP/),
};

module.exports = regexps;