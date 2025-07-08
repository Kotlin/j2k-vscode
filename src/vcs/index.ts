import { extensions, Uri } from 'vscode';

import type { GitExtension } from "./git.d";
import { GitFileRenamer } from './git';

const GITAPI_VERSION_NUMBER = 1;

export interface VCSFileRenamer {
  rename(oldUri: Uri, newUri: Uri): Promise<void>;
}

export function detectVCS(): VCSFileRenamer {
  const gitExt = extensions.getExtension<GitExtension>('vscode.git')?.exports;

  if (gitExt?.enabled) {
    const api = gitExt.getAPI(GITAPI_VERSION_NUMBER);

    return new GitFileRenamer(api);
  }
}