import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from train_parking import (arrays, classification_metrics, fit, forward, loss, requests_for,
                           save_new, sigmoid, validate_data)


class TrainingChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        script = "const a=require('./scripts/pickgo_dataset.cjs'); console.log(JSON.stringify(a.makeDataset(a.loadCore().S)));"
        cls.data = json.loads(subprocess.check_output(["node", "-e", script], cwd=ROOT, text=True, encoding="utf-8"))

    def test_scene_group_split_and_feature_contract(self):
        groups = validate_data(self.data)
        self.assertEqual({key: len(value) for key, value in groups.items()},
                         {"train": 96, "validation": 32, "test": 32, "ood": 32})
        self.assertEqual(arrays(groups["train"])[0].shape, (4608, 8))

    def test_leakage_duplicate_target_rejected(self):
        data = copy.deepcopy(self.data)
        data["scenes"][1]["target"] = copy.deepcopy(data["scenes"][0]["target"])
        with self.assertRaisesRegex(ValueError, "Repeated target"):
            validate_data(data)

    def test_invalid_feature_rejected(self):
        data = copy.deepcopy(self.data)
        data["scenes"][0]["candidates"][0]["features"][0] = float("nan")
        with self.assertRaisesRegex(ValueError, "Invalid features"):
            validate_data(data)

    def test_gradient_training_reduces_loss_and_saved_weights_reproduce(self):
        random = np.random.default_rng(51)
        x = random.normal(size=(128, 2))
        y = (x[:, 0] + x[:, 1] > 0).astype(float)
        params, history, epoch = fit(x[:96], y[:96], x[96:], y[96:], 7, epochs=50)
        self.assertLess(loss(forward(params, x[:96])[1], y[:96]), history[0]["train_bce"] * .4)
        self.assertEqual(epoch, min(range(len(history)), key=lambda i: history[i]["validation_bce"]))
        restored = {key: np.array(value.tolist()) for key, value in params.items()}
        np.testing.assert_allclose(forward(params, x)[1], forward(restored, x)[1])

    def test_ranking_never_reads_evaluation_labels(self):
        scenes = [next(s for s in self.data["scenes"] if s["split"] == "test")]
        params = {"w1": np.ones((8, 24)) * .1, "b1": np.zeros(24), "w2": np.ones(24), "b2": np.array(0.)}
        first = requests_for(scenes, params, np.zeros(8), np.ones(8))
        changed = copy.deepcopy(scenes)
        for candidate in changed[0]["candidates"]:
            candidate["feasible"] = not candidate["feasible"]
        self.assertEqual(first, requests_for(changed, params, np.zeros(8), np.ones(8)))

    def test_all_negative_metric_has_no_balanced_accuracy(self):
        metrics = classification_metrics(np.zeros(10), np.zeros(10))
        self.assertEqual(metrics["accuracy"], 1.)
        self.assertIsNone(metrics["balanced_accuracy"])

    def test_results_cannot_be_overwritten(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            file = Path(directory) / "result.json"
            save_new(file, {"first": 1})
            with self.assertRaises(FileExistsError):
                save_new(file, {"second": 2})
            self.assertEqual(json.loads(file.read_text()), {"first": 1})

    def test_server_entry_generates_trains_and_replays(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            config = Path(directory) / "config.json"
            config.write_text(json.dumps({"epochs": 1, "seeds": [7]}), encoding="utf-8")
            output = Path(directory) / "run"
            command = [sys.executable, str(ROOT / "scripts/run_server.py"), "--config", str(config),
                       "--core", str(ROOT / "vendor/pickgo-core.js"), "--output", str(output)]
            subprocess.run(command, check=True, capture_output=True, timeout=30)
            report = json.loads((output / "training/report.json").read_text(encoding="utf-8"))
            self.assertEqual(report["candidate_coverage"]["test"]["scenes_with_feasible_candidate"], 9)
            self.assertEqual(len(report["runs"][0]["replay_summary"]), 10)
            self.assertEqual(report["training"]["epochs"], 1)

    def test_numerically_stable_loss(self):
        self.assertTrue(np.isfinite(loss(np.array([-1000., 1000.]), np.array([1., 0.]))))
        self.assertTrue(np.isfinite(sigmoid(np.array([-1000., 1000.]))).all())


if __name__ == "__main__":
    unittest.main()
