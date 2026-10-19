"""Tooling fixtures only: no torch, CUDA, network or model execution."""
import copy
import io
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from collect_results import clean_report, nano_pairs
from mini_client import read_stream
from mini_requests import common_length, prepare
from run_matrix import matrix


def fixture():
    return {"nano_commit": "a" * 40, "gpu": "FIXTURE GPU", "arguments": {
        "mode": "eager", "batch_size": 1, "prompt_tokens": 128, "new_tokens": 64,
        "warmups": 2, "repeats": 5, "seed": 42, "max_model_len": 2048,
        "max_batched_tokens": 2048, "memory_fraction": 0.5, "model": "/private/model"},
        "provenance": {"python": "3.11.0", "packages": {"torch": "2.8.0+cu128"},
                       "model_config_hashes": {"config.json": "b" * 64},
                       "script_hashes": {"nano_bench.py": "c" * 64}},
        "runs": [{"seconds": 1, "output_tokens": 64, "output_tokens_per_second": 64,
                  "peak_allocated_mib": 100, "peak_reserved_mib": 128,
                  "input_ids_sha256": "d" * 64} for _ in range(5)],
        "text": "private response", "executable": "/private/python"}


class ToolTests(unittest.TestCase):
    def test_matrix_contains_exact_pairs(self):
        self.assertEqual(len(matrix("hf")), 6)
        rows = matrix("nano")
        self.assertEqual(len(rows), 12)
        for i in range(0, len(rows), 2):
            a, b = rows[i:i+2]
            self.assertEqual({a["mode"], b["mode"]}, {"eager", "graph"})
            self.assertEqual({k: v for k, v in a.items() if k != "mode"},
                             {k: v for k, v in b.items() if k != "mode"})

    def test_sse_ignores_role_only_and_does_not_count_tokens(self):
        stream = io.BytesIO(b'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n'
                            b'data: {"choices":[{"delta":{"content":"multiple words"}}]}\n\n'
                            b'data: [DONE]\n\n')
        times = iter([10.25, 10.75])
        row = read_stream(stream, 10, now=lambda: next(times))
        self.assertEqual(row["first_content_seconds"], 0.25)
        self.assertEqual(row["content_events"], 1)
        self.assertEqual(row["end_to_end_seconds"], 0.75)
        self.assertNotIn("output_tokens", row)

    def test_sse_requires_completion_and_visible_content(self):
        with self.assertRaises(ValueError):
            read_stream([], 0)
        with self.assertRaises(ValueError):
            read_stream([b"data: [DONE]\n"], 0)

    def test_prefix_is_token_based(self):
        self.assertEqual(common_length([1, 2, 3], [1, 2, 9]), 2)
        self.assertEqual(common_length([1], [1, 2]), 1)

    def test_prepared_requests_have_equal_length_controls(self):
        class FixtureTokenizer:
            def __init__(self):
                self.words = {}

            def encode(self, text, add_special_tokens=True):
                return [self.words.setdefault(word, len(self.words)) for word in text.split()]

        prepared = prepare(FixtureTokenizer(), count=12, repeat=4)
        rows = prepared["requests"]
        self.assertEqual(len(rows), 24)
        for index in range(0, 24, 2):
            self.assertEqual(rows[index]["input_tokens"], rows[index+1]["input_tokens"])
        self.assertGreater(rows[2]["max_previous_common_tokens"], rows[3]["max_previous_common_tokens"])

    def test_export_excludes_private_fields_recursively(self):
        raw = fixture()
        raw["provenance"]["declared_versions"] = {"server": "/private/server"}
        cleaned = clean_report(raw)
        serialized = json.dumps(cleaned)
        self.assertNotIn("private", serialized)
        self.assertNotIn("executable", serialized)
        self.assertEqual(len(cleaned["runs"]), 5)

    def test_pair_rejects_different_workloads_or_environment(self):
        eager = clean_report(fixture()) | {"record": 1}
        raw = fixture()
        raw["arguments"]["mode"] = "graph"
        graph = clean_report(raw) | {"record": 2}
        self.assertEqual(len(nano_pairs([eager, graph])), 1)
        for field in ("workload", "environment", "smoke"):
            changed = copy.deepcopy(graph)
            if field == "workload":
                changed["runs"][0]["input_ids_sha256"] = "e" * 64
            elif field == "environment":
                changed["provenance"]["packages"]["torch"] = "different"
            else:
                changed["settings"]["repeats"] = 1
            self.assertEqual(nano_pairs([eager, changed]), [])

    def test_missing_tokens_and_nonfinite_measurements_rejected(self):
        for value in (float("nan"), float("inf"), -1):
            raw = fixture()
            raw["runs"][0]["seconds"] = value
            with self.assertRaises(ValueError):
                clean_report(raw)
        raw = fixture()
        raw["runs"][0]["output_tokens"] = 63
        with self.assertRaises(ValueError):
            clean_report(raw)

    def test_hf_mismatch_cannot_be_exported_as_performance(self):
        with self.assertRaises(ValueError):
            clean_report({"task": "compare", "manual_paths_equal_all_repeats": False,
                          "cache_equals_hf_generate": False})

    def test_bad_hash_cannot_form_a_comparison_pair(self):
        raw = fixture()
        raw["provenance"]["model_config_hashes"] = {}
        with self.assertRaises(ValueError):
            clean_report(raw)


if __name__ == "__main__":
    unittest.main()
