import * as vscode from "vscode";
import * as path from "path";
import { Queue, Job } from "./queue";
import { Worker } from "./worker";

export class QueueListProvider implements vscode.TreeDataProvider<Job> {
  private onChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.onChange.event;

  constructor(
    private readonly queue: Queue,
    private readonly worker: Worker,
  ) {
    queue.onDidChange(() => this.onChange.fire());
    worker.onDidChange(() => this.onChange.fire());
  }

  getChildren(element?: Job): Job[] {
    if (element) {
      // anything not at the root level should have no children
      return [];
    }

    const items = [...this.queue.toArray()];
    const running = this.worker.current;

    // since the queue dequeues the currently processed job, prepend it
    return running ? [running, ...items] : items;
  }

  getTreeItem(job: Job): vscode.TreeItem {
    const item = new vscode.TreeItem(path.basename(job.javaUri.fsPath));

    const isRunning = this.worker.current?.id === job.id;

    item.contextValue = isRunning ? "jobRunning" : "jobQueued";

    item.iconPath = isRunning
      ? new vscode.ThemeIcon(
          "sync~spin",
          new vscode.ThemeColor("testing.iconQueued"),
        )
      : new vscode.ThemeIcon("history");

    if (isRunning) {
      item.command = {
        command: "j2k.queue.openProgress",
        title: "Open Streaming Editor",
        arguments: [job],
      };
    }

    return item;
  }
}
