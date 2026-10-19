"""Single-request HF baseline and fixed-length KV-cache correctness experiment."""
import argparse
import gc
import hashlib
import json
import statistics
import time
import random
from pathlib import Path
from records import provenance, save_new


def sync(device):
    import torch
    if str(device).startswith("cuda"):
        torch.cuda.synchronize(device)


def manual_generate(model, input_ids, new_tokens, use_cache):
    """One unpadded request; ignore EOS to keep both workloads identical.

    The first forward predicts generated token 1. The last sampled token is
    not forwarded, so the final cache is prompt_length + new_tokens - 1 long.
    Returns tensors on their original device; copying is outside timed regions.
    """
    import torch
    if new_tokens < 1 or input_ids.ndim != 2 or input_ids.shape[0] != 1:
        raise ValueError("Requires new_tokens >= 1 and a single unpadded input [1, L]")
    if input_ids.shape[1] < 1:
        raise ValueError("Input must contain at least one token")
    sequence = input_ids.clone()
    next_input = input_ids
    past = None
    forward_lengths = []
    with torch.inference_mode():
        for step in range(new_tokens):
            current = next_input if use_cache else sequence
            forward_lengths.append(current.shape[1])
            # Mask covers cached tokens AND the current input token(s).
            mask = torch.ones_like(sequence)
            output = model(
                input_ids=current, attention_mask=mask,
                past_key_values=past if use_cache else None,
                use_cache=use_cache, return_dict=True,
            )
            token = output.logits[:, -1, :].argmax(dim=-1, keepdim=True)
            sequence = torch.cat((sequence, token), dim=1)
            if use_cache:
                past = output.past_key_values
                next_input = token
        return sequence[:, input_ids.shape[1]:], forward_lengths


def measure(call, device):
    import torch
    gc.collect()
    sync(device)
    is_cuda = str(device).startswith("cuda")
    if is_cuda:
        torch.cuda.reset_peak_memory_stats(device)
    start = time.perf_counter()
    output = call()
    sync(device)
    elapsed = time.perf_counter() - start
    peak = torch.cuda.max_memory_allocated(device) / 2**20 if is_cuda else None
    return output, {"seconds": elapsed, "peak_allocated_mib": peak}


def build_parser():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, help="Local model directory")
    parser.add_argument("--task", choices=("baseline", "compare"), default="baseline")
    parser.add_argument("--prompt", default="用三句话解释操作系统中的虚拟内存。")
    parser.add_argument("--new-tokens", type=int, default=64)
    parser.add_argument("--repeat-prompt", type=int, default=1)
    parser.add_argument("--input-tokens", type=int, help="Exact synthetic token count; bypass chat template")
    parser.add_argument("--repeats", type=int, default=5)
    parser.add_argument("--warmups", type=int, default=1)
    parser.add_argument("--device", choices=("cuda", "cpu"), default="cuda")
    parser.add_argument("--dtype", choices=("float16", "bfloat16", "float32"), default="bfloat16")
    parser.add_argument("--output", default="results/hf.json")
    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    if Path(args.output).exists():
        parser.error("Output exists; choose a new result path")
    if args.input_tokens is not None and args.input_tokens < 1:
        parser.error("input-tokens must be positive")
    if min(args.new_tokens, args.repeats, args.repeat_prompt) < 1 or args.warmups < 1:
        parser.error("new-tokens, repeats, repeat-prompt, warmups must be positive")
    if not Path(args.model).is_dir():
        parser.error("--model must be a downloaded local directory")
    import torch
    import transformers
    from transformers import AutoModelForCausalLM, AutoTokenizer, GenerationConfig
    if args.device == "cuda" and not torch.cuda.is_available():
        parser.error("CUDA unavailable; run check_env.py before continuing")
    if args.device == "cpu" and args.dtype != "float32":
        parser.error("Use --dtype float32 for the CPU fallback")
    torch.manual_seed(42)
    tokenizer = AutoTokenizer.from_pretrained(args.model, local_files_only=True)
    prompt = "\n".join([args.prompt] * args.repeat_prompt)
    input_ids = tokenizer.apply_chat_template(
        [{"role": "user", "content": prompt}], tokenize=True,
        add_generation_prompt=True, enable_thinking=False, return_tensors="pt",
    ).to(args.device)
    if args.input_tokens is not None:
        pool = tokenizer.encode("GPU inference uses memory and schedules requests. 缓存与调度。", add_special_tokens=False)
        rng = random.Random(42)
        input_ids = torch.tensor([[rng.choice(pool) for _ in range(args.input_tokens)]], device=args.device)
    model = AutoModelForCausalLM.from_pretrained(
        args.model, torch_dtype=getattr(torch, args.dtype),
        attn_implementation="eager", local_files_only=True,
    ).to(args.device).eval()
    if input_ids.shape[1] + args.new_tokens > model.config.max_position_embeddings:
        parser.error("Input + output exceed model context limit")
    pad = tokenizer.pad_token_id
    if pad is None:
        pad = tokenizer.eos_token_id
    generation = GenerationConfig(
        do_sample=False, max_new_tokens=args.new_tokens, min_new_tokens=args.new_tokens,
        use_cache=True, eos_token_id=None, pad_token_id=pad,
    )

    def reference():
        with torch.inference_mode():
            return model.generate(
                input_ids=input_ids, attention_mask=torch.ones_like(input_ids),
                generation_config=generation,
            )[:, input_ids.shape[1]:]

    ids_cpu = input_ids[0].tolist()
    report = {
        "task": args.task, "arguments": vars(args),
        "provenance": provenance(args.model),
        "gpu": torch.cuda.get_device_name(0) if args.device == "cuda" else "cpu",
        "workload": "synthetic token IDs" if args.input_tokens else "chat template text",
        "torch": torch.__version__, "transformers": transformers.__version__,
        "input_tokens": input_ids.shape[1], "new_tokens": args.new_tokens,
        "input_ids_sha256": hashlib.sha256(json.dumps(ids_cpu).encode()).hexdigest(),
        "attention_backend": "eager", "fixed_length_ignore_eos": True,
        "timing_scope": "model execution + Python generation loop; excludes load, tokenize, decode",
    }
    if args.task == "baseline":
        for _ in range(args.warmups):
            reference()
        generated, timing = measure(reference, args.device)
        report.update(timing)
        report["output_tokens_per_second"] = generated.numel() / timing["seconds"]
        report["generated_token_ids"] = generated[0].tolist()
        report["text"] = tokenizer.decode(report["generated_token_ids"], skip_special_tokens=True)
    else:
        for _ in range(args.warmups):
            manual_generate(model, input_ids, args.new_tokens, False)
            manual_generate(model, input_ids, args.new_tokens, True)
        raw = {"no_cache": [], "cache": []}
        last_ids = {}
        lengths = {}
        all_equal = True
        for repeat in range(args.repeats):
            # Alternate order to reduce systematic run-order bias.
            modes = (False, True) if repeat % 2 == 0 else (True, False)
            for mode in modes:
                name = "cache" if mode else "no_cache"
                (tokens, lens), timing = measure(
                    lambda: manual_generate(model, input_ids, args.new_tokens, mode), args.device,
                )
                raw[name].append(timing)
                last_ids[name] = tokens[0].tolist()
                lengths[name] = lens
            all_equal &= last_ids["cache"] == last_ids["no_cache"]
        ref_ids = reference()[0].tolist()
        report["runs"] = raw
        report["median_seconds"] = {
            key: statistics.median(row["seconds"] for row in rows)
            for key, rows in raw.items()
        }
        report["speedup_no_cache_over_cache"] = (
            report["median_seconds"]["no_cache"] / report["median_seconds"]["cache"]
        )
        report["manual_paths_equal_all_repeats"] = all_equal
        report["cache_equals_hf_generate"] = last_ids["cache"] == ref_ids
        report["forward_input_lengths"] = lengths
        report["generated_token_ids"] = last_ids
        report["text_cache"] = tokenizer.decode(last_ids["cache"], skip_special_tokens=True)
    path = save_new(args.output, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"Saved: {path}")
    if args.task == "compare" and not (all_equal and report["cache_equals_hf_generate"]):
        print("Token mismatch: inspect first divergent position before making performance claims.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
