class authCandiate {
    constructor () {

    }

    clear() {
        // clears all property as null.
        Object.keys(this)
            .forEach(key => (this[key] = null));
    }
}

module.exports = authCandiate;