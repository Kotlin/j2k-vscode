import * as vscode from "vscode";
import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";

import { detectVCS, VCSFileRenamer } from "./vcs";
import { detectBuildSystems } from "./build-systems";
import { MemoryContentProvider } from "./batch/memory";
import { Job, Queue } from "./batch/queue";
import { CompletedJob, Worker } from "./batch/worker";
import { QueueListProvider } from "./batch/queue-view";
import { CompletedListProvider } from "./batch/completed-view";
import { applyPatch } from "@langchain/core/utils/json_patch";

export function logFile(filename: string, content: string) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders === undefined) {
    throw new Error("Expected a workspace to be open");
  }

  const basePath = workspaceFolders[0].uri.fsPath;

  const logsDir = path.join(basePath, ".j2k-logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // let's add a timestamp to keep track of what happened when

  const timestamp = new Date().toISOString();
  // for ease of later programmatic inspection, put the timestamp first
  const header = `// ${timestamp} (logged at)\n\n`;

  fs.writeFileSync(path.join(logsDir, filename), `${header}${content}`, {
    encoding: "utf8",
  });
}

async function normaliseSelection(input: vscode.Uri[]): Promise<vscode.Uri[]> {
  const out: vscode.Uri[] = [];

  for (const uri of input) {
    const stat = await vscode.workspace.fs.stat(uri);

    if ((stat.type & vscode.FileType.Directory) !== 0) {
      const pattern = new vscode.RelativePattern(uri, "**/*.java");

      const found = await vscode.workspace.findFiles(pattern);
      out.push(...found);
    } else if (/\.java$/i.test(uri.fsPath)) {
      out.push(uri);
    }
  }

  const normaliseFsPath = (p: string) => {
    const n = path.normalize(p);
    return process.platform === "win32" ? n.toLowerCase() : n;
  };

  return [...new Map(out.map((u) => [normaliseFsPath(u.fsPath), u])).values()];
}

export async function activate(context: vscode.ExtensionContext) {
  // so that we don't have to discover open workspaces when accepting/rejecting,
  // we convey this state between the convert command
  // and the accept/cancel commands
  let javaUri: vscode.Uri;
  let kotlinUri: vscode.Uri;

  function inDiff(editor: vscode.TextEditor | undefined): boolean {
    if (!editor) {
      return false;
    }

    const uri = editor.document.uri.toString();

    const onRight =
      typeof kotlinUri !== "undefined" && uri === kotlinUri.toString();
    const onLeft = typeof javaUri !== "undefined" && uri === javaUri.toString();

    return onLeft || onRight;
  }

  // for general purpose logging
  const outputChannel = vscode.window.createOutputChannel("j2k-vscode");
  outputChannel.appendLine("Output channel loaded");

  // to preserve VC history, lazy load vcsHandler
  let vcsHandler: VCSFileRenamer;

  const buildSystems = await detectBuildSystems();
  outputChannel.appendLine(
    `Detected build systems: ${buildSystems.map((s) => s.name).join(", ")}`,
  );

  for (const system of buildSystems) {
    if (system.name === "none") {
      continue;
    }

    if (await system.needsKotlin()) {
      outputChannel.appendLine(
        `Build system ${system.name} requires Kotlin to be configured.`,
      );

      vscode.window
        .showInformationMessage(
          `This ${system.name} project currently builds only Java. Would you like to add Kotlin support?`,
          "Add Kotlin",
          "Not now",
        )
        .then(async (choice) => {
          if (choice !== "Add Kotlin") {
            return;
          }

          outputChannel.appendLine(
            `Configuring Kotlin from prompt for ${system.name}`,
          );
          await system.enableKotlin();
        });
    }
  }

  const queue = new Queue();
  const mem = new MemoryContentProvider();
  const worker = new Worker(context, queue, mem, outputChannel);
  worker.start();

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider("j2k-progress", mem),
  );
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider("j2k-result", mem),
  );

  const queueProvider = new QueueListProvider(queue, worker);
  vscode.window.registerTreeDataProvider("j2k.queue", queueProvider);

  const completedProvider = new CompletedListProvider(worker);
  const completedTree = vscode.window.createTreeView("j2k.completed", {
    treeDataProvider: completedProvider
  });
  context.subscriptions.push(completedTree);

  // this logic has been factored out so that if we want to keep going after
  // cancel action as well, then we can do this
  async function tryOpenNextConversion() {
    const nextCompleted = worker.completed.find(c => !c.error);

    if (nextCompleted) {
      await vscode.commands.executeCommand("j2k.completed.openDiff", nextCompleted);

      // we are opening a conversion before it's been converted, so it's .java here
      // also remains consistent with the tree view
      vscode.window.showInformationMessage(
        `Automatically opened next Kotlin conversion (${path.basename(nextCompleted.resultUri.fsPath, ".kt")}.java) to be reviewed.`
      );

      // try to also highlight it in the tree view so it's visually appealing
      await completedTree
        .reveal(nextCompleted, { select: true, focus: false })
        .then(() => {}, () => {});
    }
  }

  const queueFile = vscode.commands.registerCommand(
    "j2k.queueFile",
    async (resource?: vscode.Uri, resources?: vscode.Uri[]) => {
      const selected = resources?.length
        ? resources
        : resource
          ? [resource]
          : [];

      const javaUris = await normaliseSelection(selected);

      javaUris.forEach((uri: vscode.Uri) => {
        outputChannel.appendLine(
          `queueFile: Enqueued ${path.basename(uri.fsPath)}`,
        );

        queue.enqueue(uri);
      });

      vscode.commands.executeCommand("workbench.view.extension.j2k");
    },
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "j2k.queue.openProgress",
      async (job: Job) => {
        let document = await vscode.workspace.openTextDocument(job.progressUri);

        if (document.languageId !== "kotlin") {
          document = await vscode.languages.setTextDocumentLanguage(
            document,
            "kotlin",
          );
        }

        await vscode.window.showTextDocument(document, { preview: true });
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "j2k.completed.openDiff",
      async (completedJob: CompletedJob) => {
        vcsHandler = await detectVCS(outputChannel);

        const left = await vscode.workspace.openTextDocument(
          completedJob.job.javaUri,
        );

        const { dir, name } = path.parse(completedJob.job.javaUri.fsPath);

        const rightUri = vscode.Uri.from({
          scheme: "untitled",
          path: path.join(dir, name + ".kt"),
        });
        let right = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === rightUri.toString());
        if (!right) {
          right = await vscode.workspace.openTextDocument(rightUri);
          right = await vscode.languages.setTextDocumentLanguage(right, "kotlin");

          // provide actual text
          const edit = new vscode.WorkspaceEdit();
          edit.replace(rightUri, new vscode.Range(0,0,0,0), completedJob.kotlinText);
          await vscode.workspace.applyEdit(edit);
        }

        javaUri = completedJob.job.javaUri;
        kotlinUri = right.uri;

        await vscode.commands.executeCommand(
          "vscode.diff",
          left.uri,
          right.uri,
          "Java to Kotlin Preview",
        );
      },
    ),
  );

  const acceptAndReplace = vscode.commands.registerCommand(
    "j2k.acceptAndReplaceConversion",
    async () => {
      // PRE: our diff is open therefore j2k.convertFile has run
      assert.ok(javaUri, "javaUri is not set before accepting conversion");
      assert.ok(kotlinUri, "kotlinUri is not set before accepting conversion");

      const currentJavaUri = javaUri;
      const currentKotlinUri = kotlinUri;

      const kotlinDoc = await vscode.workspace.openTextDocument(currentKotlinUri);
      const replacementCode = kotlinDoc.getText();

      // write the replacement code to the same location as the java

      const oldPath = currentJavaUri.fsPath;
      const dir = path.dirname(oldPath);
      const base = path.basename(oldPath, ".java");
      const newPath = path.join(dir, base + ".kt");

      const kotlinReplacement = vscode.Uri.file(newPath);

      // rename the java file to .kt file extension to preserve commit
      // history, then commit

      await vcsHandler.renameAndCommit(currentJavaUri, kotlinReplacement);

      // write the kotlin file, then delete the old java file
      await vscode.workspace.fs.writeFile(
        kotlinReplacement,
        Buffer.from(replacementCode, "utf-8"),
      );

      // log the changes made to the file
      const originalBase = path.basename(currentJavaUri.fsPath, ".java");
      const logFileName = `${originalBase}_polished.kt`;
      logFile(logFileName, replacementCode);

      await vcsHandler.stageConversionReplacement(kotlinReplacement);

      // tidy up any changed state
      await vscode.commands.executeCommand(
        "workbench.action.revertAndCloseActiveEditor",
      );

      worker.removeCompleted(currentJavaUri);

      // here we are saving a kotlin file, so output kotlin Uri
      vscode.window.showInformationMessage(
        `Conversion result for ${path.basename(currentKotlinUri.fsPath)} saved successfully.`,
      );

      return await tryOpenNextConversion();
    },
  );

  const cancelAndDiscard = vscode.commands.registerCommand(
    "j2k.cancelConversion",
    async () => {
      const currentJavaUri = javaUri;

      // tidy up any changed state
      await vscode.commands.executeCommand(
        "workbench.action.revertAndCloseActiveEditor",
      );

      if (currentJavaUri) {
        worker.removeCompleted(currentJavaUri);
      }

      vscode.window.showInformationMessage(
        `Conversion cancelled for ${path.basename(currentJavaUri.fsPath)}`,
      );
    },
  );

  context.subscriptions.push(queueFile, acceptAndReplace, cancelAndDiscard);

  // only show our buttons when we are actively in the diff editor
  vscode.window.onDidChangeActiveTextEditor(
    (editor: vscode.TextEditor | undefined) => {
      vscode.commands.executeCommand(
        "setContext",
        "j2k.diffActive",
        inDiff(editor),
      );
    },
  );

  // to register bigger, bolder commands from editor/title,
  // the toolbar automatically detects keybinds to render below
  // the title. therefore we create aliases which do not have
  // keybinds
  context.subscriptions.push(
    vscode.commands.registerCommand("j2k.acceptFromToolbar", () =>
      vscode.commands.executeCommand("j2k.acceptAndReplaceConversion"),
    ),
    vscode.commands.registerCommand("j2k.cancelFromToolbar", () =>
      vscode.commands.executeCommand("j2k.cancelConversion"),
    ),
  );

  // api key storage
  context.subscriptions.push(
    vscode.commands.registerCommand("j2k.setApiKey", async () => {
      const key = await vscode.window.showInputBox({
        prompt: "Enter your LLM API key",
        password: true,
        ignoreFocusOut: true,
      });

      if (key) {
        await context.secrets.store("j2k.apiKey", key);
        vscode.window.showInformationMessage(
          "LLM API key saved to VS Code secure storage.",
        );

        outputChannel.appendLine(
          "LLM API key saved to VS Code secure storage.",
        );
      }
    }),
  );

  // bind the enable kotlin function to a command
  context.subscriptions.push(
    vscode.commands.registerCommand("j2k.configureKotlin", async () => {
      outputChannel.appendLine("Manual trigger: Configuring Kotlin");

      const systems = await detectBuildSystems();

      const actionable = systems.filter((s) => s.name !== "none");
      if (actionable.length === 0) {
        outputChannel.appendLine("No supported build system detected.");
        return;
      }

      for (const system of actionable) {
        try {
          outputChannel.appendLine(`Checking Kotlin setup for ${system.name}…`);
          if (await system.needsKotlin()) {
            outputChannel.appendLine(`Enabling Kotlin for ${system.name}…`);
            await system.enableKotlin();
            outputChannel.appendLine(`Kotlin configured for ${system.name}.`);
          } else {
            outputChannel.appendLine(
              `Kotlin already configured for ${system.name}.`,
            );
          }
        } catch (err: any) {
          outputChannel.appendLine(
            `Failed to configure Kotlin for ${system.name}: ${err?.message ?? String(err)}`,
          );
        }
      }
    }),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
