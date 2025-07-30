import * as assert from "assert";
import * as vscode from "vscode";
import { execSync } from "child_process";

import { convertToKotlin } from "../../converter";

function fakeOutput(): vscode.OutputChannel {
  const log: string[] = [];
  return {
    appendLine: (s: string) => log.push(s),
    name: "J2K‑Test",
    dispose() {},
    clear() {},
    show() {},
    hide() {},
    replace() {},
  } as unknown as vscode.OutputChannel;
}

function fakeEditor(): {
  editor: vscode.TextEditor;
  content(): string;
} {
  let buf = "";
  const ed = {
    document: { lineCount: 0 } as unknown as vscode.TextDocument,
    async edit(cb: (eb: { insert: any }) => void) {
      cb({
        insert: (_pos: vscode.Position, txt: string) => {
          buf += txt;
        },
      });
      return true;
    },
  } as unknown as vscode.TextEditor;
  return { editor: ed, content: () => buf };
}

const stubCtx = {
  secrets: {
    get: async () => "", // no api key needed
    store: async () => undefined,
    delete: async () => undefined,
  },
} as unknown as vscode.ExtensionContext;

async function runConversion(java: string): Promise<string> {
  const { editor } = fakeEditor();
  return await convertToKotlin(java, fakeOutput(), stubCtx, editor);
}

suite("LLM testsuite", function () {
  this.timeout(90000); // 90s timeout per test

  // 1: Loses imports / uses the wrong imports
  test("imports surviving the conversion", async () => {
    // TODO: find a better example to test against
    const java = `
      import org.springframework.beans.factory.annotation.Autowired;
      public class Foo { @Autowired Bar bar; }
    `;
    const kotlin = await runConversion(java);

    assert.match(
      kotlin,
      /import\s+org\.springframework\.beans\.factory\.annotation\.Autowired/,
      "Spring @Autowired import disappeared or was mangled"
    );
  });

  // 2: Uses data classes where not required, which overcomplicates things.
  test("doesn't introduce unnecessary data class", async () => {
    // TODO: find a better example to test against
    const java = `
      public class PlainPojo {
        private int id;
        private String name;
      }
    `;
    const kotlin = await runConversion(java);
    assert.ok(
      !/\bdata\s+class\b/.test(kotlin),
      "`data class` keyword should be absent"
    );
  });

  // 3: Classes declared are final where not explicitly marked in Java as such
  test("converts non-final classes as open", async () => {
    const java = "public class Sample {}";
    const kotlin = await runConversion(java);
    assert.ok(/\bopen\b/.test(kotlin));
  });

  // 4: ensure result is in kotlin
  test("generics converted; no raw List<T> semicolons", async () => {
    const java = `
      public interface OwnerRepository {
        java.util.List<Owner> findAll();
      }
    `;
    const kotlin = await runConversion(java);
    assert.ok(!/List<Owner>;\s*$/.test(kotlin), "Still looks like Java");
  });

  // 5: Sometimes generates closing remarks along with a random tag to close e.g. [/START_J2K] which is not real syntax specified within the prompt
  test("ensure output is only code", async () => {
    // TODO: find a better example to test against
    const kotlin = await runConversion(
      `public class Hello { public static void main(String[] a){} }`
    );
    assert.ok(!/START_J2K/.test(kotlin));
    assert.ok(!/<\/?code>/i.test(kotlin));
  });

  // 6: Mixes up Java and Kotlin collections in regards to mutability
  test("preserves mutability", async () => {
    const java = `
      import java.util.List;
      public class Owner { private List<Pet> pets; }
    `;
    const kotlin = await runConversion(java);
    assert.match(kotlin, /\bMutableList<.*Pet.*>/);
  });

  // 7: Generates getters/setters when already auto-implemented by properties
  test("avoid redundant getters/setters", async () => {
    const java = `
      public class Person {
        private String firstName;
        public String getFirstName() { return firstName; }
      }
    `;
    const kotlin = await runConversion(java);
    assert.ok(!/fun\s+getFirstName\s*\(/.test(kotlin));
  });

  // 8: Hallucinates nonexistent Kotlin functions that exist in java (e.g. equalsIgnoreCase)
  test("no java exclusive functions", async () => {
    const java = `
      public class StringUtilsDemo {
        boolean same(String a, String b){ return a.equalsIgnoreCase(b); }
      }
    `;
    const kotlin = await runConversion(java);
    assert.ok(!/equalsIgnoreCase/.test(kotlin));
  });
});
