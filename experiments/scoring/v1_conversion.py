import requests

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
