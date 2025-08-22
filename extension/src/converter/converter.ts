import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";

import { getPrompt } from "./prompt";
import { extractAddresses } from "./extract-addresses";

import * as vscode from "vscode";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const TASK_CONTEXT = "You are a senior Kotlin engineer and Java-Kotlin JVM interop specialist.";

function getFunctionPrompt(javaCode: string, address: string) {
  const systemContent = [
    "You are a senior Kotlin engineer and Java-Kotlin JVM interop specialist. ",
    "Convert the given function to idiomatic Kotlin and output the final code in <kotlin> tags. ",
    "Preserve behavior and API, prefer idiomatic Kotlin when safe. ",
    "You MUST provide the final output in <kotlin> tags, no markdown, nothing else apart from <kotlin> XML tags enclosing the output."
  ].join("");

  const TASK_DESCRIPTION = "Your task is to convert only a specific function within the provided Java code to **idiomatic kotlin**, preserving behaviour while improving readability, safety and maintainability.";

  const INPUT_CONTEXT = `The function is part of the Java code given below:
<java>
${javaCode}
</java>`;

  const FUNCTION_TARGET = `The function you should translate is: ${address}
This refers to the exact method/constructor with the same name and parameter types.`;

  const OUTPUT_FORMATTING = "Wrap the conversion result of the function in <kotlin> tags. Return ONLY the Kotlin function wrapped in the tags. Do NOT move/rename the function or change parameters.";
  
  const REMARKS = "Output the conversion result as idiomatic Kotlin that drops into an otherwise fully and perfectly converted Kotlin codebase, where this function is the only gap. Convert only that one function/constructor. Use Kotlin idioms and avoid Java-isms.";

  const humanContent = [
    TASK_CONTEXT,
    TASK_DESCRIPTION,
    INPUT_CONTEXT,
    FUNCTION_TARGET,
    OUTPUT_FORMATTING,
    REMARKS
  ].join("\n\n");

  return ChatPromptTemplate.fromMessages([
    { role: "system", content: systemContent },
    { role: "human", content: humanContent}
  ], {
    templateFormat: "mustache",
    validateTemplate: false
  });
}

function getStructuralPrompt(javaCode: string, functions: Map<string, string>) {
  const systemContent = [
    "You are a senior Kotlin engineer and Java-Kotlin JVM interop specialist. ",
    "Convert the given Java code to idiomatic Kotlin and output the final code in <kotlin> tags. ",
    "Preserve behavior and API, prefer idiomatic Kotlin when safe. ",
    "You MUST provide the final output in <kotlin> tags, no markdown, nothing else apart from <kotlin> XML tags enclosing the output."
  ].join("");

  const TASK_DESCRIPTION = "Your task is to convert the following Java code to **idiomatic Kotlin**, preserving behaviour while improving readability, safety and maintainability. The functions have already been converted for you, so you can use these as the correct conversions of the functions within the Java code.";

  const INPUT_CONTEXT = `The Java code to convert is:
<java>
${javaCode}
</java>`;

  const FUNCTIONS_CONTEXT = "The Kotlin conversions for each function are listed below:";

  const FUNCTION_CONVERSIONS = Array.from(functions.entries())
    .map(([name, body]) => `Function: ${name}
<kotlin>
${body}
</kotlin>`).join("\n");

  const PRECOGNITION = `Before emitting any code, run through the provided Java input and perform these 3 steps of thinking.
<step>
  1: Build a faithful Kotlin skeleton, keeping the package declaration and the given imports.

  <rule>
    Declare classes/interfaces/enums, and convert constructors.
  </rule>
  <rule>
    Declare method signatures only.
  </rule>
  <rule>
    For every method whose address appears in the supplied list, paste the provided Kotlin body verbatim into the matching signature.
  </rule>
</step>

<step>
  2: Introduce syntactic transformations to make the output truly idiomatic.

  <rule>
    Where getters and setters are defined as methods in Java, use the Kotlin syntax to replace these methods with a more idiomatic version.
  </rule>
  <rule>
    Lambdas should be used where they can simplify code complexity while replicating the exact behaviour of the previous code.
  </rule>
</step>`;

  // note currently i'm converting v3 exactly to typescript, so issues with numbered invariants aren't being addressed here yet.
  const INVARIANTS = `In each stage of your chain of thought, the following invariants must hold.

<invariant>
  1: No new side-effects or behaviour.
</invariant>
<invariant>
  2: Preserve all annotations and targets exactly.

  <rule>
    Annotations must target the backing field in Kotlin where they targeted the field in Java.
  </rule>
</invariant>
<invariant>
  3: Preserve the package declaration and all imports.

  <rule>
    Carry forwards every single import, adding no new imports. Only remove imports where they would shadow Kotlin names <example>java.util.List shadows Kotlin's List</example>
  </rule>
</invariant>
<invariant>
  4: Ensure the output result is in Kotlin.

  <rule>
    The emitted code must be syntactically valid Kotlin.
  </rule>
</invariant>

After each stage, after the updated conversion code has been emitted, go through each of these invariants, listing the ones that no longer hold after this step. If any exist, revert to the previous step and recalculate the current step from the top.`;

  const OUTPUT_FORMATTING = "Wrap the conversion result in <kotlin> tags.";
  
  const REMARKS = "Use the pre-converted functions given above to help convert the entire Java source to idiomatic Kotlin.";

  const humanContent = [
    TASK_CONTEXT,
    TASK_DESCRIPTION,
    INPUT_CONTEXT,
    FUNCTIONS_CONTEXT,
    FUNCTION_CONVERSIONS,
    PRECOGNITION,
    INVARIANTS,
    OUTPUT_FORMATTING,
    REMARKS
  ].join("\n\n");

  return ChatPromptTemplate.fromMessages([
    { role: "system", content: systemContent },
    { role: "human", content: humanContent}
  ], {
    templateFormat: "mustache",
    validateTemplate: false
  });
}

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
        numCtx: 8192 * 2,
        keepAlive: 0,
      });
    case "openrouter":
      console.log(cfg.get<string>("openRouter.baseUrl"));
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

export function extractLastKotlinBlockFromXML(text: string) {
  const OPEN = "<kotlin>";
  const CLOSE = "</kotlin>";

  const lower = text.toLowerCase();
  const closeIdx = lower.lastIndexOf(CLOSE);
  if (closeIdx === -1) {
    return text;
  }

  const openIdx = lower.lastIndexOf(OPEN, closeIdx);
  if (openIdx === -1) {
    return text;
  }

  const start = openIdx + OPEN.length;
  return text.slice(start, closeIdx);
}

export function extractLastKotlinBlockFromMarkdown(text: string, general: boolean = false) {
  let OPEN = "```";
  if (general) {
    OPEN += "kotlin";
  }
  const CLOSE = "```";

  const lower = text.toLowerCase();
  const closeIdx = lower.lastIndexOf(CLOSE);
  if (closeIdx === -1) {
    return text;
  }

  const openIdx = lower.lastIndexOf(OPEN, closeIdx);
  if (openIdx === -1) {
    return text;
  }

  const start = openIdx + OPEN.length;
  return text.slice(start, closeIdx);
}

// behaviour observed is that sometimes the LLM ignores the request for XML tags
export function extractLastKotlinBlock(text: string) {
  const original = text;

  const resultInXML = extractLastKotlinBlockFromXML(text);

  if (resultInXML !== original) {
    return resultInXML;
  }

  const resultInMarkdown = extractLastKotlinBlockFromMarkdown(text);

  if (resultInMarkdown !== original) {
    return resultInMarkdown;
  }

  const resultInGeneralMarkdown = extractLastKotlinBlockFromMarkdown(text, true);

  return resultInGeneralMarkdown;
}

async function convertUsingLLM(
  javaCode: string,
  outputChannel: vscode.OutputChannel,
  context: vscode.ExtensionContext,
  onToken: (token: string) => Promise<void>,
) {
  const model = await makeModel(context);
  outputChannel.appendLine(`convertUsingLLM: Using model ${model.model}`);

  const prompt = getPrompt(javaCode);
  const chain = RunnableSequence.from([prompt, model]);

  outputChannel.appendLine(
    "convertUsingLLM: Prompt invoked, waiting for response",
  );

  outputChannel.appendLine("convertUsingLLM: Starting LLM stream");

  for await (const chunk of await chain.stream({ javaCode })) {
    const delta: string =
      typeof chunk === "string" ? chunk : (chunk.content as string);

    // call input callback
    await onToken(delta);
  }
}

async function convertStructurallyWithLLM(
  javaCode: string,
  outputChannel: vscode.OutputChannel,
  context: vscode.ExtensionContext,
  onToken: (token: string) => Promise<void>,
) {
  const model = await makeModel(context);
  outputChannel.appendLine(`convertStructurallyWithLLM: Using model ${model.model}`);

  outputChannel.appendLine("convertStructurallyWithLLM: Starting LLM stream");

  const functions = new Map<string, string>();

  for (const address of extractAddresses(javaCode)) {
    await onToken(`\n\n====== CONVERSION START ${address} ======\n\n`);
    let functionConversionResult = "";

    const prompt = getFunctionPrompt(javaCode, address);
    const chain = RunnableSequence.from([prompt, model]);

    outputChannel.appendLine(
      `convertStructurallyWithLLM: Prompt invoked for ${address}, waiting for response`,
    );
    for await (const chunk of await chain.stream({ javaCode })) {
      const delta: string =
        typeof chunk === "string" ? chunk : (chunk.content as string);

      // call input callback
      await onToken(delta);
      functionConversionResult += delta;
    }

    const actualResultFunction = extractLastKotlinBlock(functionConversionResult);
    functions.set(address, actualResultFunction);
    await onToken(`\n\n====== CONVERSION END ${address} ======\n\n`);
  }

  const prompt = getStructuralPrompt(javaCode, functions);
  const chain = RunnableSequence.from([prompt, model]);

  outputChannel.appendLine(`convertStructurallyWithLLM: Converting full code now`);

  for await (const chunk of await chain.stream({ javaCode })) {
    const delta: string =
      typeof chunk === "string" ? chunk : (chunk.content as string);

    // call input callback
    await onToken(delta);
  }
}

export async function convertToKotlin(
  javaCode: string,
  outputChannel: vscode.OutputChannel,
  context: vscode.ExtensionContext,
  onToken: (token: string) => Promise<void>,
) {
  await convertStructurallyWithLLM(javaCode, outputChannel, context, onToken);
}
