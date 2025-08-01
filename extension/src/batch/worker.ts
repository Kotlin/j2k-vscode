import * as vscode from "vscode";
import { Queue, Job } from "./queue";
import { MemoryContentProvider } from "./memory";
import { convertToKotlin } from "../converter";

// for future prompts
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

// for current prompt
function extractKotlinOld(text: string) {
  const tagPosition = text.indexOf("<<START_J2K>>\n");

  if (tagPosition === -1) {
    return text;
  }
  
  return text.slice(tagPosition + "<<START_J2K>>\n".length);
}

export interface CompletedJob {
  job: Job;
  resultUri: vscode.Uri;
  kotlinText: string;
  error: boolean;
}

export class Worker {
  private busy = false;
  current?: Job;
  completed: CompletedJob[] = [];
  private onChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this.onChange.event;

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

    this.busy = true;

    const job = this.queue.dequeue();
    if (!job) {
      this.busy = false;
      return;
    }

    if (job.status !== "queued") {
      this.busy = false;
      return;
    }

    job.status = "running";

    this.current = job;
    this.onChange.fire();

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

      const extracted = extractKotlinOld(buf);
      this.mem.set(resultUri, extracted);
      this.mem.clear(job.progressUri);

      this.completed.push({
        job: job,
        resultUri,
        kotlinText: extracted,
        error: false,
      });
    } catch (e: any) {
      this.completed.push({
        job: job,
        resultUri: job.progressUri,
        kotlinText: String(e?.message ?? e),
        error: true,
      });

      this.out.appendLine(`Error converting ${job.javaUri.fsPath}: ${String(e?.message ?? e)}`);
    } finally {
      this.current = undefined;
      this.busy = false;

      this.onChange.fire();

      this.maybeStart();
    }
  }

  removeCompleted(result: vscode.Uri) {
    const i = this.completed.findIndex(c => c.resultUri.fsPath === result.fsPath);

    if (i >= 0) {
      this.completed.splice(i,1);
      this.onChange.fire();
    }
  }
}