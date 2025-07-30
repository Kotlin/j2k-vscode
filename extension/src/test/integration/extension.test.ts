import * as assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { activate } from "../../extension";

suite("test extension", () => {
  let registerStub: sinon.SinonStub;

  setup(() => {
    registerStub = sinon
      .stub(vscode.commands, "registerCommand")
      .callsFake(() => ({
        dispose() {
          /* no-op duck-typed disposable */
        },
      }));
  });

  teardown(() => {
    registerStub.restore();
  });

  test("registers all command IDs", () => {
    const fakeContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    activate(fakeContext);

    const commandsObserved = registerStub
      .getCalls()
      .map((call) => call.args[0])
      .sort();
    const commandsExpected = [
      "j2k.acceptAndReplaceConversion",
      "j2k.cancelConversion",
      "j2k.convertFile",
    ].sort();

    assert.deepStrictEqual(
      commandsObserved,
      commandsExpected,
      `activate() should register exactly the ${commandsExpected.length} commands ${commandsExpected.join(", ")}`,
    );
  });
});
