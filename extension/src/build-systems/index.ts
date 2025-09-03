import * as vscode from "vscode";
import { NoBuildSystem } from "./standard";
import { GradleBuildSystem } from "./gradle";
import { MavenBuildSystem } from "./maven";

export interface JVMBuildSystem {
  name: string;

  needsKotlin(): Promise<boolean>;

  enableKotlin(): Promise<void>;
}

async function hasFile(folder: vscode.WorkspaceFolder, glob: string) {
  const files = await vscode.workspace.findFiles(
    new vscode.RelativePattern(folder, glob),
    "**/build/**",
    1, // max files to return
  );

  return files.length > 0;
}

export async function detectBuildSystems(): Promise<JVMBuildSystem[]> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const buildSystems = [];
  for (const folder of folders) {
    if (await hasFile(folder, "**/{build.gradle,build.gradle.kts}")) {
      buildSystems.push(new GradleBuildSystem(folder));
    } 
    if (await hasFile(folder, "**/pom.xml")) {
      buildSystems.push(new MavenBuildSystem(folder));
    }
  }

  if (buildSystems.length > 0) {
    return buildSystems;
  }

  return [new NoBuildSystem()];
}
