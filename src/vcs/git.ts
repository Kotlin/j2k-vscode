import * as vscode from "vscode";
import { VCSFileRenamer } from ".";
import * as path from "path";

// note: not many reliable docs on the git api that vscode exposes
// this comes from https://github.com/microsoft/vscode/tree/main/extensions/git
import type { API as GitAPI, Repository } from "./git.d";
import { Status } from "./git.d";

export class GitFileRenamer implements VCSFileRenamer {
  private api: GitAPI;
  private channel: vscode.OutputChannel;

  name: string = "Git";

  constructor(api: GitAPI, channel: vscode.OutputChannel) {
    this.api = api;
    this.channel = channel;
  }

  async renameAndCommit(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.rename(oldUri, newUri);

    const oldName = path.basename(oldUri.fsPath);
    const newName = path.basename(newUri.fsPath);

    this.channel.appendLine(
      `GitFileRenamer: Renamed file ${oldName} to ${newName}`,
    );

    const repo: Repository = this.api.getRepository(oldUri)!;

    await repo.commit(`Rename ${oldName} -> ${newName}`, { all: true });

    this.channel.appendLine(`GitFileRenamer: Committed the rename`);
  }

  async stageConversionReplacement(kotlinUri: vscode.Uri): Promise<void> {
    const repo: Repository = this.api.getRepository(kotlinUri)!;

    await repo.add([kotlinUri.fsPath]);

    this.channel.appendLine(
      `GitFileRenamer: Staged the replacement of Java code with Kotlin`,
    );

    // maybe overkill
    await repo.commit(`Convert ${path.basename(kotlinUri.fsPath)} to Kotlin`);

    this.channel.appendLine(`GitFileRenamer: Committed the Kotlin replacement`);
  }
}
