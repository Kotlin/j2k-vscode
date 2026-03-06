import { ChatPromptTemplate } from "@langchain/core/prompts";

import { EXAMPLES } from "./examples";
import { PRECOGNITION } from "./precognition";
import { INVARIANTS } from "./invariants";
import { SPRING_PROMPT } from "./specific/spring";
import { HIBERNATE_PROMPT } from "./specific/hibernate";
import { LOMBOK_PROMPT } from "./specific/lombok";

import taskContext from "../../../../prompt/task_context.txt";
import taskDescription from "../../../../prompt/task_description.txt";
import outputFormatting from "../../../../prompt/output_formatting.txt";
import remarks from "../../../../prompt/remarks.txt";
import system from "../../../../prompt/system.txt";

const TASK_CONTEXT = taskContext;

const TASK_DESCRIPTION = taskDescription;

const OUTPUT_FORMATTING = outputFormatting;

const REMARKS = remarks;

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

  const systemContent = system;

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
