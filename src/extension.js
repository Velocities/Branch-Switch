const vscode = require("vscode");
const path = require("path");
const Repository = require("./classes/Repository");
const TabManager = require("./classes/TabManager");
const fs = require('fs');

let repository = null;
let tabManager = null;

// Temporary until we switch this project to TypeScript
const RefType = {
  Head: 0,
  RemoteHead: 1,
  Tag: 2
};

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

  // Load repository metadata
  await repository.loadRepositoryMetadata();

  const gitExtension = vscode.extensions.getExtension("vscode.git");

  // Wait for gitExtension to fully load so you can use it
  await gitExtension.activate(); // NOT TESTED YET

  if (!gitExtension) {
    console.error("Git extension not found!");
    return;
  }

  const gitAPI = gitExtension.exports.getAPI(1);

  // Now we can instantiate the TabManager with everything it needs to function
  tabManager = new TabManager(repository, gitAPI);

  // Wait for repositories to be ready
  const intervalId = setInterval(() => {
    if (gitAPI.repositories.length > 0) {
      clearInterval(intervalId);

      const repo = gitAPI.repositories[0];
      tabManager.currentBranch = repo.state.HEAD?.name;

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
      const currentBranchName = gitAPI.repositories[0]?.state.HEAD?.name || "unknown";
      await tabManager.saveState(currentBranchName);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("branchSwitch.restoreTabs", async () => {
      const currentBranchName = gitAPI.repositories[0]?.state.HEAD?.name || "unknown";
      await tabManager.restoreState(currentBranchName);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("branchSwitch.switchBranchWithStash", async () => {
      const gitRepository = gitAPI.repositories[0];

      // Get all refs using the new API
      const allRefs = await gitRepository.getRefs();

      const currentBranchName = gitRepository.state.HEAD?.name;

      if (!currentBranchName) {
        vscode.window.showErrorMessage("Failed to determine current branch.");
        return;
      }

      // Log refs for debugging
      console.log("All refs:", allRefs.map(ref => `${ref.name} (${ref.type})`));

      // Filter local branches (of type Head) and exclude current branch
      const branches = allRefs
        .filter(ref => ref.type === RefType.Head && ref.name && ref.name !== currentBranchName) // 0 === Head
        .map(ref => ref.name);

      if (branches.length === 0) {
        vscode.window.showInformationMessage("No other branches found.");
        return;
      }

      // Show QuickPick
      const targetBranch = await vscode.window.showQuickPick(branches, {
        placeHolder: "Select a branch to switch to"
      });

      if (!targetBranch) return; // User cancelled

      await tabManager.switchBranchWithStash(targetBranch);
    })
  )
}

/** Deactivates the extension. */
async function deactivate() {
  // Save all branch states before the extension is deactivated
  if (repository) {
    await repository.saveAllBranches();
    await repository.saveRepositoryMetadata();
  }
}

module.exports = {
  activate,
  deactivate,
};
