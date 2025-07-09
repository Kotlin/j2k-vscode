import * as vscode from "vscode";
import { VCSFileRenamer } from ".";

// note: not many reliable docs on the git api that vscode exposes
// this comes from https://github.com/microsoft/vscode/tree/main/extensions/git
import type { GitExtension, API as GitAPI, Repository } from "./git.d";

// since the extension only has access to a GitFileRenamer if
// more than 0 repositories are detected, we know that there's
// at least one repository open - we can therefore ignore the case
// of 0 repositories
export class GitFileRenamer implements VCSFileRenamer {
  private api: GitAPI;

  name: string = "Git";

  constructor(api: GitAPI) {
    this.api = api;
  }

  async renameAndCommit(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.rename(oldUri, newUri);

    const repo: Repository = this.api.getRepository(oldUri)!;

    // a Repository object doesn't expose a remove/delete method
    // await vscode.commands.executeCommand("git.stage", oldUri);
    await repo.add([newUri.fsPath]);

    await repo.commit(`Rename ${oldUri.path} -> ${newUri.path}`);
  }

  async stageConversionReplacement(kotlinUri: vscode.Uri): Promise<void> {
    const repo: Repository = this.api.getRepository(kotlinUri)!;

    await repo.add([kotlinUri.fsPath]);

    // maybe overkill
    // await repo.commit(`Convert ${kotlinUri.path} to Kotlin`);
  }
}
