import * as vscode from "vscode";
import * as path from "path";

export async function normaliseSelection(
  input: vscode.Uri[],
): Promise<vscode.Uri[]> {
  const out: vscode.Uri[] = [];

  for (const uri of input) {
    const stat = await vscode.workspace.fs.stat(uri);

    if ((stat.type & vscode.FileType.Directory) !== 0) {
      const pattern = new vscode.RelativePattern(uri, "**/*.java");
      const found = await vscode.workspace.findFiles(pattern);
      out.push(...found);
    } else if (/\.java$/i.test(uri.fsPath)) {
      out.push(uri);
    }
  }

  const normaliseFsPath = (p: string) => {
    const n = path.normalize(p);
    return process.platform === "win32" ? n.toLowerCase() : n;
  };

  return [...new Map(out.map((u) => [normaliseFsPath(u.fsPath), u])).values()];
}

export function deriveWorkspaceFolder(
  uri: vscode.Uri,
): vscode.WorkspaceFolder | undefined {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (folder) {
    return folder;
  }

  const all = vscode.workspace.workspaceFolders;
  return all && all.length > 0 ? all[0] : undefined;
}

export async function restoreOriginalFromBackup(
  kotlinUri: vscode.Uri,
): Promise<void> {
  const kotlinPath = kotlinUri.fsPath;
  const dir = path.dirname(kotlinPath);
  const base = path.basename(kotlinPath, ".kt");

  const javaPath = path.join(dir, base + ".java");
  const javaBackupPath = javaPath + ".j2k";

  const javaUri = vscode.Uri.file(javaPath);
  const javaBackupUri = vscode.Uri.file(javaBackupPath);

  // delete the generated kotlin file, if it exists
  try {
    await vscode.workspace.fs.stat(kotlinUri);
    await vscode.workspace.fs.delete(kotlinUri, {
      recursive: false,
      useTrash: false,
    });
  } catch {
    // ignore
  }

  // restore backup if present
  try {
    await vscode.workspace.fs.stat(javaBackupUri);
    await vscode.workspace.fs.rename(javaBackupUri, javaUri, {
      overwrite: true,
    });
  } catch {
    // ignore
  }
}
