"""Original tabular Q-learning warm-up. Not a Tencent simulator or competition submission."""
import argparse
from collections import deque
import json
from pathlib import Path
import random

MOVES = ((0, -1), (0, 1), (-1, 0), (1, 0))
MAPS = {
    "train-a": ["#######", "#.....#", "#..#..#", "#..#..#", "#.....#", "#....G#", "#######"],
    "train-b": ["#######", "#.....#", "#.#...#", "#.#.#.#", "#...#.#", "#....G#", "#######"],
    "train-c": ["#######", "#.....#", "#...#.#", "#.#...#", "#.#...#", "#....G#", "#######"],
    "test-a": ["#######", "#.....#", "#.#.#.#", "#.#...#", "#...#.#", "#....G#", "#######"],
    "test-b": ["#######", "#.....#", "#..#..#", "#.#.#.#", "#.#...#", "#....G#", "#######"],
}
ROOT = Path(__file__).resolve().parents[1]


class Grid:
    def __init__(self, layout, max_steps=80):
        if max_steps < 1 or not layout or len({len(row) for row in layout}) != 1:
            raise ValueError("Invalid map or horizon")
        self.layout, self.max_steps = layout, max_steps
        goals = [(x, y) for y, row in enumerate(layout) for x, char in enumerate(row) if char == "G"]
        if len(goals) != 1:
            raise ValueError("Exactly one goal required")
        self.goal = goals[0]
        self.free = [(x, y) for y, row in enumerate(layout) for x, char in enumerate(row) if char != "#"]
        self.done = True

    def blocked(self, position):
        x, y = position
        return y < 0 or y >= len(self.layout) or x < 0 or x >= len(self.layout[0]) or self.layout[y][x] == "#"

    def observation(self):
        x, y = self.position
        # Position plus local occupancy only. No full-map oracle or map identity.
        return (x, y, *(int(self.blocked((x + dx, y + dy))) for dx, dy in MOVES))

    def reset(self, start=(1, 1)):
        if start not in self.free or start == self.goal:
            raise ValueError("Invalid start")
        self.position, self.steps, self.done = start, 0, False
        return self.observation()

    def step(self, action):
        if self.done:
            raise ValueError("Reset before stepping a completed episode")
        if type(action) is not int or not 0 <= action < 4:
            raise ValueError("Invalid action")
        dx, dy = MOVES[action]
        proposed = (self.position[0] + dx, self.position[1] + dy)
        collision = self.blocked(proposed)
        if not collision:
            self.position = proposed
        self.steps += 1
        terminated = self.position == self.goal
        truncated = self.steps >= self.max_steps and not terminated
        self.done = terminated or truncated
        reward = 1.0 if terminated else (-.12 if collision else -.02)
        return self.observation(), reward, terminated, truncated, {"collision": collision, "success": terminated}


def update(q, state, action, reward, next_state, terminated, alpha=.2, gamma=.97):
    values = q.setdefault(state, [0.] * 4)
    next_values = q.setdefault(next_state, [0.] * 4)
    target = reward + (0. if terminated else gamma * max(next_values))
    values[action] += alpha * (target - values[action])


def best_action(q, state):
    values = q.get(state, [0.] * 4)
    # Deterministic tie handling makes evaluation repeatable.
    return max(range(4), key=lambda action: values[action])


def train(seed, episodes=4000, max_steps=80):
    randomizer = random.Random(seed)
    q, history = {}, []
    layouts = [layout for name, layout in MAPS.items() if name.startswith("train-")]
    for episode in range(episodes):
        env = Grid(randomizer.choice(layouts), max_steps)
        state = env.reset(randomizer.choice([point for point in env.free if point != env.goal]))
        epsilon = max(.05, 1 - episode / max(1, episodes * .8))
        total, collisions = 0., 0
        while True:
            action = randomizer.randrange(4) if randomizer.random() < epsilon else best_action(q, state)
            next_state, reward, terminated, truncated, info = env.step(action)
            # Time limit is an artificial truncation, so bootstrap; true goal termination does not.
            update(q, state, action, reward, next_state, terminated)
            total += reward; collisions += info["collision"]
            state = next_state
            if terminated or truncated:
                break
        history.append({"episode": episode, "reward": total, "success": terminated, "steps": env.steps,
                        "collisions": collisions, "epsilon": epsilon})
    return q, history


def shortest_length(env, start):
    queue = deque([(start, 0)])
    seen = {start}
    while queue:
        point, length = queue.popleft()
        if point == env.goal:
            return length
        for dx, dy in MOVES:
            nxt = (point[0] + dx, point[1] + dy)
            if nxt not in seen and not env.blocked(nxt):
                seen.add(nxt); queue.append((nxt, length + 1))
    return None


def evaluate(q, seed=0, max_steps=80):
    randomizer = random.Random(seed)
    rows = []
    for name, layout in MAPS.items():
        for start in ((1, 1), (5, 1), (1, 5)):
            for method in ("q_learning", "greedy", "random"):
                env = Grid(layout, max_steps)
                state, total, collisions = env.reset(start), 0., 0
                while True:
                    if method == "q_learning":
                        action = best_action(q, state)
                    elif method == "random":
                        action = randomizer.randrange(4)
                    else:
                        available = [a for a in range(4) if state[2 + a] == 0]
                        action = min(available, key=lambda a: abs(state[0] + MOVES[a][0] - env.goal[0]) + abs(state[1] + MOVES[a][1] - env.goal[1])) if available else 0
                    state, reward, terminated, truncated, info = env.step(action)
                    total += reward; collisions += info["collision"]
                    if terminated or truncated:
                        break
                rows.append({"map": name, "split": name.split("-")[0], "start": list(start), "method": method,
                             "success": terminated, "truncated": truncated, "steps": env.steps, "reward": total,
                             "collisions": collisions, "oracle_shortest_length": shortest_length(env, start)})
    return rows


def save_new(path, data):
    with path.open("x", encoding="utf-8") as stream:
        json.dump(data, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.write("\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--episodes", type=int, default=4000)
    parser.add_argument("--seeds", type=int, nargs="+", default=[7, 19, 43])
    args = parser.parse_args()
    if args.episodes < 1 or any(seed < 0 for seed in args.seeds) or len(set(args.seeds)) != len(args.seeds):
        parser.error("Positive episodes and distinct non-negative seeds required")
    args.output.mkdir(parents=True, exist_ok=False)
    save_new(args.output / "config.json", {"kind": "original-grid-qlearning-warmup", "episodes": args.episodes,
             "seeds": args.seeds, "max_steps": 80, "alpha": .2, "gamma": .97, "maps": MAPS,
             "reward": {"goal": 1., "collision": -.12, "step": -.02},
             "boundary": "Not Tencent Kaiwu, not VLN, no official scores or server training claimed"})
    for seed in args.seeds:
        q, history = train(seed, args.episodes)
        save_new(args.output / f"q-{seed}.json", [{"state": list(state), "values": values} for state, values in sorted(q.items())])
        save_new(args.output / f"history-{seed}.json", history)
        save_new(args.output / f"evaluation-{seed}.json", evaluate(q, seed))
        print(json.dumps({"seed": seed, "training_episodes": len(history), "learned_states": len(q)}))


if __name__ == "__main__":
    main()
