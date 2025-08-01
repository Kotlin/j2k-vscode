import * as vscode from "vscode";
import { Queue, Job } from "./queue";
import { MemoryContentProvider } from "./memory";
import { convertToKotlin } from "../converter";

function extractKotlin(text: string) {
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

export interface CompletedJob {
  job: Job;
  resultUri: vscode.Uri;
  kotlinText: string;
}

export class Worker {
  private busy = false;
  current?: Job;
  completed: CompletedJob[] = [];
  private changed = new vscode.EventEmitter<void>();
  readonly onDidChange = this.changed.event;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly queue: Queue,
    private readonly mem: MemoryContentProvider,
    private readonly out: vscode.OutputChannel
  ) {
    queue.onDidChange(() => this.maybeStart());
  }

  start() {
    this.maybeStart();
  }

  stop() {
    // no op for now
  }

  // called on every event, must validate
  private async maybeStart() {
    if (this.busy) {
      return;
    }

    const job = this.queue.dequeue()
    if (!job) {
      return;
    }

    if (job.status !== "queued") {
      return;
    }

    this.busy = true;
    this.current = job;
    this.changed.fire();

    try {
      const java = await vscode.workspace.openTextDocument(job.javaUri);
      let buf = "";

      await convertToKotlin(
        java.getText(),
        this.out,
        this.context,
        async (token) => {
          buf += token;
          this.mem.set(job.progressUri, buf);
        }
      );

      const resultUri = vscode.Uri.parse(
        `j2k-result:${job.javaUri.fsPath.replace(/\.java$/i, ".kt")}`
      );
      this.mem.set(resultUri, buf);
      this.mem.clear(job.progressUri);

      this.completed.push({
        job: job,
        resultUri,
        kotlinText: extractKotlin(buf),
      });
    } catch (e: any) {
      this.completed.push({
        job: job,
        resultUri: job.progressUri,
        kotlinText: String(e?.message ?? e),
      });

      this.out.appendLine(`Error converting ${job.javaUri.fsPath}: ${String(e?.message ?? e)}`);
    } finally {
      this.current = undefined;
      this.busy = false;

      this.changed.fire();

      this.maybeStart();
    }
  }
}