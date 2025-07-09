import * as assert from 'assert';
import { convertToKotlin } from '../converter';

suite("convertToKotlin()", () => {
  const javaHelloWorld = `public class Hello {
  public static void main(String[] args) {
    System.out.println("Hello World");
  }
}`;

  test("returns non-empty Kotlin snippet", () => {
    const kotlin = convertToKotlin(javaHelloWorld);

    assert.ok(kotlin.length > 0, "result should not be empty");
    // more tests when convertToKotlin isn't purely stubbed out
  });
});
