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
    if (!uri) return false;

    const contents = (await vscode.workspace.openTextDocument(uri)).getText();
    return !contents.includes("kotlin-maven-plugin");
  }

  async enableKotlin() {
    const uri = await this.getBuildFile();
    if (!uri) throw new Error("No pom.xml found in this workspace folder.");

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

    // properties: kotlin.version, kotlin.compiler.jvmTarget
    if (!props["kotlin.version"]) {
      props["kotlin.version"] = [KOTLIN_VERSION];
    }
    const detectedJvmTarget = this.readCompilerTarget(pom) ?? "17";
    if (!props["kotlin.compiler.jvmTarget"]) {
      props["kotlin.compiler.jvmTarget"] = [detectedJvmTarget];
    }

    // dependencies
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

    // --- Build plugins ---
    const build = pom.project.build[0];
    build.plugins = build.plugins ?? [{}];
    build.plugins[0].plugin = build.plugins[0].plugin ?? [];
    const plugins = build.plugins[0].plugin as any[];

    const findPlugin = (gid: string, aid: string) =>
      plugins.find(
        (p: any) => p.groupId?.[0] === gid && p.artifactId?.[0] === aid,
      );

    let kotlinPlugin = findPlugin(
      "org.jetbrains.kotlin",
      "kotlin-maven-plugin",
    );

    const ensureArg = (execConf: any, argValue: string) => {
      execConf.args = execConf.args ?? [{ arg: [] }];
      const argArr = execConf.args[0].arg as string[];
      if (!argArr.includes(argValue)) argArr.push(argValue);
    };

    const ensureCompilerPlugins = (conf: any) => {
      conf.compilerPlugins = conf.compilerPlugins ?? [{ plugin: [] }];
      const list = conf.compilerPlugins[0].plugin as string[];
      const add = (v: string) => {
        if (!list.includes(v)) list.push(v);
      };
      add("spring");
      add("all-open");
      add("jpa");
    };

    const ensurePluginDependency = (plg: any, gid: string, aid: string) => {
      plg.dependencies = plg.dependencies ?? [{ dependency: [] }];
      const arr = plg.dependencies[0].dependency as any[];
      const exists = arr.some(
        (d: any) => d.groupId?.[0] === gid && d.artifactId?.[0] === aid,
      );
      if (!exists) {
        arr.push({
          groupId: [gid],
          artifactId: [aid],
          version: ["${kotlin.version}"],
        });
      }
    };

    if (!kotlinPlugin) {
      kotlinPlugin = {
        groupId: ["org.jetbrains.kotlin"],
        artifactId: ["kotlin-maven-plugin"],
        version: ["${kotlin.version}"],
        configuration: [
          {
            jvmTarget: ["${kotlin.compiler.jvmTarget}"],
          },
        ],
        executions: [
          {
            execution: [
              {
                id: ["compile-kotlin"],
                phase: ["compile"],
                goals: [{ goal: ["compile"] }],
                configuration: [
                  {
                    args: [{ arg: [`-Xjava-source-roots=\${project.basedir}/src/main/java`] }],
                  },
                ],
              },
              {
                id: ["test-compile-kotlin"],
                phase: ["test-compile"],
                goals: [{ goal: ["test-compile"] }],
                configuration: [
                  {
                    args: [{ arg: [`-Xjava-source-roots=\${project.basedir}/src/test/java`] }],
                  },
                ],
              },
            ],
          },
        ],
      };

      if (configureInPlaceReplacements) {
        kotlinPlugin.configuration[0].sourceDirs = [
          { source: ["src/main/java", "src/main/kotlin"] },
        ];
        kotlinPlugin.configuration[0].testSourceDirs = [
          { source: ["src/test/java", "src/test/kotlin"] },
        ];
      }
      ensureCompilerPlugins(kotlinPlugin.configuration[0]);

      ensurePluginDependency(
        kotlinPlugin,
        "org.jetbrains.kotlin",
        "kotlin-maven-allopen",
      );
      ensurePluginDependency(
        kotlinPlugin,
        "org.jetbrains.kotlin",
        "kotlin-maven-noarg",
      );

      plugins.push(kotlinPlugin);
    } else {
      kotlinPlugin.version = kotlinPlugin.version ?? ["${kotlin.version}"];
      kotlinPlugin.configuration = kotlinPlugin.configuration ?? [{}];
      const conf = kotlinPlugin.configuration[0];

      if (!conf.jvmTarget) conf.jvmTarget = ["${kotlin.compiler.jvmTarget}"];
      if (configureInPlaceReplacements) {
        conf.sourceDirs = conf.sourceDirs ?? [{ source: [] }];
        conf.testSourceDirs = conf.testSourceDirs ?? [{ source: [] }];
        const src = conf.sourceDirs[0].source as string[];
        const testSrc = conf.testSourceDirs[0].source as string[];
        const addIfMissing = (arr: string[], v: string) => {
          if (!arr.includes(v)) arr.push(v);
        };
        addIfMissing(src, "src/main/java");
        addIfMissing(src, "src/main/kotlin");
        addIfMissing(testSrc, "src/test/java");
        addIfMissing(testSrc, "src/test/kotlin");
      }
      ensureCompilerPlugins(conf);

      kotlinPlugin.executions = kotlinPlugin.executions ?? [{ execution: [] }];
      const execs = kotlinPlugin.executions[0].execution as any[];

      const upsertExec = (id: string, phase: string, javaRootsArg: string) => {
        let e = execs.find((x: any) => (x.id?.[0] ?? "") === id);
        if (!e) {
          e = {
            id: [id],
            phase: [phase],
            goals: [{ goal: [id.startsWith("test-") ? "test-compile" : "compile"] }],
            configuration: [{}],
          };
          execs.push(e);
        } else {
          e.phase = [phase];
          e.goals = [{ goal: [id.startsWith("test-") ? "test-compile" : "compile"] }];
          e.configuration = e.configuration ?? [{}];
        }
        const econf = e.configuration[0];
        ensureArg(econf, javaRootsArg);
      };

      upsertExec(
        "compile-kotlin",
        "compile",
        "-Xjava-source-roots=${project.basedir}/src/main/java",
      );
      upsertExec(
        "test-compile-kotlin",
        "test-compile",
        "-Xjava-source-roots=${project.basedir}/src/test/java",
      );

      ensurePluginDependency(
        kotlinPlugin,
        "org.jetbrains.kotlin",
        "kotlin-maven-allopen",
      );
      ensurePluginDependency(
        kotlinPlugin,
        "org.jetbrains.kotlin",
        "kotlin-maven-noarg",
      );
    }

    let mavenCompiler = findPlugin(
      "org.apache.maven.plugins",
      "maven-compiler-plugin",
    );
    if (!mavenCompiler) {
      mavenCompiler = {
        groupId: ["org.apache.maven.plugins"],
        artifactId: ["maven-compiler-plugin"],
        version: ["3.14.0"],
        executions: [
          {
            execution: [
              {
                id: ["default-compile"],
                goals: [{ goal: ["compile"] }],
                configuration: [{ skipMain: ["true"] }],
              },
              {
                id: ["compile-java"],
                phase: ["compile"],
                goals: [{ goal: ["compile"] }],
                configuration: [{ release: ["${java.version}"] }],
              },
              {
                id: ["default-testCompile"],
                goals: [{ goal: ["testCompile"] }],
                configuration: [{ skip: ["true"] }],
              },
              {
                id: ["test-compile-java"],
                phase: ["test-compile"],
                goals: [{ goal: ["testCompile"] }],
                configuration: [{ release: ["${java.version}"] }],
              },
            ],
          },
        ],
      };
      plugins.push(mavenCompiler);
    } else {
      mavenCompiler.version = mavenCompiler.version ?? ["3.14.0"];
      mavenCompiler.executions = mavenCompiler.executions ?? [{ execution: [] }];
      const execs = mavenCompiler.executions[0].execution as any[];

      const setExec = (id: string, update: any) => {
        let e = execs.find((x: any) => (x.id?.[0] ?? "") === id);
        if (!e) {
          e = { id: [id] };
          execs.push(e);
        }
        Object.assign(e, update);
      };

      setExec("default-compile", {
        goals: [{ goal: ["compile"] }],
        configuration: [{ skipMain: ["true"] }],
      });
      setExec("compile-java", {
        phase: ["compile"],
        goals: [{ goal: ["compile"] }],
        configuration: [{ release: ["${java.version}"] }],
      });
      setExec("default-testCompile", {
        goals: [{ goal: ["testCompile"] }],
        configuration: [{ skip: ["true"] }],
      });
      setExec("test-compile-java", {
        phase: ["test-compile"],
        goals: [{ goal: ["testCompile"] }],
        configuration: [{ release: ["${java.version}"] }],
      });
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
