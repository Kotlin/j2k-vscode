import * as vscode from 'vscode';
import { VCSFileRenamer } from '.';

// in the case that no version control repositories were found,
// fall back to standard file system management
export class StandardFileRenamer implements VCSFileRenamer {
  async renameAndCommit(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.rename(oldUri, newUri);
  }

  async stageConversionReplacement(kotlinUri: vscode.Uri): Promise<void> {
    // no op
  }
}
