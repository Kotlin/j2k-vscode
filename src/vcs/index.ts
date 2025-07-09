import { extensions, Uri } from "vscode";

import type { GitExtension } from "./git.d";
import { GitFileRenamer } from "./git";
import { StandardFileRenamer } from "./standard";

const GITAPI_VERSION_NUMBER = 1;

export interface VCSFileRenamer {
  name: string;

  renameAndCommit(oldUri: Uri, newUri: Uri): Promise<void>;

  stageConversionReplacement(kotlinUri: Uri): Promise<void>;
}

export function detectVCS(): VCSFileRenamer {
  const gitExt = extensions.getExtension<GitExtension>("vscode.git")?.exports;

  if (gitExt?.enabled) {
    console.log("git extension enabled");
    const api = gitExt.getAPI(GITAPI_VERSION_NUMBER);

    console.log(api.repositories.length);

    if (api.repositories.length > 0) {
      // we guarantee that there is at least one repository opened
      // before we return a gitfilerenamer, so that we can interact
      // with the repository without validating the above
      console.log("Using git for the file renamer");
      return new GitFileRenamer(api);
    }
  }

  console.log("Using a standard FS file renamer");
  // return standard fs renamer to simplify logic
  return new StandardFileRenamer();
}
