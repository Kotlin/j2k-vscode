import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

import * as vscode from "vscode";

function makeModel() {
  const cfg = vscode.workspace.getConfiguration("j2k");

  const model = cfg.get<string>("model", "codellama:instruct");
  const provider = cfg.get<string>("provider", "local-ollama");

  switch (provider) {
    case "local-ollama":
      return new ChatOllama({
        baseUrl: cfg.get<string>("ollama.baseUrl", "http://localhost:11434"),
        model: model,
        temperature: 0
      });
    case "openrouter":
      return new ChatOpenAI({
        model: model,
        apiKey: "TODO: unsupported",
        configuration: {
          baseURL: cfg.get<string>("openRouter.baseUrl", "https://openrouter.ai/api/v1")
        }
      });
    case "openai":
      return new ChatOpenAI({
        model: model,
        apiKey: "TODO: unsupported",
      });
    default:
      throw new Error(`J2K: unknown provider ${provider}`);
  }
}

function countTokens(text: string) {
  // using that 1 token is approximately 4 chars
  return Math.ceil(text.length / 4);
}

async function convertUsingLLM(
  javaCode: string,
  outputChannel: vscode.OutputChannel,
) {
  const model = makeModel();
  outputChannel.appendLine(`convertUsingLLM: Using model ${model.model}`);

  const systemPrompt: string = `
Translate the given Java code to Kotlin.
Return only the translated Kotlin code, no extra comments.
`.trim();

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    [
      "human",
      ["Java source code we want to translate.\n", "{javaCode}"].join(""),
    ],
  ]);

  const chain = RunnableSequence.from([
    prompt,
    model
  ]);

  outputChannel.appendLine(
    "convertUsingLLM: Prompt invoked, waiting for response",
  );

  return await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "J2K: Translating...",
    cancellable: false
  },
  async (progress) => {
    let generated = 0;
    let output = "";

    // assume that a kotlin file will be 95% the size of the corresponding
    // java file due to having cleaner syntax but also inefficiencies
    // with the conversion
    let upperBound = Math.ceil(countTokens(javaCode) * 0.95);
    let lastPercentage = 0;

    for await (const chunk of await chain.stream({ javaCode })) {
      const delta: string = typeof chunk === "string" ? chunk : (chunk.content as string);
      output += delta;
      generated += countTokens(delta);
      
      // never let the percentage hit more than 100
      const percentage = Math.min((generated / upperBound) * 100, 99);

      progress.report({
        increment: percentage - lastPercentage,
        message: `${percentage.toFixed(0)}%`
      });
      lastPercentage = percentage;
    }

    progress.report({
      increment: 100 - lastPercentage,
      message: "LLM response received"
    });

    return output;
  });
}

export async function convertToKotlin(
  javaCode: string,
  outputChannel: vscode.OutputChannel,
): Promise<string> {
  return await convertUsingLLM(javaCode, outputChannel);
}
