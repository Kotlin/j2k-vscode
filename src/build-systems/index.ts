import * as vscode from "vscode";
import { NoBuildSystem } from "./standard";

export interface JVMBuildSystem {
  name: string;

  needsKotlin(folder: vscode.WorkspaceFolder): Promise<boolean>

  enableKotlin(folder: vscode.WorkspaceFolder): Promise<void>
}

export async function detectBuildSystem(): Promise<JVMBuildSystem> {
  return new NoBuildSystem();
}