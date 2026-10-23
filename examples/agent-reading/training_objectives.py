"""Chapter 7: arithmetic of toy objectives; no model is trained."""
from math import log


def sft_loss(probability_of_target):
    if not 0 < probability_of_target <= 1:
        raise ValueError("目标概率必须处于(0,1]")
    return -log(probability_of_target)


def weak_reward(trajectory):
    return 1.0 - 0.1 * trajectory["calls"]


def checked_reward(trajectory):
    if not trajectory["verified"]:
        return -1.0
    return 2.0 * trajectory["correct"] - 0.1 * trajectory["calls"]


def expected_reward(p, first, second, reward):
    if not 0 <= p <= 1:
        raise ValueError("策略概率无效")
    return p * reward(first) + (1 - p) * reward(second)


if __name__ == "__main__":
    grounded = {"correct": True, "verified": True, "calls": 1}
    shortcut = {"correct": False, "verified": False, "calls": 0}
    print("目标概率0.2 / 0.8的SFT损失：",
          round(sft_loss(0.2), 3), round(sft_loss(0.8), 3))
    print("只奖省调用：", weak_reward(grounded), weak_reward(shortcut))
    print("加入验证门槛：", checked_reward(grounded), checked_reward(shortcut))
    for p in (0.2, 0.8):
        print("选择有依据路径的概率", p, "期望奖励",
              round(expected_reward(p, grounded, shortcut, checked_reward), 3))
    assert weak_reward(shortcut) > weak_reward(grounded)
    assert checked_reward(shortcut) < checked_reward(grounded)
