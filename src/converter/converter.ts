import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

import * as vscode from "vscode";

const model = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "llama3",
  temperature: 0,
});

async function convertUsingOllama(
  javaCode: string,
  outputChannel: vscode.OutputChannel,
) {
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
    "convertUsingOllama: Prompt invoked, waiting for response",
  );
  const res = await chain.invoke({ javaCode });
  outputChannel.appendLine("convertUsingOllama: Response received");

  return res;
}

export async function convertToKotlin(
  javaCode: string,
  outputChannel: vscode.OutputChannel,
): Promise<string> {
  return await convertUsingOllama(javaCode, outputChannel);
}
