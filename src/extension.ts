import * as vscode from "vscode";
import * as assert from "assert";
import * as path from "path";

import { convertToKotlin } from "./converter";
import { detectVCS, VCSFileRenamer } from "./vcs";

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

  return inDiff;
}

export async function activate(context: vscode.ExtensionContext) {
  // so that we don't have to discover open workspaces when accepting/rejecting,
  // we convey this state between the convert command
  // and the accept/cancel commands
  let javaUri: vscode.Uri;
  let kotlinUri: vscode.Uri;

  // for general purpose logging
  const outputChannel = vscode.window.createOutputChannel("j2k-vscode");
  outputChannel.appendLine("Output channel loaded");

  // to preserve VC history, lazy load vcsHandler
  let vcsHandler: VCSFileRenamer;

  const convertFile = vscode.commands.registerCommand(
    "j2k.convertFile",
    async (uri: vscode.Uri) => {
      outputChannel.appendLine(`Converting ${uri.fsPath}`);

      vcsHandler = await detectVCS(outputChannel);
      outputChannel.appendLine(`VCS detected: ${vcsHandler.name}`);

      const javaBuf = await vscode.workspace.openTextDocument(uri);
      const javaCode = javaBuf.getText();
      javaUri = uri;

      const kotlinCode = await convertToKotlin(javaCode, outputChannel, context);
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

      await vcsHandler.renameAndCommit(javaUri, kotlinReplacement);

      // write the kotlin file, then delete the old java file
      await vscode.workspace.fs.writeFile(
        kotlinReplacement,
        Buffer.from(replacementCode, "utf-8"),
      );

      await vcsHandler.stageConversionReplacement(kotlinReplacement);

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
      vscode.commands.executeCommand(
        "setContext",
        "j2k.diffActive",
        inDiff(editor),
      );
    },
  );

  // to register bigger, bolder commands from editor/title,
  // the toolbar automatically detects keybinds to render below
  // the title. therefore we create aliases which do not have
  // keybinds
  context.subscriptions.push(
    vscode.commands.registerCommand("j2k.acceptFromToolbar", () =>
      vscode.commands.executeCommand("j2k.acceptAndReplaceConversion"),
    ),
    vscode.commands.registerCommand("j2k.cancelFromToolbar", () =>
      vscode.commands.executeCommand("j2k.cancelConversion"),
    ),
  );

  // api key storage
  context.subscriptions.push(
    vscode.commands.registerCommand("j2k.setApiKey", async () => {
      const key = await vscode.window.showInputBox({
        prompt: "Enter your LLM API key",
        password: true,
        ignoreFocusOut: true
      });

      if (key) {
        await context.secrets.store("j2k.apiKey", key);
        vscode.window.showInformationMessage(
          "LLM API key saved to VS Code secure storage."
        );

        outputChannel.appendLine("LLM API key saved to VS Code secure storage.")
      }
    }),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
