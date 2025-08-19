import re
from tree_sitter_languages import get_parser
import requests

PARSER = get_parser("java")
TYPE_NODES = {"class_declaration","interface_declaration","enum_declaration","record_declaration"}

def _txt(src: bytes, node) -> str:
  return src[node.start_byte:node.end_byte].decode("utf-8", errors="ignore")

def _class_chain(node, src: bytes) -> list[str]:
  chain, cur = [], node.parent
  while cur:
    if cur.type in TYPE_NODES:
      name = cur.child_by_field_name("name")
      chain.append(_txt(src, name) if name else "<anon>")
    cur = cur.parent
  return list(reversed(chain)) or ["<no-type>"]

GENERIC = re.compile(r"<[^<>]*>")
ANNOT = re.compile(r"@\w+(?:\([^()]*\))?")
QUAL = re.compile(r"([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)")

def _norm_type(s: str) -> str:
  s = ANNOT.sub("", s)
  while GENERIC.search(s):
    s = GENERIC.sub("", s)
  s = re.sub(r"\s+", "", s)
  s = QUAL.sub(lambda m: m.group(0).split(".")[-1], s)
  return s

def _param_types(node, src: bytes) -> list[str]:
  params = node.child_by_field_name("parameters")
  if not params: return []
  out = []
  for p in params.named_children:
    t = p.child_by_field_name("type")
    if not t: continue
    ty = _norm_type(_txt(src, t))
    if p.type == "spread_parameter" or "..." in _txt(src, p):
      ty += "..."
    out.append(ty)
  return out

def list_function_addresses(java_src: str) -> list[str]:
  src = java_src.encode("utf-8", errors="ignore")
  root = PARSER.parse(src).root_node
  addrs: list[str] = []

  stack = [root]
  while stack:
    n = stack.pop()
    if n.type in ("method_declaration","constructor_declaration"):
      cls = ".".join(_class_chain(n, src))
      name_node = n.child_by_field_name("name")
      name = _txt(src, name_node) if n.type == "method_declaration" else "<init>"
      params = _param_types(n, src)
      addrs.append(f"{cls}#{name}({','.join(params)})")
    stack.extend(n.children)

  return addrs

TASK_CONTEXT = """You are a senior Kotlin engineer and Java-Kotlin JVM interop specialist."""

def _get_function_prompt(java_code, function):
  PROMPT = ""

  TASK_DESCRIPTION = """Your task is to convert only a specific function within the provided Java code to **idiomatic kotlin**, preserving behaviour while improving readability, safety and maintainability."""

  INPUT_CONTEXT = f"""The function is part of the Java code given below:
<java>
{java_code}
</java>"""

  FUNCTION_TARGET = f"""The function you should translate is: {function}
This refers to the exact method/constructor with the same name and parameter types."""

  OUTPUT_FORMATTING = """Wrap the conversion result of the function in <kotlin> tags. Return ONLY the Kotlin function wrapped in the tags. Do NOT move/rename the function or change parameters."""

  REMARKS = """Output the conversion result as idiomatic Kotlin that drops into an otherwise fully and perfectly converted Kotlin codebase, where this function is the only gap. Convert only that one function/constructor. Use Kotlin idioms and avoid Java-isms."""

  if TASK_CONTEXT:
    PROMPT += f"""{TASK_CONTEXT}"""

  if TASK_DESCRIPTION:
    PROMPT += f"""\n\n{TASK_DESCRIPTION}"""

  if INPUT_CONTEXT:
    PROMPT += F"""\n\n{INPUT_CONTEXT}"""

  if FUNCTION_TARGET:
    PROMPT += f"""\n\n{FUNCTION_TARGET}"""

  if OUTPUT_FORMATTING:
    PROMPT += f"""\n\n{OUTPUT_FORMATTING}"""

  if REMARKS:
    PROMPT += f"""\n\n{REMARKS}"""
  
  return PROMPT

def _get_main_prompt(java_code, functions):
  PROMPT = ""

  TASK_DESCRIPTION = """Your task is to convert the following Java code to **idiomatic Kotlin**, preserving behaviour while improving readability, safety and maintainability. The functions have already been converted for you, so you can use these as the correct conversions of the functions within the Java code."""

  INPUT_DATA = f"""The Java code to convert is:
<java>
{java_code}
</java>"""
  
  FUNCTIONS_CONTEXT = """The Kotlin conversions for each function are listed below:"""
  
  FUNCTION_CONVERSIONS = [f"""Function: {f[0]}
<kotlin>
{f[1]}
</kotlin>""" for f in functions]
  
  PRECOGNITION = """Before emitting any code, run through the provided Java input and perform these 3 steps of thinking.
<step>
  1: Build a faithful Kotlin skeleton, keeping the package declaration and the given imports.

  <rule>
    Declare classes/interfaces/enums, and convert constructors.
  </rule>
  <rule>
    Declare method signatures only.
  </rule>
  <rule>
    For every method whose address appears in the supplied list, paste the provided Kotlin body verbatim into the matching signature.
  </rule>
</step>

<step>
  2: Introduce syntactic transformations to make the output truly idiomatic.

  <rule>
    Where getters and setters are defined as methods in Java, use the Kotlin syntax to replace these methods with a more idiomatic version.
  </rule>
  <rule>
    Lambdas should be used where they can simplify code complexity while replicating the exact behaviour of the previous code.
  </rule>
</step>
"""

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
  
  OUTPUT_FORMATTING = """Wrap the conversion result in <kotlin> tags."""

  REMARKS = """Use the pre-converted functions given above to help convert the entire Java source to idiomatic Kotlin."""

  if TASK_CONTEXT:
    PROMPT += f"""{TASK_CONTEXT}"""

  if TASK_DESCRIPTION:
    PROMPT += f"""\n\n{TASK_DESCRIPTION}"""

  if INPUT_DATA:
    PROMPT += F"""\n\n{INPUT_DATA}"""

  if FUNCTIONS_CONTEXT:
    PROMPT += f"""\n\n{FUNCTIONS_CONTEXT}"""
    
  NEWLINES = "\n\n"
  
  if FUNCTION_CONVERSIONS:
    PROMPT += f"""\n\n{NEWLINES.join(FUNCTION_CONVERSIONS)}"""
  
  if PRECOGNITION:
    PROMPT += f"""\n\n{PRECOGNITION}"""
  
  if INVARIANTS:
    PROMPT += f"""\n\n{INVARIANTS}"""

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

  function_results = []

  for address in list_function_addresses(java_code):
    messages = [
      {
          "role": "system",
          "content": (
              "You are a senior Kotlin engineer and Java-Kotlin JVM interop specialist. "
              "Convert the given function to idiomatic Kotlin and output the final code in <kotlin> tags. "
              "Preserve behavior and API, prefer idiomatic Kotlin when safe."
          )
      },
      { "role": "user", "content": _get_function_prompt(java_code, address) },
    ]

    payload = {
      "model": MODEL,
      "messages": messages,
      "keep_alive": 0,
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
    function_results.append((address, _get_last_kotlin_text(output)))

  messages = [
    {
        "role": "system",
        "content": (
            "You are a senior Kotlin engineer and Java-Kotlin JVM interop specialist. "
            "Convert the given Java code to idiomatic Kotlin and output the final code in <kotlin> tags. "
            "Preserve behavior and API, prefer idiomatic Kotlin when safe."
        )
    },
    { "role": "user", "content": _get_main_prompt(java_code, function_results) },
  ]

  payload = {
    "model": MODEL,
    "messages": messages,
    "keep_alive": 0,
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
