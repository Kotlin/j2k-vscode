import re

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

results = parse_test_results(open("scores.txt", "r").read())
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