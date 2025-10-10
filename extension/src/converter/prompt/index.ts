import { ChatPromptTemplate } from "@langchain/core/prompts";

import { EXAMPLES } from "./examples";
import { PRECOGNITION } from "./precognition";
import { INVARIANTS } from "./invariants";
import { SPRING_PROMPT } from "./specific/spring";
import { HIBERNATE_PROMPT } from "./specific/hibernate";
import { LOMBOK_PROMPT } from "./specific/lombok";

const TASK_CONTEXT = `You are a senior Kotlin engineer and Java-Kotlin JVM interop specialist.`;

const TASK_DESCRIPTION = `Your task is to convert provided Java code into **idiomatic Kotlin**, preserving behaviour while improving readability, safety and maintainability.`;

const OUTPUT_FORMATTING = `Wrap your final conversion result in <kotlin> tags.`;

const REMARKS =
  "Ensure the final Kotlin output would compile and run identically to the Java input.";

const PREFILL = `<convert_think>\n`;

export function getPrompt(
  javaCode: string,
  technologiesUsed: {
    spring: boolean;
    lombok: boolean;
    hibernate: boolean;
  } = {
    spring: false,
    lombok: false,
    hibernate: false,
  },
) {
  const INPUT_DATA = `The Java code to convert is:
<java>
${javaCode}
</java>`;

  const systemContent = [
    "You are a senior Kotlin engineer and Java-Kotlin JVM interop specialist. ",
    "Follow the four-step conversion (<convert_think>) and output final code in <kotlin> tags. ",
    "Preserve behavior and API, prefer idiomatic Kotlin when safe.",
  ].join("");

  const humanContentFirstPart = [
    TASK_CONTEXT,
    TASK_DESCRIPTION,
    EXAMPLES,
    INPUT_DATA,
  ];

  const specificTechnologies: string[] = [];

  if (technologiesUsed.spring) {
    specificTechnologies.push(SPRING_PROMPT);
  }

  if (technologiesUsed.hibernate) {
    specificTechnologies.push(HIBERNATE_PROMPT);
  }

  if (technologiesUsed.lombok) {
    specificTechnologies.push(LOMBOK_PROMPT);
  }

  const humanContentLastPart = [
    INVARIANTS,
    PRECOGNITION,
    OUTPUT_FORMATTING,
    REMARKS,
  ].join("\n\n");

  const humanContent = [
    ...humanContentFirstPart,
    ...specificTechnologies,
    ...humanContentLastPart,
  ].join("\n\n");

  return ChatPromptTemplate.fromMessages(
    [
      { role: "system", content: systemContent },
      { role: "human", content: humanContent },
      { role: "assistant", content: PREFILL },
    ],
    {
      templateFormat: "mustache",
      validateTemplate: false,
    },
  );
}
