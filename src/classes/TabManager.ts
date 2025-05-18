import * as vscode from 'vscode';
import Repository from './Repository';
import FileTab from './FileTab';

export default class TabManager {
  private repository: Repository;
  private vscodeGitAPI: any; // Consider defining a proper type for Git API
  private currentBranch: string;

  constructor(repository: Repository, vscodeGitAPI: any, currentBranch: string = '') {
    this.repository = repository;
    this.vscodeGitAPI = vscodeGitAPI;
    this.currentBranch = currentBranch;
  }

  // Getters and setters for currentBranch (necessary for event hook on gitAPI)
  getCurrentBranch(): string {
    return this.currentBranch;
  }

  setCurrentBranch(currentBranch: string): void {
    this.currentBranch = currentBranch;
  }

  /**
   * Gets the line number for where the user last had there cursor before the file was closed.
   * @param tab The VSCode tab open for a given file
   * @returns The line number of the user's last cursor position for the given file/VSCode tab (0 for non-text documents)
   */
  private getCursorPosition(tab: vscode.Tab): number {
    const editor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.fsPath === (tab.input as vscode.TabInputText).uri.fsPath
    );
    return editor ? editor.selection.active.line : 0;
  }

  getOpenTabs(): {
    path: string;
    isTextDoc: boolean;
    cursorPosition: number;
    pinned: boolean;
  }[] {
    return vscode.window.tabGroups.all.flatMap((group) =>
      group.tabs
        .filter((tab) => 'uri' in (tab.input as any)) // Checks for file-based tabs
        .map((tab) => ({
          path: (tab.input as vscode.TabInputText).uri.fsPath,
          isTextDoc: true,
          cursorPosition: this.getCursorPosition(tab),
          pinned: tab.isPinned ?? false,
        }))
    );
  }

  async flagNonTextDocs(openTabs: {
    path: string;
    isTextDoc: boolean;
    cursorPosition: number;
    pinned: boolean;
  }[]): Promise<void> {
    for (const tab of openTabs) {
      try {
        await vscode.workspace.openTextDocument(tab.path);
        tab.isTextDoc = true;
      } catch (error) {
        console.log(`Couldn't openTextDocument on ${tab.path}`);
        tab.isTextDoc = false;
      }
    }
  }

  async saveState(branchName: string): Promise<void> {
    const openTabs = this.getOpenTabs();
    await this.flagNonTextDocs(openTabs);
    const fileTabs = openTabs.map(
      (tab) => new FileTab(tab.path, tab.cursorPosition, tab.isTextDoc, tab.pinned)
    );
    return this.repository.saveBranch(branchName, fileTabs);
  }

  /**
   * Restores the VSCode tabs last open by this branch before switching to another branch.
   * @param branchName The name of the {@link Branch} for which to reopen its VSCode tabs
   * @returns Promise object to do restore work
   */
  async restoreState(branchName: string): Promise<void> {
    const openTabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs);
    for (const tab of openTabs) {
      if (tab.isPinned && 'uri' in (tab.input as any)) {
        await vscode.commands.executeCommand('workbench.action.unpinEditor', (tab.input as vscode.TabInputText).uri);
      }
    }

    await vscode.commands.executeCommand('workbench.action.closeAllEditors');

    const branch = await this.repository.getBranch(branchName);
    for (const file of branch.fileTabs) {
      if (file.isTextDoc) {
        const doc = await vscode.workspace.openTextDocument(file.path);
        const editor = await vscode.window.showTextDocument(doc, { preview: false });
        const cursorPosition = new vscode.Position(file.cursorPosition, 0);
        editor.selection = new vscode.Selection(cursorPosition, cursorPosition);
      } else {
        await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(file.path));
        vscode.commands.executeCommand('workbench.action.keepEditor');
      }

      if (file.pinned) {
        vscode.commands.executeCommand('workbench.action.pinEditor');
      }
    }
  }

  async handleBranchChange(newBranchName: string): Promise<void> {
    const currentGitRepository = this.vscodeGitAPI.repositories[0];
    const saveStatePromise = this.saveState(this.currentBranch);
    this.currentBranch = newBranchName;
    await this.restoreState(newBranchName);
    await this.repository.popStashIfExists(newBranchName);
    await saveStatePromise;
  }

  async switchBranchWithStash(targetBranchName: string): Promise<void> {
    const currentGitRepository = this.vscodeGitAPI.repositories[0];

    if (currentGitRepository?.state.mergeChanges.length > 0) {
      vscode.window.showErrorMessage("Cannot switch branches with unresolved merge conflicts.");
      return;
    }

    try {
      const stashHash = await this.repository.stageAndStashChanges(currentGitRepository.rootUri.fsPath);
      if (!stashHash) {
        throw new Error('stageAndStashChanges was unsuccessful (stashHash === null).');
      }

      const branchObj = await this.repository.getBranch(this.currentBranch);
      if (branchObj) {
        branchObj.stashHash = stashHash;
        await this.saveState(targetBranchName);
      }

      await this.repository.checkoutBranch(targetBranchName);
      vscode.window.showInformationMessage(`Switched to ${targetBranchName} (stash ${stashHash} saved)`);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to switch branches: ${error.message}`);
    }
  }
}
