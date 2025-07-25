import math
from tree_sitter_language_pack import get_parser
import re

# 1) Loses imports / uses the wrong imports
# Examples: Vet, Specialty, Visit

# 2) Uses data classes where not required, which overcomplicates things.
# Examples: Vet, Owner TODO:

# 3) Classes declared are final where not explicitly marked in Java as such
# Examples: Vet, PetType TODO:

# 4) Will not perform any Kotlin conversion at all, instead generating Java-style syntax
# Examples: OwnerRepository

# 5) Sometimes generates closing remarks along with a random tag to close e.g. [/START_J2K] which is not real syntax specified within the prompt
# Examples: PetTypeRepository, Vet, OwnerRepository, PetTypeFormatter, PetValidator, VetController

# 6) Mixes up Java and Kotlin collections in regards to mutability
# Examples: Vets, Owner TODO:

# 7) Generates getters/setters when already auto-implemented by properties
# Examples: Owner TODO:

# 8) Hallucinates nonexistent Kotlin functions that exist in java (e.g. equalsIgnoreCase)
# Examples: Owner

# 9) Removes Javadoc and licensing comments
# Examples: all

SENTINEL = "<<START_J2K>>"

# helper function to extract after sentinel
def get_after_sentinel(code: str) -> str:
  parts = code.split(SENTINEL, 1)
  return parts[1] if len(parts) > 1 else ""

# hard checks begin here

# generally required for all code
def only_one_sentinel(code: str):
  return int(code.count(SENTINEL) == 1)

parser = get_parser("kotlin")

# covers 4,5
def valid_kotlin_syntax(code: str):
  actual_code = get_after_sentinel(code)
  if (actual_code == ""):
    return 0
  tree = parser.parse(actual_code.encode("utf-8"))
  return int(not tree.root_node.has_error)

# covers 8
def no_java_only_funcs(code: str):
  after = get_after_sentinel(code)
  bad = ["equalsIgnoreCase"] # to be expanded

  return int(not any(b in after for b in bad))

# soft checks begin here

# helpers

def extract_imports(code: str):
  return [l.strip() for l in code.splitlines() if l.strip().startswith("import ")]

def is_wildcard(line: str):
  return line.endswith(".*") or line.endswith(".*;")

IGNORED_IMPORTS = [
  "java.util.List", "java.util.Set", "java.util.Map",
  "java.util.ArrayList", "java.util.HashSet", "java.util.HashMap"
]

# covers 1
def no_lost_imports(gold, pred):
  kotlin_imports = extract_imports(pred.kotlin_code or "")
  java_imports = [imp for imp in extract_imports(gold.java_code or "") if not any(ignore in imp for ignore in IGNORED_IMPORTS)]

  return len(java_imports) == len(kotlin_imports) and (not any([is_wildcard(line) for line in pred.kotlin_code.splitlines()]))

OPEN_CLASS_RE = re.compile(r'\bopen\s+class\s+[A-Z]\w*')
JAVA_CLASS_RE = re.compile(r'\b(?:(public|protected|private)\s+)?(?:(abstract|final)\s+)?class\s+([A-Z]\w*)')

# covers 3
def open_classes_match(gold, pred):
  java = gold.java_code or ""
  kotlin_code = get_after_sentinel(pred.kotlin_code or "")

  need_open = [m.group(3) for m in JAVA_CLASS_RE.finditer(java) if (m.group(2) or "") not in ("final", "abstract")]
  if not need_open:
    return 1

  got_open = len(OPEN_CLASS_RE.findall(kotlin_code))
  return int(got_open == len(need_open))

JAVA_MUT_COL_RE = re.compile(r'\b(java\.util\.)?(List|Set|Map)<')
KT_MUT_COL_RE = re.compile(r'\bMutable(List|Set|Map)<')
KT_MUT_constructor_RE = re.compile(r'\bmutable(List|Set|Map)Of\s*\(')

# covers 6
def mutability_match(gold, pred):
    java = gold.java_code or ""
    kotlin_code = get_after_sentinel(pred.kotlin_code or "")

    want_mut = len(JAVA_MUT_COL_RE.findall(java))
    if want_mut == 0:
        return 1
    
    got_mut = len(KT_MUT_COL_RE.findall(kotlin_code)) + len(KT_MUT_constructor_RE.findall(kotlin_code))
    return int(got_mut == want_mut)


# [String -> Int]
hard_checks = [only_one_sentinel, valid_kotlin_syntax]
# [(Float, String -> Int)]
soft_checks = [(1, no_lost_imports), (1, open_classes_match), (1, mutability_match)]

def metric(gold, pred, trace=None):
  code = pred.kotlin_code or ""
  score_parts = {}

  sentinel_ok = int(SENTINEL in code)
  if not sentinel_ok:
    return 0

  score_parts["sentinel"] = 0.4 * sentinel_ok

  hard = [f(code) for f in hard_checks]
  score_parts["hard"] = 0.4 * (sum(hard) / len(hard))

  soft = [weight * f(gold, pred) for (weight, f) in soft_checks]
  score_parts["soft"] = 0.2 * (sum(soft) / sum([weight for (weight, _) in soft_checks]))

  score = sum(score_parts.values())
  print(f"DEBUG SCORE: {score}")

  if score < 0.6:
    import pathlib, json
    DEBUG_DIR = pathlib.Path("metric_debug")
    DEBUG_DIR.mkdir(exist_ok=True)
    with open(DEBUG_DIR / "bad_preds.jsonl", "a") as f:
      f.write(json.dumps({
        "java": getattr(gold, "java_code", ""),
        "kotlin": getattr(pred, "kotlin_code", ""),
        "rationale": getattr(pred, "rationale", ""),
        "score_parts": score_parts
      }) + "\n")
  return score