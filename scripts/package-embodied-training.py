"""Package only the published training source and reviewed synthetic sample records."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "examples/embodied-training"
DESTINATION = ROOT / "downloads"
TOP_FILES = {"README.md", "SOURCES.md", "curriculum.json", "requirements.txt", ".gitignore", ".gitattributes"}
FOLDERS = {"docs": {".md"}, "configs": {".json"}, "scripts": {".py", ".cjs"},
           "tests": {".py", ".cjs"}, "vendor": {".js", ".md"}, "sample-results": {".json"}}


def main():
    files = []
    for file in sorted(SOURCE.rglob("*")):
        if not file.is_file():
            continue
        relative = file.relative_to(SOURCE)
        if any(part in {"__pycache__", "runs", "data", ".venv", ".git"} for part in relative.parts):
            continue
        allowed = relative.as_posix() in TOP_FILES or (len(relative.parts) > 1
                    and file.suffix in FOLDERS.get(relative.parts[0], set()))
        if not allowed or file.is_symlink():
            raise ValueError("Unexpected publish file: " + relative.as_posix())
        files.append(file)
    DESTINATION.mkdir(exist_ok=True)
    archive = DESTINATION / "embodied-training-lab.zip"
    temporary = DESTINATION / "embodied-training-lab.zip.tmp"
    entries = {}
    with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for file in files:
            name = "embodied-training-lab/" + file.relative_to(SOURCE).as_posix()
            content = file.read_bytes()
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 23, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            bundle.writestr(info, content)
            entries[name] = hashlib.sha256(content).hexdigest()
    with zipfile.ZipFile(temporary) as bundle:
        if bundle.testzip() is not None:
            raise ValueError("Archive CRC failed")
        for name, expected in entries.items():
            if hashlib.sha256(bundle.read(name)).hexdigest() != expected:
                raise ValueError("Archive content mismatch")
    temporary.replace(archive)
    manifest = {"schema": 1, "archive_path": "downloads/embodied-training-lab.zip",
                "sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
                "bytes": archive.stat().st_size, "files": entries}
    (DESTINATION / "embodied-training-lab.manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"files": len(entries), "bytes": manifest["bytes"], "sha256": manifest["sha256"]}))


if __name__ == "__main__":
    main()
