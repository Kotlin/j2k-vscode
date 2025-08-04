import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";

import { getPrompt } from "./prompt";

import * as vscode from "vscode";

async function makeModel(context: vscode.ExtensionContext) {
  const cfg = vscode.workspace.getConfiguration("j2k");

  const model = cfg.get<string>("model", "deepseek-r1:8b");
  const provider = cfg.get<string>("provider", "local-ollama");

  const apiKey = (await context.secrets.get("j2k.apiKey")) ?? "";

  switch (provider) {
    case "local-ollama":
      return new ChatOllama({
        baseUrl: cfg.get<string>("ollama.baseUrl", "http://localhost:11434"),
        model: model,
        temperature: 0,
      });
    case "openrouter":
      return new ChatOpenAI({
        model: model,
        apiKey: apiKey,
        configuration: {
          baseURL: cfg.get<string>(
            "openRouter.baseUrl",
            "https://openrouter.ai/api/v1",
          ),
        },
      });
    case "openai":
      return new ChatOpenAI({
        model: model,
        apiKey: apiKey,
      });
    default:
      throw new Error(`J2K: unknown provider ${provider}`);
  }
}

function countTokens(text: string) {
  // using that 1 token is approximately 4 chars
  return Math.ceil(text.length / 4);
}

export function extractLastKotlinBlock(text: string): string | null {
  const re = /<kotlin\b[^>]*>([\s\S]*?)<\/kotlin>/gi;
  let match: RegExpExecArray | null;
  let last: string | null = null;

  while ((match = re.exec(text)) !== null) {
    last = match[1];
  }

  return last?.trim() ?? null;
}

async function convertUsingLLM(
  javaCode: string,
  outputChannel: vscode.OutputChannel,
  context: vscode.ExtensionContext,
  onToken: (token: string) => Promise<void>,
  onProgress?: (percentage: number, msg?: string) => void,
) {
  const model = await makeModel(context);
  outputChannel.appendLine(`convertUsingLLM: Using model ${model.model}`);

  const prompt = getPrompt(javaCode);
  const chain = RunnableSequence.from([prompt, model]);

  outputChannel.appendLine(
    "convertUsingLLM: Prompt invoked, waiting for response",
  );

  let generated = 0;

  // assume that a kotlin file will be 95% the size of the corresponding
  // java file due to having cleaner syntax but also inefficiencies
  // with the conversion
  let upperBound = Math.ceil(countTokens(javaCode) * 0.95);
  let lastPercentage = 0;

  let seenStart = false;
  let buf = "";

  outputChannel.appendLine("convertUsingLLM: Starting LLM stream");

  for await (const chunk of await chain.stream({ javaCode })) {
    const delta: string =
      typeof chunk === "string" ? chunk : (chunk.content as string);

    // call input callback
    await onToken(delta);

    if (seenStart) {
      generated += countTokens(delta);

      // never let the percentage hit more than 100
      const percentage = Math.min((generated / upperBound) * 100, 99);

      if (percentage > lastPercentage) {
        lastPercentage = percentage;
        onProgress?.(percentage, `${percentage.toFixed(0)}%`);
      }
    } else {
      buf += delta;
      // cap max buffer size before seeing token
      if (buf.length > 2048) {
        buf = buf.slice(-256);
      }

      if (buf.includes("<<START_J2K>>")) {
        seenStart = true;
      }
    }
  }

  // final report
  onProgress?.(100, "LLM response received");
}

export async function convertToKotlin(
  javaCode: string,
  outputChannel: vscode.OutputChannel,
  context: vscode.ExtensionContext,
  onToken: (token: string) => Promise<void>,
  onProgress?: (p: number, msg?: string) => void,
) {
  await convertUsingLLM(javaCode, outputChannel, context, onToken, onProgress);
}
