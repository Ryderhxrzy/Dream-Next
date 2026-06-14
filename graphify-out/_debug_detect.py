import json, sys
from graphify.detect import detect
from pathlib import Path

scan_root = Path("graphify-out/.graphify_root").read_text(encoding="utf-8").strip()
print("Scan root:", repr(scan_root))

result = detect(Path(scan_root))
print("total_files:", result.get("total_files", 0))
print("scan_root from result:", result.get("scan_root", ""))

files = result.get("files", {})
for cat, flist in files.items():
    if flist:
        print(cat + ": " + str(len(flist)))
        print("  SAMPLE:", repr(flist[0]))
