"""Portable batch entry point. Never opens a browser, downloads models, or connects to hardware."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
from train_parking import ROOT, run, save_new


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=ROOT / "configs/parking-baseline.json")
    parser.add_argument("--core", type=Path, default=ROOT / "vendor/pickgo-core.js", help="Existing PickGo simulator core")
    parser.add_argument("--output", type=Path, required=True, help="A new experiment directory")
    args = parser.parse_args()
    config = json.loads(args.config.read_text(encoding="utf-8"))
    epochs, seeds = config["epochs"], config["seeds"]
    if not isinstance(epochs, int) or epochs < 1 or not seeds or any(not isinstance(s, int) or s < 0 for s in seeds) or len(set(seeds)) != len(seeds):
        parser.error("Invalid epochs or seeds")
    if not args.core.is_file():
        parser.error("PickGo core not found")
    args.output.mkdir(parents=True, exist_ok=False)
    save_new(args.output / "config.json", config)
    # Subprocesses launched by training inherit exactly this trusted local core path.
    os.environ["PICKGO_CORE"] = str(args.core.resolve())
    dataset_file = args.output / "dataset.json"
    subprocess.run(["node", str(ROOT / "scripts/pickgo_dataset.cjs"), "generate", str(dataset_file.resolve())],
                   check=True, timeout=60)
    run(dataset_file, args.output / "training", epochs, seeds)


if __name__ == "__main__":
    main()
