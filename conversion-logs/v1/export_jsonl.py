import os, json

def get_filenames():
  filenames = []

  for filename in os.listdir():
    if filename.endswith(".java"):
      basename = os.path.splitext(filename)[0]
      filenames.append(basename)
  
  return filenames

def strip_header(text):
  return "\n".join(text.splitlines()[2:])

def construct_objects(filenames):
  objects = []

  for filename in filenames:
    result = {}

    with open(f"{filename}.java", "r") as f:
      result["java_code"] = strip_header(f.read())
    
    with open(f"{filename}_polished.kt", "r") as f:
      result["kotlin_code"] = strip_header(f.read())
    
    # for later use
    result["rationale"] = ""

    objects.append(result)
    
  return objects

objects = [json.dumps(x) for x in construct_objects(get_filenames())]
output = "\n".join(objects) + "\n"

with open("j2k_cases.jsonl", "w") as f:
  f.write(output)