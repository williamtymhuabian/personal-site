---
title: AI Agent 共读⑦：后训练之前，先想清楚数据、轨迹和奖励
date: 2026-10-23
category: AI 共读
summary: 对照第七章，区分预训练、SFT、偏好学习和强化学习，理解多轮信用分配与奖励投机，用一个小型目标函数练习观察优化方向。
tags: AI Agent, 共读, 后训练, SFT, 强化学习
research: rd-002, rd-006, rd-007, rd-008
book: ai-agents-in-depth
chapter: 7
pinned: false
---

后续实践：[腾讯开悟与强化学习服务器训练](#/post/kaiwu-rl-server-practice) 提供独立 Q-learning 热身；[从三本书到具身课题](#/post/embodied-kaiwu-training-roadmap) 把数据、评估和恢复策略连接成训练路线。

一个助手用更少的工具调用交出答案，究竟是学会了更高效的策略，还是直接省掉了必要的查询？答案取决于任务结果和验证过程。训练目标如果只奖励“少调用”，反而可能鼓励后者。

本篇对应李博杰《深入理解 AI Agent：设计原理与工程实践》PDF v1.3 第7章“模型后训练”，书内第190—230页，对应 PDF 第198—238页。本章讨论改变模型参数；它与前面通过上下文、知识和工具改变系统行为的方法相互配合。

## 先区分三种改变模型的方式

在本章讨论的自回归语言模型框架中，预训练通过大规模预测任务学习语言与知识表示；SFT 使用示范数据，让模型提高合适回答和动作序列的概率；强化学习则根据采样行为获得的反馈调整策略。

SFT 可以帮助模型学会稳定的输出形式和任务流程，但示范质量、覆盖范围和分布都很重要。强化学习允许探索不同动作，也依赖环境、奖励与采样预算，不会因为名字里有“强化”就自然获得更好的泛化。

原书用“模仿示范”和“从反馈中学习”构建直觉，并按常见训练路径展开。阅读时应把经验判断与普遍定律分开：不能据此推出 SFT 只能记忆、RL 一定泛化，也不能把某个固定先后顺序套到所有模型和任务上。

如果问题只是知识过期，先改善检索与资料治理可能更直接；如果模型反复不遵守稳定格式或决策习惯，才更有理由研究参数更新。选择更新位置，应从错误类型出发。

## Agent 的训练样本是一段交互，而不只是最后答案

多轮任务包含用户目标、模型动作、工具结果、状态变化与最后结论。相同答案可能对应不同路径：一条有真实查询依据，一条碰巧猜中，还可能有一条通过越权拿到了材料。

整理示范时要保留能解释行为的条件，同时区分哪些内容由模型产生、哪些由环境提供。工具返回值可以作为模型决策的输入，不能在没有区分角色的情况下，把整段记录都当作同一种输出目标来拟合。

失败轨迹也未必没有价值。它可能暴露工具错误、错误假设或不应采用的捷径。但“某条失败记录里包含正确答案”也可能泄漏目标，数据整理需要检查训练时和部署时能获得的信息是否一致。

## 结果奖励和过程约束需要一起设计

最终答对能提供结果信号，但很难单独解释长轨迹中哪一步值得强化，这就是多轮信用分配的困难。过程反馈可以更早指出问题，也可能把某种不必要的固定步骤变成新的优化目标。

比如要求每题必须查询三次，能够压制直接猜测，却可能惩罚本来就不需要查询的问题。更合适的检查应尽量贴近真实要求：是否取得必要证据、是否满足授权边界、是否完成规定的验证。

奖励模型或自动评审也是不完美的测量器。模型学会迎合测量器，不一定意味着用户目标更好地满足。除了观察平均奖励，还要检查真实任务表现、失败分布和奖励被钻空子的样例。

## 动手：同一条轨迹在不同奖励下会得到什么分数

下面只计算简化目标函数，不训练语言模型。`-log(p)` 用来观察目标输出概率与负对数损失的关系；两条手写轨迹则展示弱奖励如何偏好错误捷径。

保存为 `training_objectives.py`，运行 `python training_objectives.py`。

```python
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
```

目标概率从0.2变为0.8时，负对数损失约从1.609降到0.223。只奖励省调用时，错误捷径得到1.0，有依据的路径得到0.9；加入验证门槛后，两者分别为-1.0和1.9。

这些数字来自我们指定的公式和虚构轨迹，只说明目标函数的偏好。没有发生梯度更新、模型采样或策略学习，也不能由此证明真实系统采用这个奖励就能成功。

把正确路径的调用数改成很多次，看看成本惩罚会不会重新主导选择；再设计一条“通过验证器但答案错误”的轨迹，检查验证器与真实目标之间的缺口。

## 偏好、参数效率和蒸馏放在哪张地图里

人类或其他评审给出的偏好可以用于学习更符合要求的输出。不同方法可能使用奖励模型与策略优化，也可能直接利用偏好对进行优化，不能把所有偏好学习都等同于同一种 RL 流程。

参数高效微调减少需要更新的参数，并不自动解决坏数据、遗忘或评估不足。蒸馏则关注把教师行为或反馈转移给学生；教师自身的错误、任务覆盖以及学生实际访问到的条件，都可能影响效果。

原书后段讨论 on-policy 蒸馏与样本效率。初读可以先抓住它在解决什么：让学习信号更贴近学生实际产生的轨迹，而不只是背诵一批与当前行为分布脱节的答案。具体算法还需要结合实现、预算和独立评估来理解。

## 让一次后训练尝试成为可分析的实验

在开始训练前，先固定失败样例、基线与验证标准；整理合法可用、角色清楚的轨迹；用少量样本检查格式、损失和奖励是否符合预期；最后同时测试新能力与旧能力保留情况。

对应方向包括[强化学习后训练与偏好对齐](#/research?direction=rd-002)、[合成数据与数据质量](#/research?direction=rd-006)、[参数高效微调](#/research?direction=rd-007)及[模型蒸馏与压缩](#/research?direction=rd-008)。从模型实现入手的基础阅读可查看[从零构建大模型书目](#/books?book=llm-from-scratch)。

本次可以记录的问题是：“我的奖励究竟鼓励了什么行为？如果它被优化到极致，会不会偏离原来的目标？”

## 阅读出处

- 李博杰，《深入理解 AI Agent：设计原理与工程实践》，v1.3，第7章，书内第190—230页；涉及训练阶段、SFT、RL、数据环境、信用分配与蒸馏。
- [作者原始项目与训练实验](https://github.com/bojieli/ai-agent-book)。本文没有运行原书训练任务，也不把其成绩记作本次结果。
- [本书章节索引](#/books?book=ai-agents-in-depth)。本文代码为原创的目标函数算术练习。
