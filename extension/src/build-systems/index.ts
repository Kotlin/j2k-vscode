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

export async function detectBuildSystem(): Promise<JVMBuildSystem> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of folders) {
    if (await hasFile(folder, "**/{build.gradle,build.gradle.kts}")) {
      return new GradleBuildSystem(folder);
    } else if (await hasFile(folder, "**/pom.xml")) {
      return new MavenBuildSystem(folder);
    }
  }

  return new NoBuildSystem();
}
