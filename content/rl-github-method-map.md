---
title: 强化学习 GitHub 学习地图：从 on-policy、off-policy 到开悟实战
date: 2026-10-29
category: 强化学习
summary: 用六个维度分清强化学习方法，按用途选择10个GitHub项目，串起表格学习、PPO、离线强化学习、多智能体与腾讯开悟。
tags: 强化学习, GitHub, on-policy, off-policy, PPO, 腾讯开悟
research: rd-002, rd-011, rd-012, rd-015, rd-020
pinned: false
---

强化学习有覆盖面很广的开源框架，但很难用一个仓库同时学好数学原理、单个算法实现、分布式训练和具体比赛。对我们目前的目标，更合适的组合是：用小实现理解更新公式，用成熟库建立对照，再读开悟环境里的完整数据链路。

本文核对日期为2026年10月29日。仓库按用途整理，不按 Star 或未经验证的比赛成绩排名。下面的阅读路线和练习是本站设计；本次完成资料调研，没有运行这些框架或进行开悟训练。

## 先把“好多类”拆成六个问题

### 1. 在学什么：价值、策略，还是两者一起？

价值方法估计一个动作未来能带来多少收益，例如 Q-learning、DQN。策略方法直接学习如何选择动作，例如 REINFORCE。Actor-Critic 同时训练策略和价值估计器，PPO、SAC 都可以放在这个范围里。

这里的 critic 是帮助估计回报或优势的模型，并不是人工评审。Actor-Critic 也不能直接翻译成“多智能体”：一个智能体同样可以有 actor 和 critic。

### 2. 谁生成数据：on-policy 与 off-policy

先记两个名字：行为策略负责采样，目标策略是我们希望改进或评估的策略。On-policy 强调使用与正在学习的策略相匹配的数据；off-policy 允许行为策略与目标策略不同。

SARSA 的下一步目标使用实际采到的下一动作；Q-learning 使用下一状态的最大 Q 值，因此即使行为采用带探索的策略，更新目标仍可对应贪心策略。用一个人为构造的数字例子理解：奖励为1，折扣0.9，下一状态两个动作的 Q 值分别为2和5，而实际采到第一个动作，那么 SARSA 的目标为2.8，Q-learning 的目标为5.5。这只是一次更新目标，不是训练结果。

PPO 通常归为 on-policy。它会固定一批由旧策略采集的数据，在有限轮次内反复做小批量更新；“同一批数据更新多次”不等于可以无限混入任意历史数据。DQN、TD3、SAC 则常借助经验回放进行 off-policy 学习。[PPO 算法说明](https://spinningup.openai.com/en/latest/algorithms/ppo.html)

### 3. 数据从哪里来：online 与 offline

Online RL 可以继续与环境交互收集新轨迹；offline RL 只用预先收集的数据学习。Off-policy 是策略与采样分布的关系，offline 是数据获取条件，两者不是同义词。

SAC 使用回放池仍可不断采样，属于在线 off-policy 的常见用法；离线设置下，数据覆盖不到的动作可能被错误高估，不能直接把普通在线训练器接到一份日志上就认为问题解决了。离线到在线则先用固定数据初始化，再允许交互。[强化学习方法分类参考](https://spinningup.openai.com/en/latest/spinningup/rl_intro2.html)

### 4. 是否学习环境：model-free 与 model-based

Model-free 方法不要求显式学习环境转移模型。Model-based 方法使用或学习动力学、世界模型等，再利用预测进行规划或策略学习。这里的 model 指环境模型，不是“有没有神经网络”：DQN 有神经网络，仍常被归为 model-free。

### 5. 有几个决策者：单智能体与多智能体

存在对手，不代表第一步就必须选择 MAPPO。王者荣耀1v1可以先研究一个策略如何面对固定对手；当对手也持续学习时，又出现对手分布变化。多智能体协作还可能研究集中训练、分散执行，即训练 critic 可以使用规则允许的联合信息，而执行时各策略只使用自己的观测。

“集中训练”不意味着可以在推理时读取不可见敌人；信息权限必须随任务协议确定。

### 6. 是否记忆历史：前馈网络与循环策略


前馈策略只处理当前输入；RNN/LSTM 可以用隐藏状态保留历史。这是网络和数据组织维度，不能与 on/off-policy 混成一层分类。PPO 可以配前馈网络，也可以配循环网络；循环策略需要正确处理序列、隐藏状态和回合边界。

因此，一份实验配置至少应回答：学什么、谁采样、数据是否固定、是否使用环境模型、有几个决策者、是否需要历史。

## 10个仓库，各自解决什么问题

### 1. Sutton & Barto 配套实现：先读懂更新公式

[ShangtongZhang/reinforcement-learning-an-introduction](https://github.com/ShangtongZhang/reinforcement-learning-an-introduction) 按《Reinforcement Learning: An Introduction》第二版章节组织 Python 实现，适合从 bandit、动态规划、蒙特卡洛和 TD 学到 SARSA、Q-learning。

建议先手算上面的一个转移，再对照实现中“下一动作怎么来”“终止时是否自举”。这是社区配套实现，不是书作者发布的全部习题答案。

### 2. CleanRL：把一个算法从头读到尾

[vwxyzjn/cleanrl](https://github.com/vwxyzjn/cleanrl) 的特点是单文件实现，适合逐行追踪采样、损失和参数更新。先读 [ppo.py](https://github.com/vwxyzjn/cleanrl/blob/master/cleanrl/ppo.py)，再对照 [DQN 文档](https://docs.cleanrl.dev/rl-algorithms/dqn/) 理解回放池、目标网络和探索。

阅读时画出三个边界：环境交互在哪里发生、哪些量不参与梯度、什么时候更新策略。原始环境的输入和动作空间有约定，这个教学 PPO 文件不能直接替换王者荣耀的结构化动作接口。

### 3. Stable-Baselines3：建立通用任务的基线

[DLR-RM/stable-baselines3](https://github.com/DLR-RM/stable-baselines3) 提供 PPO、DQN、SAC、TD3 等常用算法，适合先在 Gymnasium 兼容任务上建立可重复对照。

注意算法支持的动作空间不同。循环 PPO 和带动作掩码的 PPO 位于 [SB3-Contrib](https://github.com/Stable-Baselines-Team/stable-baselines3-contrib)，不能把它们当成 SB3 核心 PPO 默认具有的能力。即使支持 MultiDiscrete，也仍需适配开悟动作头之间的条件依赖。

### 4. Tianshou：横向比较多类算法

[thu-ml/tianshou](https://github.com/thu-ml/tianshou) 覆盖 on-policy、off-policy 和离线强化学习，适合围绕采样器、缓冲区和策略接口横向学习 DQN、PPO、SAC、CQL 等方法。

它适合当“方法地图”；先选一个任务比较两个算法即可，不必为了全面而同时安装全部环境。仓库把多智能体与基于模型的支持标为实验性，不能默认所有功能有相同成熟度。

### 5. Ray RLlib：理解规模化训练

[ray-project/ray](https://github.com/ray-project/ray) 中的 RLlib 提供分布式采样、学习及多智能体支持。其 [官方文档](https://docs.ray.io/en/latest/rllib/index.html) 适合在需要多采样进程、策略映射和训练扩展时阅读。

学习重点是数据如何从采样端到学习端，以及策略版本如何分发。工程抽象更多，适合在理解单进程训练后使用；增加采样进程并不能自动解决奖励或动作错误。

### 6. MARLlib：多智能体算法的对照入口

[Replicable-MARL/MARLlib](https://github.com/Replicable-MARL/MARLlib) 基于 Ray/RLlib，整理多智能体算法与环境接入，适合进一步研究 MAPPO 等方法。

阅读时先问：哪些网络共享参数、critic 看到了什么、执行策略能看到什么？复现需按仓库依赖锁定版本，不能将旧项目配置与最新 RLlib 随意混装。

### 7. PettingZoo：学习多智能体环境接口

[Farama-Foundation/PettingZoo](https://github.com/Farama-Foundation/PettingZoo) 是多智能体环境与 API 项目，提供 AEC 和 Parallel 两类接口。它不是又一个 PPO 实现库。

它适合帮我们区分轮流决策与并行决策，检查某个 agent 结束后剩余 agent 的生命周期。环境接口理顺以后，再连接合适的学习算法。

### 8. CORL：离线数据如何用于学习

[corl-team/CORL](https://github.com/corl-team/CORL) 提供离线与离线到在线方法的单文件实现，包括 CQL、IQL、TD3+BC 等。

如果后续积累游戏或机器人轨迹，可以借它学习数据覆盖、行为约束和分布外动作问题。只有观战视频或文字复盘，未必具有动作、奖励和边界标注，不能自动成为可训练的离线 RL 数据集。

### 9. DreamerV3：世界模型路线

[danijar/dreamerv3](https://github.com/danijar/dreamerv3) 用学习到的世界模型支持想象轨迹中的策略训练，适合接到 [机器人世界模型与预测规划](#/research?direction=rd-020)。仓库说明它是 DreamerV3 的重新实现。

建议在学过 model-free 基线后再读：先理解潜在状态、模型预测和想象回报，再判断自己的任务是否需要这条路线。它的存在并不意味着开悟起步必须训练世界模型。

### 10. 腾讯 hok_env：接到王者荣耀的数据链路

[tencent-ailab/hok_env](https://github.com/tencent-ailab/hok_env) 是腾讯公开的 HoK 环境与训练框架，包含 PPO 实现；[1v1 目录](https://github.com/tencent-ailab/hok_env/tree/master/aiarena/1v1) 可从 actor 与 learner 两端阅读。

这是理解环境、采样和学习如何连接的资料入口。运行还涉及 Gamecore 及相应获取条件；公开仓库和旧版说明不等于当前赛段开发包。先固定目标版本，再核对安装和接口。

## 针对我们的学习顺序

第一步，把本站 [Q-learning 热身](#/post/kaiwu-rl-server-practice) 与配套书代码对照：写清状态、动作、更新目标和终止规则。完成标准是能解释一个数值更新，而不是只看到曲线上升。

第二步，读 CleanRL PPO，手工标出 observation、action、old log-probability、value、reward、advantage 六类量。用同一个采样批次解释一次 PPO 更新。

第三步，读官方 HoK actor/learner：追踪一条样本的产生、动作掩码、回报计算和参数同步。把不适配之处记成接口清单，再进入 [开悟王者荣耀解题路线](#/post/kaiwu-hok-rl-solution-playbook)。

第四步，遇到明确研究问题再分支：离线轨迹选 CORL；多智能体协作选 MARLlib 与 PettingZoo；服务器扩展读 RLlib；世界模型读 DreamerV3。Tianshou 或 SB3 可用于通用环境的对照，而不是同时堆叠所有框架。

## 三个能检验理解的练习

练习一：把“PPO + LSTM + 自博弈”放回六个分类维度。参考答案：通常是 on-policy、actor-critic、model-free，训练仍在线交互；LSTM 描述记忆，自博弈描述对手生成方式。不能仅凭这几个词判断是否采用集中训练。

练习二：为什么“有经验回放”不能推出“离线 RL”？参考答案：在线 off-policy 算法也使用回放池；是否还能收集新数据，才决定这里的 online/offline 条件。

练习三：为什么读懂一个 Gym PPO 还不能提交开悟？参考答案：观测、条件动作、合法性掩码、对局结束与模型导出都可能不同；必须核对对应开发包的数据契约。

可把一份“六维分类笔记”、一次 PPO 数据流标注和一张开悟接口清单，分别作为个人学习记录，引用 [强化学习方向](#/research?direction=rd-002)。如果后续用于 Agent 后训练，再与 [共读第7章](#/post/ai-agents-ch07-post-training-and-rewards) 的轨迹、奖励和数据质量联系起来；游戏控制与语言模型后训练的实现仍需分别核对。
