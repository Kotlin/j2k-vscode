import * as vscode from "vscode";
import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";

import { detectVCS, VCSFileRenamer } from "./vcs";
import { detectBuildSystems, JVMBuildSystem } from "./build-systems";
import { MemoryContentProvider } from "./batch/memory";
import { Job, Queue } from "./batch/queue";
import { CompletedJob, Worker } from "./batch/worker";
import { QueueListProvider } from "./batch/queue-view";
import { CompletedListProvider } from "./batch/completed-view";
import { AcceptedListProvider, AcceptedItem } from "./batch/accepted-view";

const SESSION_STORAGE_NAME = ".j2k-session.tmp";

type ConversionSession = {
  active: boolean;
  acceptedFiles: vscode.Uri[];
  workspaceFolder?: vscode.WorkspaceFolder;
};

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

function deriveWorkspaceFolder(uri: vscode.Uri): vscode.WorkspaceFolder | undefined {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (folder) {
    return folder;
  }
  
  const all = vscode.workspace.workspaceFolders;
  return all && all.length > 0 ? all[0] : undefined;
}

async function restoreOriginalFromBackup(kotlinUri: vscode.Uri) {
  const kotlinPath = kotlinUri.fsPath;
  const dir = path.dirname(kotlinPath);
  const base = path.basename(kotlinPath, ".kt");

  const javaPath = path.join(dir, base + ".java");
  const javaBackupPath = javaPath + ".j2k";

  const javaUri = vscode.Uri.file(javaPath);
  const javaBackupUri = vscode.Uri.file(javaBackupPath);

  // delete the generated kotlin file, if it exists
  try {
    await vscode.workspace.fs.stat(kotlinUri);
    await vscode.workspace.fs.delete(kotlinUri, { recursive: false, useTrash: false });
  } catch { }

  // restore backup if present
  try {
    await vscode.workspace.fs.stat(javaBackupUri);
    await vscode.workspace.fs.rename(javaBackupUri, javaUri, { overwrite: true });
  } catch { }
}

async function initialiseBuildSystems(
  outputChannel: vscode.OutputChannel,
): Promise<JVMBuildSystem[]> {
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

  return buildSystems;
}

async function configureKotlinForBuildSystems(
  outputChannel: vscode.OutputChannel,
): Promise<void> {
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
}

async function createBatchController(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  session: ConversionSession,
) {
  const queue = new Queue();
  const mem = new MemoryContentProvider();
  const worker = new Worker(context, queue, mem, outputChannel);
  worker.start();
  if (session.active && session.acceptedFiles.length > 0) {
    worker.restoreAccepted(session.acceptedFiles);
  }

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider("j2k-progress", mem),
  );
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider("j2k-result", mem),
  );

  const acceptedView = new AcceptedListProvider(worker);
  const completedView = new CompletedListProvider(worker);
  const completedTree = vscode.window.createTreeView("j2k.completed", {
    treeDataProvider: completedView,
  });
  const queueProvider = new QueueListProvider(queue, worker);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("j2k.accepted", acceptedView),
    completedTree,
    vscode.window.registerTreeDataProvider("j2k.queue", queueProvider),
  );

  return {
    queue,
    mem,
    worker,
    acceptedView,
    completedTree,
    queueProvider
  };
}

export async function activate(context: vscode.ExtensionContext) {
  const registerCommand = (command: string, callback: (...args: any[]) => any | Promise<any>,): vscode.Disposable => {
    const disposable = vscode.commands.registerCommand(command, callback);

    context.subscriptions.push(disposable);

    return disposable;
  };

  const registerBindings = (commands: Map<string, string>) => {
    for (const [key, value] of commands) {
      registerCommand(key, () =>
        vscode.commands.executeCommand(value),
      );
    }
  };

  // so that we don't have to discover open workspaces when accepting/rejecting,
  // we convey this state between the convert command
  // and the accept/cancel commands
  let javaUri: vscode.Uri;
  let kotlinUri: vscode.Uri;
  
  const session: ConversionSession = {
    active: false,
    acceptedFiles: [],
    workspaceFolder: undefined,
  };

  function getSessionFilePath(): string | undefined {
    if (!session.workspaceFolder) {
      return undefined;
    }
    
    return path.join(session.workspaceFolder.uri.fsPath, SESSION_STORAGE_NAME);
  }
  
  function deleteSessionFile() {
    const sessionFilePath = getSessionFilePath();
    if (!sessionFilePath) {
      return;
    }

    try {
      if (fs.existsSync(sessionFilePath)) {
        fs.unlinkSync(sessionFilePath);
      }
    } catch {
      // no-op
    }
  }

  function persistSessionState() {
    const sessionFilePath = getSessionFilePath();
    if (!sessionFilePath) {
      return;
    }

    if (!session.active) {
      // when the session isn't active, the file must not exist
      deleteSessionFile();
      return;
    }

    const payload = {
      accepted: session.acceptedFiles.map((uri) => uri.fsPath),
    };

    try {
      fs.writeFileSync(
        sessionFilePath,
        JSON.stringify(payload, null, 2),
        "utf8",
      );
    } catch {
      // no-op
    }
  }

  function loadSessionStateFromDisk() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return;
    }

    for (const folder of folders) {
      const sessionFilePath = path.join(folder.uri.fsPath, SESSION_STORAGE_NAME);
      if (!fs.existsSync(sessionFilePath)) {
        continue;
      }

      try {
        const content = fs.readFileSync(sessionFilePath, "utf8");
        const parsed = JSON.parse(content) as {
          accepted?: string[];
        };

        if (!parsed || !Array.isArray(parsed.accepted)) {
          fs.unlinkSync(sessionFilePath);
          continue;
        }

        const uris: vscode.Uri[] = [];
        for (const p of parsed.accepted) {
          if (typeof p !== "string") {
            continue;
          }
          if (!fs.existsSync(p)) {
            continue;
          }
          uris.push(vscode.Uri.file(p));
        }

        if (uris.length === 0) {
          // nothing to resume – remove the file
          fs.unlinkSync(sessionFilePath);
          continue;
        }

        session.active = true;
        session.acceptedFiles = uris;
        session.workspaceFolder = folder;

        break;
      } catch {
        // corrupt or unreadable, best effort clean up
        try {
          fs.unlinkSync(sessionFilePath);
        } catch {}
      }
    }
  }
  loadSessionStateFromDisk();
  vscode.commands.executeCommand("setContext", "j2k.sessionActive", session.active);

  function sessionBeginIfRequired() {
    if (session.active) {
      return;
    }
    
    session.active = true;
    session.acceptedFiles = [];
    session.workspaceFolder = undefined;
    vscode.commands.executeCommand("setContext", "j2k.sessionActive", true);
  }
  
  registerCommand("j2k.startConversionSession", () => {
    sessionBeginIfRequired();
    vscode.window.showInformationMessage("J2K: Conversion session started.");
  });

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

  await initialiseBuildSystems(outputChannel);

  const {
    queue,
    mem,
    worker,
    acceptedView,
    completedTree,
    queueProvider
  } = await createBatchController(context, outputChannel, session);

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

  registerCommand(
    "j2k.queueFile",
    async (resource?: vscode.Uri, resources?: vscode.Uri[]) => {
      sessionBeginIfRequired();
      const selected = resources?.length
        ? resources
        : resource
          ? [resource]
          : [];

      const javaUris = await normaliseSelection(selected);

      javaUris.forEach((uri: vscode.Uri) => {
        const queued = queue.toArray().some(item => item.javaUri.fsPath === uri.fsPath);
        const running = worker.current && worker.current.javaUri.fsPath === uri.fsPath;

        if (queued || running) {
          outputChannel.appendLine(`queueFile: skipped ${path.basename(uri.fsPath)} (already in queue)`);
          vscode.window.showInformationMessage(`${path.basename(uri.fsPath)} is already in the queue.`);

          return;
        }

        outputChannel.appendLine(
          `queueFile: Enqueued ${path.basename(uri.fsPath)}`,
        );

        queue.enqueue(uri);

        vscode.commands.executeCommand("workbench.view.extension.j2k");
      });
    },
  );

  registerCommand(
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
  );

  registerCommand(
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
  );

  registerCommand(
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

      // backup original java file as .java.j2k
      const javaBackupPath = oldPath + ".j2k"; // Foo.java -> Foo.java.j2k
      const javaBackupUri = vscode.Uri.file(javaBackupPath);

      // move the java file out of the way
      try {
        await vscode.workspace.fs.rename(currentJavaUri, javaBackupUri, { overwrite: true });
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to backup original Java file for ${path.basename(oldPath)}: ${String(err)}`,
        );
        return;
      }

      // write the kotlin file
      await vscode.workspace.fs.writeFile(
        kotlinReplacement,
        Buffer.from(replacementCode, "utf-8"),
      );

      // log the changes made to the file
      const originalBase = path.basename(currentJavaUri.fsPath, ".java");
      const logFileName = `${originalBase}_polished.kt`;
      logFile(logFileName, replacementCode);

      if (session.active) {
        if (!session.workspaceFolder) {
          session.workspaceFolder =
            deriveWorkspaceFolder(kotlinReplacement);
        }

        session.acceptedFiles.push(kotlinReplacement);
        
        // sync saved state
        persistSessionState();
      } else {
        await vcsHandler.stageConversionReplacement(kotlinReplacement);
      }

      worker.acceptCompleted(currentJavaUri, kotlinReplacement);

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

  registerCommand(
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
  registerBindings(new Map<string, string>([
    ["j2k.acceptFromToolbar", "j2k.acceptAndReplaceConversion"],
    ["j2k.cancelFromToolbar", "j2k.cancelConversion"],
    ["j2k.commitSessionFromToolbar", "j2k.commitConversionSession"],
    ["j2k.rejectSessionFromToolbar", "j2k.rejectConversionSession"],
  ]));

  // api key storage
  registerCommand("j2k.setApiKey", async () => {
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

  // bind the enable kotlin function to a command
  registerCommand("j2k.configureKotlin", async () => {
    await configureKotlinForBuildSystems(outputChannel);
  });

  registerCommand("j2k.commitConversionSession", async () => {
    if (!session.active) {
      vscode.window.showErrorMessage("No active conversion session.");
      return;
    }
    
    const suggestedText = `Convert ${session.acceptedFiles.length} files to Kotlin`;
    const name = await vscode.window.showInputBox({
      prompt: "Give this coversion session a name (optional)",
      placeHolder: suggestedText
    });

    const message = name && name.trim().length > 0 ? name!.trim() : suggestedText;

    try {
      const vcsHandler = await detectVCS(outputChannel);
      if (typeof vcsHandler.commitAll === "function") {
        await vcsHandler.commitAll(session.acceptedFiles, message);
      }
      // nothing to do for non-vcs

      vscode.window.showInformationMessage(`Committed session: ${message}`);
      
      worker.clearAllViews(queue);

      for (const kotlinUri of session.acceptedFiles) {
        const kotlinPath = kotlinUri.fsPath;
        const dir = path.dirname(kotlinPath);
        const base = path.basename(kotlinPath, ".kt");

        const javaPath = path.join(dir, base + ".java");
        const javaBackupPath = javaPath + ".j2k";
        const javaBackupUri = vscode.Uri.file(javaBackupPath);

        try {
          await vscode.workspace.fs.delete(javaBackupUri, { recursive: false, useTrash: false });
        } catch {
          // if it doesn't exist, fine
        }
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to commit session: ${err?.message ?? String(err)}`);
      return;
    } finally {
      // reset session state
      session.active = false;
      session.acceptedFiles = [];
      vscode.commands.executeCommand("setContext", "j2k.sessionActive", false);
      
      deleteSessionFile();
      session.workspaceFolder = undefined;
    }
  });
  
  registerCommand("j2k.rejectConversionSession", async () => {
    if (!session.active) {
      vscode.window.showErrorMessage("No active conversion session.");
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      `This will discard Kotlin conversions for ${session.acceptedFiles.length} files and restore the original Java files.`,
      { modal: true },
      "Discard session",
      "Cancel",
    );

    if (confirm !== "Discard session") {
      return;
    }

    try {
      for (const kotlinUri of session.acceptedFiles) {
        await restoreOriginalFromBackup(kotlinUri);
      }

      worker.clearAllViews(queue);

      vscode.window.showInformationMessage("Conversion session discarded and files restored.");
    } catch (err: any) {
      vscode.window.showErrorMessage(
        `Failed to discard session: ${err?.message ?? String(err)}`,
      );
      return;
    } finally {
      session.active = false;
      session.acceptedFiles = [];
      vscode.commands.executeCommand("setContext", "j2k.sessionActive", false);

      deleteSessionFile();
      session.workspaceFolder = undefined;
    }
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}
