import re
import glob
from pygments.lexers.jvm import KotlinLexer
from pygments.token import Token
from pygments import lex

from pathlib import Path

IMPORTS_PACKAGE_VALID = False

def strip_kotlin_comments(source: str) -> str:
    tokens = lex(source, KotlinLexer())
    return "".join(tok_text
                   for tok_type, tok_text in tokens
                   if tok_type not in Token.Comment)

def parse_test_results(report_text):
  results = []

  for line in report_text.strip().splitlines():
    match = re.match(r"(.+?): score=([\d.]+) \(ran (\d+) tests?, (\d+) passing\)", line)
    if match:
      file_name = match.group(1).strip()
      score = float(match.group(2))
      tests_run = int(match.group(3))
      tests_passed = int(match.group(4))

      results.append({
        "file": file_name,
        "score": score,
        "tests_run": tests_run,
        "tests_passed": tests_passed
      })

  return results

print("==========" * 2)
for score_path in glob.glob("v[0-9]*/scores.txt"):
  results = parse_test_results(open(score_path, "r").read())
  num_cases = len(results)
  # how many compiled

  compiled_tests = list(filter(lambda x: x["tests_run"] != 0, results))
  num_compiled = len(compiled_tests)

  # average score among those that compiled

  total_score_compiled = sum([x["score"] for x in compiled_tests])

  # how many passed 100%

  num_hundred_percent = len(list(filter(lambda x: x["tests_run"] == x["tests_passed"], compiled_tests)))

  print(f"""{num_cases} files were analysed
{num_compiled} compiled and ran some tests
{total_score_compiled/num_compiled} was the average score of the ones that compiled
{num_hundred_percent} files achieved 100% on tests""")
  
  # compute single score

  log_path = Path(score_path).parent / "logs"
  total_scores = []
  for result in results:
    kotlin_file = (log_path / result["file"]).with_suffix(".kt")

    real_lines = [line for line in strip_kotlin_comments(kotlin_file.read_text()).splitlines() if line.strip() != ""]

    if not IMPORTS_PACKAGE_VALID:
      real_lines = [line for line in real_lines if not line.lower().startswith("import ") and not line.lower().startswith("package ")]

    num_lines = len(real_lines)
    
    if num_lines == 0:
      # empty code means no code to evaluate, so shouldn't touch score
      continue
    else:
      score_for_file = (0 if result["tests_run"] == 0 else (result["tests_passed"] / result["tests_run"])) / num_lines

    total_scores.append(score_for_file)
  
  version = Path(score_path).parent.name
  
  print(f"raw score for {version}: {sum(total_scores)}")
  print(f"score for {version}: {sum(total_scores) / len(results)}")
  print("==========" * 2)