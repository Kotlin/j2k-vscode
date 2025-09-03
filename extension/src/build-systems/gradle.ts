import * as vscode from "vscode";
import { JVMBuildSystem } from ".";

const KOTLIN_VERSION = "2.2.0";
const configureInPlaceReplacements = true;

export class GradleBuildSystem implements JVMBuildSystem {
  name: string = "Gradle";

  workspaceFolder: vscode.WorkspaceFolder;

  constructor(folder: vscode.WorkspaceFolder) {
    this.workspaceFolder = folder;
  }

  private async getBuildFile() {
    const [file] = await vscode.workspace.findFiles(
      new vscode.RelativePattern(
        this.workspaceFolder,
        "{build.gradle,build.gradle.kts}",
      ),
      null,
      1,
    );

    return file;
  }

  private stripComments(code: string) {
    return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  }

  private detectIndentUnit(text: string) {
    for (const line of text.split(/\r?\n/)) {
      const indent = line.match(/^([ \t]+)\S/);
      if (indent) {
        return indent[1].includes("\t") ? "\t" : " ".repeat(indent[1].length);
      }
    }

    // 4 spaces by default
    return "    ";
  }

  async needsKotlin() {
    const uri = await this.getBuildFile();
    if (!uri) {
      return false;
    }

    const contents = this.stripComments(
      (await vscode.workspace.openTextDocument(uri)).getText(),
    );

    const pluginPatterns: RegExp[] = [
      // Kotlin‑DSL alias, e.g. kotlin("jvm") or kotlin("plugin.spring")
      /\bkotlin\s*\(\s*["'][\w\-.+]+["']\s*\)/,
      // Explicit plugin id, Groovy or Kotlin‑DSL
      /\bid\s*\(\s*["']org\.jetbrains\.kotlin[^"']*["']\s*\)/,
      /\bid\s+['"]org\.jetbrains\.kotlin[^'"]*['"]/,
    ];
    if (pluginPatterns.some((re) => re.test(contents))) {
      return false;
    }

    return true;
  }

  async enableKotlin() {
    const uri = await this.getBuildFile();
    if (!uri) {
      throw new Error("No build.gradle(.kts) found in this workspace folder.");
    }

    const isKts = uri.fsPath.endsWith(".kts");
    const plugin = isKts
      ? `kotlin("jvm") version "${KOTLIN_VERSION}"`
      : `id 'org.jetbrains.kotlin.jvm' version '${KOTLIN_VERSION}'`;
    const stdlib = isKts
      ? `implementation(kotlin("stdlib"))`
      : `implementation "org.jetbrains.kotlin:kotlin-stdlib"`;
    const reflect = isKts
      ? `implementation(kotlin("reflect"))`
      : `implementation "org.jetbrains.kotlin:kotlin-reflect"`;

    const doc = await vscode.workspace.openTextDocument(uri);
    const text = doc.getText();

    const indent = this.detectIndentUnit(text);

    let updated = text;

    const pluginsSeen = /kotlin\("jvm"\)|org\.jetbrains\.kotlin\.jvm/.test(
      text,
    );
    if (!pluginsSeen) {
      // no plugin found, insert it

      const pluginsBlock = /plugins\s*\{\s*(?:[^{}]|\{[^{}]*})*}/;
      if (pluginsBlock.test(updated)) {
        updated = updated.replace(pluginsBlock, (m) =>
          m.replace("{", `{\n${indent}${plugin}`),
        );
      } else {
        // put plugins at the top
        updated = `plugins {\n${indent}${plugin}\n}\n\n` + updated;
      }
    }

    const dependenciesBlock = /dependencies\s*\{[\s\S]*?}/;
    const dependenciesSeen =
      /kotlin-stdlib|kotlin\(\s*["']stdlib["']\s*\)/.test(updated);
    if (!dependenciesSeen) {
      // no dependency found

      if (dependenciesBlock.test(updated)) {
        updated = updated.replace(dependenciesBlock, (m) =>
          m.replace("{", `{\n${indent}${stdlib}`),
        );
      } else {
        updated += `\n\ndependencies {\n${indent}${stdlib}\n}\n`;
      }
    }

    const springDetected = /\borg\.springframework\.boot\b/.test(updated);

    if (springDetected) {
      const reflectSeen = /kotlin-reflect|kotlin\(\s*["']reflect["']\s*\)/.test(
        updated,
      );
      if (!reflectSeen) {
        if (dependenciesBlock.test(updated)) {
          updated = updated.replace(dependenciesBlock, (m) =>
            m.replace("{", `{\n${indent}${reflect}`),
          );
        } else {
          updated += `\n\ndependencies {\n${indent}${reflect}\n}\n`;
        }
      }
    }

    const sourceDirectorySeen =
      /sourceSets\.(main|["']main["'])[^}]*\.kotlin\.srcDir/.test(updated);
    if (configureInPlaceReplacements && !sourceDirectorySeen) {
      const srcDirLines = isKts
        ? `${indent}sourceSets["main"].kotlin.srcDir("src/main/java")
${indent}sourceSets["test"].kotlin.srcDir("src/test/java")`
        : `${indent}sourceSets.main.kotlin.srcDirs += 'src/main/java'
${indent}sourceSets.test.kotlin.srcDirs += 'src/test/java'`;

      const kotlinBlock = /kotlin\s*\{[\s\S]*?}/;
      if (kotlinBlock.test(updated)) {
        updated = updated.replace(kotlinBlock, (m) =>
          m.replace("{", "{\n" + srcDirLines),
        );
      } else {
        updated += `\nkotlin {\n${srcDirLines}\n}\n`;
      }
    }

    if (updated !== text) {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(uri, new vscode.Range(0, 0, doc.lineCount, 0xffff), updated);

      await vscode.workspace.applyEdit(edit);
      await doc.save();

      vscode.window.showInformationMessage(
        `Kotlin ${KOTLIN_VERSION} configured for Gradle project.`,
      );
    } else {
      vscode.window.showInformationMessage("Kotlin is already configured.");
    }
  }
}
