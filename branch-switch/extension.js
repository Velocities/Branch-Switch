const vscode = require('vscode');

/** Handles branch changes. */
function handleBranchChange() {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
        console.error('Git extension not found!');
        return;
    }

    const gitAPI = gitExtension.exports.getAPI(1);
    const repos = gitAPI.repositories;

    repos.forEach((repo) => {
        const branchName = repo.state.HEAD ? repo.state.HEAD.name : 'unknown';
        console.log(`Branch changed to: ${branchName}`);

        // Get the configuration
        const config = vscode.workspace.getConfiguration('branchTabManager');
        const autoSaveRestore = config.get('autoSaveRestore', true);

        if (autoSaveRestore) {
            vscode.commands.executeCommand('workbench.action.closeAllEditors').then(() => {
                restoreBranchTabs(branchName);
            });
        }
    });
}

/** Restores the tabs for the given branch. */
function restoreBranchTabs(context, branchName) {
    // Retrieve the mapping of branches to tabs
    const branchTabMap = context.globalState.get('branchTabMap', {});

    // Get the saved tabs for the current branch
    const savedTabs = branchTabMap[branchName] || [];

    if (savedTabs.length === 0) {
        console.log(`No saved tabs found for branch: ${branchName}`);
        return;
    }

    // Open each saved file
    savedTabs.forEach((filePath) => {
        vscode.workspace.openTextDocument(filePath)
            .then(doc => vscode.window.showTextDocument(doc, { preview: false }))
            .catch(err => console.error(`Failed to open file ${filePath}:`, err));
    });
}



/** Saves the currently open tabs for the given branch. */
function saveBranchTabs(context, branchName) {
    // Retrieve the existing mapping of branches to tabs
    const branchTabMap = context.globalState.get('branchTabMap', {});

    // Get the currently open documents
    const openDocuments = vscode.workspace.textDocuments.map(doc => doc.fileName);

    // Update the map with the current branch and its open tabs
    branchTabMap[branchName] = openDocuments;

    // Save the updated map back to global state
    context.globalState.update('branchTabMap', branchTabMap)
        .then(() => console.log(`Saved tabs for branch: ${branchName}`))
        .catch(err => console.error(`Failed to save tabs for branch: ${branchName}`, err));
}



/** Activates the extension. */
function activate(context) {
    console.log('BranchTabManager extension is now active!');

    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
        console.error('Git extension not found!');
        return;
    }

    const gitAPI = gitExtension.exports.getAPI(1);

    // Save tabs when branch changes and restore for the new branch
	gitAPI.repositories.forEach((repo) => {
		repo.state.onDidChange(() => {
			const branchName = repo.state.HEAD ? repo.state.HEAD.name : 'unknown';
			
			// Save tabs for the previous branch
			if (branchName) {
				saveBranchTabs(context, branchName);
			}

			// Restore tabs for the new branch
			if (branchName) {
				restoreBranchTabs(context, branchName);
			}
		});
	});


    // Handle branch change to restore tabs
    gitAPI.onDidChangeState(() => {
        console.log('Git state changed!');
        handleBranchChange();
    });

    // Register a manual save command
	const saveCommand = vscode.commands.registerCommand('branchTabManager.saveTabs', () => {
		const branchName = gitAPI.repositories[0]?.state.HEAD?.name || 'unknown';
		saveBranchTabs(context, branchName);
	});
	context.subscriptions.push(saveCommand);

	// Register a manual restore command
	const restoreCommand = vscode.commands.registerCommand('branchTabManager.restoreTabs', () => {
		const branchName = gitAPI.repositories[0]?.state.HEAD?.name || 'unknown';
		restoreBranchTabs(context, branchName);
	});
	context.subscriptions.push(restoreCommand);
}

/** Deactivates the extension. */
function deactivate() {}

module.exports = {
    activate,
    deactivate
};
