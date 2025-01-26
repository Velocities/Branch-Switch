class FileTab {
    /**
     * 
     * @param {string} path File location in the tree
     * @param {number} cursorPosition Position cursor was last placed just prior to branch save
     * @param {boolean} isTextDoc If file is a text doc or not (e.g. false for logo.png)
     * @param {boolean} pinned If file was pinned or not just prior to branch save
     */
    constructor(path, cursorPosition = 0, isTextDoc = true, pinned = false) {
        this.path = path; // Absolute or relative path of the file.
        this.cursorPosition = cursorPosition; // The position of the cursor in the file.
        this.isTextDoc = isTextDoc; // Whether the file is text.
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
            isTextDoc: this.isTextDoc,
            pinned: this.pinned,
        };
    }

    /**
     * Create a File instance from a plain object.
     * @param {Object} obj Plain object representation of a file
     * @returns {FileTab} A new File instance
     */
    static fromObject(obj) {
        return new FileTab(obj.path, obj.cursorPosition, obj.isTextDoc, obj.pinned);
    }
}

module.exports = FileTab;
