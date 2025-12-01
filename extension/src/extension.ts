import * as vscode from "vscode";

import { VCSFileRenamer } from "./vcs";
import { initialiseBuildSystems } from "./helpers/build-systems";
import { ConversionSession, createBatchController } from "./helpers/batch";
import { createSessionManager } from "./helpers/session";
import { registerSessionCommands } from "./helpers/session-commands";
import { registerQueueCommands } from "./helpers/queue-commands";
import { registerConversionCommands } from "./helpers/conversion-commands";
import { registerConfigCommands } from "./helpers/config-commands";

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

  const session: ConversionSession = {
    active: false,
    acceptedFiles: [],
    workspaceFolder: undefined,
  };

  const sessionManager = createSessionManager(session);
  // just in case we have a previous session that existed
  sessionManager.loadFromDisk();
  
  registerCommand("j2k.startConversionSession", () => {
    sessionManager.beginIfRequired();
    vscode.window.showInformationMessage("J2K: Conversion session started.");
  });

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
  } = createBatchController(context, outputChannel, session);

  registerQueueCommands(
    context,
    {
      queue,
      worker,
      outputChannel,
      sessionManager
    }
  );

  registerConversionCommands(
    context,
    {
      session,
      worker,
      queue,
      completedTree,
      outputChannel,
      sessionManager,
    }
  );

  registerConfigCommands(
    context,
    {
      outputChannel,
    }
  );

  registerSessionCommands(
    context,
    {
      session,
      worker,
      queue,
      outputChannel,
      sessionManager,
    }
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
}

// This method is called when your extension is deactivated
export function deactivate() {}
