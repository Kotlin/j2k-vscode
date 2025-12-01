import * as vscode from "vscode";
import * as path from "path";
import { detectVCS } from "../vcs";
import { ConversionSession } from "../helpers/batch";
import { restoreOriginalFromBackup } from "../helpers/fs";
import { Queue } from "../batch/queue";
import { Worker } from "../batch/worker";

type SessionManager = {
  reset(): void;
};

export function registerSessionCommands(
  context: vscode.ExtensionContext,
  deps: {
    session: ConversionSession;
    worker: Worker;
    queue: Queue;
    outputChannel: vscode.OutputChannel;
    sessionManager: SessionManager;
  },
) {
  const { session, worker, queue, outputChannel, sessionManager } = deps;

  const registerCommand = (
    command: string,
    callback: (...args: any[]) => any | Promise<any>,
  ): vscode.Disposable => {
    const disposable = vscode.commands.registerCommand(command, callback);
    context.subscriptions.push(disposable);
    return disposable;
  };

  registerCommand("j2k.commitConversionSession", async () => {
    if (!session.active) {
      vscode.window.showErrorMessage("No active conversion session.");
      return;
    }

    const suggestedText = `Convert ${session.acceptedFiles.length} files to Kotlin`;
    const name = await vscode.window.showInputBox({
      prompt: "Give this coversion session a name (optional)",
      placeHolder: suggestedText,
    });

    const message =
      name && name.trim().length > 0 ? name.trim() : suggestedText;

    try {
      const vcsHandler = await detectVCS(outputChannel);
      if (typeof vcsHandler.commitAll === "function") {
        await vcsHandler.commitAll(session.acceptedFiles, message);
      }
      // nothing to do for non-vcs

      vscode.window.showInformationMessage(`Committed session: ${message}`);

      worker.clearAllViews(queue);

      for (const kotlinUri of session.acceptedFiles) {
        const kotlinPath = kotlinUri.fsPath;
        const dir = path.dirname(kotlinPath);
        const base = path.basename(kotlinPath, ".kt");

        const javaPath = path.join(dir, base + ".java");
        const javaBackupPath = javaPath + ".j2k";
        const javaBackupUri = vscode.Uri.file(javaBackupPath);

        try {
          await vscode.workspace.fs.delete(javaBackupUri, {
            recursive: false,
            useTrash: false,
          });
        } catch {
          // if it doesn't exist, fine
        }
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(
        `Failed to commit session: ${err?.message ?? String(err)}`,
      );
      return;
    } finally {
      sessionManager.reset();
    }
  });

  registerCommand("j2k.rejectConversionSession", async () => {
    if (!session.active) {
      vscode.window.showErrorMessage("No active conversion session.");
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      `This will discard Kotlin conversions for ${session.acceptedFiles.length} files and restore the original Java files.`,
      { modal: true },
      "Discard session",
      "Cancel",
    );

    if (confirm !== "Discard session") {
      return;
    }

    try {
      for (const kotlinUri of session.acceptedFiles) {
        await restoreOriginalFromBackup(kotlinUri);
      }

      worker.clearAllViews(queue);

      vscode.window.showInformationMessage(
        "Conversion session discarded and files restored.",
      );
    } catch (err: any) {
      vscode.window.showErrorMessage(
        `Failed to discard session: ${err?.message ?? String(err)}`,
      );
      return;
    } finally {
      sessionManager.reset();
    }
  });
}
