import * as vscode from "vscode";
import { MemoryContentProvider } from "../batch/memory";
import { Queue } from "../batch/queue";
import { Worker } from "../batch/worker";
import { QueueListProvider } from "../batch/queue-view";
import { CompletedListProvider } from "../batch/completed-view";
import { AcceptedListProvider } from "../batch/accepted-view";

export type ConversionSession = {
  active: boolean;
  acceptedFiles: vscode.Uri[];
  workspaceFolder?: vscode.WorkspaceFolder;
};

export function createBatchController(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  session: ConversionSession,
) {
  const queue = new Queue();
  const mem = new MemoryContentProvider();
  const worker = new Worker(context, queue, mem, outputChannel);
  worker.start();
  if (session.active && session.acceptedFiles.length > 0) {
    worker.restoreAccepted(session.acceptedFiles);
  }

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider("j2k-progress", mem),
  );
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider("j2k-result", mem),
  );

  const acceptedView = new AcceptedListProvider(worker);
  const completedView = new CompletedListProvider(worker);
  const completedTree = vscode.window.createTreeView("j2k.completed", {
    treeDataProvider: completedView,
  });
  const queueProvider = new QueueListProvider(queue, worker);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("j2k.accepted", acceptedView),
    completedTree,
    vscode.window.registerTreeDataProvider("j2k.queue", queueProvider),
  );

  return {
    queue,
    mem,
    worker,
    acceptedView,
    completedTree,
    queueProvider,
  };
}
