const assert = require("assert");
const vscode = require("vscode");

suite("BranchSwitch Integration Tests", () => {
  vscode.window.showInformationMessage("Running BranchSwitch integration tests...");

  // Test that the extension activates successfully
  test("Extension activates without errors", async () => {
    const extension = vscode.extensions.getExtension("Velocities.branchSwitch"); // Use your extension's ID
    assert.ok(extension, "Extension not found");
    await extension.activate();
    assert.ok(extension.isActive, "Extension did not activate");
  });

  // Test that the "Save Tabs" command is registered
  test('"Save Tabs" command is registered', async () => {
    const command = "branchSwitch.saveTabs"; // Command ID
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes(command), `"${command}" command not registered`);
  });

  // Test the "Restore Tabs" command is registered
  test('"Restore Tabs" command is registered', async () => {
    const command = "branchSwitch.restoreTabs"; // Command ID
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes(command), `"${command}" command not registered`);
  });

  // Test execution of the "Save Tabs" command
  test('"Save Tabs" command executes successfully', async () => {
    const result = await vscode.commands.executeCommand("branchSwitch.saveTabs");
    assert.strictEqual(result, undefined, '"Save Tabs" command did not execute successfully');
  });

  // Test execution of the "Restore Tabs" command
  test('"Restore Tabs" command executes successfully', async () => {
    const result = await vscode.commands.executeCommand("branchSwitch.restoreTabs");
    assert.strictEqual(result, undefined, '"Restore Tabs" command did not execute successfully');
  });
});
