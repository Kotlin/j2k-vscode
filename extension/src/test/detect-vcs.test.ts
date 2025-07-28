import * as assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { extensions } from "vscode";
import { detectVCS } from "../vcs";
import { GitFileRenamer } from "../vcs/git";
import { StandardFileRenamer } from "../vcs/standard";

interface FakeGitAPI {
  repositories: unknown[];
}

function makeFakeGitExt(sandbox: sinon.SinonSandbox): vscode.Extension<any> {
  const fakeApi: FakeGitAPI = {
    repositories: [{}],
  };

  const fakeExports = {
    enabled: true,
    getAPI: () => fakeApi,
  };

  return {
    exports: fakeExports,
    activate: sandbox.stub().resolves(fakeExports),
  } as any as vscode.Extension<any>;
}

suite("detectVCS()", () => {
  let sandbox: sinon.SinonSandbox;

  setup(() => (sandbox = sinon.createSandbox()));
  teardown(() => sandbox.restore());

  test("returns GitFileRenamer when Git extension and repos present", async () => {
    sandbox
      .stub(extensions, "getExtension")
      .returns(makeFakeGitExt(sandbox) as any);

    const fakeChannel = {
      appendLine: () => {},
    } as any as vscode.OutputChannel;

    const renamer = await detectVCS(fakeChannel);
    assert.ok(renamer instanceof GitFileRenamer);
  });

  test("returns StandardFileRenamer when nothing available", async () => {
    sandbox.stub(extensions, "getExtension").returns(undefined);

    const fakeChannel = {
      appendLine: () => {},
    } as any as vscode.OutputChannel;

    const renamer = await detectVCS(fakeChannel);
    assert.ok(renamer instanceof StandardFileRenamer);
  });
});
