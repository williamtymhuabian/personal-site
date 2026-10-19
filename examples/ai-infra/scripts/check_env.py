"""Read-only environment report. Does not install packages or change drivers."""
import argparse
import importlib.metadata as metadata
import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from records import save_new


def command_output(command):
    if not shutil.which(command[0]):
        return "not found"
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=20)
        return (result.stdout + result.stderr).strip()
    except (OSError, subprocess.TimeoutExpired) as exc:
        return str(exc)


def collect():
    report = {
        "python": sys.version,
        "executable": sys.executable,
        "platform": platform.platform(),
        "cuda_visible_devices": os.environ.get("CUDA_VISIBLE_DEVICES", "not set"),
        "packages": {},
        "nvidia_smi": command_output([
            "nvidia-smi", "--query-gpu=index,name,memory.total,memory.used,driver_version",
            "--format=csv",
        ]),
        "nvcc": command_output(["nvcc", "--version"]),
    }
    for package in ("torch", "transformers", "huggingface-hub", "triton", "flash-attn", "flashinfer-python", "minisgl", "nano-vllm"):
        try:
            report["packages"][package] = metadata.version(package)
        except metadata.PackageNotFoundError:
            report["packages"][package] = None
    try:
        import torch
        report["torch_cuda_build"] = torch.version.cuda
        report["cuda_available"] = torch.cuda.is_available()
        report["devices"] = []
        if report["cuda_available"]:
            for index in range(torch.cuda.device_count()):
                props = torch.cuda.get_device_properties(index)
                report["devices"].append({
                    "logical_index": index, "name": props.name,
                    "total_memory_gib": props.total_memory / 2**30,
                    "capability": list(torch.cuda.get_device_capability(index)),
                })
    except Exception as exc:
        report["torch_error"] = repr(exc)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="results/raw/environment.json")
    args = parser.parse_args()
    if Path(args.output).exists():
        parser.error("Choose a new environment report path")
    report = collect()
    path = save_new(args.output, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"Saved: {path}")
    return 0 if report.get("cuda_available") else 2


if __name__ == "__main__":
    raise SystemExit(main())
