import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function findRepoRoot(startDir: string): string {
  let cur = path.resolve(startDir);
  for (let i = 0; i < 15; i++) {
    if (fs.existsSync(path.join(cur, "prompt", "invariants.txt"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  throw new Error(
    `Could not find repo root. Expected prompt/invariants.txt above: ${startDir}`
  );
}

const repoRoot = findRepoRoot(scriptDir);

const promptDir = path.join(repoRoot, "prompt");
const outDir = path.join(repoRoot, "claude");
const outFile = path.join(outDir, "CLAUDE.md");

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").trim();
}

function maybeRead(relPathFromPrompt: string): string | null {
  const p = path.join(promptDir, relPathFromPrompt);
  if (!fs.existsSync(p)) return null;
  const txt = readText(p);
  return txt.length ? txt : null;
}

function section(title: string, body: string | null): string {
  if (!body) return "";
  return `## ${title}\n\n${body}\n`;
}

function subSection(title: string, body: string | null): string {
  if (!body) return "";
  return `### ${title}\n\n${body}\n`;
}

fs.mkdirSync(outDir, { recursive: true });

// markdown headers to filenames
const mainSections: Array<{ title: string; file: string }> = [
  { title: "System Prompt", file: "system.txt" },
  { title: "Task Description", file: "task_description.txt" },
  { title: "Task Context", file: "task_context.txt" },
  { title: "Conversion Invariants", file: "invariants.txt" },
  { title: "Conversion Process", file: "precognition.txt" },
  { title: "Examples", file: "examples.txt" },
  { title: "Remarks", file: "remarks.txt" },
  { title: "Output Formatting", file: "output_formatting.txt" },
];

const specificFiles: Array<{ title: string; file: string }> = [
  { title: "Spring", file: path.join("specific", "spring.txt") },
  { title: "Hibernate", file: path.join("specific", "hibernate.txt") },
  { title: "Lombok", file: path.join("specific", "lombok.txt") },
];

const parts: string[] = [];

parts.push(`# Claude Code Instructions

This document defines how to perform Java to Kotlin conversions in this repo.
`);

parts.push(`## How to use

- If converting a single file: read the Java source and produce the Kotlin output.
- If converting multiple files: emit each file as its own unit (see Output Formatting).
`);

// main sections
for (const s of mainSections) {
  const body = maybeRead(s.file);
  const rendered = section(s.title, body);
  if (rendered) {
    parts.push(rendered);
  }
}

// framework bodies
const specificBodies = specificFiles
  .map((s) => ({ ...s, body: maybeRead(s.file) }))
  .filter((s) => s.body);

if (specificBodies.length) {
  parts.push(`## Framework specific notes\n`);
  for (const s of specificBodies) {
    parts.push(subSection(s.title, s.body));
  }
}

fs.writeFileSync(outFile, parts.join("\n").replace(/\n{3,}/g, "\n\n"), "utf8");
console.log(`Wrote ${path.relative(repoRoot, outFile)}`);
