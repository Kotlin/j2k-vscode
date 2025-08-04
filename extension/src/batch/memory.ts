import * as vscode from "vscode";

// having a concrete instance of vscode.TextDocumentContentProvider allows us
// to store currently being converted uris in memory, as well as automatically
// update documents open with such URIs
export class MemoryContentProvider
  implements vscode.TextDocumentContentProvider
{
  private store = new Map<string, string>();

  private change = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this.change.event;

  set(uri: vscode.Uri, text: string) {
    this.store.set(uri.toString(), text);
    this.change.fire(uri);
  }

  clear(uri: vscode.Uri) {
    this.store.delete(uri.toString());
    this.change.fire(uri);
  }

  provideTextDocumentContent(uri: vscode.Uri) {
    return this.store.get(uri.toString()) ?? "";
  }
}
