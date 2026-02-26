import * as vscode from "vscode";
import { Queue, Job } from "./queue";
import { MemoryContentProvider } from "./memory";
import { convertToKotlin, extractLastKotlinBlock } from "../converter";
import path from "path";
import { TelemetryReporter } from "@vscode/extension-telemetry";

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
  accepted: { uri: vscode.Uri }[] = [];
  private onChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this.onChange.event;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly queue: Queue,
    private readonly mem: MemoryContentProvider,
    private readonly out: vscode.OutputChannel,
    private readonly reporter: TelemetryReporter,
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

    this.out.appendLine(
      `Worker: Started converting ${path.basename(job.javaUri.fsPath)}`,
    );
    const t0 = Date.now();

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
        },
        reporter,
      );

      if (this.current !== job) {
        return;
      }

      const resultUri = vscode.Uri.parse(
        `j2k-result:${job.javaUri.fsPath.replace(/\.java$/i, ".kt")}`,
      );

      const extracted = extractLastKotlinBlock(buf);
      this.mem.set(resultUri, extracted);
      this.mem.clear(job.progressUri);

      this.completed.push({
        job: job,
        resultUri,
        kotlinText: extracted,
        error: false,
      });
      this.out.appendLine(
        `Worker: Finished converting ${path.basename(job.javaUri.fsPath)} in ${Date.now() - t0} milliseconds`,
      );
    } catch (e: any) {
      this.completed.push({
        job: job,
        resultUri: job.progressUri,
        kotlinText: String(e?.message ?? e),
        error: true,
      });

      this.out.appendLine(
        `Error converting ${job.javaUri.fsPath}: ${String(e?.message ?? e)}`,
      );
    } finally {
      this.current = undefined;
      this.busy = false;

      this.onChange.fire();

      this.maybeStart();
    }
  }

  acceptCompleted(javaUri: vscode.Uri, kotlinUri: vscode.Uri) {
    const completedIdx = this.completed.findIndex(
      (completedJob) => completedJob.job.javaUri.fsPath === javaUri.fsPath,
    );
    if (completedIdx >= 0) {
      // remove from completed
      this.completed.splice(completedIdx, 1);
    }

    this.accepted.push({ uri: kotlinUri });
    this.onChange.fire();
  }

  clearAllViews(queue: Queue) {
    queue.clear();
    this.completed = [];
    this.accepted = [];
    this.current = undefined;
    this.onChange.fire();
  }

  removeCompleted(result: vscode.Uri) {
    const i = this.completed.findIndex(
      (c) =>
        c.resultUri.fsPath === result.fsPath ||
        c.job.javaUri.fsPath === result.fsPath,
    );

    if (i >= 0) {
      this.completed.splice(i, 1);
      this.onChange.fire();
      this.out.appendLine(
        `Worker: Removed completed file ${path.basename(result.fsPath)}`,
      );
    }
  }

  restoreAccepted(uris: vscode.Uri[]) {
    this.accepted = uris.map((uri) => ({ uri }));
    this.onChange.fire();
  }
}
