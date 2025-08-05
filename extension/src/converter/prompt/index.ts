import { ChatPromptTemplate } from "@langchain/core/prompts";

import { EXAMPLES } from "./examples";
import { PRECOGNITION } from "./precognition";
import { INVARIANTS } from "./invariants";

const TASK_CONTEXT = `You are a senior Kotlin engineer and Java-Kotlin JVM interop specialist.`;

const TASK_DESCRIPTION = `Your task is to convert provided Java code into **idiomatic Kotlin**, preserving behaviour while improving readability, safety and maintainability.`;

const OUTPUT_FORMATTING = `Wrap your final conversion result in <kotlin> tags.`;

const REMARKS = "Ensure the final Kotlin output would compile and run identically to the Java input.";

const PREFILL = `<convert_think>\n`;

export function getPrompt(javaCode: string) {
  const INPUT_DATA = `The Java code to convert is:
<java>
${javaCode}
</java>`;

  const systemContent = [
    TASK_CONTEXT,
    TASK_DESCRIPTION,
  ].join("\n\n");

  const humanContent = [
    EXAMPLES,
    INPUT_DATA,
    INVARIANTS,
    PRECOGNITION,
    OUTPUT_FORMATTING,
    REMARKS
  ].join("\n\n");

  return ChatPromptTemplate.fromMessages([
    ["system", systemContent],
    ["human", humanContent],
    ["assistant", PREFILL]
  ], {
    templateFormat: "mustache",
    validateTemplate: false
  });
}
