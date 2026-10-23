"""Train a small MLP from geometric examples; no image model, LLM, API, or hardware."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
from collections import Counter

# Small matrices: avoid spawning a large BLAS worker pool.
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FEATURES = ["target_x", "target_y", "base_x", "base_y", "relative_x", "relative_y", "radius", "radius_squared"]


def save_new(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.write("\n")


def validate_data(data):
    if data.get("schema") != 1 or data.get("feature_names") != FEATURES:
        raise ValueError("Unsupported dataset schema or feature order")
    seen = set()
    groups = {split: [] for split in ("train", "validation", "test", "ood")}
    targets = set()
    for scene in data["scenes"]:
        if scene["id"] in seen or scene["split"] not in groups:
            raise ValueError("Duplicate scene or unknown split")
        seen.add(scene["id"])
        target = tuple(scene["target"][key] for key in ("x", "y", "z"))
        if target in targets:
            raise ValueError("Repeated target across scenes")
        targets.add(target)
        ids = [candidate["id"] for candidate in scene["candidates"]]
        if not ids or len(ids) != len(set(ids)):
            raise ValueError("Missing or duplicate candidates")
        for candidate in scene["candidates"]:
            if len(candidate["features"]) != len(FEATURES) or not np.isfinite(candidate["features"]).all():
                raise ValueError("Invalid features")
            if not isinstance(candidate["feasible"], bool):
                raise ValueError("Invalid label")
        groups[scene["split"]].append(scene)
    if not all(groups.values()):
        raise ValueError("Every split must contain scenes")
    return groups


def arrays(scenes):
    candidates = [candidate for scene in scenes for candidate in scene["candidates"]]
    return np.array([row["features"] for row in candidates]), np.array([float(row["feasible"]) for row in candidates])


def sigmoid(values):
    return 1 / (1 + np.exp(-np.clip(values, -40, 40)))


def forward(params, x):
    hidden = np.tanh(x @ params["w1"] + params["b1"])
    logits = hidden @ params["w2"] + params["b2"]
    return hidden, logits


def loss(logits, labels):
    return float(np.mean(np.logaddexp(0, logits) - labels * logits))


def fit(train_x, train_y, val_x, val_y, seed, epochs=160):
    random = np.random.default_rng(seed)
    params = {"w1": random.normal(0, .25, (train_x.shape[1], 24)), "b1": np.zeros(24),
              "w2": random.normal(0, .25, 24), "b2": np.array(0.)}
    first = {key: np.zeros_like(value) for key, value in params.items()}
    second = {key: np.zeros_like(value) for key, value in params.items()}
    history, best, best_loss, step = [], None, float("inf"), 0
    for epoch in range(epochs + 1):
        train_loss = loss(forward(params, train_x)[1], train_y)
        validation_loss = loss(forward(params, val_x)[1], val_y)
        history.append({"epoch": epoch, "train_bce": train_loss, "validation_bce": validation_loss})
        if validation_loss < best_loss:
            best_loss = validation_loss
            best = {key: value.copy() for key, value in params.items()}
            best_epoch = epoch
        if epoch == epochs:
            break
        for indices in np.array_split(random.permutation(len(train_x)), max(1, int(np.ceil(len(train_x) / 256)))):
            x, y = train_x[indices], train_y[indices]
            hidden, logits = forward(params, x)
            delta = (sigmoid(logits) - y) / len(y)
            dh = delta[:, None] * params["w2"] * (1 - hidden ** 2)
            gradients = {"w1": x.T @ dh, "b1": dh.sum(axis=0), "w2": hidden.T @ delta, "b2": delta.sum()}
            step += 1
            for key in params:
                first[key] = .9 * first[key] + .1 * gradients[key]
                second[key] = .999 * second[key] + .001 * gradients[key] ** 2
                params[key] -= .005 * (first[key] / (1 - .9 ** step)) / (np.sqrt(second[key] / (1 - .999 ** step)) + 1e-8)
    return best, history, best_epoch


def classification_metrics(scores, labels):
    predicted = scores >= .5
    truth = labels.astype(bool)
    tp = int(np.sum(predicted & truth)); fp = int(np.sum(predicted & ~truth))
    fn = int(np.sum(~predicted & truth)); tn = int(np.sum(~predicted & ~truth))
    recall = tp / (tp + fn) if tp + fn else None
    specificity = tn / (tn + fp) if tn + fp else None
    return {"n": len(labels), "positive_fraction": float(labels.mean()), "tp": tp, "fp": fp, "fn": fn, "tn": tn,
            "accuracy": float(np.mean(predicted == truth)),
            "balanced_accuracy": (recall + specificity) / 2 if recall is not None and specificity is not None else None}


def requests_for(scenes, params, mean, scale):
    requests = []
    for scene in scenes:
        # Only observable geometry is passed to the model. Labels do not enter ranking.
        x = (np.array([row["features"] for row in scene["candidates"]]) - mean) / scale
        scores = sigmoid(forward(params, x)[1])
        ranked = [scene["candidates"][i]["id"] for i in np.argsort(-scores, kind="stable")]
        nearest = sorted(scene["candidates"], key=lambda row: np.hypot(row["base"]["x"] + 1.55, row["base"]["y"] + 1.02))
        geometrical = [row["id"] for row in nearest]
        for method, ids, verify in [("fixed", [], False), ("nearest", geometrical[:1], False),
                                    ("geometry_verified", geometrical, True), ("mlp_raw", ranked[:1], False),
                                    ("mlp_verified", ranked, True)]:
            requests.append({"scene_id": scene["id"], "method": method, "candidate_ids": ids, "verify": verify})
    return requests


def summarize_replays(rows):
    groups = {}
    for row in rows:
        groups.setdefault((row["split"], row["method"]), []).append(row)
    return [{"split": split, "method": method, "episodes": len(group),
             "succeeded": sum(row["status"] == "SUCCEEDED" for row in group),
             "status_counts": dict(Counter(row["status"] for row in group)),
             "endpoint_checks_mean": float(np.mean([row["checks"] for row in group]))}
            for (split, method), group in groups.items()]


def run(dataset_file, output, epochs, seeds):
    if output.exists():
        raise ValueError("Use a new output directory; previous runs are never overwritten")
    data_bytes = dataset_file.read_bytes()
    data = json.loads(data_bytes)
    groups = validate_data(data)
    train_x, train_y = arrays(groups["train"])
    val_x, val_y = arrays(groups["validation"])
    mean, scale = train_x.mean(axis=0), train_x.std(axis=0)
    scale = np.maximum(scale, 1e-8)
    x = (train_x - mean) / scale
    vx = (val_x - mean) / scale
    report = {"schema": 1, "kind": "synthetic-geometric-training-and-kinematic-replay",
              "dataset_sha256": hashlib.sha256(data_bytes).hexdigest(), "core_sha256": data["core_sha256"],
              "environment": {"python": sys.version, "numpy": np.__version__, "platform": platform.platform()},
              "split_scenes": {key: len(value) for key, value in groups.items()},
              "candidate_coverage": {key: {"scenes_with_feasible_candidate": sum(any(c["feasible"] for c in s["candidates"]) for s in value),
                                          "candidate_count": sum(len(s["candidates"]) for s in value)}
                                     for key, value in groups.items()},
              "source_sha256": {name: hashlib.sha256((ROOT / "scripts" / name).read_bytes()).hexdigest()
                                for name in ("train_parking.py", "pickgo_dataset.cjs")},
              "training": {"epochs": epochs, "seeds": seeds, "optimizer": "Adam", "learning_rate": .005,
                           "batch_size": 256, "hidden_units": 24, "threshold": .5,
                           "checkpoint_selection": "minimum validation BCE; test/OOD not used"}, "runs": []}
    save_new(output / "manifest.json", report)
    for seed in seeds:
        params, history, best_epoch = fit(x, train_y, vx, val_y, seed, epochs)
        model = {"feature_names": FEATURES, "mean": mean.tolist(), "scale": scale.tolist(),
                 "params": {key: value.tolist() for key, value in params.items()},
                 "dataset_sha256": report["dataset_sha256"], "core_sha256": data["core_sha256"], "seed": seed}
        seed_dir = output / f"seed-{seed}"
        save_new(seed_dir / "model.json", model)
        save_new(seed_dir / "history.json", history)
        metrics = {}
        for split, scenes in groups.items():
            sx, sy = arrays(scenes)
            scores = sigmoid(forward(params, (sx - mean) / scale)[1])
            metrics[split] = classification_metrics(scores, sy)
            metrics[split]["always_negative_accuracy"] = float(np.mean(sy == 0))
        requests = requests_for(groups["test"] + groups["ood"], params, mean, scale)
        requests_file, replay_file = seed_dir / "requests.json", seed_dir / "replay.json"
        save_new(requests_file, requests)
        subprocess.run(["node", str(ROOT / "scripts/pickgo_dataset.cjs"), "replay", str(dataset_file.resolve()),
                        str(requests_file.resolve()), str(replay_file.resolve())], check=True, timeout=180)
        replays = json.loads(replay_file.read_text(encoding="utf-8"))
        entry = {"seed": seed, "best_epoch": best_epoch, "initial_train_bce": history[0]["train_bce"],
                 "best_validation_bce": history[best_epoch]["validation_bce"], "classification": metrics,
                 "replay_summary": summarize_replays(replays["rows"])}
        save_new(seed_dir / "metrics.json", entry)
        report["runs"].append(entry)
        print(json.dumps(entry, ensure_ascii=False))
    save_new(output / "report.json", report)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=ROOT / "data/parking-v1.json")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--epochs", type=int, default=160)
    parser.add_argument("--seeds", type=int, nargs="+", default=[7, 19, 43])
    args = parser.parse_args()
    if args.epochs < 1 or not args.seeds or len(set(args.seeds)) != len(args.seeds):
        parser.error("Positive epochs and distinct seeds required")
    run(args.data, args.output, args.epochs, args.seeds)


if __name__ == "__main__":
    main()
