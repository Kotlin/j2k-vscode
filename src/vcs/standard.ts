import * as vscode from "vscode";
import { VCSFileRenamer } from ".";

// in the case that no version control repositories were found,
// fall back to standard file system management
export class StandardFileRenamer implements VCSFileRenamer {
  private channel: vscode.OutputChannel;

  name: string = "FS";
  
  constructor(channel: vscode.OutputChannel) {
    this.channel = channel;
  }

  async renameAndCommit(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.rename(oldUri, newUri);
    
    this.channel.appendLine(`StandardFileRenamer: Renamed file ${oldUri} to ${newUri}`);
  }

  async stageConversionReplacement(kotlinUri: vscode.Uri): Promise<void> {
    // no op
    
    this.channel.appendLine(`StandardFileRenamer: No-op on staging the conversion replacement`);
  }
}
