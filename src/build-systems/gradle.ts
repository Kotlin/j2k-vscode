import * as vscode from "vscode";
import { JVMBuildSystem } from ".";

export class GradleBuildSystem implements JVMBuildSystem {
  name: string = "Gradle"

  workspaceFolder: vscode.WorkspaceFolder

  constructor(folder: vscode.WorkspaceFolder) {
    this.workspaceFolder = folder;
  }

  private async getBuildFile() {
    const [file] = await vscode.workspace.findFiles(
      new vscode.RelativePattern(this.workspaceFolder, "{build.gradle,build.gradle.kts}"),
      null,
      1,
    );

    return file;
  }
  
  private stripComments(code: string) {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
  }

  async needsKotlin() {
    const uri = await this.getBuildFile();
    if (!uri) return false;

    const contents = this.stripComments((await vscode.workspace.openTextDocument(uri)).getText());

    const pluginPatterns: RegExp[] = [
      // Kotlin‑DSL alias, e.g. kotlin("jvm") or kotlin("plugin.spring")
      /\bkotlin\s*\(\s*["'][\w\-.+]+["']\s*\)/,
      // Explicit plugin id, Groovy or Kotlin‑DSL
      /\bid\s*\(\s*["']org\.jetbrains\.kotlin[^"']*["']\s*\)/,
      /\bid\s+['"]org\.jetbrains\.kotlin[^'"]*['"]/,
    ];
    if (pluginPatterns.some(re => re.test(contents))) return false;

    return true;
  }

  async enableKotlin() {
    
  }
}