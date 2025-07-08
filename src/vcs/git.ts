import { Uri } from 'vscode';
import { VCSFileRenamer } from '.';

// note: not many reliable docs on the git api that vscode exposes
// this comes from https://github.com/microsoft/vscode/tree/main/extensions/git
import type { GitExtension, API as GitAPI } from "./git.d";

export class GitFileRenamer implements VCSFileRenamer {
  private api: GitAPI;

  constructor(api: GitAPI) {
    this.api = api;
  }

  async rename(oldUri: Uri, newUri: Uri): Promise<void> {

  }
}