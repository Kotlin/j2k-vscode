import * as vscode from "vscode";
import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";

import { convertToKotlin } from "./converter";
import { detectVCS, VCSFileRenamer } from "./vcs";
import { detectBuildSystem } from "./build-systems";
import { MemoryContentProvider } from "./batch/memory";
import { Job, Queue } from "./batch/queue";
import { CompletedJob, Worker } from "./batch/worker";
import { QueueListProvider } from "./batch/queue-view";
import { CompletedListProvider } from "./batch/completed-view";

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

  return [...new Map(out.map(u => [normaliseFsPath(u.fsPath), u])).values()];
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

    const onRight = typeof kotlinUri !== "undefined" && uri === kotlinUri.toString();
    const onLeft  = typeof javaUri   !== "undefined" && uri === javaUri.toString();

    return onLeft || onRight;
  }

  // for general purpose logging
  const outputChannel = vscode.window.createOutputChannel("j2k-vscode");
  outputChannel.appendLine("Output channel loaded");

  // to preserve VC history, lazy load vcsHandler
  let vcsHandler: VCSFileRenamer;

  const buildSystem = await detectBuildSystem();

  outputChannel.appendLine(`Output channel detected: ${buildSystem.name}`);

  if (await buildSystem.needsKotlin()) {
    outputChannel.appendLine(
      `Build system ${buildSystem.name} requires Kotlin to be configured.`,
    );
    vscode.window
      .showInformationMessage(
        "This project currently builds only Java. Would you like to add Kotlin support automatically?",
        "Add Kotlin",
        "Not now",
      )
      .then(async (choice) => {
        if (choice !== "Add Kotlin") {
          return;
        }

        outputChannel.append("Configuring Kotlin from prompt");

        await buildSystem.enableKotlin();
      });
  }

  const queue = new Queue();
  const mem = new MemoryContentProvider();
  const worker = new Worker(context, queue, mem, outputChannel);
  worker.start();

  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider("j2k-progress", mem));
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider("j2k-result", mem));
  
  const queueProvider = new QueueListProvider(queue, worker);
  vscode.window.registerTreeDataProvider("j2k.queue", queueProvider);

  const completedProvider = new CompletedListProvider(worker);
  vscode.window.registerTreeDataProvider("j2k.completed", completedProvider);

  const queueFile = vscode.commands.registerCommand(
    "j2k.queueFile",
    async (resource?: vscode.Uri, resources?: vscode.Uri[]) => {
      const selected = resources?.length ? resources : (resource ? [resource] : []);

      const javaUris = await normaliseSelection(selected);

      javaUris.forEach((uri: vscode.Uri) => { 
        queue.enqueue(uri);
      });

      vscode.commands.executeCommand("workbench.view.extension.j2k");
    }
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "j2k.queue.openProgress",
      async (job: Job) => {        
        let document = await vscode.workspace.openTextDocument(job.progressUri);
        
        if (document.languageId !== "kotlin") {
          document = await vscode.languages.setTextDocumentLanguage(document, "kotlin");
        }
        
        await vscode.window.showTextDocument(document, { preview: true });
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "j2k.completed.openDiff",
      async (completedJob: CompletedJob) => {
        vcsHandler = await detectVCS(outputChannel);

        const left = await(vscode.workspace.openTextDocument(completedJob.job.javaUri));
        let right = await vscode.workspace.openTextDocument(completedJob.resultUri);

        if (right.languageId !== "kotlin") {
          right = await vscode.languages.setTextDocumentLanguage(right, "kotlin");
        }

        javaUri = completedJob.job.javaUri;
        kotlinUri = completedJob.resultUri;

        await vscode.commands.executeCommand(
          "vscode.diff",
          left.uri,
          right.uri,
          "Java to Kotlin Preview"
        );
      }
    )
  );

  const convertFile = vscode.commands.registerCommand(
    "j2k.convertFile",
    async (uri: vscode.Uri, resources?: vscode.Uri[]) => {
      outputChannel.appendLine(`Converting ${uri.fsPath}`);

      vcsHandler = await detectVCS(outputChannel);
      outputChannel.appendLine(`VCS detected: ${vcsHandler.name}`);

      const javaBuf = await vscode.workspace.openTextDocument(uri);
      const javaCode = javaBuf.getText();
      javaUri = uri;

      const originalBase = path.basename(uri.fsPath, ".java");
      logFile(`${originalBase}.java`, javaCode);

      const kotlinBuf = await vscode.workspace.openTextDocument({
        language: "kotlin",
        content: "",
      });
      kotlinUri = kotlinBuf.uri;

      await vscode.commands.executeCommand(
        "vscode.diff",
        javaBuf.uri,
        kotlinBuf.uri,
        "Java to Kotlin Preview",
      );

      const kotlinEditor = vscode.window.visibleTextEditors.find(
        (e) => e.document === kotlinBuf,
      )!;

      let buf = "";
      let tokens = 0;
      const TOKENS_PER_FLUSH = 20;

      let insideCode = false;
      let finalResult = "";
      async function onToken(delta: string) {
        buf += delta;

        if (insideCode) {
          tokens += 1;

          // flush buffer
          if (buf.includes("\n") || tokens >= TOKENS_PER_FLUSH) {
            await kotlinEditor.edit(
              (eb) =>
                eb.insert(
                  new vscode.Position(kotlinEditor.document.lineCount, 0),
                  buf,
                ),
              { undoStopBefore: false, undoStopAfter: false },
            );

            finalResult += buf;

            // reset buffer
            buf = "";
            tokens = 0;
          }
        } else {
          const tagPosition = buf.indexOf("<<START_J2K>>\n");

          if (tagPosition === -1) {
            return;
          }

          outputChannel.appendLine("Code tag found");

          insideCode = true;
          tokens += 1;
          
          buf = buf.slice(tagPosition + "<<START_J2K>>\n".length);
        }
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "J2K: Translating...",
          cancellable: false,
        },
        async (progress) => {
          let last = 0;

          function onProgress(percentage: number, message?: string) {
            const next = Math.max(0, Math.min(100, Math.floor(percentage)));
            const increment = Math.max(0, next - last);

            if (increment > 0) {
              progress.report({ increment, message: message });
              last = next;
            } else if (message) {
              progress.report({ message: message });
            }
          }

          await convertToKotlin(
            javaCode,
            outputChannel,
            context,
            onToken,
            onProgress,
          );
        }
      );

      // final flush of the buffer for the last tokens, but additionally,
      // if no sentinel token was found, we flush the entire buffer to
      // output the full LLM response instead of leaving the user with
      // nothing.
      if (buf.length) {
        await kotlinEditor.edit(
          (eb) =>
            eb.insert(new vscode.Position(kotlinEditor.document.lineCount, 0), buf),
          { undoStopBefore: false, undoStopAfter: false },
        );

        finalResult += buf;
      }

      logFile(`${originalBase}_generated.kt`, finalResult);

      outputChannel.appendLine("Java to Kotlin Preview ready");
    },
  );

  const acceptAndReplace = vscode.commands.registerCommand(
    "j2k.acceptAndReplaceConversion",
    async () => {
      // PRE: our diff is open therefore j2k.convertFile has run
      assert.ok(javaUri, "javaUri is not set before accepting conversion");
      assert.ok(kotlinUri, "kotlinUri is not set before accepting conversion");

      const kotlinDoc = await vscode.workspace.openTextDocument(kotlinUri);
      const replacementCode = kotlinDoc.getText();

      // write the replacement code to the same location as the java

      const oldPath = javaUri.fsPath;
      const dir = path.dirname(oldPath);
      const base = path.basename(oldPath, ".java");
      const newPath = path.join(dir, base + ".kt");

      const kotlinReplacement = vscode.Uri.file(newPath);

      // rename the java file to .kt file extension to preserve commit
      // history, then commit

      await vcsHandler.renameAndCommit(javaUri, kotlinReplacement);

      // write the kotlin file, then delete the old java file
      await vscode.workspace.fs.writeFile(
        kotlinReplacement,
        Buffer.from(replacementCode, "utf-8"),
      );

      // log the changes made to the file
      const originalBase = path.basename(javaUri.fsPath, ".java");
      const logFileName = `${originalBase}_polished.kt`;
      logFile(logFileName, replacementCode);

      await vcsHandler.stageConversionReplacement(kotlinReplacement);

      // tidy up any changed state
      await vscode.commands.executeCommand(
        "workbench.action.revertAndCloseActiveEditor",
      );

      worker.removeCompleted(kotlinUri);
    },
  );

  const cancelAndDiscard = vscode.commands.registerCommand(
    "j2k.cancelConversion",
    async () => {
      // tidy up any changed state
      await vscode.commands.executeCommand(
        "workbench.action.revertAndCloseActiveEditor",
      );
    },
  );

  context.subscriptions.push(queueFile, convertFile, acceptAndReplace, cancelAndDiscard);

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
      outputChannel.append("Manual trigger: Configuring Kotlin");
      const buildSystem = await detectBuildSystem();

      if (await buildSystem.needsKotlin()) {
        await buildSystem.enableKotlin();
      }
    }),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
