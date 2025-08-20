import requests, re, pathlib, subprocess
import xml.etree.ElementTree as ET

def get_java_files(directory="."):
  return list(pathlib.Path(directory).rglob("*.java"))

def _get_after_sentinel(kotlin_code: str):
  sentinel = "<<START_J2K>>"
  index = kotlin_code.find(sentinel)

  if index == -1:
    return kotlin_code
  
  return kotlin_code[index + len(sentinel):].lstrip()

def convert(java_code):
  OLLAMA_URL = "http://localhost:11434/api/chat"
  MODEL = "deepseek-r1:8b"

  messages = [
    {
        "role": "system",
        "content": """Translate the given Java code to Kotlin.
Return only the translated Kotlin code, no extra comments.
Return the code text after the following sentinel token, written exactly as <<START_J2K>>.
After <<START_J2K>>, output *only valid Kotlin source code*; do not add any labels or explanations."""
    },
    { "role": "human", "content": f"Java source code we want to translate.\n{java_code}" },
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
  return _get_after_sentinel(output)

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
