"""Sequential localhost SSE client; chunk timestamps are NOT per-token timings."""
import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from records import fingerprint, save_new


def read_stream(lines, start, now=time.perf_counter):
    first = None
    events = []
    chunks = []
    done = False
    for raw in lines:
        line = raw.decode("utf-8").strip()
        if not line.startswith("data:"):
            continue
        data = line[5:].strip()
        if data == "[DONE]":
            done = True
            break
        payload = json.loads(data)
        if "error" in payload:
            raise ValueError("Server returned an SSE error")
        choices = payload.get("choices", [])
        content = choices[0].get("delta", {}).get("content") if choices else None
        if content:
            elapsed = now() - start
            if first is None:
                first = elapsed
            events.append(elapsed)
            chunks.append(content)
    if not done:
        raise ValueError("Incomplete SSE response (missing [DONE]); discard this run")
    if first is None:
        raise ValueError("No visible content; first-content latency undefined")
    return {"first_content_seconds": first, "end_to_end_seconds": now() - start,
            "content_events": len(events), "content_event_seconds": events,
            "response_text": "".join(chunks)}


def request(base, model, prompt, timeout):
    payload = dict(model=model, prompt=prompt, max_tokens=64, temperature=0.0,
                   ignore_eos=True, stream=True)
    req = urllib.request.Request(base + "/v1/chat/completions",
                                 json.dumps(payload).encode(), {"Content-Type": "application/json"})
    # Ignore system HTTP proxies for localhost; never attach API credentials.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    start = time.perf_counter()
    with opener.open(req, timeout=timeout) as response:
        if "text/event-stream" not in response.headers.get("Content-Type", ""):
            raise ValueError("Expected an SSE response")
        return read_stream(response, start)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workload", required=True)
    parser.add_argument("--cache-mode", choices=("naive", "radix"), required=True,
                        help="Declared server setting; restart the server yourself with the matching flag")
    parser.add_argument("--server-commit", required=True, help="git -C third_party/mini-sglang rev-parse HEAD")
    parser.add_argument("--model", default="Qwen/Qwen3-0.6B", help="Protocol model field; server hosts one model")
    parser.add_argument("--base-url", default="http://127.0.0.1:1919")
    parser.add_argument("--timeout", type=float, default=180)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    url = urllib.parse.urlsplit(args.base_url)
    if url.scheme != "http" or url.hostname not in ("127.0.0.1", "localhost") or url.username or url.password or url.path not in ("", "/") or url.query or url.fragment:
        parser.error("Run on the server using a plain localhost HTTP URL")
    if Path(args.output).exists():
        parser.error("Choose a new output file")
    lock = json.loads((Path(__file__).resolve().parents[1] / "versions.json").read_text(encoding="utf-8"))
    if args.server_commit != lock["mini"]["commit"]:
        parser.error("Server commit differs from versions.json; record and review the dependency change first")
    workload = json.loads(Path(args.workload).read_text(encoding="utf-8"))
    report = {
        "schema": "mini-client-v1", "cache_mode_declared": args.cache_mode,
        "server_commit_declared": args.server_commit, "workload_sha256": fingerprint(workload),
        "provenance": workload["provenance"], "output_limit": 64,
        "timing_scope": "client localhost HTTP including transport, tokenization, scheduling, compute, detokenization",
        "notes": "First visible content chunk, not exact TTFT. No token throughput or TPOT derived from SSE counts. Cache mode and commit supplied by operator, not verified via HTTP.",
        "runs": [],
    }
    base = args.base_url.rstrip("/")
    try:
        for _ in range(2):
            request(base, args.model, workload["warmup_prompt"], args.timeout)
        for row in workload["requests"]:
            metrics = request(base, args.model, row["prompt"], args.timeout)
            report["runs"].append({key: value for key, value in row.items() if key != "prompt"} | metrics)
            print(f"{row['group']} {row['index']:02d}: {metrics['end_to_end_seconds']:.4f}s", flush=True)
    except (OSError, ValueError, urllib.error.URLError) as exc:
        # Partial data is diagnostic only; never presented as a successful matrix.
        report["status"] = "incomplete"
        report["error_type"] = type(exc).__name__
        save_new(args.output, report)
        print("Request failed. Saved incomplete diagnostic; inspect the server terminal.")
        return 1
    report["status"] = "complete"
    save_new(args.output, report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
