import requests, re, pathlib, subprocess
import xml.etree.ElementTree as ET

TASK_CONTEXT = """You are a senior Kotlin engineer and Java-Kotlin JVM interop specialist."""

TASK_DESCRIPTION = """Your task is to convert provided Java code into **idiomatic Kotlin**, preserving behaviour while improving readability, safety and maintainability."""

EXAMPLES = """Some examples are given for you below.

<example>
<java>
package com.acme.util;

import java.time.LocalDate;
import java.util.Objects;

public class DateGreeter {
    public static void greet(String name) {
        String who = (name != null) ? name : "Guest";
        System.out.println("Hello, " + who + " ÔÇö today is " + LocalDate.now());
    }
}
</java>

<convert_think>
1: I'm looking at the Java and noticing a lot, like how the DateGreeter class is implicitly open and how the greet method is static. These would map to the open keyword and companion objects respectively in Kotlin.

<kotlin>
package com.acme.util

import java.time.LocalDate
import java.util.Objects

open class DateGreeter {
    companion object {
        fun greet(name: String?) {
            var who = if (name != null) name else "Guest"
            println("Hello, " + who + " ÔÇö today is " + LocalDate.now())
        }
    }
}
</kotlin>

Invariants check after Step 1
1. No new side-effects/behaviour: OK
2. Annotations/targets: OK (none present)
3. Package/imports preserved: OK
4. Valid Kotlin: OK

2: In my previous conversion, I converted the Java `String` to the Kotlin `String?`, which handles the only instance of nullability in the code. I can tell this is necessary, as within the code the author has explicitly checked for nullability, so clearly the parameter may possibly be null. Additionally, I notice a case where we have a `var` for `who`: this is only read from, so I will change this to `val`.

<kotlin>
package com.acme.util

import java.time.LocalDate
import java.util.Objects

open class DateGreeter {
    companion object {
        fun greet(name: String?) {
            val who = if (name != null) name else "Guest"
            println("Hello, " + who + " ÔÇö today is " + LocalDate.now())
        }
    }
}
</kotlin>

Invariants check after Step 2
1. No new side-effects/behaviour: OK
2. Annotations/targets: OK
3. Package/imports preserved: OK
4. Valid Kotlin: OK

3: I don't notice any collections within this code, so I won't apply any transformations here. The code is the same as from the step before.

<kotlin>
package com.acme.util

import java.time.LocalDate
import java.util.Objects

open class DateGreeter {
    companion object {
        fun greet(name: String?) {
            val who = if (name != null) name else "Guest"
            println("Hello, " + who + " ÔÇö today is " + LocalDate.now())
        }
    }
}
</kotlin>

Invariants check after Step 3
1. No new side-effects/behaviour: OK
2. Annotations/targets: OK
3. Package/imports preserved: OK
4. Valid Kotlin: OK

4: I see that the greet function is not tied with any state of the DateGreeter class. Therefore, I will move this to be a top level function. Additionally, I notice that we are formatting the string conditionally based on nullability, so Kotlin's template literals would provide an idiomatic translation here, as well as the Elvis operator. I don't see anywhere else to apply other transformations, so I will stop here.

<kotlin>
package com.acme.util

import java.time.LocalDate
import java.util.Objects

fun greet(name: String?) {
    println("Hello, ${name ?: "Guest"} ÔÇö today is ${LocalDate.now()}")
}
</kotlin>

Invariants check after Step 4
1. No new side-effects/behaviour: OK
2. Annotations/targets: OK
3. Package/imports preserved: OK
4. Valid Kotlin: OK
</convert_think>

<kotlin>
package com.acme.util

import java.time.LocalDate
import java.util.Objects

fun greet(name: String?) {
    println("Hello, ${name ?: "Guest"} ÔÇö today is ${LocalDate.now()}")
}
</kotlin>
</example>

<example>
<java>
package com.acme.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import javax.annotation.Nullable;
import java.util.Objects;

public class User {
    @JsonProperty("id")
    private final String id;

    @Nullable
    private String nickname;

    public User(String id) {
        this.id = Objects.requireNonNull(id, "id");
    }

    @JsonProperty("id")
    public String getId() {
        return id;
    }

    @Nullable
    public String getNickname() {
        return nickname;
    }

    public void setNickname(@Nullable String nickname) {
        this.nickname = nickname;
    }
}
</java>

<convert_think>
1: My first objective is strict faithfulness to the Java semantics and structure while producing valid Kotlin. I will carry forward the package and all imports verbatim as required. The Java class is implicitly open, so I'll make it `open class User` to preserve that extensibility characteristic.

The Java code has:
- A field annotation `@JsonProperty("id")` applied directly to the field `id`. In Kotlin, when turning fields into properties or fields, annotation use-site targets matter. To target the backing field exactly as Java did, I must use `@field:JsonProperty("id")` on the Kotlin declaration that represents the field.
- A getter annotation `@JsonProperty("id")` on `getId()`. In Kotlin, when I keep explicit accessor methods in a 1:1 translation, I can annotate the function directly with `@get:JsonProperty("id")` if I convert to a property later. For a faithful step with methods, I'll keep an explicit function and annotate it appropriately so the semantic target matches the Java getter.
- A nullable field `nickname` with `@Nullable` on the field. That maps to a Kotlin nullable type `String?`, and I must use `@field:Nullable` to target the field exactly. There is also a `@Nullable` on the getter's return in Java; in Kotlin for a method, I can annotate the function (or later, if it's a property, I'll use `@get:Nullable`).
- The constructor enforces non-null for `id` using `Objects.requireNonNull`. For a literal 1:1 step, I'll keep that call as-is to preserve exact behaviour and exception text.

I will keep explicit getters and setters (rather than properties) in this step to avoid any behavioural or reflective API change. This adheres to ÔÇ£no new side-effects or behaviourÔÇØ and maintains method shapes exactly.

<kotlin>
package com.acme.model

import com.fasterxml.jackson.annotation.JsonProperty
import javax.annotation.Nullable
import java.util.Objects

open class User {

    @field:JsonProperty("id")
    private val id: String

    @field:Nullable
    private var nickname: String? = null

    constructor(id: String) {
        this.id = Objects.requireNonNull(id, "id")
    }

    @get:JsonProperty("id")
    fun getId(): String {
        return id
    }

    @Nullable
    fun getNickname(): String? {
        return nickname
    }

    fun setNickname(@Nullable nickname: String?) {
        this.nickname = nickname
    }
}
</kotlin>

Invariants check after Step 1
1. No new side-effects/behaviour: OK
2. Annotations/targets preserved exactly: OK
3. Package/imports preserved: OK
4. Valid Kotlin: OK

2: Now I evaluate where Kotlin's nullability and mutability guarantees can be expressed without altering behaviour. In Java, `id` is non-null by design: the constructor enforces this via `Objects.requireNonNull`. That means it is safe for `id` to be a non-null `String` in Kotlin, which is already the case in Step 1; importantly, I do not remove the `requireNonNull` call yet, because Step 2 is an audit rather than a structural change. This maintains the exact runtime check and message.

For `nickname`, Java uses `@Nullable` consistently (field and getter), indicating that `nickname` may be absent. In Kotlin, I have represented it as `String?` already, which matches the Java semantics perfectly. The setter parameter is also marked `@Nullable`, so in Kotlin I keep the parameter type `String?` and retain the parameter annotation to preserve reflection/bytecode-level metadata.

There are no temporary variables here, so no `val` vs `var` refinements to perform beyond what exists on the fields themselves (`id` is immutable; `nickname` is mutable), which mirrors the Java intent.

<kotlin>
package com.acme.model

import com.fasterxml.jackson.annotation.JsonProperty
import javax.annotation.Nullable
import java.util.Objects

open class User {

    @field:JsonProperty("id")
    private val id: String

    @field:Nullable
    private var nickname: String? = null

    constructor(id: String) {
        this.id = Objects.requireNonNull(id, "id")
    }

    @get:JsonProperty("id")
    fun getId(): String {
        return id
    }

    @Nullable
    fun getNickname(): String? {
        return nickname
    }

    fun setNickname(@Nullable nickname: String?) {
        this.nickname = nickname
    }
}
</kotlin>

Invariants check after Step 2
1. No new side-effects/behaviour: OK
2. Annotations/targets preserved: OK
3. Package/imports preserved: OK
4. Valid Kotlin: OK

3: This code doesn't use Java collection types or other Java-specific containers, so there is nothing to migrate to Kotlin collection interfaces.

<kotlin>
package com.acme.model

import com.fasterxml.jackson.annotation.JsonProperty
import javax.annotation.Nullable
import java.util.Objects

open class User {

    @field:JsonProperty("id")
    private val id: String

    @field:Nullable
    private var nickname: String? = null

    constructor(id: String) {
        this.id = Objects.requireNonNull(id, "id")
    }

    @get:JsonProperty("id")
    fun getId(): String {
        return id
    }

    @Nullable
    fun getNickname(): String? {
        return nickname
    }

    fun setNickname(@Nullable nickname: String?) {
        this.nickname = nickname
    }
}
</kotlin>

Invariants check after Step 3
1. No new side-effects/behaviour: OK
2. Annotations/targets preserved: OK
3. Package/imports preserved: OK
4. Valid Kotlin: OK

4: Now I can safely introduce idiomatic Kotlin without changing behaviour. The key improvements are:

1) Primary constructor with a property: In Java, `id` is assigned in the constructor and never changes. Kotlin's primary constructor can declare it as a `val` property immediately. Because Java had both field and getter annotations for `id`, I need to apply both on the Kotlin property, with `@field:JsonProperty("id")` and `@get:JsonProperty("id")`, ensuring reflection/serialization targets remain identical. Since we have already reasoned that `id` is non-null by design and enforced earlier, I can drop `Objects.requireNonNull` when moving to idiomatic Kotlin ÔÇö the type system now encodes non-nullness, and removing the call does not alter externally observable behaviour (a null passed at call site would be a type error from Kotlin; from Java callers, passing null would result in a NullPointerException when the Kotlin code dereferences, which is observationally equivalent to the previous constructor NPE for practical scenarios). Nevertheless, to respect the ÔÇ£no new behaviourÔÇØ invariant strictly, the rest of the class's externally visible API remains the same (i.e., same fields' mutability, same nullable semantics).

2) Property for `nickname`: Java exposes a nullable field with a getter and setter. In idiomatic Kotlin, I can make `nickname` a mutable property `var nickname: String? = null`. To preserve the field-targeted and getter-targeted annotations that existed (field had `@Nullable`; getter returned `@Nullable`), I apply both: `@field:Nullable` and `@get:Nullable`. This maintains identical annotation targets for frameworks that inspect either the field or the accessor.

3) Preserve package/imports: I will keep all existing imports, including `java.util.Objects`, even though it is now unused, because the invariant tells me to carry forward imports unless they would shadow Kotlin names ÔÇö which does not apply here.

No changes are made to method names or signatures that could break consumers; I simply switch to property syntax which compiles down to compatible accessors by default, preserving behaviour and tooling expectations.
<kotlin>
package com.acme.model

import com.fasterxml.jackson.annotation.JsonProperty
import javax.annotation.Nullable
import java.util.Objects

open class User(
    @field:JsonProperty("id")
    @get:JsonProperty("id")
    val id: String
) {
    @field:Nullable
    @get:Nullable
    var nickname: String? = null
}
</kotlin>

Invariants check after Step 4
1. No new side-effects/behaviour: OK
2. Annotations/targets preserved exactly: OK
3. Package/imports preserved: OK
4. Valid Kotlin: OK
</convert_think>

<kotlin>
package com.acme.model

import com.fasterxml.jackson.annotation.JsonProperty
import javax.annotation.Nullable
import java.util.Objects

open class User(
    @field:JsonProperty("id")
    @get:JsonProperty("id")
    val id: String
) {
    @field:Nullable
    @get:Nullable
    var nickname: String? = null
}
</kotlin>
</example>
"""

PRECOGNITION = """Before emitting any code, run through the provided Java input and perform these 4 steps of thinking, wrapped in <convert_think> tags.
After each step of thinking, output the code as you have it in <kotlin> tags after the step's transformation has been applied.

<step>
  1: Convert the Java code 1 to 1 into Kotlin, prioritising faithfulness to the original Java semantics, to replicate the Java code's functionality and logic exactly.

  <rule>
    Java classes that are implicitly open MUST be converted as Kotlin classes that are explicitly open, using the `open` keyword.
  </rule>
  <rule>
    To convert Java constructors that inject into fields, use the Kotlin primary constructor. Any further logic within the Java constructor can be replicated with the Kotlin secondary constructor.
  </rule>
</step>

<step>
  2: Check that mutability and nullability are correctly expressed in your Kotlin conversion. Only express types as non-null where you are sure that it can never be null, inferred from the original Java. Use `val` instead of `var` where you see variables that are never modified.

  <rule>
    If you see a logical assertion that a value is not null, this shows that the author has considered that the value can never be null. Use a non-null type in this case, and remove the logical assertion.
  </rule>
  <rule>
    In all other cases, preserve the fact that types can be null in Java by using the Kotlin nullable version of that type.
  </rule>
</step>

<step>
  3: Convert datatypes like collections from their Java variants to the Kotlin variants.

  <rule>
    For Java collections like `List` that are mutable by default, always use the Kotlin `MutableList`, unless you see explicitly that the Java code uses an immutable wrapper - in this case, use the Kotlin `List` (and so on for other collections like `Set`, `Map` etc.)
  </rule>
</step>

<step>
  4: Introduce syntactic transformations to make the output truly idiomatic.

  <rule>
    Where getters and setters are defined as methods in Java, use the Kotlin syntax to replace these methods with a more idiomatic version.
  </rule>
  <rule>
    Lambdas should be used where they can simplify code complexity while replicating the exact behaviour of the previous code.
  </rule>
</step>"""

INVARIANTS = """In each stage of your chain of thought, the following invariants must hold.

<invariant>
  1: No new side-effects or behaviour.
</invariant>
<invariant>
  2: Preserve all annotations and targets exactly.

  <rule>
    Annotations must target the backing field in Kotlin where they targeted the field in Java.
  </rule>
</invariant>
<invariant>
  3: Preserve the package declaration and all imports.

  <rule>
    Carry forwards every single import, adding no new imports. Only remove imports where they would shadow Kotlin names <example>java.util.List shadows Kotlin's List</example>
  </rule>
</invariant>
<invariant>
  4: Ensure the output result is in Kotlin.

  <rule>
    The emitted code must be syntactically valid Kotlin.
  </rule>
</invariant>

After each stage, after the updated conversion code has been emitted, go through each of these invariants, listing the ones that no longer hold after this step. If any exist, revert to the previous step and recalculate the current step from the top."""

OUTPUT_FORMATTING = """Wrap your final conversion result in <kotlin> tags."""

REMARKS = """Ensure the final Kotlin output would compile and run identically to the Java input."""

PREFILL = """<convert_think>\n"""

#    0: preconditions
# i)  Kotlin is configured
# ii) we run this in the working directory of the project

#    1: get all java files in the current directory

def get_java_files(directory="."):
  return list(pathlib.Path(directory).rglob("*.java"))

#    2: define convert to kotlin function

def _get_prompt(java_code):
  PROMPT = ""

  INPUT_DATA = f"""The Java code to convert is:
<java>
{java_code}
</java>"""

  if TASK_CONTEXT:
    PROMPT += f"""{TASK_CONTEXT}"""

  if TASK_DESCRIPTION:
    PROMPT += f"""\n\n{TASK_DESCRIPTION}"""

  if EXAMPLES:
    PROMPT += f"""\n\n{EXAMPLES}"""

  if INPUT_DATA:
    PROMPT += f"""\n\n{INPUT_DATA}"""

  if INVARIANTS:
    PROMPT += f"""\n\n{INVARIANTS}"""

  if PRECOGNITION:
    PROMPT += f"""\n\n{PRECOGNITION}"""

  if OUTPUT_FORMATTING:
    PROMPT += f"""\n\n{OUTPUT_FORMATTING}"""

  if REMARKS:
    PROMPT += f"""\n\n{REMARKS}"""

  return PROMPT

def _get_last_kotlin_text(string):
  matches = list(re.finditer(r"<kotlin>(.*?)</kotlin>", string, re.DOTALL))
  if not matches:
    raise Exception()

  return matches[-1].group(1).strip()

def convert(java_code):
  OLLAMA_URL = "http://localhost:11434/api/chat"
  MODEL = "deepseek-r1:8b"

  messages = [
    {
        "role": "system",
        "content": (
            "You are a senior Kotlin engineer and Java-Kotlin JVM interop specialist. "
            "Follow the four-step conversion (<convert_think>) and output final code in <kotlin> tags. "
            "Preserve behavior and API, prefer idiomatic Kotlin when safe."
        )
    },
    { "role": "user", "content": _get_prompt(java_code) },
    { "role": "assistant", "content": PREFILL }
  ]

  payload = {
    "model": MODEL,
    "messages": messages,
    "options": {
        "temperature": 0,
        "num_ctx": 8192 * 2,
    },
    "stream": False
  }

  resp = requests.post(OLLAMA_URL, json=payload, timeout=600)
  resp.raise_for_status()
  data = resp.json()

  output = data["message"]["content"]
  return _get_last_kotlin_text(output)

#    3: define result function to score by compilation and then tests

def get_score(base=0) -> float:
  """
  return normalised score of percentage of tests passing, truncated to `base` if no compilation (default=0)
  """
  empty = {
    "tests": 0,
    "skipped": 0,
    "failures": 0,
    "errors": 0,
    "runnable": 0,
    "passed": 0,
  }

  try:
    subprocess.run(["./gradlew", "clean"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  except:
    return float(base), empty

  subprocess.run(
    ["./gradlew", "test", "--no-daemon", "--continue", "--rerun-tasks"],
    check=False,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    timeout=1800
  )

  report_glob_patterns = [
    "**/build/test-results/test/*.xml",
    "**/build/test-results/*Test/*.xml",
    "**/build/test-results/*/*.xml",
  ]
  xml_files = []

  for pattern in report_glob_patterns:
    xml_files.extend(pathlib.Path(".").glob(pattern))

  xml_files = list(set(xml_files)) # de-dupe

  total_tests = 0
  total_fails = 0
  total_errs = 0
  total_skips = 0

  for xml_path in xml_files:
    try:
      tree = ET.parse(xml_path)
      root = tree.getroot()
      suites = []

      if root.tag.lower().endswith("testsuite"):
        suites = [root]
      else:
        suites = [n for n in root.findall(".//testsuite")]

      for suite in suites:
        total_tests += int(suite.attrib.get("tests", "0"))
        total_fails += int(suite.attrib.get("failures", "0"))
        total_errs += int(suite.attrib.get("errors", "0"))
        total_skips += int(suite.attrib.get("skipped", suite.attrib.get("ignored", "0")))
    except:
      continue
  
  runnable = total_tests - total_skips
  if runnable <= 0:
    return float(base), empty
  
  passed = runnable - (total_fails + total_errs)
  score = max(0.0, min(1.0, passed / runnable))

  summary = {
    "tests": total_tests,
    "skipped": total_skips,
    "failures": total_fails,
    "errors": total_errs,
    "runnable": runnable,
    "passed": passed,
  }
  return score, summary

#    4: iterate through java files, converting to kotlin, scoring and then restoring

log_dir = pathlib.Path("logs")
log_dir.mkdir(exist_ok=True)

already_checked = []
scores_path = "scores.txt"
scores_path_obj = pathlib.Path(scores_path)

if scores_path_obj.exists():
  with scores_path_obj.open("r") as f:
    already_checked = [line.split(" ")[0][:-1] for line in f.readlines()]

for file in get_java_files("src/"):
  if "test" not in str(file).lower():
    if file.name in already_checked:
      continue

    # convert file to kotlin
    java_code = file.read_text()
    file.unlink()

    kotlin_path = file.with_suffix(".kt")

    try:
      conversion_output = convert(java_code)
      kotlin_path.write_text(conversion_output)

      print(f"{file.name}: ", end="")

      score, summary = get_score()

      print(f"{file.name}: score={score} (ran {summary['runnable']} tests, {summary['passed']} passing)")

      (log_dir/file.name).write_text(java_code)
      (log_dir/kotlin_path.name).write_text(conversion_output)

      with open(scores_path, "a") as f:
        f.write(f"{file.name}: score={score} (ran {summary['runnable']} tests, {summary['passed']} passing)\n")

      pass
    finally:
      # clean up
      file.write_text(java_code)

      if kotlin_path.exists():
        kotlin_path.unlink()
