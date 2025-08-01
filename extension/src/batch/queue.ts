import * as vscode from "vscode";

export interface EditorQueueItem {
  uri: vscode.Uri,
  editor: vscode.TextEditor,
}