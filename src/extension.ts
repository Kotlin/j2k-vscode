import * as vscode from "vscode";
import * as assert from "assert";
import * as path from "path";

import { convertToKotlin } from "./converter";
import { detectVCS, VCSFileRenamer } from "./vcs";

// larger numbers mean closer to the StatusBarAlignment:
// we put Cancel immediately to the left of Accept
const StatusBarPriorities = {
  ACCEPT: 100,
  CANCEL: 99,
} as const;

function inDiff(editor: vscode.TextEditor | undefined): boolean {
  if (!editor) {
    return false;
  }

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
  // so that we don't have to discover open workspaces when accepting/rejecting,
  // we convey this state between the convert command
  // and the accept/cancel commands
  let javaUri: vscode.Uri;
  let kotlinUri: vscode.Uri;

  // for general purpose logging
  const outputChannel = vscode.window.createOutputChannel("j2k-vscode");

  // to preserve VC history
  const vcsHandler: VCSFileRenamer = detectVCS();

  // accept/discard buttons for viewing the diff
  const acceptButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    StatusBarPriorities.ACCEPT,
  );
  acceptButton.text = "(J2K Conversion) Accept and Replace";
  acceptButton.command = "j2k.acceptAndReplaceConversion";

  const cancelButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    StatusBarPriorities.CANCEL,
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
      javaUri = uri;

      const kotlinCode = convertToKotlin(javaCode);
      const kotlinBuf = await vscode.workspace.openTextDocument({
        language: "kotlin",
        content: kotlinCode,
      });
      kotlinUri = kotlinBuf.uri;

      await vscode.commands.executeCommand(
        "vscode.diff",
        javaBuf.uri,
        kotlinBuf.uri,
        "Java to Kotlin Preview",
      );

      outputChannel.appendLine("Java to Kotlin Preview ready");
    },
  );

  const acceptAndReplace = vscode.commands.registerCommand(
    "j2k.acceptAndReplaceConversion",
    async () => {
      // PRE: our diff is open therefore j2k.convertFile has run
      assert.ok(javaUri, "javaUri is not set before accepting conversion");
      assert.ok(kotlinUri, "kotlinUri is not set before accepting conversion");

      const kotlinDoc = await vscode.workspace.openTextDocument(kotlinUri);
      const replacementCode = kotlinDoc.getText();

      // write the replacement code to the same location as the java

      const oldPath = javaUri.fsPath;
      const dir = path.dirname(oldPath);
      const base = path.basename(oldPath, ".java");
      const newPath = path.join(dir, base + ".kt");

      const kotlinReplacement = vscode.Uri.file(newPath);

      // rename the java file to .kt file extension to preserve commit
      // history, then commit

      vcsHandler.renameAndCommit(javaUri, kotlinReplacement);

      // write the kotlin file, then delete the old java file
      await vscode.workspace.fs.writeFile(
        kotlinReplacement,
        Buffer.from(replacementCode, "utf-8"),
      );
      await vscode.workspace.fs.delete(javaUri);

      // tidy up any changed state
      await vscode.commands.executeCommand(
        "workbench.action.revertAndCloseActiveEditor",
      );
    },
  );

  const cancelAndDiscard = vscode.commands.registerCommand(
    "j2k.cancelConversion",
    async () => {
      // tidy up any changed state
      await vscode.commands.executeCommand(
        "workbench.action.revertAndCloseActiveEditor",
      );
    },
  );

  context.subscriptions.push(convertFile, acceptAndReplace, cancelAndDiscard);

  // only show our buttons when we are actively in the diff editor
  vscode.window.onDidChangeActiveTextEditor(
    (editor: vscode.TextEditor | undefined) => {
      if (inDiff(editor)) {
        acceptButton.show();
        cancelButton.show();
      } else {
        acceptButton.hide();
        cancelButton.hide();
      }
    },
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
