"""Validate raw results and export an allowlisted JSON bundle for review."""
import argparse
import json
import math
import re
import statistics
import zipfile
from pathlib import Path
from records import save_new


def number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
        raise ValueError("Invalid numeric measurement")
    return value


def safe_label(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9 .()+_-]{1,120}", value):
        raise ValueError("Unexpected metadata label; review locally")
    return value


def hashes(value):
    if not isinstance(value, dict):
        raise ValueError("Missing reproducibility hashes")
    if not value or any(not isinstance(v, str) or not re.fullmatch(r"[a-f0-9]{64}", v) for v in value.values()):
        raise ValueError("Missing or malformed reproducibility hash")
    return {safe_label(k): v for k, v in value.items()}


def public_provenance(raw):
    value = raw["provenance"]
    return {"python": safe_label(value["python"]),
            "packages": {safe_label(k): safe_label(v) if v is not None else None
                         for k, v in value["packages"].items()},
            "model_config_hashes": hashes(value["model_config_hashes"]),
            "script_hashes": hashes(value["script_hashes"])}


def clean_report(raw):
    if "nano_commit" in raw:
        args = raw["arguments"]
        if args["mode"] not in ("eager", "graph") or not re.fullmatch(r"[a-f0-9]{40}", raw["nano_commit"]):
            raise ValueError("Nano source revision must be known")
        runs = [{key: number(row[key]) for key in ("seconds", "output_tokens", "output_tokens_per_second",
                                                   "peak_allocated_mib", "peak_reserved_mib")}
                | {"input_ids_sha256": hashes({"input": row["input_ids_sha256"]})["input"]}
                for row in raw["runs"]]
        if len(runs) != args["repeats"] or any(row["seconds"] <= 0 or row["output_tokens"] != args["batch_size"] * args["new_tokens"] for row in runs):
            raise ValueError("Incomplete or inconsistent Nano workload")
        return {"kind": "nano", "gpu": safe_label(raw["gpu"]), "commit": raw["nano_commit"],
                "settings": {key: (args[key] if key == "mode" else number(args[key])) for key in
                             ("mode", "batch_size", "prompt_tokens", "new_tokens", "warmups", "repeats", "seed",
                              "max_model_len", "max_batched_tokens", "memory_fraction")},
                "provenance": public_provenance(raw), "runs": runs,
                "median_seconds": statistics.median(row["seconds"] for row in runs),
                "median_output_tokens_per_second": statistics.median(row["output_tokens_per_second"] for row in runs),
                "metric": "warm_engine_batch_makespan"}
    if raw.get("task") == "compare":
        if raw.get("manual_paths_equal_all_repeats") is not True or raw.get("cache_equals_hf_generate") is not True:
            raise ValueError("HF token mismatch; inspect raw token IDs before publishing performance")
        lengths = raw["forward_input_lengths"]
        n, length = int(number(raw["new_tokens"])), int(number(raw["input_tokens"]))
        if n < 1 or length < 1 or lengths != {"cache": [length] + [1] * (n - 1), "no_cache": list(range(length, length + n))}:
            raise ValueError("Unexpected forward sequence lengths")
        runs = {key: [{"seconds": number(row["seconds"]),
                       "peak_allocated_mib": number(row["peak_allocated_mib"])} for row in raw["runs"][key]]
                for key in ("cache", "no_cache")}
        if any(len(rows) != raw["arguments"]["repeats"] or any(r["seconds"] <= 0 for r in rows) for rows in runs.values()):
            raise ValueError("Missing HF repeats")
        medians = {key: statistics.median(row["seconds"] for row in rows) for key, rows in runs.items()}
        return {"kind": "hf", "gpu": safe_label(raw["gpu"]), "input_tokens": length, "new_tokens": n,
                "dtype": safe_label(raw["arguments"]["dtype"]), "warmups": number(raw["arguments"]["warmups"]),
                "correctness": "all_manual_pairs_and_final_HF_reference_equal",
                "input_ids_sha256": hashes({"input": raw["input_ids_sha256"]})["input"],
                "provenance": public_provenance(raw), "runs": runs, "forward_input_lengths": lengths,
                "median_seconds": medians, "no_cache_over_cache": medians["no_cache"] / medians["cache"],
                "metric": "model_and_python_loop_excluding_tokenization_and_decode"}
    if raw.get("schema") == "mini-client-v1":
        if raw.get("status") != "complete" or raw.get("cache_mode_declared") not in ("naive", "radix"):
            raise ValueError("Incomplete Mini run")
        runs = []
        for row in raw["runs"]:
            if row["group"] not in ("shared", "distinct"):
                raise ValueError("Unknown workload group")
            runs.append({key: number(row[key]) for key in ("index", "input_tokens", "max_previous_common_tokens",
                                                            "first_content_seconds", "end_to_end_seconds", "content_events")}
                        | {"group": row["group"], "input_ids_sha256": hashes({"input": row["input_ids_sha256"]})["input"]})
        return {"kind": "mini", "cache_mode_declared": raw["cache_mode_declared"],
                "workload_sha256": hashes({"workload": raw["workload_sha256"]})["workload"],
                "server_commit_declared": safe_label(raw["server_commit_declared"]),
                "provenance": public_provenance(raw), "runs": runs,
                "metric": "localhost_first_content_chunk_and_request_latency_no_token_rate"}
    return None


def nano_pairs(records):
    pairs = []
    for left in records:
        if left["kind"] != "nano" or left["settings"]["mode"] != "eager":
            continue
        for right in records:
            if right["kind"] != "nano" or right["settings"]["mode"] != "graph":
                continue
            settings = lambda row: {k: v for k, v in row["settings"].items() if k != "mode"}
            if (left["gpu"], left["commit"], settings(left), left["provenance"], [r["input_ids_sha256"] for r in left["runs"]]) != (right["gpu"], right["commit"], settings(right), right["provenance"], [r["input_ids_sha256"] for r in right["runs"]]):
                continue
            if left["settings"]["repeats"] >= 5 and left["settings"]["new_tokens"] >= 64:
                pairs.append({"eager_record": left["record"], "graph_record": right["record"],
                              "eager_seconds_over_graph_seconds": left["median_seconds"] / right["median_seconds"]})
    return pairs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Raw results directory; read recursively")
    parser.add_argument("--output", default="results/share", help="New export directory")
    args = parser.parse_args()
    source, target = Path(args.input).resolve(), Path(args.output).resolve()
    if not source.is_dir() or target.exists() or target == source:
        parser.error("Input must exist; output must be a new directory")
    records = []
    try:
        for path in sorted(source.rglob("*.json")):
            cleaned = clean_report(json.loads(path.read_text(encoding="utf-8")))
            if cleaned is not None:
                cleaned["record"] = len(records) + 1
                records.append(cleaned)
        if not records:
            raise ValueError("No recognized experiment results")
        report = {"schema": "public-results-v1", "records": records, "nano_pairs": nano_pairs(records),
                  "notes": "Paths, environment dumps, logs, prompts, responses and generated token IDs excluded by allowlist. Operator must review the JSON before public posting. Smoke runs are not performance evidence."}
        saved = save_new(target / "metrics.json", report)
        with zipfile.ZipFile(target / "results-to-share.zip", "x", zipfile.ZIP_DEFLATED) as archive:
            archive.write(saved, "metrics.json")
    except (KeyError, TypeError, ValueError, ZeroDivisionError) as exc:
        # Do not echo arbitrary field contents from raw data.
        print(f"Result validation failed ({type(exc).__name__}); no successful export. Review local data.")
        return 1
    print(f"Exported {len(records)} records. Review {saved} before sharing the ZIP.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
