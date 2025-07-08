import { extensions, Uri } from "vscode";

import type { GitExtension } from "./git.d";
import { GitFileRenamer } from "./git";
import { StandardFileRenamer } from "./standard";

const GITAPI_VERSION_NUMBER = 1;

export interface VCSFileRenamer {
  renameAndCommit(oldUri: Uri, newUri: Uri): Promise<void>;

  stageConversionReplacement(kotlinUri: Uri): Promise<void>;
}

export function detectVCS(): VCSFileRenamer {
  const gitExt = extensions.getExtension<GitExtension>("vscode.git")?.exports;

  if (gitExt?.enabled) {
    const api = gitExt.getAPI(GITAPI_VERSION_NUMBER);

    if (api.repositories.length > 0) {
      // we guarantee that 
      return new GitFileRenamer(api);
    }
  }

  // return standard fs renamer to simplify logic
  return new StandardFileRenamer();
}
