import * as vscode from "vscode";
import * as path from "path";
import { Queue, Job } from "../batch/queue";
import { Worker } from "../batch/worker";
import { normaliseSelection } from "../helpers/fs";

type SessionManager = {
  beginIfRequired(): void;
};

export function registerQueueCommands(
  context: vscode.ExtensionContext,
  deps: {
    queue: Queue;
    worker: Worker;
    outputChannel: vscode.OutputChannel;
    sessionManager: SessionManager;
  },
) {
  const { queue, worker, outputChannel, sessionManager } = deps;

  const registerCommand = (
    command: string,
    callback: (...args: any[]) => any | Promise<any>,
  ): vscode.Disposable => {
    const disposable = vscode.commands.registerCommand(command, callback);
    context.subscriptions.push(disposable);
    return disposable;
  };

  registerCommand(
    "j2k.queueFile",
    async (resource?: vscode.Uri, resources?: vscode.Uri[]) => {
      sessionManager.beginIfRequired();

      const selected = resources?.length
        ? resources
        : resource
        ? [resource]
        : [];

      const javaUris = await normaliseSelection(selected);

      javaUris.forEach((uri: vscode.Uri) => {
        const queued = queue
          .toArray()
          .some((item) => item.javaUri.fsPath === uri.fsPath);
        const running =
          worker.current &&
          worker.current.javaUri.fsPath === uri.fsPath;

        if (queued || running) {
          outputChannel.appendLine(
            `queueFile: skipped ${path.basename(uri.fsPath)} (already in queue)`,
          );
          vscode.window.showInformationMessage(
            `${path.basename(uri.fsPath)} is already in the queue.`,
          );

          return;
        }

        outputChannel.appendLine(
          `queueFile: Enqueued ${path.basename(uri.fsPath)}`,
        );

        queue.enqueue(uri);

        vscode.commands.executeCommand("workbench.view.extension.j2k");
      });
    },
  );

  registerCommand(
    "j2k.queue.openProgress",
    async (job: Job) => {
      let document = await vscode.workspace.openTextDocument(job.progressUri);

      if (document.languageId !== "kotlin") {
        document = await vscode.languages.setTextDocumentLanguage(
          document,
          "kotlin",
        );
      }

      await vscode.window.showTextDocument(document, { preview: true });
    },
  );
}
