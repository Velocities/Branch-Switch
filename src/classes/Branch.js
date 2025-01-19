const fs = require('fs/promises');
const path = require('path');
const FileTab = require('./FileTab'); // Assuming File.js has been updated

class Branch {

    /**
     * 
     * @param {string} name Name of branch for the repository in use
     */
    constructor(name) {
        this.name = name;
        this.fileTabs = [];
        this.stashHash = null;
    }

    /**
     * Tracks file in branch recording for later
     * @param {FileTab} fileTab 
     */
    addFileTab(fileTab) {
        this.fileTabs.push(fileTab);
    }

    /**
     * 
     * @param {string} fileTabPath 
     */
    removeFileTab(fileTabPath) {
        this.fileTabs = this.fileTabs.filter(fileTab => fileTab.path !== fileTabPath);
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
            fileTabs: this.fileTabs.map(file => {
                return file.toObject();
            }),
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
        branch.fileTabs = data.fileTabs.map(FileTab.fromObject); // Convert plain objects back into File instances
        return branch;
    }
}

module.exports = Branch;
