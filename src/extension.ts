import * as vscode from "vscode";

import { convertToKotlin } from "./converter";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "j2k-vscode" is now active!');

  const outputChannel = vscode.window.createOutputChannel("j2k-vscode");

  const convertFile = vscode.commands.registerCommand(
    "j2k.convertFile",
    async (uri: vscode.Uri) => {
      outputChannel.appendLine(`Converting ${uri.fsPath}`);

      const javaBuf = await vscode.workspace.openTextDocument(uri);
      const javaCode = javaBuf.getText();

      const kotlinCode = convertToKotlin(javaCode);
      const kotlinBuf = await vscode.workspace.openTextDocument({
        language: "kotlin",
        content: kotlinCode
      });

      await vscode.commands.executeCommand(
        "vscode.diff",
        javaBuf.uri,
        kotlinBuf.uri,
        "Java to Kotlin Preview"
      );

      outputChannel.appendLine("Java to Kotlin Preview ready");
    }
  );

  context.subscriptions.push(convertFile);
}

// This method is called when your extension is deactivated
export function deactivate() {}
