from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from grid_rl import Grid, MAPS, train, update, evaluate, shortest_length


class GridChecks(unittest.TestCase):
    def test_goal_is_true_termination_and_cannot_be_stepped_twice(self):
        env = Grid(MAPS['train-a'])
        env.reset((4, 5))
        _, reward, terminated, truncated, _ = env.step(3)
        self.assertEqual(reward, 1.)
        self.assertTrue(terminated)
        self.assertFalse(truncated)
        with self.assertRaises(ValueError):
            env.step(3)

    def test_timeout_is_truncation_and_collision_does_not_move(self):
        env = Grid(MAPS['train-a'], max_steps=1)
        env.reset()
        _, _, terminated, truncated, info = env.step(0)
        self.assertEqual(env.position, (1, 1))
        self.assertTrue(info['collision'])
        self.assertFalse(terminated)
        self.assertTrue(truncated)

    def test_bootstrap_stops_only_at_true_terminal_state(self):
        q = {('next',): [2., 1., 0., 0.]}
        update(q, ('state',), 0, 1., ('next',), True, alpha=1., gamma=.5)
        self.assertEqual(q[('state',)][0], 1.)
        update(q, ('state',), 0, 1., ('next',), False, alpha=1., gamma=.5)
        self.assertEqual(q[('state',)][0], 2.)

    def test_training_changes_values_and_is_reproducible(self):
        first, history = train(7, episodes=30)
        second, repeated = train(7, episodes=30)
        self.assertEqual(first, second)
        self.assertEqual(history, repeated)
        self.assertTrue(any(value != 0 for values in first.values() for value in values))

    def test_evaluation_keeps_test_maps_separate_and_reports_raw_failures(self):
        q, _ = train(7, episodes=5)
        before = {key: values[:] for key, values in q.items()}
        rows = evaluate(q)
        self.assertEqual(q, before)
        self.assertEqual(len(rows), 45)
        self.assertEqual({row['split'] for row in rows}, {'train', 'test'})
        self.assertTrue(all(row['oracle_shortest_length'] is not None for row in rows))


if __name__ == '__main__':
    unittest.main()
