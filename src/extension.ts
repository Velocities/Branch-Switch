import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import Repository from "./classes/Repository";
import TabManager from "./classes/TabManager";

// RefType enum to replace the plain object
enum RefType {
  Head = 0,
  RemoteHead = 1,
  Tag = 2,
}

let repository: Repository | null = null;
let tabManager: TabManager | null = null;

/** Activates the extension. */
export async function activate(context: vscode.ExtensionContext) {
  console.log("Branch Switch extension is now active!");

  if ( !context.storageUri ) {
    console.error("Workspace storage is unavailable.");
    return;
  }

  const storageDir = context.storageUri.fsPath;
  console.log(`storageDir grabbed from context: ${storageDir}`);

  if ( !fs.existsSync(storageDir) ) {
    console.log("Making storageDir exist...");
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (!gitExtension) {
    console.error("Git extension not found!");
    return;
  }

  // We need this extension for our extension to function
  await gitExtension.activate();

  // The type of gitExtension.exports can vary depending on the Git extension version,
  // so you might want to define a proper interface or import types from 'vscode.git'
  const gitAPI = gitExtension.exports.getAPI(1);


  // Set event listener to handleBranchChange when a branch change is detected by gitExtension
  const intervalId = setInterval(async () => {
    if (gitAPI.repositories.length > 0) {
      clearInterval(intervalId);
      const currentGitRepository = gitAPI.repositories[0];
      repository = new Repository(storageDir, currentGitRepository.rootUri.fsPath);
      await repository.loadRepositoryMetadata();

      // tabManager obviously isn't null onward from this point (it's okay to use ! notation in the rest of this activate block)
      tabManager = new TabManager(repository, gitAPI, currentGitRepository.state.HEAD?.name);

      gitAPI.repositories.forEach((repo: any) => {
        repo.state.onDidChange(async () => {
          const branchName = repo.state.HEAD?.name || "unknown";
          
          if ( tabManager!.getCurrentBranch() !== branchName ) {
            // Branch changed in git; trigger a handler call
            await tabManager!.handleBranchChange(branchName);
          }
        });
      });
    } else {
      console.warn("No repositories found.");
    }
  }, 1000);

  context.subscriptions.push(
    vscode.commands.registerCommand("branchSwitch.saveTabs", async () => {
      const currentBranchName = gitAPI.repositories[0]?.state.HEAD?.name || "unknown";
      await tabManager!.saveState(currentBranchName);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("branchSwitch.restoreTabs", async () => {
      const currentBranchName = gitAPI.repositories[0]?.state.HEAD?.name || "unknown";
      await tabManager!.restoreState(currentBranchName);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("branchSwitch.switchBranchWithStash", async () => {
      const gitRepository = gitAPI.repositories[0];

      const allRefs = await gitRepository.getRefs();

      const currentBranchName = gitRepository.state.HEAD?.name;

      if (!currentBranchName) {
        vscode.window.showErrorMessage("Failed to determine current branch.");
        return;
      }

      console.log("All refs:", allRefs.map((ref: any) => `${ref.name} (${ref.type})`));

      const branches = allRefs
        .filter((ref: any) => ref.type === RefType.Head && ref.name && ref.name !== currentBranchName)
        .map((ref: any) => ref.name);

      if (branches.length === 0) {
        vscode.window.showInformationMessage("No other branches found.");
        return;
      }

      const targetBranch = await vscode.window.showQuickPick(branches, {
        placeHolder: "Select a branch to switch to",
      });

      if (!targetBranch) return;

      await tabManager!.switchBranchWithStash(targetBranch);
    })
  );
}

/** Deactivates the extension. */
export async function deactivate() {
  if (repository) {
    await repository.saveAllBranches();
    await repository.saveRepositoryMetadata();
  }
}
