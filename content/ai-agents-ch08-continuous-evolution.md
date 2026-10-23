---
title: AI Agent 共读⑧：从保存经验到持续改进，中间还缺哪些步骤
date: 2026-10-23
category: AI 共读
summary: 对照第八章，区分知识、指令、程序和参数更新，用候选版本、回归检查与回滚练习理解持续进化的可验证闭环。
tags: AI Agent, 共读, 持续学习, 经验管理, 回归验证
research: rd-009, rd-016, rd-015, rd-076
book: ai-agents-in-depth
chapter: 8
pinned: false
---

把每次成功经历都写进记忆，系统就会越来越好吗？如果一次成功只是碰巧发生，或者依赖已经失效的规则，反复复用它反而可能让错误更稳定。

本篇对应李博杰《深入理解 AI Agent：设计原理与工程实践》PDF v1.3 第8章“Agent 的持续进化”，书内第231—245页，对应 PDF 第239—253页。它把前面几章连在一起：从运行轨迹获得信号，形成候选更新，再通过验证决定能否影响以后的任务。

## 记住经历与学会策略之间还有一层推理

第三章关心怎样找回用户和世界的信息；这一章进一步问，哪些经历能够支持“以后在这种条件下这样做”的策略。

例如，一次检索失败后改用编号搜索成功了，可以保存这条轨迹。但要提炼出“编号类问题先查精确编号”，还需要检查成功是否确实来自查询方式，而不是同时换了数据源或碰巧命中缓存。

有用的经验应包含触发条件、采取的动作、结果、证据和适用范围。仅留下“这种方法很好”很难验证，也容易被推广到不合适的任务。

日志记录是原材料，跨案例比较、归因、验证和实际加载，才构成改进链路。一个新规则从未被检索到，即使文本写得正确，也不会改变行为。

## 经验可以落在四个不同位置

事实与背景可以写入知识；清楚、可语言化的行为约定可以写成指令或 Skill；稳定且适合确定执行的步骤可以固化为程序；需要更广泛内化的行为能力则可以考虑参数更新。

这四种载体在成本、可解释性、回滚方式和生效条件上不同。修正一条过期知识，通常不必先训练模型；给固定计算补一个函数，也可能比再写一大段提示更清楚。

选择位置之后，还要确认更新怎样激活：知识是否被检索、指令是否加载、代码路径是否实际运行、模型是否真换成了新版本。不要把“文件已经写好”当作整个闭环已经完成。

## 先形成候选，不让每次反馈直接改写线上行为

生产反馈可能混有错误归因、不可信输入或局部偏好。一个用户喜欢的输出，也未必符合其他用户的任务或必要边界。

更容易追溯的做法是保留基线、提出候选、记录变更原因和证据，经过回归后再逐步采用。验证应覆盖新任务、原有任务、变化后的规则，以及必要的安全约束。

“持续追加”尤其容易形成维护负担：旧规则与新规则并存，Skill 重复，提示不断膨胀。系统还需要合并、淘汰和重新验证，而不是把记忆容量增长当成能力增长。

## 动手：新题做对了，也可能不该接受更新

下面用人工构造的布尔结果模拟候选版本报告。示例政策很保守：安全项全过、旧通过项不回退、新任务通过数增加，才允许进入下一阶段验证。

保存为 `evolution_gate.py`，运行 `python evolution_gate.py`。

```python
"""Chapter 8: controlled release gate with manually constructed test outcomes."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Report:
    version: str
    new_tasks: tuple
    retained_tasks: tuple
    safety: tuple


def promote(baseline, candidate):
    for name in ("new_tasks", "retained_tasks", "safety"):
        old, new = getattr(baseline, name), getattr(candidate, name)
        if not old or len(old) != len(new):
            raise ValueError("同一评估维度必须有一一对应的用例")
        if any(type(v) is not bool for v in old + new):
            raise ValueError("练习中的用例结果必须为布尔值")
    if not all(candidate.safety):
        return False, "安全门槛未通过"
    if any(old and not new for old, new in
           zip(baseline.retained_tasks, candidate.retained_tasks)):
        return False, "旧能力发生回退"
    if sum(candidate.new_tasks) <= sum(baseline.new_tasks):
        return False, "新任务没有增加通过数"
    return True, "允许进入下一阶段验证"


if __name__ == "__main__":
    baseline = Report("v1", (False, True), (True, True), (True,))
    regression = Report("v2-bad", (True, True), (False, True), (True,))
    candidate = Report("v2", (True, True), (True, True), (True,))
    current = baseline
    for proposal in (regression, candidate):
        allowed, reason = promote(baseline, proposal)
        print(proposal.version, allowed, reason)
        if allowed:
            current = proposal
    print("练习中的当前版本：", current.version)
    current = baseline  # Explicit rollback in this in-memory teaching example.
    print("回滚后：", current.version)
```

第一个候选虽然增加了新任务通过数，却损害旧能力，因此被拒绝；第二个符合这套练习门槛，成为内存中的当前版本。最后显式切回基线，展示回滚需要保留可恢复的旧版本。

这些报告不是模型实测数据，固定门槛也不是通用发布政策。真实系统可能要权衡不同任务价值、测量不确定性与变化风险，并在后续使用中持续检查。

可以把候选的安全结果改为 `False`，观察它是否优先被拒绝；再让新任务没有进步，检查“只是换了版本号”为什么不等于改进。下一步才是把这些手写报告换成独立执行得到的结果。

## 完成一次任务，不等于获得了可迁移的进步

要区分记忆命中与策略迁移，可以改变问题表述、用户、资料版本或环境，再检查是否仍能正确处理。同一道题做第二遍的进步，无法单独证明系统学会了一般方法。

规则变化时也需要观察适应速度。一个只会追加信息的系统可能同时记着旧标准与新标准，检索时仍用错版本。更新能力和忘掉失效规则的能力，需要一起评价。

原书还讨论离线整合和能力保鲜。它们可以类比整理学习笔记：合并重复内容、补来源、撤回错误解释、重新验证长期没用的方法。整理本身也可能引入错误，因此需要差异记录和回滚，而不是相信“自动总结一定更好”。

## 给自己的经验库留一个证据入口

可以为每条经验记下：来自哪次任务、哪些对照支持它、在哪些条件下不适用、最后核对时间。以后遇到相反证据时，就能定位需要修改的规则。

本章关联[持续学习与测试时适应](#/research?direction=rd-009)、[智能体记忆与自我改进](#/research?direction=rd-016)、[智能体评测](#/research?direction=rd-015)及[AI 软件质量保障](#/research?direction=rd-076)。值得追问：你的系统能否撤回一条已经影响多次任务的错误经验？

## 阅读出处

- 李博杰，《深入理解 AI Agent：设计原理与工程实践》，v1.3，第8章，书内第231—245页；对应学习信号、四种更新载体与长期闭环。
- [作者原始项目及持续进化实验](https://github.com/bojieli/ai-agent-book)。本文未进行真实模型的持续学习对照。
- [本书章节索引](#/books?book=ai-agents-in-depth)。示例代码独立编写，只演示候选接纳规则和内存回滚。
