// src/helpers/session.ts
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ConversionSession } from "./batch";

const SESSION_STORAGE_NAME = ".j2k-session.tmp";

export interface SessionManager {
  loadFromDisk(): void;
  persist(): void;
  reset(): void;
  beginIfRequired(): void;
}

export function createSessionManager(
  session: ConversionSession,
): SessionManager {
  const setSessionContext = (active: boolean) => {
    vscode.commands.executeCommand("setContext", "j2k.sessionActive", active);
  };

  function getSessionFilePath(): string | undefined {
    if (!session.workspaceFolder) {
      return undefined;
    }

    return path.join(session.workspaceFolder.uri.fsPath, SESSION_STORAGE_NAME);
  }

  function deleteSessionFile() {
    const sessionFilePath = getSessionFilePath();
    if (!sessionFilePath) {
      return;
    }

    try {
      if (fs.existsSync(sessionFilePath)) {
        fs.unlinkSync(sessionFilePath);
      }
    } catch {
      // no-op
    }
  }

  function persist() {
    const sessionFilePath = getSessionFilePath();
    if (!sessionFilePath) {
      return;
    }

    if (!session.active) {
      // when the session isn't active, the file must not exist
      deleteSessionFile();
      return;
    }

    const payload = {
      accepted: session.acceptedFiles.map((uri) => uri.fsPath),
    };

    try {
      fs.writeFileSync(
        sessionFilePath,
        JSON.stringify(payload, null, 2),
        "utf8",
      );
    } catch {
      // no-op
    }
  }

  function loadFromDisk() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      setSessionContext(false);
      return;
    }

    session.active = false;
    session.acceptedFiles = [];
    session.workspaceFolder = undefined;

    for (const folder of folders) {
      const sessionFilePath = path.join(
        folder.uri.fsPath,
        SESSION_STORAGE_NAME,
      );
      if (!fs.existsSync(sessionFilePath)) {
        continue;
      }

      try {
        const content = fs.readFileSync(sessionFilePath, "utf8");
        const parsed = JSON.parse(content) as {
          accepted?: string[];
        };

        if (!parsed || !Array.isArray(parsed.accepted)) {
          fs.unlinkSync(sessionFilePath);
          continue;
        }

        const uris: vscode.Uri[] = [];
        for (const p of parsed.accepted) {
          if (typeof p !== "string") {
            continue;
          }
          if (!fs.existsSync(p)) {
            continue;
          }
          uris.push(vscode.Uri.file(p));
        }

        if (uris.length === 0) {
          // nothing to resume - remove the file
          fs.unlinkSync(sessionFilePath);
          continue;
        }

        session.active = true;
        session.acceptedFiles = uris;
        session.workspaceFolder = folder;

        break;
      } catch {
        // corrupt or unreadable, best effort clean up
        try {
          fs.unlinkSync(sessionFilePath);
        } catch {
          // ignore
        }
      }
    }

    setSessionContext(session.active);
  }

  function reset() {
    session.active = false;
    session.acceptedFiles = [];
    session.workspaceFolder = undefined;
    setSessionContext(false);
    deleteSessionFile();
  }

  function beginIfRequired() {
    if (session.active) {
      return;
    }

    session.active = true;
    session.acceptedFiles = [];
    session.workspaceFolder = undefined;
    setSessionContext(true);
    persist();
  }

  return {
    loadFromDisk,
    persist,
    reset,
    beginIfRequired,
  };
}
