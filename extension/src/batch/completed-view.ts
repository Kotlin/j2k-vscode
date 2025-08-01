import * as vscode from "vscode";
import { Worker, CompletedJob } from "./worker";
import { cp } from "fs";

export class CompletedListProvider implements vscode.TreeDataProvider<CompletedJob> {
  private onChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.onChange.event;

  constructor(private readonly worker: Worker) {
    worker.onDidChange(() => this.onChange.fire());
  }
  
  getChildren(element?: CompletedJob): CompletedJob[] {
    if (element) {
      return [];
    }
    
    return this.worker.completed;
  }
  
  getTreeItem(completedJob: CompletedJob): vscode.TreeItem {
    const item = new vscode.TreeItem(vscode.workspace.asRelativePath(completedJob.job.javaUri.fsPath));

    item.iconPath = new vscode.ThemeIcon(completedJob.kotlinText ? "check" : "warning");
    item.command = {
      command: "j2k.completed.openDiff",
      title: "Open Diff",
      arguments: [completedJob]
    };

    return item;
  }
}