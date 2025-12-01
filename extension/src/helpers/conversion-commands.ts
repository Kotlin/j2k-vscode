import * as vscode from "vscode";
import * as assert from "assert";
import * as path from "path";
import { detectVCS, VCSFileRenamer } from "../vcs";
import { CompletedJob, Worker } from "../batch/worker";
import { Queue } from "../batch/queue";
import { AcceptedItem } from "../batch/accepted-view";
import { ConversionSession } from "../helpers/batch";
import { logFile } from "../helpers/logging";
import { deriveWorkspaceFolder } from "../helpers/fs";

type SessionManager = {
  persist(): void;
};

export function registerConversionCommands(
  context: vscode.ExtensionContext,
  deps: {
    session: ConversionSession;
    worker: Worker;
    queue: Queue;
    completedTree: vscode.TreeView<AcceptedItem | CompletedJob>;
    outputChannel: vscode.OutputChannel;
    sessionManager: SessionManager;
  },
) {
  const {
    session,
    worker,
    queue,
    completedTree,
    outputChannel,
    sessionManager,
  } = deps;

  let javaUri: vscode.Uri | undefined;
  let kotlinUri: vscode.Uri | undefined;
  let vcsHandler: VCSFileRenamer;

  const registerCommand = (
    command: string,
    callback: (...args: any[]) => any | Promise<any>,
  ): vscode.Disposable => {
    const disposable = vscode.commands.registerCommand(command, callback);
    context.subscriptions.push(disposable);
    return disposable;
  };

  function inDiff(editor: vscode.TextEditor | undefined): boolean {
    if (!editor) {
      return false;
    }

    const uri = editor.document.uri.toString();

    const onRight =
      typeof kotlinUri !== "undefined" && uri === kotlinUri.toString();
    const onLeft =
      typeof javaUri !== "undefined" && uri === javaUri.toString();

    return onLeft || onRight;
  }

  // this logic has been factored out so that if we want to keep going after
  // cancel action as well, then we can do this
  async function tryOpenNextConversion() {
    const nextCompleted = worker.completed.find((c) => !c.error);

    if (nextCompleted) {
      await vscode.commands.executeCommand(
        "j2k.completed.openDiff",
        nextCompleted,
      );

      // we are opening a conversion before it's been converted, so it's .java here
      // also remains consistent with the tree view
      vscode.window.showInformationMessage(
        `Automatically opened next Kotlin conversion (${path.basename(nextCompleted.resultUri.fsPath, ".kt")}.java) to be reviewed.`,
      );

      // try to also highlight it in the tree view so it's visually appealing
      await completedTree
        .reveal(nextCompleted, { select: true, focus: false })
        .then(
          () => {},
          () => {},
        );
    }
  }

  registerCommand(
    "j2k.completed.openDiff",
    async (completedJob: CompletedJob) => {
      vcsHandler = await detectVCS(outputChannel);

      const left = await vscode.workspace.openTextDocument(
        completedJob.job.javaUri,
      );

      const { dir, name } = path.parse(completedJob.job.javaUri.fsPath);

      const rightUri = vscode.Uri.from({
        scheme: "untitled",
        path: path.join(dir, name + ".kt"),
      });

      let right = vscode.workspace.textDocuments.find(
        (doc) => doc.uri.toString() === rightUri.toString(),
      );

      if (!right) {
        right = await vscode.workspace.openTextDocument(rightUri);
        right = await vscode.languages.setTextDocumentLanguage(
          right,
          "kotlin",
        );

        // provide actual text
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          rightUri,
          new vscode.Range(0, 0, 0, 0),
          completedJob.kotlinText,
        );
        await vscode.workspace.applyEdit(edit);
      }

      javaUri = completedJob.job.javaUri;
      kotlinUri = right.uri;

      await vscode.commands.executeCommand(
        "vscode.diff",
        left.uri,
        right.uri,
        "Java to Kotlin Preview",
      );
    },
  );

  registerCommand("j2k.acceptAndReplaceConversion", async () => {
    // PRE: our diff is open therefore j2k.convertFile has run
    assert.ok(javaUri, "javaUri is not set before accepting conversion");
    assert.ok(kotlinUri, "kotlinUri is not set before accepting conversion");

    const currentJavaUri = javaUri!;
    const currentKotlinUri = kotlinUri!;

    const kotlinDoc = await vscode.workspace.openTextDocument(currentKotlinUri);
    const replacementCode = kotlinDoc.getText();

    // write the replacement code to the same location as the java

    const oldPath = currentJavaUri.fsPath;
    const dir = path.dirname(oldPath);
    const base = path.basename(oldPath, ".java");
    const newPath = path.join(dir, base + ".kt");

    const kotlinReplacement = vscode.Uri.file(newPath);

    // backup original java file as .java.j2k
    const javaBackupPath = oldPath + ".j2k";
    const javaBackupUri = vscode.Uri.file(javaBackupPath);

    // move the java file out of the way
    try {
      await vscode.workspace.fs.rename(currentJavaUri, javaBackupUri, {
        overwrite: true,
      });
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to backup original Java file for ${path.basename(oldPath)}: ${String(
          err,
        )}`,
      );
      return;
    }

    // write the kotlin file
    await vscode.workspace.fs.writeFile(
      kotlinReplacement,
      Buffer.from(replacementCode, "utf-8"),
    );

    // log the changes made to the file
    const originalBase = path.basename(currentJavaUri.fsPath, ".java");
    const logFileName = `${originalBase}_polished.kt`;
    logFile(logFileName, replacementCode);

    if (session.active) {
      if (!session.workspaceFolder) {
        session.workspaceFolder = deriveWorkspaceFolder(kotlinReplacement);
      }

      session.acceptedFiles.push(kotlinReplacement);

      // sync saved state
      sessionManager.persist();
    } else {
      await vcsHandler.stageConversionReplacement(kotlinReplacement);
    }

    worker.acceptCompleted(currentJavaUri, kotlinReplacement);

    // tidy up any changed state
    await vscode.commands.executeCommand(
      "workbench.action.revertAndCloseActiveEditor",
    );

    worker.removeCompleted(currentJavaUri);

    // here we are saving a kotlin file, so output kotlin Uri
    vscode.window.showInformationMessage(
      `Conversion result for ${path.basename(
        currentKotlinUri.fsPath,
      )} saved successfully.`,
    );

    return await tryOpenNextConversion();
  });

  registerCommand("j2k.cancelConversion", async () => {
    const currentJavaUri = javaUri;

    // tidy up any changed state
    await vscode.commands.executeCommand(
      "workbench.action.revertAndCloseActiveEditor",
    );

    if (currentJavaUri) {
      worker.removeCompleted(currentJavaUri);
    }

    if (currentJavaUri) {
      vscode.window.showInformationMessage(
        `Conversion cancelled for ${path.basename(
          currentJavaUri.fsPath,
        )}`,
      );
    }
  });

  // only show our buttons when we are actively in the diff editor
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(
      (editor: vscode.TextEditor | undefined) => {
        vscode.commands.executeCommand(
          "setContext",
          "j2k.diffActive",
          inDiff(editor),
        );
      },
    ),
  );
}