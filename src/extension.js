const vscode = require("vscode");
const path = require("path");
const Repository = require("./classes/Repository");
const TabManager = require("./classes/TabManager");
const fs = require('fs');

let repository = null;
let tabManager = null;
let currentBranch = null;

/** Activates the extension. */
async function activate(context) {
  console.log("Branch Switch extension is now active!");

  // Ensure the storage directory is available
  if (!context.storageUri) {
    console.error("Workspace storage is unavailable.");
    return;
  }

  const storageDir = context.storageUri.fsPath;
  console.log(`storageDir grabbed from context: ${storageDir}`);

  // Avoid potential "No such file or directory" errors later
  // by ensuring the fsPath actually exists (this is necessary)
  if (!fs.existsSync(storageDir)) {
    console.log("Making storageDir exist...");
    fs.mkdirSync(storageDir, { recursive: true });
  }

  // Initialize Repository and TabManager
  repository = new Repository(storageDir);
  tabManager = new TabManager(repository);

  // Load repository metadata
  await repository.loadRepositoryMetadata();

  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (!gitExtension) {
    console.error("Git extension not found!");
    return;
  }

  const gitAPI = gitExtension.exports.getAPI(1);

  // Wait for repositories to be ready
  const intervalId = setInterval(() => {
    if (gitAPI.repositories.length > 0) {
      clearInterval(intervalId);

      const repo = gitAPI.repositories[0];
      currentBranch = repo.state.HEAD?.name;
      tabManager.currentBranch = currentBranch;

      // Set listeners for branch changes
      gitAPI.repositories.forEach((repo) => {
        repo.state.onDidChange(async () => {
          const branchName = repo.state.HEAD?.name || "unknown";
          if (tabManager.currentBranch !== branchName) {
            await tabManager.handleBranchChange(branchName);
          }
        });
      });
    } else {
      console.warn("No repositories found.");
    }
  }, 1000);

  // Register commands for manual save and restore
  context.subscriptions.push(
    vscode.commands.registerCommand("branchSwitch.saveTabs", async () => {
      const branchName = gitAPI.repositories[0]?.state.HEAD?.name || "unknown";
      await tabManager.saveState(branchName, getOpenTabs());
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("branchSwitch.restoreTabs", async () => {
      const branchName = gitAPI.repositories[0]?.state.HEAD?.name || "unknown";
      await tabManager.restoreState(branchName);
    })
  );
}

/** Deactivates the extension. */
async function deactivate() {
  // Save all branch states before the extension is deactivated
  if (repository) {
    await repository.saveAllBranches();
    await repository.saveRepositoryMetadata();
  }
}

/** Get the currently open tabs. */
function getOpenTabs() {
  return vscode.window.tabGroups.all.flatMap((group) =>
    group.tabs
      .filter((tab) => tab.input && tab.input.uri) // Only include valid file tabs
      .map((tab) => ({
        path: tab.input.uri.fsPath,
        cursorPosition: getCursorPosition(tab),
        pinned: tab.isPinned || false,
      }))
  );
}

/** Get the cursor position for a tab. */
function getCursorPosition(tab) {
  const editor = vscode.window.visibleTextEditors.find(
    (e) => e.document.uri.fsPath === tab.input.uri.fsPath
  );
  return editor ? editor.selection.active.line : 0;
}

module.exports = {
  activate,
  deactivate,
};
