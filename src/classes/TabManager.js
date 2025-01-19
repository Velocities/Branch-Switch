const FileTab = require('./FileTab');
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
     * @returns {Array} Tabs that are visually open in VSCode.
     */
    getOpenTabs() {
      const thisTabManagerInstance = this;
      return vscode.window.tabGroups.all.flatMap((group) =>
        group.tabs
          .filter((tab) => tab.input && tab.input.uri) // Only include valid file tabs
          .map((tab) => ({
            path: tab.input.uri.fsPath,
            isTextDoc: true, // Just a default value
            cursorPosition: thisTabManagerInstance.getCursorPosition(tab),
            pinned: tab.isPinned || false,
          }))
      );
    }

    /**
     * 
     * @param {Array} openTabs 
     */
    async flagNonTextDocs(openTabs) {
      for (const tab of openTabs) {
          try {
            // Try to open the document as a text document
            // (the doc is obviously already open, but this won't cause problems)
            await vscode.workspace.openTextDocument(tab.path).then(() => {
              tab.isTextDoc = true;
            });
          } catch (error) {
            // If there's an error, it's likely not a text document
            console.log(`Couldn't openTextDocument on ${tab.path}`);
            tab.isTextDoc = false;
          }
      };
    }

    /**
     * Saves state of branch to persistent storage location.
     * @param {string} branchName 
     */
    async saveState(branchName) {
        let openTabs = this.getOpenTabs();
        await this.flagNonTextDocs(openTabs);
        const fileTabs = openTabs.map(tab => new FileTab(tab.path, tab.cursorPosition, tab.isTextDoc, tab.pinned));
        await this.repository.saveBranch(branchName, fileTabs);
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
        for (const file of branch.fileTabs) {
          if (file.isTextDoc) {
            await vscode.workspace.openTextDocument(file.path).then(doc => {
                // "preview: false" makes the tab open without italicizing (i.e. stay open when opening more tabs)
                vscode.window.showTextDocument(doc, { preview: false }).then(editor => {
                    // This currently moves the cursor to the correct line but not to the exact column
                    const cursorPosition = new vscode.Position(file.cursorPosition, 0);
                    editor.selection = new vscode.Selection(cursorPosition, cursorPosition);
                });
            });
          } else {
            // Open as a non-text document using the built-in "open file" command
            await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(file.path)).then(() => {
              // Close the preview and reopen in non-preview mode to prevent italicization
              vscode.commands.executeCommand('workbench.action.keepEditor');
            });
          }
        }
    }

    /**
     * Saves the state of the current branch, then loads
     * the state of newBranchName using its associated metadata
     * that we stored earlier.
     * @param {string} newBranchName Name of the branch we're switching to
     */
    async handleBranchChange(newBranchName) {
        await this.saveState(this.currentBranch);
        this.currentBranch = newBranchName;
        await this.restoreState(newBranchName);
    }
}

module.exports = TabManager;
