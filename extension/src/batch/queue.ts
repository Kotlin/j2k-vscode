import * as vscode from "vscode";

export type Status = "queued" | "running" | "done" | "error";

export interface Job {
  id: string;
  javaUri: vscode.Uri; // input
  progressUri: vscode.Uri; // stream target: j2k-progress,
  status: Status;
}

export class Queue {
  private queued: Job[] = [];
  private eventEmitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.eventEmitter.event;

  enqueue(uri: vscode.Uri) {
    this.queued.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      javaUri: uri,
      progressUri: vscode.Uri.parse(
        `j2k-progress:${uri.fsPath.replace(/\.java$/i, ".kt")}`,
      ),
      status: "queued" as const,
    });

    this.eventEmitter.fire();
  }

  dequeue(): Job | undefined {
    const job = this.queued.shift();
    if (job) {
      this.eventEmitter.fire();
    }

    return job;
  }

  peek(): Job | undefined {
    return this.queued[0];
  }

  toArray(): ReadonlyArray<Job> {
    return this.queued;
  }
}
