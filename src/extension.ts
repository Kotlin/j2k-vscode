import * as vscode from "vscode";
import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";

import { convertToKotlin } from "./converter";
import { detectVCS, VCSFileRenamer } from "./vcs";
import { detectBuildSystem } from "./build-systems";

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

export function logFile(filename: string, content: string) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders === undefined) {
    throw new Error("Expected a workspace to be open");
  }

  const basePath = workspaceFolders[0].uri.fsPath;

  const logsDir = path.join(basePath, ".j2k-logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // let's add a timestamp to keep track of what happened when

  const timestamp = new Date().toISOString();
  // for ease of later programmatic inspection, put the timestamp first
  const header = `// ${timestamp} (logged at)\n\n`;

  fs.writeFileSync(path.join(logsDir, filename), `${header}${content}`, {
    encoding: "utf8",
  });
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
  
  const buildSystem = await detectBuildSystem();

  outputChannel.appendLine(`Output channel detected: ${buildSystem.name}`);

  if (await buildSystem.needsKotlin()) {
    outputChannel.appendLine(`Build system ${buildSystem.name} requires Kotlin to be configured.`);
    vscode.window.showInformationMessage(
      "This project currently builds only Java. Would you like to add Kotlin support automatically?",
      "Add Kotlin",
      "Not now"
    ).then(async (choice) => {
      if (choice !== "Add Kotlin") {
        return;
      }

      outputChannel.append("Configuring Kotlin from prompt");

      await buildSystem.enableKotlin();
    });
  }

  const convertFile = vscode.commands.registerCommand(
    "j2k.convertFile",
    async (uri: vscode.Uri) => {
      outputChannel.appendLine(`Converting ${uri.fsPath}`);

      vcsHandler = await detectVCS(outputChannel);
      outputChannel.appendLine(`VCS detected: ${vcsHandler.name}`);

      const javaBuf = await vscode.workspace.openTextDocument(uri);
      const javaCode = javaBuf.getText();
      javaUri = uri;

      const originalBase = path.basename(uri.fsPath, ".java");
      logFile(`${originalBase}.java`, javaCode);

      const kotlinBuf = await vscode.workspace.openTextDocument({
        language: "kotlin",
        content: "",
      });
      kotlinUri = kotlinBuf.uri;

      await vscode.commands.executeCommand(
        "vscode.diff",
        javaBuf.uri,
        kotlinBuf.uri,
        "Java to Kotlin Preview",
      );

      const kotlinEditor = vscode.window.visibleTextEditors.find(
        (e) => e.document === kotlinBuf,
      )!;

      const result = await convertToKotlin(
        javaCode,
        outputChannel,
        context,
        kotlinEditor,
      );

      logFile(`${originalBase}_generated.kt`, result);

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

      // log the changes made to the file
      const originalBase = path.basename(javaUri.fsPath, ".java");
      const logFileName = `${originalBase}_polished.kt`;
      logFile(logFileName, replacementCode);

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
    }),
  );

  // bind the enable kotlin function to a command
  context.subscriptions.push(
    vscode.commands.registerCommand("j2k.configureKotlin", async () => {
      outputChannel.append("Manual trigger: Configuring Kotlin");
      const buildSystem = await detectBuildSystem();

      if (await buildSystem.needsKotlin()) {
        await buildSystem.enableKotlin();
      }
    }),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
