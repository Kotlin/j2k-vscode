import * as vscode from "vscode";
import { VCSFileRenamer } from ".";

// note: not many reliable docs on the git api that vscode exposes
// this comes from https://github.com/microsoft/vscode/tree/main/extensions/git
import type { GitExtension, API as GitAPI, Repository } from "./git.d";
import { report } from "process";

export class GitFileRenamer implements VCSFileRenamer {
  private api: GitAPI;

  constructor(api: GitAPI) {
    this.api = api;
  }

  async renameAndCommit(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.rename(oldUri, newUri);

    const repo: Repository | null = this.api.getRepository(oldUri);

    if (repo === null) {

    }
  }

  async stageConversionReplacement(kotlinUri: vscode.Uri): Promise<void> {
    
  }
}
