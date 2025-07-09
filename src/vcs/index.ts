import { extensions, Uri, OutputChannel } from "vscode";

import type { GitExtension } from "./git.d";
import { GitFileRenamer } from "./git";
import { StandardFileRenamer } from "./standard";

const GITAPI_VERSION_NUMBER = 1;

export interface VCSFileRenamer {
  name: string;

  renameAndCommit(oldUri: Uri, newUri: Uri): Promise<void>;

  stageConversionReplacement(kotlinUri: Uri): Promise<void>;
}

export async function detectVCS(outputChannel: OutputChannel): Promise<VCSFileRenamer> {
  const gitExt = extensions.getExtension<GitExtension>("vscode.git");

  if (gitExt) {
    const exports = (await gitExt.activate());
    if (exports.enabled) {
      // nested if as we need to validate that the extension exists
      // and that it's enabled separately
      outputChannel.appendLine(`detectVCS: Active git extension found`);
      const api = exports.getAPI(GITAPI_VERSION_NUMBER);

      if (api.repositories.length > 0) {
        // we guarantee that there is at least one repository opened
        // before we return a gitfilerenamer, so that we can interact
        // with the repository without validating the above
        
        // note: the above is not the best method, as the repository can change
        // between conversions, so assuming the repository doesn't change
        // is an unreasonable assumption
        return new GitFileRenamer(api, outputChannel);
      }

      outputChannel.appendLine(`detectVCS: ${api.repositories.length > 0 ? "U" : "Not u"}sing Git as VCS`);
    }
  }

  outputChannel.appendLine(`detectVCS: No VC repository found, defaulting to none`);
  // return standard fs renamer to simplify logic
  return new StandardFileRenamer(outputChannel);
}
