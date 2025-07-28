import dspy, json, random

from metric import metric

# for 5 steps of reasaoning
COT_CONSTANT = 5

# https://www.promptingguide.ai/techniques/cot
# Kojima et al. 2022 suggests adding 'Let's think step by step' before each answer.
class JavaToKotlin(dspy.Signature):
  f"""
  Translate the given Java code to Kotlin.
  - Return only the translated Kotlin code, preserving all existing comments, licence headers and Javadoc from the Java source.
    Do not delete or rewrite them unless Kotlin syntax absolutely requires it.
  - Do not add your own explanatory comments or narrative text.
  - This file is part of a larger project. Do not inroduce breaking changes (visibility, constructor signatures, etc.) unless you can prove safety.

  Output policy:
  - Return the code text after the following sentinel token, written exactly as <<START_J2K>>, on its own line.
  - After <<START_J2K>>, output *only valid Kotlin source code*; do not add any labels or explanations.

  Let's think step-by-step in EXACTLY {COT_CONSTANT} numbered steps BEFORE emitting code.
  """
  java_code: str = dspy.InputField(desc="Full Java snippet to translate.")
  rationale: str = dspy.OutputField(desc=f"{COT_CONSTANT} numbered steps of reasoning. No Kotlin code here.")
  kotlin_code: str = dspy.OutputField(desc="Only valid Kotlin, starting after <<START_J2K>>")

converter = dspy.ChainOfThought(JavaToKotlin)
dspy.configure(lm=dspy.LM("ollama_chat/codellama:instruct", api_base="http://localhost:11434", api_key=""))

# extract data

rows = None
with open("j2k_cases.jsonl", "r") as f:
  rows = [json.loads(l) for l in f.readlines()]

random.shuffle(rows)

# at least one validation row, should be 20% of the training data
split = max(1, int(len(rows) * 0.2))
validation_rows, training_rows = rows[:split], rows[split:]

training_set = [
  dspy.Example(java_code=row["java_code"], kotlin_code=row["kotlin_code"], rationale=row["rationale"]).with_inputs("java_code")
  for row in rows
]

validation_set = [
  dspy.Example(java_code=row["java_code"], kotlin_code=row["kotlin_code"], rationale=row["rationale"]).with_inputs("java_code")
  for row in validation_rows
]

opt = dspy.BootstrapFewShot(
    metric=metric,
    max_rounds=20,
    teacher_settings={
      "temperature": 1
    }
)

dspy.configure(use_json_output=False)

compiled = opt.compile(converter, trainset=training_set)
compiled.save("j2k_compiled.json")