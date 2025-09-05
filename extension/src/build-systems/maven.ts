import * as vscode from "vscode";
import { JVMBuildSystem } from ".";

const KOTLIN_VERSION = "2.2.0";
const configureInPlaceReplacements = true;

export class MavenBuildSystem implements JVMBuildSystem {
  name = "Maven";
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

  private stripXmlComments(xml: string) {
    return xml.replace(/<!--([\s\S]*?)-->/g, "");
  }

  private detectIndentUnit(text: string) {
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([ \t]+)\S/);
      if (m) {
        return m[1].includes("\t") ? "\t" : " ".repeat(m[1].length);
      }
    }
    return "  ";
  }

  private hasKotlinPlugin(text: string) {
    return /<artifactId>\s*kotlin-maven-plugin\s*<\/artifactId>/i.test(text);
  }

  private hasKotlinStdlib(text: string) {
    return /<groupId>\s*org\.jetbrains\.kotlin\s*<\/groupId>\s*<artifactId>\s*kotlin-stdlib\s*<\/artifactId>/i.test(
      this.stripXmlComments(text),
    );
  }

  private hasKotlinReflect(text: string) {
    return /<groupId>\s*org\.jetbrains\.kotlin\s*<\/groupId>\s*<artifactId>\s*kotlin-reflect\s*<\/artifactId>/i.test(
      this.stripXmlComments(text),
    );
  }

  private detectSpringBoot(text: string) {
    // detect any dependency belonging to org.springframework.boot
    return /<groupId>\s*org\.springframework\.boot\s*<\/groupId>/i.test(
      this.stripXmlComments(text),
    );
  }

  private readCompilerTarget(text: string): string | undefined {
    const cleaned = this.stripXmlComments(text);
    const getProp = (name: string) => {
      const re = new RegExp(`<${name}>\\s*([^<\\s][^<]*)\\s*<\\/${name}>`, "i");
      const m = cleaned.match(re);
      return m?.[1];
    };
    return (
      getProp("maven.compiler.release") ??
      getProp("maven.compiler.target") ??
      getProp("maven.compiler.source") ??
      getProp("java.version")
    );
  }

  async needsKotlin() {
    const uri = await this.getBuildFile();
    if (!uri) {
      return false;
    }
    const contents = (await vscode.workspace.openTextDocument(uri)).getText();
    return !this.hasKotlinPlugin(contents);
  }

  async enableKotlin() {
    const uri = await this.getBuildFile();
    if (!uri) {
      throw new Error("No pom.xml found in this workspace folder.");
    }

    const doc = await vscode.workspace.openTextDocument(uri);
    const original = doc.getText();
    const indent = this.detectIndentUnit(original);

    let updated = original;

    // find jvm target
    const desiredJvmTarget = this.readCompilerTarget(updated)?.trim() || "17";

    const ensureProperties = (xml: string) => {
      if (!/<properties>\s*[\s\S]*?<\/properties>/i.test(xml)) {
        // create properties before first <dependencies> or near top after <name> if possible
        const anchor =
          xml.match(/<\/name>\s*/i)?.index ??
          xml.match(/<\/version>\s*/i)?.index ??
          0;
        const insertPos = anchor
          ? anchor +
            (xml.match(/<\/name>\s*/i)?.[0]?.length ||
              xml.match(/<\/version>\s*/i)?.[0]?.length ||
              0)
          : 0;
        const propsBlock =
          `\n${indent}<properties>\n` +
          `${indent}${indent}<kotlin.version>${KOTLIN_VERSION}</kotlin.version>\n` +
          `${indent}${indent}<kotlin.compiler.jvmTarget>${desiredJvmTarget}</kotlin.compiler.jvmTarget>\n` +
          `${indent}</properties>\n`;
        return xml.slice(0, insertPos) + propsBlock + xml.slice(insertPos);
      }

      // upsert 2 properties
      const upsertProp = (xml2: string, key: string, value: string) => {
        const re = new RegExp(
          `(<properties>[\\s\\S]*?)(<${key}>[\\s\\S]*?<\\/${key}>)([\\s\\S]*?<\\/properties>)`,
          "i",
        );
        if (re.test(xml2)) {
          return xml2.replace(
            new RegExp(`<${key}>[\\s\\S]*?<\\/${key}>`, "i"),
            `<${key}>${value}</${key}>`,
          );
        } else {
          // inject before </properties>
          return xml2.replace(
            /<\/properties>/i,
            `${indent}${indent}<${key}>${value}<\/${key}>\n${indent}<\/properties>`,
          );
        }
      };

      let out = xml;
      const hasKver =
        /<properties>[\s\S]*?<kotlin\.version>[\s\S]*?<\/kotlin\.version>[\s\S]*?<\/properties>/i.test(
          out,
        );
      if (!hasKver) {
        out = out.replace(
          /<\/properties>/i,
          `${indent}${indent}<kotlin.version>${KOTLIN_VERSION}<\/kotlin.version>\n${indent}<\/properties>`,
        );
      } else {
        out = upsertProp(out, "kotlin.version", KOTLIN_VERSION);
      }

      const hasJvmTarget =
        /<properties>[\s\S]*?<kotlin\.compiler\.jvmTarget>[\s\S]*?<\/kotlin\.compiler\.jvmTarget>[\s\S]*?<\/properties>/i.test(
          out,
        );
      if (!hasJvmTarget) {
        out = out.replace(
          /<\/properties>/i,
          `${indent}${indent}<kotlin.compiler.jvmTarget>${desiredJvmTarget}<\/kotlin.compiler.jvmTarget>\n${indent}<\/properties>`,
        );
      } else {
        out = upsertProp(out, "kotlin.compiler.jvmTarget", desiredJvmTarget);
      }
      return out;
    };

    updated = ensureProperties(updated);

    // add <dependencies> with kotlin-stdlib (+ reflect if Spring Boot)
    const ensureDependenciesSection = (xml: string) => {
      if (!/<dependencies>\s*[\s\S]*?<\/dependencies>/i.test(xml)) {
        // create just before </project>
        const depBlock = `\n${indent}<dependencies>\n${indent}</dependencies>\n`;
        return xml.replace(/<\/project>\s*$/i, `${depBlock}</project>`);
      }
      return xml;
    };

    updated = ensureDependenciesSection(updated);

    const upsertDependency = (
      xml: string,
      gid: string,
      aid: string,
      version?: string,
    ) => {
      const cleaned = this.stripXmlComments(xml);
      const exists = new RegExp(
        `<dependency>\\s*<groupId>\\s*${gid.replace(
          /\./g,
          "\\.",
        )}\\s*<\\/groupId>\\s*<artifactId>\\s*${aid}\\s*<\\/artifactId>[\\s\\S]*?<\\/dependency>`,
        "i",
      ).test(cleaned);
      if (exists) {
        return xml;
      }

      const dep =
        `${indent}${indent}<dependency>\n` +
        `${indent}${indent}${indent}<groupId>${gid}</groupId>\n` +
        `${indent}${indent}${indent}<artifactId>${aid}</artifactId>\n` +
        (version
          ? `${indent}${indent}${indent}<version>${version}</version>\n`
          : "") +
        `${indent}${indent}</dependency>\n`;

      return xml.replace(/<\/dependencies>/i, `${dep}${indent}</dependencies>`);
    };

    // stdlib
    if (!this.hasKotlinStdlib(updated)) {
      updated = upsertDependency(
        updated,
        "org.jetbrains.kotlin",
        "kotlin-stdlib",
        "${kotlin.version}",
      );
    }

    const springDetected = this.detectSpringBoot(updated);
    if (springDetected && !this.hasKotlinReflect(updated)) {
      updated = upsertDependency(
        updated,
        "org.jetbrains.kotlin",
        "kotlin-reflect",
        "${kotlin.version}",
      );
    }

    // ensure <build><plugins> exists
    const ensureBuildPlugins = (xml: string) => {
      let out = xml;
      if (!/<build>\s*[\s\S]*?<\/build>/i.test(out)) {
        out = out.replace(
          /<\/project>\s*$/i,
          `\n${indent}<build>\n${indent}${indent}<plugins>\n${indent}${indent}</plugins>\n${indent}</build>\n</project>`,
        );
      } else if (
        !/<build>[\s\S]*?<plugins>[\s\S]*?<\/plugins>[\s\S]*?<\/build>/i.test(
          out,
        )
      ) {
        out = out.replace(
          /<\/build>/i,
          `${indent}${indent}<plugins>\n${indent}${indent}</plugins>\n${indent}</build>`,
        );
      }
      return out;
    };

    updated = ensureBuildPlugins(updated);

    const upsertPlugin = (
      xml: string,
      gid: string,
      aid: string,
      bodyXml: string,
    ) => {
      const pluginRe = new RegExp(
        `<plugin>\\s*<groupId>\\s*${gid.replace(
          /\./g,
          "\\.",
        )}\\s*<\\/groupId>\\s*<artifactId>\\s*${aid}\\s*<\\/artifactId>[\\s\\S]*?<\\/plugin>`,
        "i",
      );
      if (pluginRe.test(xml)) {
        return xml.replace(pluginRe, bodyXml);
      }
      // append inside </plugins>
      return xml.replace(
        /<\/plugins>/i,
        `${bodyXml}\n${indent}${indent}</plugins>`,
      );
    };

    // kotlin-maven-plugin as according to tutorial
    const kotlinPluginXml = `${indent}${indent}<plugin>
${indent}${indent}${indent}<groupId>org.jetbrains.kotlin</groupId>
${indent}${indent}${indent}<artifactId>kotlin-maven-plugin</artifactId>
${indent}${indent}${indent}<version>\${kotlin.version}</version>
${indent}${indent}${indent}<configuration>
${indent}${indent}${indent}${indent}<jvmTarget>\${kotlin.compiler.jvmTarget}</jvmTarget>${
      configureInPlaceReplacements
        ? `
${indent}${indent}${indent}${indent}<sourceDirs>
${indent}${indent}${indent}${indent}${indent}<source>src/main/java</source>
${indent}${indent}${indent}${indent}${indent}<source>src/main/kotlin</source>
${indent}${indent}${indent}${indent}</sourceDirs>
${indent}${indent}${indent}${indent}<testSourceDirs>
${indent}${indent}${indent}${indent}${indent}<source>src/test/java</source>
${indent}${indent}${indent}${indent}${indent}<source>src/test/kotlin</source>
${indent}${indent}${indent}${indent}</testSourceDirs>`
        : ``
    }
${indent}${indent}${indent}${indent}<compilerPlugins>
${indent}${indent}${indent}${indent}${indent}<plugin>spring</plugin>
${indent}${indent}${indent}${indent}${indent}<plugin>all-open</plugin>
${indent}${indent}${indent}${indent}${indent}<plugin>jpa</plugin>
${indent}${indent}${indent}${indent}</compilerPlugins>
${indent}${indent}${indent}</configuration>
${indent}${indent}${indent}<executions>
${indent}${indent}${indent}${indent}<execution>
${indent}${indent}${indent}${indent}${indent}<id>compile-kotlin</id>
${indent}${indent}${indent}${indent}${indent}<phase>compile</phase>
${indent}${indent}${indent}${indent}${indent}<goals><goal>compile</goal></goals>
${indent}${indent}${indent}${indent}${indent}<configuration>
${indent}${indent}${indent}${indent}${indent}${indent}<args>
${indent}${indent}${indent}${indent}${indent}${indent}${indent}<arg>-Xjava-source-roots=\${project.basedir}/src/main/java</arg>
${indent}${indent}${indent}${indent}${indent}${indent}</args>
${indent}${indent}${indent}${indent}${indent}</configuration>
${indent}${indent}${indent}${indent}</execution>
${indent}${indent}${indent}${indent}<execution>
${indent}${indent}${indent}${indent}${indent}<id>test-compile-kotlin</id>
${indent}${indent}${indent}${indent}${indent}<phase>test-compile</phase>
${indent}${indent}${indent}${indent}${indent}<goals><goal>test-compile</goal></goals>
${indent}${indent}${indent}${indent}${indent}<configuration>
${indent}${indent}${indent}${indent}${indent}${indent}<args>
${indent}${indent}${indent}${indent}${indent}${indent}${indent}<arg>-Xjava-source-roots=\${project.basedir}/src/test/java</arg>
${indent}${indent}${indent}${indent}${indent}${indent}</args>
${indent}${indent}${indent}${indent}${indent}</configuration>
${indent}${indent}${indent}${indent}</execution>
${indent}${indent}${indent}</executions>
${indent}${indent}${indent}<dependencies>
${indent}${indent}${indent}${indent}<dependency>
${indent}${indent}${indent}${indent}${indent}<groupId>org.jetbrains.kotlin</groupId>
${indent}${indent}${indent}${indent}${indent}<artifactId>kotlin-maven-allopen</artifactId>
${indent}${indent}${indent}${indent}${indent}<version>\${kotlin.version}</version>
${indent}${indent}${indent}${indent}</dependency>
${indent}${indent}${indent}${indent}<dependency>
${indent}${indent}${indent}${indent}${indent}<groupId>org.jetbrains.kotlin</groupId>
${indent}${indent}${indent}${indent}${indent}<artifactId>kotlin-maven-noarg</artifactId>
${indent}${indent}${indent}${indent}${indent}<version>\${kotlin.version}</version>
${indent}${indent}${indent}${indent}</dependency>
${indent}${indent}${indent}</dependencies>
${indent}${indent}</plugin>`;

    updated = upsertPlugin(
      updated,
      "org.jetbrains.kotlin",
      "kotlin-maven-plugin",
      kotlinPluginXml,
    );

    // 5) maven-compiler-plugin (silence default-compile/testCompile and add explicit java compile steps as in the tutorial)
    const mavenCompilerXml = `${indent}${indent}<plugin>
${indent}${indent}${indent}<groupId>org.apache.maven.plugins</groupId>
${indent}${indent}${indent}<artifactId>maven-compiler-plugin</artifactId>
${indent}${indent}${indent}<version>3.14.0</version>
${indent}${indent}${indent}<executions>
${indent}${indent}${indent}${indent}<execution>
${indent}${indent}${indent}${indent}${indent}<id>default-compile</id>
${indent}${indent}${indent}${indent}${indent}<goals><goal>compile</goal></goals>
${indent}${indent}${indent}${indent}${indent}<configuration><skipMain>true</skipMain></configuration>
${indent}${indent}${indent}${indent}</execution>
${indent}${indent}${indent}${indent}<execution>
${indent}${indent}${indent}${indent}${indent}<id>compile-java</id>
${indent}${indent}${indent}${indent}${indent}<phase>compile</phase>
${indent}${indent}${indent}${indent}${indent}<goals><goal>compile</goal></goals>
${indent}${indent}${indent}${indent}${indent}<configuration><release>\${java.version}</release></configuration>
${indent}${indent}${indent}${indent}</execution>
${indent}${indent}${indent}${indent}<execution>
${indent}${indent}${indent}${indent}${indent}<id>default-testCompile</id>
${indent}${indent}${indent}${indent}${indent}<goals><goal>testCompile</goal></goals>
${indent}${indent}${indent}${indent}${indent}<configuration><skip>true</skip></configuration>
${indent}${indent}${indent}${indent}</execution>
${indent}${indent}${indent}${indent}<execution>
${indent}${indent}${indent}${indent}${indent}<id>test-compile-java</id>
${indent}${indent}${indent}${indent}${indent}<phase>test-compile</phase>
${indent}${indent}${indent}${indent}${indent}<goals><goal>testCompile</goal></goals>
${indent}${indent}${indent}${indent}${indent}<configuration><release>\${java.version}</release></configuration>
${indent}${indent}${indent}${indent}</execution>
${indent}${indent}${indent}</executions>
${indent}${indent}</plugin>`;

    updated = upsertPlugin(
      updated,
      "org.apache.maven.plugins",
      "maven-compiler-plugin",
      mavenCompilerXml,
    );

    // final write if changed
    if (updated !== original) {
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
