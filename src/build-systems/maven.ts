import * as vscode from "vscode";
import { JVMBuildSystem } from ".";

export class MavenBuildSystem implements JVMBuildSystem {
  name: string = "Maven"
  
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