import * as vscode from "vscode";
import { detectBuildSystems, JVMBuildSystem } from "../build-systems";

export async function initialiseBuildSystems(
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
          `Kotlin is not configured for ${system.name}.`,
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

export async function configureKotlinForBuildSystems(
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
        `Failed to configure Kotlin for ${system.name}: ${
          err?.message ?? String(err)
        }`,
      );
    }
  }
}
