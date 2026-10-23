---
title: AI Agent 共读⑤：代码生成之后，怎样知道修改真的解决了问题
date: 2026-10-23
category: AI 共读
summary: 对照第五章，理解 Coding Agent 的搜索、编辑、运行和恢复流程，用边界用例区分看似可用的补丁与满足要求的修改。
tags: AI Agent, 共读, Coding Agent, 程序修复, 软件测试
research: rd-071, rd-072, rd-073, rd-077
book: ai-agents-in-depth
chapter: 5
pinned: false
---

“代码能运行”和“代码满足需求”之间，隔着一个最容易被省略的步骤：验证。一个补丁可能修好了展示用例，却破坏边界输入；也可能因为改错文件而根本没有作用。

本篇对应李博杰《深入理解 AI Agent：设计原理与工程实践》PDF v1.3 第5章“Coding Agent 与代码生成”，书内第131—161页，对应 PDF 第139—169页。我们把重点放在可检查的开发流程，以及代码怎样成为精确表达和验证想法的工具。

## Coding Agent 的工作对象是整个修改过程

一个实际代码任务通常需要定位相关文件、理解接口与约束、提出修改、检查差异、运行验证，再根据失败结果继续调整。生成函数只是其中的一步。

原书讨论文件系统与通用执行能力在开放任务中的价值：中间数据可以留下来，代码可以组合原先没有的处理流程，结果也能被重新检查。但这种架构是一种工程选择，不是所有任务都必须具备任意代码执行能力。

对于一个小而固定的业务操作，受限工具可能更合适；对于需要清洗数据、分析仓库和组织复杂产物的任务，代码与工作区更有组合性。能力范围应与可用的隔离、权限和验证手段一起设计。

## 搜索、编辑与验证各有边界

搜索提供定位线索，不是读完整个项目的替代品。找到函数名后，还需要查看调用方、测试和数据约定，确认它实际参与哪条执行路径。

编辑应有清楚的目标和前置条件。例如，替换文本时要求旧片段唯一匹配，应用补丁时核对基线版本。找不到原片段，可能说明文件已变化；不应自动在另一个相似位置做修改。

验证则从需求建立可执行判断。正常情况、边界输入、无效输入以及相关旧行为，都可能需要覆盖。测试通过说明候选修改满足了这些检查，不能证明没有测试到的所有情况也正确，更不能把一次运行当成形式化证明。

## 动手：一个只修了表面的候选补丁

需求是把数值限制在指定区间，并在下界大于上界时拒绝输入。只看“负数应该变成0”这个用例，始终返回下界的函数也能通过；加入中间值、超上界和无效区间，差异就显现出来。

保存为 `patch_verification.py`，运行 `python patch_verification.py`。两个候选实现都是手写的，不会调用模型，也不会执行外部生成的代码。

```python
"""Chapter 5: two hand-written candidate fixes, no generated code execution."""
def wrong_clamp(x, lower, upper):
    return lower


def correct_clamp(x, lower, upper):
    if lower > upper:
        raise ValueError("下界不能大于上界")
    return max(lower, min(x, upper))


def verify(candidate):
    cases = [(-2, 0, 10, 0), (5, 0, 10, 5),
             (12, 0, 10, 10), (3, 3, 3, 3)]
    failures = []
    for x, lower, upper, expected in cases:
        actual = candidate(x, lower, upper)
        if actual != expected:
            failures.append({"input": (x, lower, upper),
                             "expected": expected, "actual": actual})
    try:
        candidate(5, 10, 0)
        failures.append({"input": (5, 10, 0), "expected": "ValueError"})
    except ValueError:
        pass
    return failures


def replace_exact(source, old, new):
    if not old or source.count(old) != 1:
        raise ValueError("原文匹配不是唯一，停止修改")
    return source.replace(old, new, 1)


if __name__ == "__main__":
    for candidate in (wrong_clamp, correct_clamp):
        failed = verify(candidate)
        print(candidate.__name__, "通过" if not failed else "失败", failed)
    assert verify(wrong_clamp) and not verify(correct_clamp)
    try:
        replace_exact("a = 1\na = 1\n", "a = 1", "a = 2")
    except ValueError as error:
        print("拒绝含糊修改：", error)
```

第一个候选在中间值、上界及无效区间检查中失败，第二个通过这组固定用例。最后的文本替换因为目标不唯一被拒绝，演示了“无法确定修改对象”时的一条明确停止路径。

继续增加一个全负数区间和两个端点用例。再问：如果输入包含小数、无穷大或非数值，需求该怎样定义？不要在实现完成后，才为了迁就已有代码临时修改标准。

## 失败结果应该推动下一步，而不是被隐藏

测试失败可能来自实现错误，也可能来自依赖、环境或用例本身。有效恢复首先要分清故障类别，再选择修复、重新配置或请求补充信息。

重试需要边界。遇到暂时性网络错误可以有限重试，但同一个语法错误不会因为重复运行而消失。连续相同失败应触发诊断或停止，而不是无限消耗预算。

对有副作用的操作，还要确认上一轮是否已经部分完成。版本控制能保存和比较修改，不代表所有外部变化都可由一次回退撤销。代码、生成数据和外部服务状态可能需要不同的恢复方法。

## 代码为什么能帮助思考

业务规则写成程序后，输入、分支和异常更容易被逐项检查。统计和计算任务也可以交给确定性工具，避免只靠自然语言心算。但程序实现的规则，仍可能不是用户真正想要的规则。

因此，“精确执行了错误规格”也是一种失败。开发流程需要在需求、实现和验证之间建立对应关系：哪段代码满足哪条要求，哪条检查能发现它被破坏。

原书还讨论生成多媒体、系统适配和创建新 Agent。它们共同展示代码的组合能力；生成出来的程序仍需独立检查，不能因为由另一个 Agent 创建就自动继承可信性。

## 从练习走向研究问题

记录本次学习时，可以附上失败用例及其揭示的错误假设。例如：“只检查下界输入，让一个恒定输出实现混过了检查；加入区间内部、上界和非法输入后才发现差别。”

对应方向包括[仓库级编程智能体](#/research?direction=rd-071)、[自动程序修复](#/research?direction=rd-072)、[自动测试生成](#/research?direction=rd-073)和[代码理解与重构](#/research?direction=rd-077)。进一步可以研究：哪些测试最能区分真正修复和过拟合补丁？

## 阅读出处

- 李博杰，《深入理解 AI Agent：设计原理与工程实践》，v1.3，第5章，书内第131—161页；重点对应5.1节的 Coding Agent 流程、恢复与工具，以及5.2节的代码能力。
- [作者原始项目与配套代码](https://github.com/bojieli/ai-agent-book)。
- [本书章节索引](#/books?book=ai-agents-in-depth)。本文程序是原创的局部机制练习，不是对真实编程智能体能力的评测。
