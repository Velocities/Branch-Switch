const Branch = require('./Branch');
const path = require('path');
const fs = require('fs/promises');
const vscode = require('vscode');


const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * This class deals with all git repo-related commands, both for this extension and git commands
 * that we can't call using the git extension API.
 */
class Repository {
    constructor(storageDir) {
        // Type should be a string
        this.storageDir = storageDir;
        // Map of branch names (strings) to Branch objects.
        this.branches = new Map();
    }

    /**
     * Gets the {@link Branch} object for the requested name string
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
     * @param {Array} fileTabs 
     */
    async saveBranch(name, fileTabs) {
        // Get the Branch object from the string -> Branch map for this repo
        const branch = await this.getBranch(name);

        // Set FileTab[] (array of file tabs) to what we're given
        branch.fileTabs = fileTabs;

        // Now call Branch object's save method
        await branch.save(this.storageDir);
    }

    async saveAllBranches() {
        for (const branch of this.branches.values()) {
            await branch.save(this.storageDir);
        }
    }

    /**
     * 
     * @param {string} repoPath File system location of the repo
     * @param {string} targetBranchName Name of the branch to pop the stash on (should be the current branch)
     */
    async popStashIfExists(repoPath, targetBranchName) {
        const targetBranch = await this.getBranch(targetBranchName);

        if ( targetBranch.stashHash ) {
            try {
                const { stdout } = await execAsync(`git stash pop ${targetBranch.stashHash}`, { cwd: repoPath });

                vscode.window.showInformationMessage(`Successfully popped stash ${targetBranch.stashHash} for branch ${targetBranchName}`);
            } catch (err) {
                // User might have accidentally popped the stash themselves or cleared
                // their git stash list for the repo at some point
                vscode.window.showErrorMessage(`Failed to pop stash ${err.message} for branch ${targetBranchName}`);
            }

            // Get rid of the stash hash information for that branch (so we won't pop it again)
            targetBranch.stashHash = null
        } else {
            vscode.window.showInformationMessage(`No stash hash for branch ${targetBranchName}`)
        }
    }

    /**
     * Equivalent to `git stash push`
     * @param {string} repoPath File system location of the repo
     * @param {boolean} [includeUntracked=true] Whether or not the untracked files should also be staged
     * @returns Stash hash if successful, returned as a string in the Promise
     */
    async stageAndStashChanges(repoPath, includeUntracked = true) {
        try {
            // Stage all unstaged files and push to stash list in git
            const stashCmd = includeUntracked
                ? 'git stash push --include-untracked -m "vscode-temp-stash"'
                : 'git add . && git stash push -m "vscode-temp-stash"';

            await execAsync(stashCmd, { cwd: repoPath });

            // Get the most recent stash entry (assuming this is the one we just created)
            const { stdout } = await execAsync('git stash list --pretty="%H %gd %s"', { cwd: repoPath });

            // Find the stash with the matching message
            const lines = stdout.trim().split('\n');
            const match = lines.find(line => line.includes('vscode-temp-stash'));

            if (match) {
                const [hash, stashRef, ...messageParts] = match.split(' ');
                return stashRef; // like "stash@{0}" — usable with git stash pop/apply
            } else {
                throw new Error('Could not find the stash entry.');
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to stash: ${err.message}`);
            return null;
        }
    }

    /**
     * Equivalent to `git checkout`
     * @param {string} repoPath File system location of the repo
     * @param {string} branchName 
     * @returns boolean indicating success or failure
     */
    async checkoutBranch(repoPath, branchName) {
        try {
            const { stdout } = await execAsync(`git checkout ${branchName}`, { cwd: repoPath });
            
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to checkout branch "${branchName}": ${error.message}`);
            return false;
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
