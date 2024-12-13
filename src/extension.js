const vscode = require("vscode");

let currentBranch = null;

/** Restores the tabs for the given branch. */
async function restoreBranchTabs(context, branchName) {
  if (!context.globalState) return;

  const branchTabMap = context.globalState.get("branchTabMap", {});
  const savedTabs = branchTabMap[branchName] || [];

  if (savedTabs.length === 0) {
      vscode.window.showInformationMessage(`No saved tabs found for branch: ${branchName}`);
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
  console.log("Branch Switch extension is now active!");

  const gitExtension = vscode.extensions.getExtension("vscode.git");
  const gitAPI = gitExtension.exports.getAPI(1); 

  // Save tabs when branch changes and restore for the new branch

  // Wait for a short delay and check again in case the repo wasn't ready
  const intervalId = setInterval(() => {
    if (gitAPI.repositories.length > 0) {
      clearInterval(intervalId);
      const repo = gitAPI.repositories[0];
      currentBranch = repo.state.HEAD?.name;

      // Now set the listeners
      gitAPI.repositories.forEach((repo) => {
        repo.state.onDidChange(() => {
          const branchName = repo.state.HEAD ? repo.state.HEAD.name : "unknown";
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
  }, 1000);

  if (!gitExtension) {
    console.error("Git extension not found!");
    return;
  }

  // Register a manual save command
  const saveCommand = vscode.commands.registerCommand("branchSwitch.saveTabs", () => {
    const branchName = gitAPI.repositories[0]?.state.HEAD?.name || "unknown";
    saveBranchTabs(context, branchName);
  });
  context.subscriptions.push(saveCommand);

  // Register a manual restore command
  const restoreCommand = vscode.commands.registerCommand("branchSwitch.restoreTabs", () => {
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
