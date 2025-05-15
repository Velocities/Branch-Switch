import Branch from './Branch';
import path from 'path';
import fs from 'fs/promises';
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * This class deals with all git repo-related commands, both for this extension and git commands
 * that we can't call using the git extension API.
 */
export default class Repository {
    private storageDir: string;
    private branches: Map<string, Branch>;

    constructor(storageDir: string) {
        this.storageDir = storageDir;
        this.branches = new Map<string, Branch>();
    }

    /**
     * Gets the {@link Branch} object for the requested name string
     */
    async getBranch(name: string): Promise<Branch> {
        if (!this.branches.has(name)) {
            const branch = await Branch.load(this.storageDir, name).catch(() => new Branch(name));
            this.branches.set(name, branch);
        }
        return this.branches.get(name)!;
    }

    /**
     * Save information about {@link Branch} to persistent storage.
     */
    async saveBranch(name: string, fileTabs: any[]): Promise<void> {
        const branch = await this.getBranch(name);
        branch.fileTabs = fileTabs;
        await branch.save(this.storageDir);
    }

    async saveAllBranches(): Promise<void> {
        for (const branch of this.branches.values()) {
            await branch.save(this.storageDir);
        }
    }

    /**
     * Pop a git stash if it exists for a given branch.
     */
    async popStashIfExists(repoPath: string, targetBranchName: string): Promise<void> {
        const targetBranch = await this.getBranch(targetBranchName);

        if (targetBranch.stashHash) {
            try {
                const { stdout } = await execAsync(`git stash pop ${targetBranch.stashHash}`, { cwd: repoPath });
                vscode.window.showInformationMessage(`Successfully popped stash ${targetBranch.stashHash} for branch ${targetBranchName}`);
            } catch (err: any) {
                vscode.window.showErrorMessage(`Failed to pop stash ${err.message} for branch ${targetBranchName}`);
            }

            targetBranch.stashHash = null;
        } else {
            vscode.window.showInformationMessage(`No stash hash for branch ${targetBranchName}`);
        }
    }

    /**
     * Equivalent to `git stash push`
     */
    async stageAndStashChanges(repoPath: string, includeUntracked: boolean = true): Promise<string | null> {
        try {
            const stashCmd = includeUntracked
                ? 'git stash push --include-untracked -m "vscode-temp-stash"'
                : 'git add . && git stash push -m "vscode-temp-stash"';

            await execAsync(stashCmd, { cwd: repoPath });

            const { stdout } = await execAsync('git stash list --pretty="%H %gd %s"', { cwd: repoPath });
            const lines = stdout.trim().split('\n');
            const match = lines.find(line => line.includes('vscode-temp-stash'));

            if (match) {
                const [hash, stashRef] = match.split(' ');
                return stashRef; // e.g., "stash@{0}"
            } else {
                throw new Error('Could not find the stash entry.');
            }
        } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to stash: ${err.message}`);
            return null;
        }
    }

    /**
     * Equivalent to `git checkout`
     */
    async checkoutBranch(repoPath: string, branchName: string): Promise<boolean> {
        try {
            const { stdout } = await execAsync(`git checkout ${branchName}`, { cwd: repoPath });
            return true;
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to checkout branch "${branchName}": ${error.message}`);
            return false;
        }
    }

    /**
     * Load repository.json metadata into memory.
     */
    async loadRepositoryMetadata(): Promise<void> {
        const filePath = path.join(this.storageDir, 'repository.json');
        try {
            const data = JSON.parse(await fs.readFile(filePath, 'utf8')) as { branches: string[] };
            for (const name of data.branches || []) {
                const branch = await Branch.load(this.storageDir, name).catch(() => new Branch(name));
                this.branches.set(name, branch);
            }
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }

    /**
     * Save branch names to repository.json metadata file.
     */
    async saveRepositoryMetadata(): Promise<void> {
        const data = {
            branches: Array.from(this.branches.keys()),
        };
        const filePath = path.join(this.storageDir, 'repository.json');
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }
}
