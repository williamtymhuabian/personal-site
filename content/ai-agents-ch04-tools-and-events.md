---
title: AI Agent 共读④：把工具做成清楚、可控、能恢复的接口
date: 2026-10-23
category: AI 共读
summary: 对照第四章，理解工具契约、权限、参数保真、MCP、按需发现和异步事件，用一个内存工具练习验证、拒绝与重复请求处理。
tags: AI Agent, 共读, 工具设计, MCP, 异步事件
research: rd-014, rd-031, rd-011
book: ai-agents-in-depth
chapter: 4
pinned: false
---

给 Agent 一个叫“处理资料”的函数，它究竟会读文件、改文件，还是把文件发出去？如果名称、参数和返回值没有说清楚，工具越强，误解的后果可能越大。

本篇对应李博杰《深入理解 AI Agent：设计原理与工程实践》PDF v1.3 第4章“工具”，书内第103—130页，对应 PDF 第111—138页。主线有两条：怎样让 Agent 找到合适的工具，以及怎样在真实的等待、失败和中断中使用工具。

## 工具首先是一份可检查的契约

可以从模型和运行时两个视角看同一个工具。模型需要知道何时使用、输入什么、会产生什么结果；运行时则需要验证调用是否合法、权限是否足够，以及真实执行是否成功。

一份清楚的契约应说明用途、适用边界、参数类型、必要条件和结果结构。例如，“追加一条学习笔记”比“处理资料”更容易界定；返回 `stored` 与记录标识，也比只返回一句“好了”更便于验证。

参数保真同样重要。用户指定的文本、路径、标识不能被接口悄悄改写成另一个对象。需要规范化时，应明确规范化规则；原文无法唯一匹配时，应报告冲突，而不是替用户猜一个目标。

工具描述帮助模型正确选择，程序校验负责兜住无效调用。把一条规则写进描述，并不能代替执行前的检查。

## 五类工具放进同一条任务链

感知工具获取信息，执行工具改变状态，协作工具协调其他执行者。事件触发让外部变化启动任务，用户沟通则把进展、结果或需要补充的条件传递给用户。

对学习助手而言，可以分别对应查笔记、保存笔记、请专门模块检查引用、接收课程更新事件和发送学习结果。它们不必都放进一个万能函数中：只读查询和有副作用的保存，应有不同的契约和权限。

工具粒度需要结合任务选择。过细会让一次简单操作产生很多调用；过粗又可能遮住关键边界。一个有用的判断是：这个操作能否被独立理解、验证、重试或撤销？

## MCP 和 Skills 解决了哪一部分

MCP 为工具和其他能力的互操作提供约定，能够减少每个系统各写一套接入方式的负担。协议兼容并不意味着工具可信，也不意味着用户已经授予了所有操作权限。

当能力数量很多时，一次注入全部定义会增加上下文和选择负担。分层目录、检索预筛及 Skills 的按需查阅，都可以用于控制暴露范围。发现工具、理解工具和获准执行工具，仍然是三个不同步骤。

如果一个工具说明里夹着“忽略用户约束”，应把它看成待处理的外部输入，而不是运行时权限的来源。权限应由独立的应用状态决定。

## 动手：一个不会真的写文件的笔记工具

下面的工具只修改进程内列表。它校验固定契约，检查应用传入的授权，并用请求标识避免相同内容在重试时重复追加。保存为 `tool_contract.py`，运行 `python tool_contract.py`。

```python
"""Chapter 4: a simulated append tool; no files or network are changed."""
import json


def execute(request, granted, receipts, notes):
    if set(request) != {"id", "tool", "arguments"}:
        raise ValueError("请求字段不完整或含未知字段")
    if request["tool"] != "append_note" or "notes:append" not in granted:
        raise PermissionError("工具或权限不允许")
    args = request["arguments"]
    if set(args) != {"text"} or not isinstance(args["text"], str):
        raise ValueError("工具参数必须是单个text字符串")
    if not args["text"].strip() or len(args["text"]) > 100:
        raise ValueError("正文需为1—100字")
    if not isinstance(request["id"], str) or not request["id"]:
        raise ValueError("需要有效请求标识")
    fingerprint = json.dumps(args, ensure_ascii=False, sort_keys=True)
    if request["id"] in receipts:
        previous, result = receipts[request["id"]]
        if previous != fingerprint:
            raise ValueError("同一请求标识不能对应不同正文")
        return result
    notes.append(args["text"])
    result = {"status": "stored", "count": len(notes)}
    receipts[request["id"]] = (fingerprint, result)
    return result


if __name__ == "__main__":
    request = {"id": "demo-1", "tool": "append_note",
               "arguments": {"text": "工具执行前先校验契约。"}}
    notes, receipts = [], {}
    for _ in range(2):
        print(execute(request, {"notes:append"}, receipts, notes))
    assert len(notes) == 1
    try:
        execute(request, set(), receipts, notes)
    except PermissionError as error:
        print("拒绝：", error)
```

两次相同请求都返回记录数1；移除授权后，请求被拒绝。这是内存中的单进程演示，不具备数据库事务、持久化去重或跨进程并发保证。

把同一请求标识对应的正文改掉，程序应拒绝；增加未知参数，也应拒绝。这样的失败比“似乎执行了另一个操作”更容易解释和恢复。

真实系统还要处理一种重要情况：客户端超时，但服务端可能已经执行成功。此时直接重试可能造成重复副作用，需要使用服务端支持的幂等键、查询执行状态，或明确的补偿机制。

## 异步任务需要状态，不能只剩一个等待框

第四章还讨论事件驱动架构。耗时操作开始后，系统需要知道它处于待执行、运行、完成、失败还是取消状态；用户在期间改变目标时，也应有确定的处理方式。

常见策略包括取消旧任务、把新请求排队，以及在资源允许时并行处理。选择取决于任务语义：检索旧问题的结果可以丢弃，已经发出的外部写入则不能靠取消本地等待自动撤回。

事件需要标识、来源和去重规则。任务结束前到达的新事件不一定是“开始一个新任务”的授权，也可能只是当前任务的新证据。把这些状态显式记录下来，才方便定位为什么发生了重复执行或结果串线。

## 这次学习可以留下什么

尝试给自己的一个工具写出三份材料：给模型看的描述、给程序检查的参数契约、给使用者看的失败说明。然后用同一个请求连续调用两次，检查系统能否解释每次发生了什么。

本章连接[工具使用与自主研究智能体](#/research?direction=rd-014)、[提示注入与智能体安全](#/research?direction=rd-031)及[智能体规划与长程任务执行](#/research?direction=rd-011)。一个值得研究的问题是：在不额外扩大权限的前提下，工具发现能否减少选择错误和调用开销？

## 阅读出处

- 李博杰，《深入理解 AI Agent：设计原理与工程实践》，v1.3，第4章，书内第103—130页；对应工具设计、MCP、异步事件和主动发现等章节。
- [作者原始项目与实验](https://github.com/bojieli/ai-agent-book)；具体协议和产品实现会演进，本文不把书中的实现描述当作当前接口规范。
- [本书章节索引](#/books?book=ai-agents-in-depth)。示例代码由本文独立编写，不会访问文件、网络或外部账户。
