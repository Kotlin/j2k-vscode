import * as vscode from "vscode";
import { JVMBuildSystem } from ".";

export class MavenBuildSystem implements JVMBuildSystem {
  name: string = "Maven"

  async needsKotlin(folder: vscode.WorkspaceFolder) {
    return false;
  }

  async enableKotlin(folder: vscode.WorkspaceFolder) {
    
  }
}