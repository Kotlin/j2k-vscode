import * as vscode from "vscode";
import { JVMBuildSystem } from ".";

export class MavenBuildSystem implements JVMBuildSystem {
  name: string = "Maven"
  
  workspaceFolder: vscode.WorkspaceFolder

  constructor(folder: vscode.WorkspaceFolder) {
    this.workspaceFolder = folder;
  }
  
  private async getBuildFile() {
    const [file] = await vscode.workspace.findFiles(
      new vscode.RelativePattern(this.workspaceFolder, "pom.xml"),
      null,
      1,
    );

    return file;
  }

  async needsKotlin() {
    const uri = await this.getBuildFile();
    if (!uri) return false;

    const contents = (await vscode.workspace.openTextDocument(uri)).getText();

    return !contents.includes("kotlin-maven-plugin");
  }

  async enableKotlin() {
    
  }
}