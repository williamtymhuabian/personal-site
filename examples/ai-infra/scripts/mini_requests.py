"""Prepare equal-token-length shared/distinct-prefix requests; no model loading."""
import argparse
import json
from pathlib import Path
from records import fingerprint, provenance, save_new


def common_length(left, right):
    for index, (a, b) in enumerate(zip(left, right)):
        if a != b:
            return index
    return min(len(left), len(right))


def prepare(tokenizer, count=12, repeat=40):
    def encode(text):
        # Plain prompt on /v1/chat/completions bypasses chat templates.
        return tokenizer.encode(text, add_special_tokens=True)

    prefix = "red sensor reads a quiet room. " * repeat
    labels = ["blue", "green", "black", "white", "yellow", "orange", "purple", "silver"]
    labels += [str(i) for i in range(100, 1000)]
    shared, distinct = [], []
    for index in range(count):
        suffix = f"\nQuestion {index:03d}: describe the room briefly.\nAnswer:"
        text = prefix + suffix
        ids = encode(text)
        for label in labels:
            candidate = (f"{label} sensor reads a quiet room. " * repeat) + suffix
            other = encode(candidate)
            if len(other) == len(ids):
                labels.remove(label)
                break
        else:
            raise ValueError("Could not create equal-length controls; reduce repeat/count and inspect tokenizer")
        shared.append(dict(group="shared", index=index, prompt=text, input_tokens=len(ids),
                           input_ids_sha256=fingerprint(ids)))
        distinct.append(dict(group="distinct", index=index, prompt=candidate, input_tokens=len(other),
                             input_ids_sha256=fingerprint(other)))
    for group in (shared, distinct):
        history = []
        for row in group:
            ids = encode(row["prompt"])
            row["max_previous_common_tokens"] = max((common_length(ids, old) for old in history), default=0)
            history.append(ids)
    # Interleave to reduce drift; index 0 in each group is not a steady-state sample.
    rows = [row for pair in zip(shared, distinct) for row in pair]
    return {"schema": "mini-workload-v1", "requests": rows,
            "warmup_prompt": "A separate warmup request about operating systems. Answer briefly.",
            "interpretation": "Common token lengths describe input overlap, not observed server cache hits."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True)
    parser.add_argument("--count", type=int, default=12)
    parser.add_argument("--prefix-repeat", type=int, default=40)
    parser.add_argument("--output", default="results/mini-workload.json")
    args = parser.parse_args()
    if args.count < 2 or args.count > 64 or args.prefix_repeat < 1:
        parser.error("count must be 2..64; prefix-repeat must be positive")
    if Path(args.output).exists():
        parser.error("Choose a new output file")
    from transformers import AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained(args.model, local_files_only=True)
    workload = prepare(tokenizer, args.count, args.prefix_repeat)
    if any(row["input_tokens"] + 64 > 2048 for row in workload["requests"]):
        parser.error("Workload exceeds the 2048-token server context; reduce prefix-repeat")
    workload["provenance"] = provenance(args.model)
    path = save_new(args.output, workload)
    print(f"Saved {len(workload['requests'])} controlled requests: {path}")


if __name__ == "__main__":
    main()
