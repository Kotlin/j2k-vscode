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

  async needsKotlin() {
    const uri = await this.getBuildFile();
    if (!uri) return false;

    const contents = (await vscode.workspace.openTextDocument(uri)).getText();

    return !contents.includes("org.jetbrains.kotlin.jvm");
  }

  async enableKotlin() {
    
  }
}