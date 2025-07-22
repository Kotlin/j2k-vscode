import * as fs from "fs";
import * as path from "path";
import { distance } from "fastest-levenshtein";

type ConversionPair = {
  name: string,
  generated: string,
  polished: string
};

async function collectConversionPairs(dir = "conversion-logs/v1") {
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

collectConversionPairs().then(pairs => {
  for (const { name, generated, polished } of pairs) {
    const generatedContent = fs.readFileSync(generated, { encoding: "utf-8" });
    const polishedContent = fs.readFileSync(polished, { encoding: "utf-8" });

    // how many characters of the final result were from the user?
    const editsRequired = distance(generatedContent, polishedContent);
    const fraction = (editsRequired / polishedContent.length);
    
    const percent = new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 1,
      minimumFractionDigits: 0
    });

    console.log(`==========
${name} conversion:
${editsRequired} characters changed out of ${polishedContent.length} total
This is ${percent.format(fraction)} of the file, so ${percent.format(1 - fraction)} of the file was valid.`)
  }
});