const vscode = require("vscode");

let currentBranch = null;

/** Handles branch changes. */
function handleBranchChange() {
  vscode.window.showInformationMessage("git branch switch detected");
  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (!gitExtension) {
    console.error("Git extension not found!");
    return;
  }

  const gitAPI = gitExtension.exports.getAPI(1);
  const repos = gitAPI.repositories;

  repos.forEach((repo) => {
    const branchName = repo.state.HEAD ? repo.state.HEAD.name : "unknown";
    console.log(`Branch changed to: ${branchName}`);

    // Get the configuration
    const config = vscode.workspace.getConfiguration("branchTabManager");
    if (!config) {
      console.log("config === null");
    }
    const autoSaveRestore = config.get("autoSaveRestore", true);

    if (autoSaveRestore) {
      vscode.commands.executeCommand("workbench.action.closeAllEditors").then(() => {
        restoreBranchTabs(branchName);
      });
    }
  });
}

/** Restores the tabs for the given branch. */
async function restoreBranchTabs(context, branchName) {
  if (!context.globalState) return;

  const branchTabMap = context.globalState.get("branchTabMap", {});
  const savedTabs = branchTabMap[branchName] || [];

  console.log("Length of savedTabs for restore: " + savedTabs.length);

  if (savedTabs.length === 0) {
      console.log(`No saved tabs found for branch: ${branchName}`);
      return;
  }

  await vscode.commands.executeCommand('workbench.action.closeAllEditors');

  // Attempt to open each saved file
  for (const filePath of savedTabs) {
      try {
          const doc = await vscode.workspace.openTextDocument(filePath);
          await vscode.window.showTextDocument(doc, { preview: false });
      } catch (err) {
          console.error(`Failed to open file ${filePath}:`, err);
      }
  }
  vscode.window.showInformationMessage(`Restored last tabs opened for ${branchName}`);
}


/** Saves the currently open tabs for the given branch. */
function saveBranchTabs(context, branchName) {
  // Retrieve the existing mapping of branches to tabs
  const branchTabMap = context.globalState.get("branchTabMap", {});

  // Get the currently open tabs from all tab groups
  const openTabs = vscode.window.tabGroups.all.flatMap(group =>
    group.tabs
      .filter(tab => tab.input && tab.input.uri) // Only include valid file tabs
      .map(tab => tab.input.uri.fsPath) // Extract the file path
  );

  // Update the map with the current branch and its open tabs
  branchTabMap[branchName] = openTabs;

  // Save the updated map back to global state
  context.globalState
    .update("branchTabMap", branchTabMap)
    .then(() => console.log(`Saved tabs for branch: ${branchName}`))
    .catch(err => console.error(`Failed to save tabs for branch: ${branchName}`, err));
  vscode.window.showInformationMessage(`Saved tabs opened for ${branchName}`);
}


/** Activates the extension. */
function activate(context) {
  console.log("BranchTabManager extension is now active!");

  const gitExtension = vscode.extensions.getExtension("vscode.git");
  const gitAPI = gitExtension.exports.getAPI(1); 

  // Save tabs when branch changes and restore for the new branch

  // Wait for a short delay and check again in case the repo wasn't ready
  const intervalId = setInterval(() => {
    if (gitAPI.repositories.length > 0) {
      clearInterval(intervalId);
      const repo = gitAPI.repositories[0];
      vscode.window.showInformationMessage("In a repo: " + repo.rootUri.path);
      currentBranch = repo.state.HEAD?.name;
      console.log("Current branch:", currentBranch);

      // Now set the listeners
      gitAPI.repositories.forEach((repo) => {
        vscode.window.showInformationMessage("in a repo: " + repo);
        repo.state.onDidChange(() => {
          //vscode.window.showInformationMessage("git state changed!!!");
          const branchName = repo.state.HEAD ? repo.state.HEAD.name : "unknown";
          //vscode.window.showInformationMessage(branchName);
          if (currentBranch != branchName) {
            saveBranchTabs(context, currentBranch);
            currentBranch = branchName;
            restoreBranchTabs(context, branchName);
          }
        });
      });
    } else {
        console.warn('No repositories found.');
    }
  }, 1000);  // Adjust time as needed

  if (!gitExtension) {
    console.error("Git extension not found!");
    return;
  }

  // Register a manual save command
  const saveCommand = vscode.commands.registerCommand("branchTabManager.saveTabs", () => {
    const branchName = gitAPI.repositories[0]?.state.HEAD?.name || "unknown";
    saveBranchTabs(context, branchName);
  });
  context.subscriptions.push(saveCommand);

  // Register a manual restore command
  const restoreCommand = vscode.commands.registerCommand("branchTabManager.restoreTabs", () => {
    const branchName = gitAPI.repositories[0]?.state.HEAD?.name || "unknown";
    restoreBranchTabs(context, branchName);
  });
  context.subscriptions.push(restoreCommand);
}

/** Deactivates the extension. */
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
