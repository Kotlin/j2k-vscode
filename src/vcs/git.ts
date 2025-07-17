import * as vscode from "vscode";
import { VCSFileRenamer } from ".";
import * as path from "path";

// note: not many reliable docs on the git api that vscode exposes
// this comes from https://github.com/microsoft/vscode/tree/main/extensions/git
import type { GitExtension, API as GitAPI, Repository } from "./git.d";

export class GitFileRenamer implements VCSFileRenamer {
  private api: GitAPI;
  private channel: vscode.OutputChannel;

  private async waitForIndex(repo: Repository, wantedPaths: string[]): Promise<void> {
    for (let i = 0; i < 20; i++) {
      const indexedFiles = repo.state.indexChanges.map(c => c.uri.fsPath);
      if (wantedPaths.every(p => indexedFiles.includes(p))) {
        this.channel.appendLine("GitFileRenamer: Staged changes registered by Git");
        return;
      }

      // files aren't yet in the index, wait 50ms
      // we have 20 iterations to wait up to max 1 second
      await new Promise(r => setTimeout(r, 50));
    }

    throw new Error("GitFileRenamer: Timed out while waiting for Git to finish staging");
  }

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
      `GitFileRenamer: Renamed file ${newName} to ${newName}`,
    );

    const repo: Repository = this.api.getRepository(oldUri)!;

    // a Repository object doesn't expose a remove/delete method
    await vscode.commands.executeCommand("git.stage", oldUri);
    await repo.add([newUri.fsPath]);

    this.channel.appendLine(
      `GitFileRenamer: Staged the rename as a deletion and addition`,
    );

    // wait to allow git to sync back up
    await this.waitForIndex(repo, [oldUri.fsPath, newUri.fsPath]);

    await repo.commit(`Rename ${oldName} -> ${newName}`);

    this.channel.appendLine(`GitFileRenamer: Committed the rename`);
  }

  async stageConversionReplacement(kotlinUri: vscode.Uri): Promise<void> {
    const repo: Repository = this.api.getRepository(kotlinUri)!;

    await repo.add([kotlinUri.fsPath]);

    this.channel.appendLine(
      `GitFileRenamer: Staged the replacement of Java code with Kotlin`,
    );

    await this.waitForIndex(repo, [kotlinUri.fsPath]);

    // maybe overkill
    await repo.commit(`Convert ${path.basename(kotlinUri.fsPath)} to Kotlin`);

    this.channel.appendLine(`GitFileRenamer: Committed the Kotlin replacement`);
  }
}
