"""Offline single-GPU Nano-vLLM benchmark; measures warm-engine batch makespan."""
import argparse
import hashlib
import importlib.metadata
import inspect
import json
import random
import statistics
import subprocess
import time
from pathlib import Path
from records import provenance, save_new


def positive_int(value):
    value = int(value)
    if value < 1:
        raise argparse.ArgumentTypeError("must be positive")
    return value


def make_prompts(pool, batch_size, prompt_tokens, seed):
    rng = random.Random(seed)
    return [[rng.choice(pool) for _ in range(prompt_tokens)] for _ in range(batch_size)]


def source_revision(llm_class):
    location = Path(inspect.getfile(llm_class)).resolve().parent
    try:
        result = subprocess.run(
            ["git", "-C", str(location), "rev-parse", "HEAD"],
            capture_output=True, text=True, timeout=10,
        )
        return result.stdout.strip() if result.returncode == 0 else "unknown"
    except (OSError, subprocess.TimeoutExpired):
        return "unknown"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, help="Local model directory")
    parser.add_argument("--batch-size", type=positive_int, default=1)
    parser.add_argument("--prompt-tokens", type=positive_int, default=128)
    parser.add_argument("--new-tokens", type=positive_int, default=64)
    parser.add_argument("--max-model-len", type=positive_int, default=2048)
    parser.add_argument("--max-batched-tokens", type=positive_int, default=2048)
    parser.add_argument("--memory-fraction", type=float, default=0.5)
    parser.add_argument("--mode", choices=("eager", "graph"), default="eager")
    parser.add_argument("--warmups", type=positive_int, default=2)
    parser.add_argument("--repeats", type=positive_int, default=5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", default="results/nano.json")
    args = parser.parse_args()
    if Path(args.output).exists():
        parser.error("Output exists; choose a new result path")
    if not Path(args.model).is_dir():
        parser.error("--model must be a downloaded local directory")
    if not 0 < args.memory_fraction < 1:
        parser.error("memory-fraction must be between 0 and 1")
    if args.prompt_tokens + args.new_tokens > args.max_model_len:
        parser.error("prompt-tokens + new-tokens exceed max-model-len")
    import torch
    from transformers import AutoTokenizer
    from nanovllm import LLM, SamplingParams
    if not torch.cuda.is_available():
        parser.error("CUDA is required")
    tokenizer = AutoTokenizer.from_pretrained(args.model, local_files_only=True)
    pool = tokenizer.encode(
        "Operating systems manage memory. GPU inference schedules requests. "
        "计算机系统需要管理缓存与请求。", add_special_tokens=False,
    )
    if not pool:
        parser.error("Tokenizer produced an empty token pool")
    engine = LLM(
        str(Path(args.model).resolve()), tensor_parallel_size=1,
        enforce_eager=(args.mode == "eager"),
        gpu_memory_utilization=args.memory_fraction,
        max_model_len=args.max_model_len,
        max_num_batched_tokens=args.max_batched_tokens,
        max_num_seqs=max(8, args.batch_size),
    )
    sampling = SamplingParams(temperature=0.6, max_tokens=args.new_tokens, ignore_eos=True)
    rows = []
    for trial in range(-args.warmups, args.repeats):
        # Different seeded inputs each trial avoid systematically timing a fully
        # prefix-cached prompt after warmup. Seeds match across eager/graph runs.
        prompts = make_prompts(pool, args.batch_size, args.prompt_tokens, args.seed + trial)
        torch.manual_seed(args.seed + trial)
        torch.cuda.synchronize()
        torch.cuda.reset_peak_memory_stats()
        start = time.perf_counter()
        outputs = engine.generate(prompts, sampling, use_tqdm=False)
        torch.cuda.synchronize()
        elapsed = time.perf_counter() - start
        token_count = sum(len(output["token_ids"]) for output in outputs)
        expected = args.batch_size * args.new_tokens
        if len(outputs) != args.batch_size or token_count != expected:
            raise RuntimeError(f"Unexpected workload: {len(outputs)} requests, {token_count}/{expected} tokens")
        if trial >= 0:
            rows.append({
                "trial": trial, "seconds": elapsed,
                "output_tokens": token_count, "output_tokens_per_second": token_count / elapsed,
                "peak_allocated_mib": torch.cuda.max_memory_allocated() / 2**20,
                "peak_reserved_mib": torch.cuda.max_memory_reserved() / 2**20,
                "input_ids_sha256": hashlib.sha256(json.dumps(prompts).encode()).hexdigest(),
            })
    report = {
        "arguments": vars(args), "gpu": torch.cuda.get_device_name(0),
        "provenance": provenance(args.model),
        "torch": torch.__version__, "torch_cuda_build": torch.version.cuda,
        "nano_version": importlib.metadata.version("nano-vllm"),
        "nano_commit": source_revision(LLM),
        "workload": "synthetic token IDs; fixed lengths; fresh prompts per trial; sampled outputs",
        "timing_scope": "warm engine generate() batch makespan, including host scheduling and output decode; excludes construction, graph capture, input creation",
        "median_seconds": statistics.median(row["seconds"] for row in rows),
        "median_output_tokens_per_second": statistics.median(row["output_tokens_per_second"] for row in rows),
        "runs": rows,
    }
    path = save_new(args.output, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    # Engine cleanup is owned by its atexit hook. Do not call exit() twice.


if __name__ == "__main__":
    main()
