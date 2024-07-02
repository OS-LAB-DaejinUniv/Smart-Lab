const regexps = {
    // regular expression for pattern matching on buffer.
    authedUser: new RegExp(/AUTHED_[0-9A-F]{96}/),
    processed: new RegExp(/OK/),
    notosid: new RegExp(/NOT_OSID/),
    crypto: new RegExp(/MISMATCHED_CRYPTOGRAM/),
    rfLost: new RegExp(/RF_DROP/)
};

module.exports = regexps;