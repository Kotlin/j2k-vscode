import * as vscode from "vscode";

import { convertToKotlin } from "./converter";

function inDiff(editor: vscode.TextEditor | undefined): boolean {
  console.log("here");
  if (!editor) {
    return false;
  }

  console.log("here1");

  // when opening the diff, the right hand side is automatically focused
  // this is our kotlin window
  const inDiff =
    vscode.window.activeTextEditor?.document?.uri.scheme === "untitled" &&
    vscode.window.activeTextEditor.viewColumn === undefined &&
    vscode.window.activeTextEditor?.document.languageId === "kotlin";

  console.log(vscode.window.activeTextEditor?.document?.uri.scheme);
  console.log(vscode.window.activeTextEditor?.viewColumn);
  console.log(vscode.window.activeTextEditor?.document?.languageId);

  return inDiff;
}

export function activate(context: vscode.ExtensionContext) {
  // for general purpose logging
  const outputChannel = vscode.window.createOutputChannel("j2k-vscode");

  // accept/discard buttons for viewing the diff
  const acceptButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    99,
  );
  acceptButton.text = "(J2K Conversion) Accept and Replace";
  acceptButton.command = "j2k.acceptAndReplaceConversion";

  const cancelButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  cancelButton.text = "(J2K Conversion) Cancel";
  cancelButton.command = "j2k.cancelConversion";

  context.subscriptions.push(acceptButton, cancelButton);

  const convertFile = vscode.commands.registerCommand(
    "j2k.convertFile",
    async (uri: vscode.Uri) => {
      outputChannel.appendLine(`Converting ${uri.fsPath}`);

      const javaBuf = await vscode.workspace.openTextDocument(uri);
      const javaCode = javaBuf.getText();

      const kotlinCode = convertToKotlin(javaCode);
      const kotlinBuf = await vscode.workspace.openTextDocument({
        language: "kotlin",
        content: kotlinCode,
      });

      await vscode.commands.executeCommand(
        "vscode.diff",
        javaBuf.uri,
        kotlinBuf.uri,
        "Java to Kotlin Preview",
      );

      outputChannel.appendLine("Java to Kotlin Preview ready");
    },
  );

  context.subscriptions.push(convertFile);

  // only show our buttons when we are actively in the diff editor
  vscode.window.onDidChangeActiveTextEditor(
    (editor: vscode.TextEditor | undefined) => {
      console.log("editor changed!");
      if (inDiff(editor)) {
        console.log("show buttons");
        acceptButton.show();
        cancelButton.show();
      } else {
        console.log("HIDE BUTTONS");
        acceptButton.hide();
        cancelButton.hide();
      }
    },
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
