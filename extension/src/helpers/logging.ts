import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export function logFile(filename: string, content: string): void {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error("Expected a workspace to be open");
  }

  const basePath = workspaceFolders[0].uri.fsPath;

  const logsDir = path.join(basePath, ".j2k-logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // let's add a timestamp to keep track of what happened when
  const timestamp = new Date().toISOString();
  // for ease of later programmatic inspection, put the timestamp first
  const header = `// ${timestamp} (logged at)\n\n`;

  fs.writeFileSync(path.join(logsDir, filename), `${header}${content}`, {
    encoding: "utf8",
  });
}
