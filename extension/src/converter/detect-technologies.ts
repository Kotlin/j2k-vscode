import { text } from "stream/consumers";
import * as vscode from "vscode";

export function detectTechnologies(code: string) {
  const technologiesUsed = {
    spring: false,
    lombok: false,
    hibernate: false,
  };

  // detect for imports in order to determine whether
  // a technology is being used within the code or not

  for (const line of code.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("import org.springframework.")) {
      technologiesUsed.spring = true;
    }

    if (trimmedLine.startsWith("import org.hibernate.")) {
      technologiesUsed.hibernate = true;
    }

    if (trimmedLine.startsWith("import lombok.")) {
      technologiesUsed.lombok = true;
    }
  }

  return technologiesUsed;
}
