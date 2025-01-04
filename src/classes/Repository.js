const Branch = require('./Branch');
const path = require('path');
const fs = require('fs/promises');

class Repository {
    constructor(storageDir) {
        // Type should be a string
        this.storageDir = storageDir;
        // Map of branch names (strings) to Branch objects.
        this.branches = new Map();
    }

    /**
     * 
     * @param {string} name 
     * @returns {Branch}
     */
    async getBranch(name) {
        if (!this.branches.has(name)) {
            // Load the branch from file or create a new one
            const branch = await Branch.load(this.storageDir, name).catch(() => new Branch(name));
            this.branches.set(name, branch);
        }
        return this.branches.get(name);
    }

    /**
     * Save information about {@link Branch} to persistent storage.
     * @param {string} name 
     * @param {Array} files 
     */
    async saveBranch(name, files) {
        // Get the Branch object from the string -> Branch map for this repo
        const branch = await this.getBranch(name);

        // Set File[] (array of files) to what we're given
        branch.files = files;

        // Now call Branch object's save method
        await branch.save(this.storageDir);
    }

    async saveAllBranches() {
        for (const branch of this.branches.values()) {
            await branch.save(this.storageDir);
        }
    }

    /**
     * Manages the repository.json file that keeps track of
     * branch names.
     * The metadata file tracks which branches have saved states.
     */
    async loadRepositoryMetadata() {
        const filePath = path.join(this.storageDir, 'repository.json');
        try {
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
            // Load each branch name into memory
            for (const name of data.branches || []) {
                const branch = await Branch.load(this.storageDir, name).catch(() => new Branch(name));
                this.branches.set(name, branch);
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error; // Rethrow any errors other than missing file
            }
        }
    }

    /**
     * Manages the repository.json file that keeps track of
     * branch names.
     * The metadata file tracks which branches have saved states.
     */
    async saveRepositoryMetadata() {
        const data = {
            branches: Array.from(this.branches.keys()), // List of branch names
        };
        const filePath = path.join(this.storageDir, 'repository.json');
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }
}

module.exports = Repository;
