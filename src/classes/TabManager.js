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
     * @returns {Promise} This is the Promise for actually saving the branch at a time that's convenient for the caller
     */
    async saveState(branchName) {
        let openTabs = this.getOpenTabs();
        await this.flagNonTextDocs(openTabs);
        const fileTabs = openTabs.map(tab => new FileTab(tab.path, tab.cursorPosition, tab.isTextDoc, tab.pinned));

        // Save the branch asynchronously
        return this.repository.saveBranch(branchName, fileTabs);
    }

    /**
     * Restores state of branch from persistent storage location.
     * @param {string} branchName 
     */
    async restoreState(branchName) {
        // Unpin all pinned tabs before closing them to avoid potential exceptions being thrown
        const openTabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
        for (const tab of openTabs) {
            if (tab.isPinned) {
                await vscode.commands.executeCommand('workbench.action.unpinEditor', tab.input.uri);
            }
        }

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
          // Pin the tab if it was previously pinned
          // Note for devs: we put this pinEditor code here because we expect it
          // to be the same for both text files AND non-text files
          if (file.pinned) {
            vscode.commands.executeCommand('workbench.action.pinEditor');
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
        // Note: saveState and restoreState run concurrently. Ensure that any modifications
        // to saveBranch or related methods consider potential race conditions, especially 
        // if these methods are expanded to include operations that could conflict.

        // Save state of the current branch IN MEMORY while starting to restore the new one
        const saveStatePromise = this.saveState(this.currentBranch);
    
        // Change the current branch immediately
        this.currentBranch = newBranchName;
    
        // Restore state of the new branch first (user wants to see their required content ASAP)
        await this.restoreState(newBranchName);
    
        // Ensure that saveState completes, but this happens concurrently with restoreState
        await saveStatePromise;
    }
}

module.exports = TabManager;
