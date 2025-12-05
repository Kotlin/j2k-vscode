import * as vscode from "vscode";
import * as path from "path";
import { Worker, CompletedJob } from "./worker";

export interface AcceptedItem {
  label: string;
  uri: vscode.Uri;
}

export class AcceptedListProvider
  implements vscode.TreeDataProvider<AcceptedItem>
{
  private onChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.onChange.event;

  constructor(private readonly worker: Worker) {
    worker.onDidChange(() => this.onChange.fire());
  }

  getChildren(element?: AcceptedItem): AcceptedItem[] {
    if (element) {
      return [];
    }

    return this.worker.accepted.map(({ uri }) => ({
      label: path.basename(uri.fsPath),
      uri,
    }));
  }

  getTreeItem(acceptedItem: AcceptedItem): vscode.TreeItem {
    const item = new vscode.TreeItem(acceptedItem.label);

    item.iconPath = vscode.ThemeIcon.File;
    item.resourceUri = acceptedItem.uri;

    item.command = {
      command: "vscode.open",
      title: "Open File",
      arguments: [acceptedItem.uri],
    };

    return item;
  }
}
