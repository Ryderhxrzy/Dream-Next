import sys, json
from graphify.detect import detect_incremental
from pathlib import Path

if __name__ == "__main__":
    scan_root = Path("graphify-out/.graphify_root").read_text(encoding="utf-8").strip()
    result = detect_incremental(Path(scan_root))
    Path("graphify-out/.graphify_incremental.json").write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")

    deleted = list(result.get("deleted_files", []))
    new_total = result.get("new_total", 0)

    if new_total == 0 and not deleted:
        print("No files changed since last run. Nothing to update.")
        sys.exit(0)

    if deleted:
        print(str(len(deleted)) + " deleted file(s) to prune.")
    if new_total > 0:
        print(str(new_total) + " new/changed file(s) to re-extract.")

    # Show what changed
    new_files = result.get("new_files", {})
    for cat, flist in new_files.items():
        if flist:
            for f in flist[:10]:
                print("  CHANGED: " + f)
