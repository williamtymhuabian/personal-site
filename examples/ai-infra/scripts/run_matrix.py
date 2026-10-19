"""Print experiment commands. Only --execute launches model subprocesses."""
import argparse
import json
import shlex
import subprocess
import sys
from pathlib import Path
from records import save_new


def matrix(suite, smoke=False):
    if suite == "hf":
        return [dict(input_tokens=i, new_tokens=n) for i in ([64] if smoke else [64, 256, 1024])
                for n in ([8] if smoke else [16, 64])]
    rows = []
    for index, (length, batch) in enumerate((p, b) for p in ([128] if smoke else [128, 512])
                                          for b in ([1] if smoke else [1, 4, 8])):
        # Alternate which mode gets the earlier process slot.
        for mode in (["eager", "graph"] if index % 2 == 0 else ["graph", "eager"]):
            rows.append(dict(prompt_tokens=length, batch_size=batch, new_tokens=8 if smoke else 64, mode=mode))
    return rows


def commands(args):
    root = Path(__file__).resolve().parent
    for index, config in enumerate(matrix(args.suite, args.smoke)):
        command = [args.python, str(root / ("hf_cache_lab.py" if args.suite == "hf" else "nano_bench.py")),
                   "--model", args.model, "--repeats", "1" if args.smoke else "5",
                   "--warmups", "1" if args.smoke else "2"]
        if args.suite == "hf":
            command += ["--task", "compare", "--dtype", args.dtype]
        else:
            command += ["--memory-fraction", str(args.memory_fraction)]
        for key, value in config.items():
            command += ["--" + key.replace("_", "-"), str(value)]
        command += ["--output", str(Path(args.output) / f"{args.suite}-{index:02d}.json")]
        yield command


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--suite", choices=("hf", "nano"), required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--python", default=sys.executable, help="Python from this suite's isolated environment")
    parser.add_argument("--output", required=True, help="New directory; never overwrites old runs")
    parser.add_argument("--dtype", choices=("float16", "bfloat16", "float32"), default="bfloat16")
    parser.add_argument("--memory-fraction", type=float, default=0.5)
    parser.add_argument("--smoke", action="store_true", help="Fit/compatibility test, not a performance conclusion")
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if not 0 < args.memory_fraction < 1:
        parser.error("memory-fraction must be between 0 and 1")
    plan = list(commands(args))
    for command in plan:
        print(shlex.join(command), flush=True)
    if not args.execute:
        print("Preview only. No model loaded and no result directory created.")
        return 0
    directory = Path(args.output)
    if directory.exists():
        parser.error("Choose a new output directory (including after a failed run)")
    if not Path(args.model).is_dir():
        parser.error("Download the local model first")
    save_new(directory / "plan.json", {"suite": args.suite, "smoke": args.smoke, "commands": plan})
    # One process at a time; separate engine instances release their GPU memory.
    for index, command in enumerate(plan):
        with (directory / f"run-{index:02d}.private.log").open("w", encoding="utf-8") as log:
            result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
        if result.returncode:
            print(f"Stopped: run {index:02d} returned {result.returncode}. Inspect its private log.")
            return result.returncode
        print(f"Completed {index + 1}/{len(plan)}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
