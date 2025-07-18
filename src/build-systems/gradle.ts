import * as vscode from "vscode";
import { JVMBuildSystem } from ".";

const KOTLIN_VERSION = "2.2.0";
const configureInPlaceReplacements = true;

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
    const uri = await this.getBuildFile();
    if (!uri) {
      throw new Error("No build.gradle(.kts) found in this workspace folder.")
    }
    
    const isKts = uri.fsPath.endsWith(".kts");
    const plugin = isKts ? `kotlin("jvm") version "${KOTLIN_VERSION}"` : `id 'org.jetbrains.kotlin.jvm' version '${KOTLIN_VERSION}'`;
    const stdlib = isKts ? `implementation(kotlin("stdlib"))` : `implementation "org.jetbrains.kotlin:kotlin-stdlib"`;

    const doc = await vscode.workspace.openTextDocument(uri);
    const text = doc.getText();
    
    let updated = text;

    const pluginsSeen = /kotlin\("jvm"\)|org\.jetbrains\.kotlin\.jvm/.test(text);
    if (!pluginsSeen) {
      // no plugin found, insert it

      const pluginsBlock = /plugins\s*\{[\s\S]*?}/;
      if (pluginsBlock.test(updated)) {
        updated = updated.replace(pluginsBlock, m => m.replace("{", "{\n    " + plugin));
      } else {
        // put plugins at the top
        updated = `plugins {\n    ${plugin}\n}\n\n` + updated;
      }
    }

    const dependenciesSeen = /kotlin-stdlib|kotlin\(\s*["']stdlib["']\s*\)/.test(updated);
    if (!dependenciesSeen) {
      // no dependency found

      const dependenciesBlock = /dependencies\s*\{[\s\S]*?}/;
      if (dependenciesBlock.test(updated)) {
        updated = updated.replace(dependenciesBlock, m => m.replace("{", "{\n    " + stdlib));
      } else {
        updated += `\n\ndependencies {\n    ${stdlib}\n}\n`;
      }
    }

    const sourceDirectorySeen = /sourceSets\.(main|["']main["'])[^}]*\.kotlin\.srcDir/.test(updated);
    if (configureInPlaceReplacements && !sourceDirectorySeen) {
      const srcDirLines = isKts ? `    sourceSets["main"].kotlin.srcDir("src/main/java")
    sourceSets["test"].kotlin.srcDir("src/test/java")` : `    sourceSets.main.kotlin.srcDirs += 'src/main/java'
    sourceSets.test.kotlin.srcDirs += 'src/test/java'`;

      const kotlinBlock = /kotlin\s*\{[\s\S]*?}/;
      if (kotlinBlock.test(updated)) {
        updated = updated.replace(
          kotlinBlock,
          m => m.replace("{", "{\n" + srcDirLines)
        );
      } else {
        updated += `\n\nkotlin {\n${srcDirLines}\n}\n`;
      }
    }

    if (updated !== text) {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(uri, doc.lineAt(doc.lineCount - 1).rangeIncludingLineBreak, updated);

      await vscode.workspace.applyEdit(edit);
      await doc.save();

      vscode.window.showInformationMessage(`Kotlin ${KOTLIN_VERSION} configured for Gradle project.`);
    } else {
      vscode.window.showInformationMessage("Kotlin is already configured.");
    }
  }
}