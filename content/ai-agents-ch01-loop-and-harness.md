---
title: AI Agent 共读①：从工具循环到可靠执行，读懂 Agent 与 Harness
date: 2026-10-22
category: AI 共读
summary: 对照《深入理解 AI Agent》第一章，用一个无需 API 的原创小程序理解决策、工具、结果反馈与停止条件，再把这些概念映射到真实系统。
tags: AI Agent, 共读, Harness, 工具调用, 研究方向
research: rd-011, rd-014, rd-015, rd-031
book: ai-agents-in-depth
chapter: 1
pinned: false
---

一个聊天模型能写出操作步骤，一个 Agent 系统还需要真的执行步骤、看到结果，并知道什么时候该停止。理解这层差别，比先记住一串框架名称更有用。

这篇是《深入理解 AI Agent：设计原理与工程实践》的第一篇共读笔记。阅读依据是李博杰所著 PDF v1.3（2026-07-30），第1章“AI Agent 入门”，书内第7—27页，对应 PDF 第15—35页。本文以自己的语言重新组织知识，并补充原创练习；不是原书转载，也不替代原书。

读完后，试着回答三个问题：模型做了什么，外围程序做了什么，系统凭什么判断任务已经完成？

## 先把一个任务拆开来看

假设要做一个“学习资料助手”：收到“解释工具循环”后，先查找已有笔记，再给出有依据的解释。

- 模型或决策模块负责选择下一步：先查询，还是已经有足够信息可以回答。
- 上下文提供这一步能看到的材料：用户问题、查询结果、之前的操作及当前约束。
- 工具负责可执行能力：在资料中查询，而不是凭空声称已经查过。

原书用“LLM + 上下文 + 工具”建立现代 Agent 的概念框架。这里的加号表达的是组件之间的配合，不是一个严格的数学等式，也不表示只要把三个模块摆在一起就能获得可靠自主性。

可以用两个问题检查系统边界：它能看到什么，它实际能够做什么？缺少当前文档，模型就可能不知道资料里写了什么；没有查询工具，它也无法靠一句“我去查一下”访问资料。模型已经知道如何查询，和系统确实给了它查询能力，是不同层次的问题。

扩大能力时仍要按任务选择。资料助手先有只读查询就够了；支付、删除和发送信息等操作需要另外设计权限与验证，不能从“有一个通用执行工具”推导出“所有操作都已获准”。

## 工具调用为什么是一个循环

一次工具调用可以按四个阶段观察：选择工具及参数，运行工具，追加结构化结果，再决定是否继续。

例如，决策模块输出“查询主题：工具循环”，外围程序检查这个工具是否存在、参数是否合法，然后执行查询。返回“找到了这段解释”后，决策模块才有新的证据可以用于回答。

工具声明不是工具实现。模型生成一个名字，不会让函数自动运行；函数执行失败，也不能因为模型说“成功了”就当作成功。程序应当把真实结果或错误反馈给后续决策。

这里讨论的是可观察的动作与反馈。理解循环并不要求展示模型内部的思维链；真正需要留下的是调用了什么、输入是什么、结果是什么，以及完成条件有没有被满足。

如果任务总是同样的固定步骤，直接写工作流通常更容易测试。如果每一步都必须根据新证据调整，再考虑动态决策。工作流和 Agent 也可以组合：外层固定重要流程，局部允许探索。

## 动手：用离线程序看清反馈的作用

下面的小实验不接任何模型服务，不需要 API Key 或 GPU。它用脚本决策器代替 LLM，目的只是把“执行”和“回传结果”的区别做成可观察行为。它不是模型推理能力实验，也不复现原书的模型消融结果。

把下面代码保存为 `agent_loop.py`，使用 Python 3.10 或以上运行 `python agent_loop.py`。

```python
"""Original offline teaching demo. The scripted policy is NOT an LLM."""
import json

TOPICS = {
    "工具循环": "决策、执行工具、回传结果，再依据结果决定下一步。",
    "上下文工程": "为当前任务组织规则、证据、历史和状态。",
}


def lookup_topic(topic):
    if not isinstance(topic, str) or len(topic) > 40:
        raise ValueError("主题需要是40字以内的字符串")
    return {"topic": topic, "found": topic in TOPICS,
            "text": TOPICS.get(topic, "未找到，不能据此编造解释。")}


TOOLS = {"lookup_topic": lookup_topic}


def scripted_policy(messages):
    # A deterministic stand-in makes the feedback mechanism observable offline.
    if messages[-1]["role"] == "tool":
        result = json.loads(messages[-1]["content"])
        return {"kind": "final", "text": result["text"]}
    return {"kind": "tool", "name": "lookup_topic",
            "arguments": {"topic": "工具循环"}, "call_id": "lookup-1"}


def run_agent(feedback=True, max_turns=3):
    messages = [{"role": "user", "content": "解释工具循环"}]
    trace = []
    for turn in range(1, max_turns + 1):
        action = scripted_policy(messages)
        trace.append({"turn": turn, "kind": action["kind"]})
        if action["kind"] == "final":
            return {"status": "done", "answer": action["text"], "trace": trace}
        tool = TOOLS.get(action["name"])
        if tool is None:
            return {"status": "blocked", "trace": trace}
        messages.append({"role": "assistant", "tool_call": action})
        result = tool(**action["arguments"])
        if feedback:
            messages.append({"role": "tool", "call_id": action["call_id"],
                             "content": json.dumps(result, ensure_ascii=False)})
    return {"status": "max_turns", "trace": trace}


if __name__ == "__main__":
    for label, enabled in [("有反馈", True), ("不回传结果", False)]:
        print(label, json.dumps(run_agent(enabled), ensure_ascii=False))
```

正常模式下，第一轮调用查询，第二轮读到结果并结束；不回传工具结果时，脚本策略会重复查询，到第三轮被轮次上限停止。第二种情况不是模型“变笨”的证据：这是我们明确写进脚本策略的行为，用来演示缺少反馈时循环会怎样失去推进依据。

本次代码检查的结果是：有反馈返回 `done`，轨迹为 `tool → final`；关闭反馈返回 `max_turns`，轨迹为三次 `tool`。这是离线教学程序的执行结果，不能换算成真实 Agent 的成功率或成本收益。

建议做两个改动：把查询主题改成不存在的名字，观察“未找到”和编造答案有什么差别；再把 `max_turns` 改成1，观察预算不足如何改变结果。改变程序之后重新运行，记录自己的输出。

## Harness：围绕能力建立可验证的执行环境

第一章的另一条主线是 Harness。可以把它理解为模型外围负责组织信息、限制动作、检查结果和处理失败的工程部分。

在这个小例子里，工具注册表限制了可以调用的能力；参数检查拒绝不符合约定的输入；轮次上限让循环能终止；执行轨迹帮助检查程序确实做了什么。这些是 Harness 的最小影子，还远不是完整的生产实现。

真实系统还需要超时、异常处理、资源预算、持久状态、权限边界和验证逻辑。对于有副作用的工具，还要考虑重复执行：同一个动作因为重试运行两次，会不会产生两次扣款或重复发送？这类问题需要幂等设计或外部事务保证，不能只靠提示词提醒。

验证也应该落在任务本身。资料助手回答完一句话，并不代表所有要求都满足；如果任务要求“给出来源”，就应检查来源确实存在且支持相应解释。如果不具备必要信息，明确说明缺口，往往比反复调用同一个工具更合理。

## 三种“学习”不要混在一起

在对话里补充示例，可以改变当前任务中的输出，这属于上下文适应。把经验写成以后会被读取的文档或规则，改变的是外部资料。通过训练修改模型权重，则是参数更新。

它们都可能让后续表现发生变化，但持续时间、成本和验证方式不同。一次对话中的纠正，不等于模型已经永久学会；保存了文件，也不等于下一次一定会检索并正确使用它。

对自己的学习也可以采用类似区分：看过概念、写过笔记、独立跑过练习，留下的证据不同。方向榜只记录自己确认过的学习条目，不把“页面里有两篇文章”自动等同于“我已经掌握两章”。

## 把这次阅读变成下一步问题

如果更关心行动如何选择，可以继续看[智能体规划与长程任务执行](#/research?direction=rd-011)；如果更关心工具接口，可以进入[工具使用与自主研究智能体](#/research?direction=rd-014)；如果想研究什么时候才算完成，可以查看[智能体评测与可靠性](#/research?direction=rd-015)；如果关心不可信内容怎样影响执行，可以进入[提示注入与智能体安全](#/research?direction=rd-031)。

一次可操作的学习记录可以写成：“我能区分模型生成调用请求与程序执行工具；离线程序有反馈时两轮结束，关掉反馈后触发轮次上限；接下来想验证模型在收到错误结果时能否换一种策略。”其中前半段是已经观察到的行为，最后一句是待验证假设。

下一篇：[AI Agent 共读②：把上下文变成可管理的信息系统](#/post/ai-agents-ch02-context-engineering)。也可以回到[推荐书目与章节索引](#/books?book=ai-agents-in-depth)。

## 阅读出处与延伸

- 李博杰，《深入理解 AI Agent：设计原理与工程实践》，本地阅读版本 v1.3，第一章，书内第7—27页。本文概念导读依据该版本；在线版本可能已更新。
- [作者原始项目与配套实验](https://github.com/bojieli/ai-agent-book)。需要了解原书实验条件和实现时，以对应版本为准。
- [作者提供的在线阅读入口](https://bojieli.github.io/ai-agent-book/)。

本文代码是独立编写的教学示例，未复制原书代码。欢迎一起运行、指出问题，也欢迎在留言中提供具体输入、实际输出和自己的解释。
