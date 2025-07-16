import * as vscode from "vscode";
import { JVMBuildSystem } from ".";

export class GradleBuildSystem implements JVMBuildSystem {
  name: string = "Gradle"

  workspaceFolder: vscode.WorkspaceFolder

  constructor(folder: vscode.WorkspaceFolder) {
    this.workspaceFolder = folder;
  }

  async needsKotlin(folder: vscode.WorkspaceFolder) {
    return false;
  }

  async enableKotlin(folder: vscode.WorkspaceFolder) {
    
  }
}