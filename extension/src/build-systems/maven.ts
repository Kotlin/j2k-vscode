import * as vscode from "vscode";
import { JVMBuildSystem } from ".";
import * as xml2js from "xml2js";

const KOTLIN_VERSION = "2.2.0";
const configureInPlaceReplacements = true;

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

  private detectSpring(pom: any): boolean {
    const deps = pom?.project?.dependencies?.[0]?.dependency ?? [];
    return deps.some((d: any) => {
      const gid = (d.groupId?.[0] ?? "").toString();
      return gid === "org.springframework.boot";
    });
  }

  private readCompilerTarget(pom: any): string | undefined {
    const props = pom?.project?.properties?.[0] ?? {};
    const release = props["maven.compiler.release"]?.[0];
    const target = props["maven.compiler.target"]?.[0];
    const source = props["maven.compiler.source"]?.[0];
    return (release ?? target ?? source)?.toString();
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
    const parser = new xml2js.Parser({
      preserveChildrenOrder: true,
      charsAsChildren: true,
      includeWhiteChars: true,
    });
    const builder = new xml2js.Builder({
      renderOpts: { pretty: true, indent: "  " },
    });

    const pom = await parser.parseStringPromise(text);
    pom.project = pom.project ?? {};
    pom.project.properties = pom.project.properties ?? [{}];
    pom.project.dependencies = pom.project.dependencies ?? [{}];
    pom.project.build = pom.project.build ?? [{}];
    const props = pom.project.properties[0];
    const depsNode = pom.project.dependencies[0];
    depsNode.dependency = depsNode.dependency ?? [];

    if (!props["kotlin.version"]) {
      props["kotlin.version"] = [KOTLIN_VERSION];
    }
    const detectedJvmTarget = this.readCompilerTarget(pom) ?? "17";
    if (!props["kotlin.compiler.jvmTarget"]) {
      props["kotlin.compiler.jvmTarget"] = [detectedJvmTarget];
    }

    const deps = depsNode.dependency as any[];

    const hasStdlib = deps.some(
      (d: any) =>
        d.groupId?.[0] === "org.jetbrains.kotlin" &&
        d.artifactId?.[0] === "kotlin-stdlib",
    );
    if (!hasStdlib) {
      deps.push({
        groupId: ["org.jetbrains.kotlin"],
        artifactId: ["kotlin-stdlib"],
        version: ["${kotlin.version}"],
      });
    }

    if (this.detectSpring(pom)) {
      const hasReflect = deps.some(
        (d: any) =>
          d.groupId?.[0] === "org.jetbrains.kotlin" &&
          d.artifactId?.[0] === "kotlin-reflect",
      );
      if (!hasReflect) {
        deps.push({
          groupId: ["org.jetbrains.kotlin"],
          artifactId: ["kotlin-reflect"],
          version: ["${kotlin.version}"],
        });
      }
    }

    const build = pom.project.build[0];
    build.plugins = build.plugins ?? [{}];
    build.plugins[0].plugin = build.plugins[0].plugin ?? [];
    const plugins = build.plugins[0].plugin as any[];

    let kotlinPlugin = plugins.find(
      (p: any) =>
        p.groupId?.[0] === "org.jetbrains.kotlin" &&
        p.artifactId?.[0] === "kotlin-maven-plugin",
    );

    if (!kotlinPlugin) {
      kotlinPlugin = {
        groupId: ["org.jetbrains.kotlin"],
        artifactId: ["kotlin-maven-plugin"],
        version: ["${kotlin.version}"],
        executions: [
          {
            execution: [
              {
                id: ["kotlin-compile"],
                phase: ["process-sources"],
                goals: [{ goal: ["compile"] }],
              },
              {
                id: ["kotlin-test-compile"],
                phase: ["process-test-sources"],
                goals: [{ goal: ["test-compile"] }],
              },
            ],
          },
        ],
        configuration: [
          {
            jvmTarget: ["${kotlin.compiler.jvmTarget}"],
          },
        ],
      };

      if (configureInPlaceReplacements) {
        kotlinPlugin.configuration[0].sourceDirs = [
          {
            source: ["src/main/kotlin", "src/main/java"],
          },
        ];
        kotlinPlugin.configuration[0].testSourceDirs = [
          {
            source: ["src/test/kotlin", "src/test/java"],
          },
        ];
      }

      plugins.push(kotlinPlugin);
    } else {
      kotlinPlugin.configuration = kotlinPlugin.configuration ?? [{}];
      const conf = kotlinPlugin.configuration[0];
      if (!conf.jvmTarget) {
        conf.jvmTarget = ["${kotlin.compiler.jvmTarget}"];
      }

      if (configureInPlaceReplacements) {
        conf.sourceDirs = conf.sourceDirs ?? [{ source: [] }];
        conf.testSourceDirs = conf.testSourceDirs ?? [{ source: [] }];
        const src = conf.sourceDirs[0].source as string[];
        const testSrc = conf.testSourceDirs[0].source as string[];
        const addIfMissing = (arr: string[], v: string) => {
          if (!arr.includes(v)) {
            arr.push(v);
          }
        };
        addIfMissing(src, "src/main/kotlin");
        addIfMissing(src, "src/main/java");
        addIfMissing(testSrc, "src/test/kotlin");
        addIfMissing(testSrc, "src/test/java");
      }
    }

    const updated = builder.buildObject(pom);
    if (updated !== text) {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(uri, new vscode.Range(0, 0, doc.lineCount, 0xffff), updated);
      await vscode.workspace.applyEdit(edit);
      await doc.save();
      vscode.window.showInformationMessage(
        `Kotlin ${KOTLIN_VERSION} configured for Maven project.`,
      );
    } else {
      vscode.window.showInformationMessage("Kotlin is already configured.");
    }
  }
}
