import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

import * as vscode from "vscode";

async function makeModel(context: vscode.ExtensionContext) {
  const cfg = vscode.workspace.getConfiguration("j2k");

  const model = cfg.get<string>("model", "codellama:instruct");
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

async function convertUsingLLM(
  javaCode: string,
  outputChannel: vscode.OutputChannel,
  context: vscode.ExtensionContext,
) {
  const model = await makeModel(context);
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
    model,
    (msg: any) => (typeof msg === "string" ? msg : (msg.content as string)),
  ]);

  outputChannel.appendLine(
    "convertUsingLLM: Prompt invoked, waiting for response",
  );
  const res = await chain.invoke({ javaCode });
  outputChannel.appendLine("convertUsingLLM: Response received");

  return res;
}

export async function convertToKotlin(
  javaCode: string,
  outputChannel: vscode.OutputChannel,
  context: vscode.ExtensionContext,
): Promise<string> {
  return await convertUsingLLM(javaCode, outputChannel, context);
}
