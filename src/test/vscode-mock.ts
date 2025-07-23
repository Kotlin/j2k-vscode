export const window = {
  createOutputChannel: () => ({
    appendLine: () => {},
    show: () => {},
  }),
  showTextDocument: async () => ({}),
  withProgress: async (_opts: any, task: any) => task({ report: () => {} }),
};

export const workspace = {
  getConfiguration: () => ({
    get: (_key: string, def?: any) => def, // always return default
  }),
};

export enum ProgressLocation {
  Notification = 0,
}

export class Position {
  constructor(public line: number, public character: number) {}
}

export type OutputChannel = ReturnType<typeof window.createOutputChannel>;
export type TextEditor = { edit: any; document: { lineCount: number } };
export type ExtensionContext = {
  secrets: { get: (k: string) => Promise<string> };
};