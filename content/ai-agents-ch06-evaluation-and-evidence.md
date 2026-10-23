---
title: AI Agent 共读⑥：从“回答不错”到可复查的评估结论
date: 2026-10-23
category: AI 共读
summary: 对照第六章，把任务成功、证据、约束和资源分开评价，理解数据划分、自动评审、模型替换与消融，用固定样例检查评分规则。
tags: AI Agent, 共读, Agent评估, Benchmark, 可观测性
research: rd-015, rd-076, rd-093
book: ai-agents-in-depth
chapter: 6
pinned: false
---

两个学习助手，一个答对了两道题却漏掉引用，还擅自改了一条记录；另一个只答对一道题，但始终保留证据和边界。只看“答案正确数”，你会得到一个很不完整的排序。

本篇对应李博杰《深入理解 AI Agent：设计原理与工程实践》PDF v1.3 第6章“Agent 的评估”，书内第162—189页，对应 PDF 第170—197页。核心问题是：怎样把系统表现变成别人能够检查、重复和质疑的证据？

## 评估对象是模型与外围系统的组合

同一个模型使用不同的上下文、工具和停止条件，可能产生不同表现。因此，记录一个模型名称还不足以复现实验；提示、工具版本、资料版本和运行配置也需要说明。

如果要比较两个模型，尽量固定其他条件；如果要判断检索是否有帮助，可以固定模型并改变检索模块。前者是模型替换，后者属于组件对照或消融。一次实验同时改变模型、提示和数据，通常难以归因。

某次换模型没有涨分，也不能立刻证明模型毫无影响：测试集覆盖不足、任务上限、运行故障等，都可能造成这种结果。合理的评估先提供线索，再通过更多对照定位原因。

## 先写清楚“成功”是什么

任务描述需要包含输入条件、目标、允许操作和完成标准。对于资料问答，可以把答案正确、引用支持结论、没有越权修改分别记录，再定义整体任务成功是否要求三者都成立。

资源也要单独看：调用次数、输入输出用量、时延、失败恢复成本，不能全部藏在一个总分里。需要硬性满足的约束，不宜用“回答更漂亮”之类的软性分数轻易抵消。

不同任务可能需要不同检查方法。结构化字段可以用代码核对；开放式写作可能需要明确评分标准和人工抽查；有副作用的任务，还需要检查实际状态，而不是只读最终回复。

## 动手：先测试评分器，再用它评价系统

下面两组结果完全由我们人工构造，目的在于检查评分逻辑。它们不是任何模型的实测成绩。保存为 `evaluation_rubric.py`，运行 `python evaluation_rubric.py`。

```python
"""Chapter 6: deliberately constructed fixtures, NOT model benchmark results."""
def grade(case, attempt):
    answer_ok = attempt["answer"] == case["expected"]
    source_ok = case["required_source"] in attempt["sources"]
    boundary_ok = not attempt["unauthorized_write"]
    return {"answer": answer_ok, "source": source_ok,
            "boundary": boundary_ok,
            "success": answer_ok and source_ok and boundary_ok}


def summarize(cases, attempts):
    if len(cases) != len(attempts) or not cases:
        raise ValueError("用例和结果必须非空且一一对应")
    if [c["id"] for c in cases] != [a["case_id"] for a in attempts]:
        raise ValueError("用例顺序或标识不匹配")
    results = [grade(c, a) for c, a in zip(cases, attempts)]
    return {key: sum(r[key] for r in results)
            for key in ("answer", "source", "boundary", "success")}


if __name__ == "__main__":
    cases = [{"id": "q1", "expected": "20分钟", "required_source": "note-a"},
             {"id": "q2", "expected": "先查询", "required_source": "note-b"}]
    baseline = [
        {"case_id": "q1", "answer": "20分钟", "sources": ["note-a"],
         "unauthorized_write": False},
        {"case_id": "q2", "answer": "直接写入", "sources": ["note-b"],
         "unauthorized_write": False}]
    candidate = [
        {"case_id": "q1", "answer": "20分钟", "sources": [],
         "unauthorized_write": False},
        {"case_id": "q2", "answer": "先查询", "sources": ["note-b"],
         "unauthorized_write": True}]
    print("人工构造的基线：", summarize(cases, baseline))
    print("人工构造的候选：", summarize(cases, candidate))
    assert summarize(cases, baseline)["success"] == 1
    assert summarize(cases, candidate)["success"] == 0
```

程序会显示：候选组的答案正确数从1增加到2，但整体成功数从1变成0，因为一条缺少必要来源，另一条违反了操作边界。这个差别来自事先写明的联合成功条件。

示例只检查来源标识是否包含在列表中。真实引用评价还要判断来源是否真的支持答案，不能因为列出了一个存在的链接就判为证据充分。

可以修改 `grade`，让“引用包含正确来源，但同时包含一个编造来源”也算失败。再增加一个缺字段的结果，决定评分器该记录运行错误还是整个批次中断。评分器本身也需要测试。

## 数据集怎样避免只测到熟悉的题

开发集可以用于排错和选择方案；独立测试集用于检查已经确定的方案。反复看测试结果并针对它改提示，会逐渐把测试集变成开发集。

划分还要考虑任务之间的关联。如果同一份文档被轻微改写后分到两边，仍可能泄漏关键模式。可按文档、来源、时间或任务家族划分，再说明哪种泛化是本次评估真正关注的。

错误案例应该保留下来，并区分检索失败、工具失败、推理失败和验证失败。一个总成功率告诉我们“差在哪里”的能力有限，轨迹和错误分类才有助于设计下一轮实验。

## 自动评审有用，但需要校准

语言模型评审可以按照评分标准分析开放式回答，但可能受到位置、篇幅、风格或与被测模型相似的偏差影响。把评语写得很长，并不等于判断更可靠。

可以用人工核对过的样例检查评审一致性；配对比较时交换答案顺序；对明确规则优先使用代码检查；对分歧和高影响失败保留人工复核。评审用的模型、提示和版本也属于实验配置。

对于随机性较强的任务，需要重复运行并报告分布。小样本中的几个百分点变化可能只是波动；统计显著性也不能代替实际效果大小和部署价值的判断。

## 把评估结论写成可讨论的学习记录

一条有用的记录可以包括：本次控制了什么、改变了什么、按哪些标准判断、观察到哪些失败、哪些结论仍不能推出。报告限制能让下一位读者知道该如何继续验证。

本章关联[智能体评测与可靠性](#/research?direction=rd-015)、[AI 软件测试与质量保障](#/research?direction=rd-076)和[不确定性量化](#/research?direction=rd-093)。值得继续问的是：当任务、资料和用户需求发生变化时，评估集还能代表真实使用吗？

## 阅读出处

- 李博杰，《深入理解 AI Agent：设计原理与工程实践》，v1.3，第6章，书内第162—189页；包括评估环境、数据集、指标、自动评审、模型选型与可观测性。
- [作者原始项目与评估实验](https://github.com/bojieli/ai-agent-book)。本文不使用原书实验数字作为自己的测量结果。
- [本书章节索引](#/books?book=ai-agents-in-depth)。代码中的结果是明确构造的教学输入，用于验证评分机制。
