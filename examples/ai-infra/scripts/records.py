"""Small shared record helpers; importing this module does not load a model."""
import hashlib
import importlib.metadata
import json
import platform
from pathlib import Path


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def provenance(model_path):
    root = Path(__file__).resolve().parents[1]
    model = Path(model_path)
    files = {}
    for name in ("config.json", "tokenizer.json", "tokenizer_config.json", "generation_config.json"):
        if (model / name).is_file():
            files[name] = hashlib.sha256((model / name).read_bytes()).hexdigest()
    packages = {}
    for name in ("torch", "transformers", "triton", "flash-attn", "flashinfer-python", "minisgl", "nano-vllm"):
        try:
            packages[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            packages[name] = None
    scripts = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
               for p in sorted(Path(__file__).parent.glob("*.py"))}
    return {
        "python": platform.python_version(), "packages": packages,
        "model_config_hashes": files, "script_hashes": scripts,
        "declared_versions": json.loads((root / "versions.json").read_text(encoding="utf-8")),
    }


def save_new(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
    return path
