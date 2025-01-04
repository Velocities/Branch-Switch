class File {
    /**
     * 
     * @param {string} path File location in the tree
     * @param {number} cursorPosition Position cursor was last placed just prior to branch save
     * @param {boolean} pinned If file was pinned or not just prior to branch save
     */
    constructor(path, cursorPosition = 0, pinned = false) {
        this.path = path; // Absolute or relative path of the file.
        this.cursorPosition = cursorPosition; // The position of the cursor in the file.
        this.pinned = pinned; // Whether this file is pinned.
    }

    /**
     * Create a plain object representation of the File instance.
     * @returns {Object} Plain object representation of the file
     */
    toObject() {
        return {
            path: this.path,
            cursorPosition: this.cursorPosition,
            pinned: this.pinned,
        };
    }

    /**
     * Create a File instance from a plain object.
     * @param {Object} obj Plain object representation of a file
     * @returns {File} A new File instance
     */
    static fromObject(obj) {
        return new File(obj.path, obj.cursorPosition, obj.pinned);
    }
}

module.exports = File;
