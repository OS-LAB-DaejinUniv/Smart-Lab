/**
 * @brief Regular expressions to matching pattern on buffer.
 * @author Jay Kang
 * @date July 7, 2024
 * @version 0.1
 */

const regexps = {
    // success
    authedUser: new RegExp(/AUTHED_[0-9A-F]{96}/),
    processed: new RegExp(/OK/),
    
    // error
    notSupported: new RegExp(/NOT_SUPPORTED/),
    crypto: new RegExp(/MISMATCHED_CRYPTOGRAM/),
    
    // failure
    externalAuthFailed: new RegExp(/CLIENT_AUTH_ERROR/),
    internalAuthFailed: new RegExp(/SVRAUTH_ERROR/),
    challengeFailed: new RegExp(/DIDN_GOT_CHALLENGE/),

    // etc.
    tmoneyBalance: new RegExp(/TM_B_[0-9A-F]{8}/)
};

module.exports = regexps;
