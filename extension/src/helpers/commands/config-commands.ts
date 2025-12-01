import * as vscode from "vscode";
import { configureKotlinForBuildSystems } from "../build-systems";

export function registerConfigCommands(
  context: vscode.ExtensionContext,
  deps: { outputChannel: vscode.OutputChannel },
) {
  const { outputChannel } = deps;

  const registerCommand = (
    command: string,
    callback: (...args: any[]) => any | Promise<any>,
  ): vscode.Disposable => {
    const disposable = vscode.commands.registerCommand(command, callback);
    context.subscriptions.push(disposable);
    return disposable;
  };

  registerCommand("j2k.setApiKey", async () => {
    const key = await vscode.window.showInputBox({
      prompt: "Enter your LLM API key",
      password: true,
      ignoreFocusOut: true,
    });

    if (key) {
      await context.secrets.store("j2k.apiKey", key);
      vscode.window.showInformationMessage(
        "LLM API key saved to VS Code secure storage.",
      );

      outputChannel.appendLine(
        "LLM API key saved to VS Code secure storage.",
      );
    }
  });

  registerCommand("j2k.configureKotlin", async () => {
    await configureKotlinForBuildSystems(outputChannel);
  });
}
