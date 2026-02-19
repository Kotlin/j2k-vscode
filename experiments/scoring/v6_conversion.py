import re
import requests
import json

from pathlib import Path

def to_kt_path(old: Path) -> Path:
  old = Path(old).expanduser()

  parts = old.parts
  i = next(idx for idx in range(len(parts) - 1) if parts[idx] == "src" and parts[idx + 1] == "main")

  tail = Path(*parts[i + 2:])
  tail = tail.with_suffix(".kt")

  base = Path.home() / "work" / "samples" / "spring-petclinic" / "src" / "main"
  return base / tail

def convert(java_code, java_path=None):
  if not java_path:
    raise Exception()
  
  kotlin_path = to_kt_path(java_path)

  return kotlin_path.read_text()
