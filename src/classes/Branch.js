const fs = require('fs/promises');
const path = require('path');
const File = require('./File'); // Assuming File.js has been updated

class Branch {

    /**
     * 
     * @param {string} name Name of branch for the repository in use
     */
    constructor(name) {
        this.name = name;
        this.files = [];
        this.stashHash = null;
    }

    /**
     * Tracks file in branch recording for later
     * @param {File} file 
     */
    addFile(file) {
        this.files.push(file);
    }

    removeFile(filePath) {
        this.files = this.files.filter(file => file.path !== filePath);
    }

    /**
     * Save branch to file
     * @param {string} storageDir 
     */
    async save(storageDir) {
        const filePath = path.join(storageDir, `${this.name}.json`);
        const data = {
            name: this.name,
            // Convert File instances to plain objects for storage (reused later)
            files: this.files.map(file => file.toObject()),
        };
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }

    /**
     * Load branch from file
     * @param {string} storageDir Directory that contains the file
     * @param {string} name Name of file
     * @returns {Branch} Branch object for data at file (based on storageDir and name)
     */
    static async load(storageDir, name) {
        const filePath = path.join(storageDir, `${name}.json`);
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        const branch = new Branch(data.name);
        branch.files = data.files.map(File.fromObject); // Convert plain objects back into File instances
        return branch;
    }
}

module.exports = Branch;
