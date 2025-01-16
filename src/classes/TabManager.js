const File = require('./File');
const vscode = require('vscode');

class TabManager {
    constructor(repository) {
        this.repository = repository; // Instance of Repository
        this.currentBranch = null; // The current branch name
    }

    /**
     * Get the cursor position for a tab.
     * @param {vscode.Tab} tab 
     * @returns {number} Line selected in file tab
     */
    getCursorPosition(tab) {
      const editor = vscode.window.visibleTextEditors.find(
        (e) => e.document.uri.fsPath === tab.input.uri.fsPath
      );
      return editor ? editor.selection.active.line : 0;
    }

    /**
     * Get the currently open tabs.
     * @returns {Array}
     */
    getOpenTabs() {
      const thisTabManagerInstance = this;
      return vscode.window.tabGroups.all.flatMap((group) =>
        group.tabs
          .filter((tab) => tab.input && tab.input.uri) // Only include valid file tabs
          .map((tab) => ({
            path: tab.input.uri.fsPath,
            cursorPosition: thisTabManagerInstance.getCursorPosition(tab),
            pinned: tab.isPinned || false,
          }))
      );
    }

    /**
     * Saves state of branch to persistent storage location.
     * @param {string} branchName 
     */
    async saveState(branchName) {
        let openTabs = this.getOpenTabs();
        const files = openTabs.map(tab => new File(tab.path, tab.cursorPosition, tab.pinned));
        await this.repository.saveBranch(branchName, files);
    }

    /**
     * Restores state of branch from persistent storage location.
     * @param {string} branchName 
     */
    async restoreState(branchName) {
        // Close current tabs
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');

        // Retrieve state of branch from persistent storage
        const branch = await this.repository.getBranch(branchName);
        for (const file of branch.files) {
            await vscode.workspace.openTextDocument(file.path).then(doc => {
                // "preview: false" makes the tab open without italicizing (i.e. stay open when opening more tabs)
                vscode.window.showTextDocument(doc, { preview: false }).then(editor => {
                    // This currently moves the cursor to the correct line but not to the exact column
                    const cursorPosition = new vscode.Position(file.cursorPosition, 0);
                    editor.selection = new vscode.Selection(cursorPosition, cursorPosition);
                });
            });
        }
    }

    /**
     * Saves the state of the current branch, then loads
     * the state of newBranchName using its associated metadata
     * that we stored earlier.
     * @param {string} newBranchName Name of the branch we're switching to
     */
    async handleBranchChange(newBranchName) {
        await this.saveState(this.currentBranch, this.getOpenTabs());
        this.currentBranch = newBranchName;
        await this.restoreState(newBranchName);
    }
}

module.exports = TabManager;
