import * as vscode from "vscode";
import { JVMBuildSystem } from ".";
import * as xml2js from "xml2js";

export class MavenBuildSystem implements JVMBuildSystem {
  name: string = "Maven";

  workspaceFolder: vscode.WorkspaceFolder;

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
    if (!uri) {
      return false;
    }

    const contents = (await vscode.workspace.openTextDocument(uri)).getText();

    return !contents.includes("kotlin-maven-plugin");
  }

  async enableKotlin() {
    const uri = await this.getBuildFile();
    if (!uri) {
      throw new Error("No pom.xml found in this workspace folder.");
    }

    const doc = await vscode.workspace.openTextDocument(uri);
    const text = doc.getText();
    const parser = new xml2js.Parser({ preserveChildrenOrder: true });
    const builder = new xml2js.Builder({
      renderOpts: { pretty: true, indent: "  " },
    });

    const pom = await parser.parseStringPromise(text);
  }
}
