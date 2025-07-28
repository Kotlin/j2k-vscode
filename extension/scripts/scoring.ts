import * as fs from "fs";
import * as path from "path";
import { distance } from "fastest-levenshtein";

type ConversionPair = {
  name: string,
  generated: string,
  polished: string
};

type SummaryEntry = {
  name: string,
  edits: string,
  valid: string
};

const ITERATION = 1
const DIRECTORY = `conversion-logs/v${ITERATION}`

async function collectConversionPairs(dir = DIRECTORY) {
  const pairs = new Map<string, Partial<ConversionPair>>();

  for (const file of await fs.promises.readdir(dir)) {
    if (!file.endsWith(".kt")) {
      continue;
    }

    const match = file.match(/^(.*?)_(generated|polished)\.kt$/);
    if (!match) {
      continue;
    }

    const [, name, type] = match;
    const entry = pairs.get(name) ?? { name };
    entry[type as "generated" | "polished"] = path.join(dir, file);

    pairs.set(name, entry);
  }

  return Array.from(pairs.values()).filter(
    (p): p is ConversionPair => !!p.generated && !!p.polished
  );
}

function stripTimestampHeader(text: string, headerLines = 2): string {
  return text.split(/\r?\n/).slice(headerLines).join("\n");
}

collectConversionPairs().then(pairs => {
  // clear the file
  fs.writeFileSync(DIRECTORY + "/results.txt", "", { encoding: "utf-8", flag: "w" });

  const rows: SummaryEntry[] = [];

  for (const { name, generated, polished } of pairs) {
    const generatedContent = stripTimestampHeader(fs.readFileSync(generated, { encoding: "utf-8" }));
    const polishedContent = stripTimestampHeader(fs.readFileSync(polished, { encoding: "utf-8" }));

    // how many characters of the final result were from the user?
    const editsRequired = distance(generatedContent, polishedContent);
    const fraction = (editsRequired / polishedContent.length);
    
    const percent = new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 1,
      minimumFractionDigits: 0
    });

    const summary = `==========
${name} conversion:
${editsRequired} characters changed out of ${polishedContent.length} total
This is ${percent.format(fraction)} of the file, so ${percent.format(1 - fraction)} of the file was valid.`;
    console.log(summary);

    fs.appendFileSync(DIRECTORY + "/results.txt", summary + "\n", { encoding: "utf-8", flag: "a" });

    rows.push({
      name: name,
      edits: editsRequired.toString(),
      valid: percent.format(1 - fraction)
    });
  }

  console.log("==========")
  fs.appendFileSync(DIRECTORY + "/results.txt", "==========" + "\n\n\n", { encoding: "utf-8", flag: "a" });

  fs.appendFileSync(DIRECTORY + "/results.txt", "==========\nResults summary:\n==========" + "\n\n", { encoding: "utf-8", flag: "a" });

  // add line by line summary
  const header: SummaryEntry = {
    name: "File",
    edits: "Chars Changed",
    valid: "Validity"
  };

  const nameWidth = Math.max(header.name.length, ...rows.map(r => r.name.length)) + 2;
  const editsWidth = Math.max(header.edits.length, ...rows.map(r => r.edits.length)) + 2;
  const validityWidth = Math.max(header.valid.length, ...rows.map(r => r.valid.length)) + 2;

  // sort in descending order of validity
  rows.sort((left, right) => +right.valid.slice(0, -1) - +left.valid.slice(0, -1));

  fs.appendFileSync(DIRECTORY + "/results.txt", `${header.name.padEnd(nameWidth)} | ${header.edits.padEnd(editsWidth)} | ${header.valid.padEnd(validityWidth)}` + "\n", { encoding: "utf-8", flag: "a" });
  fs.appendFileSync(DIRECTORY + "/results.txt", "-".repeat(nameWidth + 1) + "+" + "-".repeat(editsWidth + 2) + "+" + "-".repeat(validityWidth + 1) + "\n", { encoding: "utf-8", flag: "a" });

  for (const row of rows) {
    fs.appendFileSync(DIRECTORY + "/results.txt", `${row.name.padEnd(nameWidth)} | ${row.edits.padEnd(editsWidth)} | ${row.valid.padEnd(validityWidth)}` + "\n", { encoding: "utf-8", flag: "a" });
  }
});