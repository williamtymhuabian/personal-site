---
title: AI Agent 共读⑩：协作怎样带来新证据，而不是更多重复讨论
date: 2026-10-23
category: AI 共读
summary: 对照第十章，从上下文共享与协作拓扑理解多 Agent 系统，用移交包、证据合并和版本检查练习控制信息丢失、冲突和错误级联。
tags: AI Agent, 共读, 多智能体, 协作, 信息移交
research: rd-012, rd-011, rd-015, rd-081
book: ai-agents-in-depth
chapter: 10
pinned: false
---

让三个助手反复赞同同一个答案，不会自动增加三个独立证据。协作是否值得，关键在于它有没有带来新的信息、更好的验证或实际的任务并行，而不只是更多对话。

这篇完成李博杰《深入理解 AI Agent：设计原理与工程实践》PDF v1.3 的十章共读。第10章“多 Agent 协作”位于书内第272—305页，对应 PDF 第280—313页。我们聚焦信息怎样移交、控制权怎样流转，以及结果怎样汇总。

## 先用两个维度描述架构

第一个维度是上下文是否共享。共享完整历史有助于保留细节，也会传递冗余、错误假设和不必要的敏感信息。独立上下文则需要明确的任务说明与移交材料，遗漏关键条件时，下游可能从一开始就理解错任务。

第二个维度是协作拓扑。管理者模式由中心模块拆解和汇总，对等模式允许相互检查，去中心化模式让控制权在执行者之间流转。它们回答“谁协调谁”，与“共享多少上下文”不是同一个问题。

选架构时可以先写任务依赖图：哪些子任务能够独立完成，哪些必须等待共同证据，哪些只能由一个执行者修改。不能并行的工作，仅仅增加 Agent 数量可能只会增加协调负担。

## 移交包应让接收方知道什么已经确定

一份可用的移交包至少应包含目标、约束、已经核对的事实及来源、当前产物、未解决问题和完成状态。如果只交一句“我查过了，应该没问题”，接收方很难检查或继续工作。

还要区分结论与假设。“文档第3章标题已从目录和章节页核对”与“我猜作者可能会这样解释”应有不同标记。上游说得自信，不能成为下游提升证据等级的理由。

文件和消息承担的职责也不同。共享文件可以保存较大的稳定产物，消息可以通知状态和传递引用，但两者都需要身份、权限和一致性约定。跨组织的互操作协议能帮助传递任务，不会自动建立对内容真实性的信任。

## 动手：把移交、冲突和版本保护写进程序

下面把两份手写移交包交给一个合并函数，并模拟两个执行者基于相同旧版本修改共享内容。没有启动任何模型或子 Agent，目的只是观察接口约束。

保存为 `handoff_contract.py`，运行 `python handoff_contract.py`。

```python
"""Chapter 10: handoff and revision checks, not a multi-model experiment."""
def merge_handoffs(packages, known_sources):
    claims = {}
    for package in packages:
        if package["status"] != "done":
            raise ValueError("子任务尚未完成")
        for claim in package["claims"]:
            if not claim["sources"] or any(s not in known_sources
                                          for s in claim["sources"]):
                raise ValueError("结论缺少可核对来源")
            key = claim["key"]
            if key in claims and claims[key]["value"] != claim["value"]:
                raise ValueError("同一问题存在冲突结论，需回查证据")
            if key not in claims:
                claims[key] = {"value": claim["value"], "sources": set()}
            claims[key]["sources"].update(claim["sources"])
    return claims


def commit_revision(store, expected_revision, value):
    if store["revision"] != expected_revision:
        raise ValueError("旧版本写入被拒绝，请先重新读取")
    store["value"] = value
    store["revision"] += 1


if __name__ == "__main__":
    packages = [
        {"worker": "reader", "status": "done", "claims": [
            {"key": "章节", "value": "用户记忆和知识库", "sources": ["chapter-3"]}]},
        {"worker": "checker", "status": "done", "claims": [
            {"key": "章节", "value": "用户记忆和知识库", "sources": ["toc"]}]}]
    merged = merge_handoffs(packages, {"chapter-3", "toc"})
    print("合并的来源数：", len(merged["章节"]["sources"]))
    store = {"revision": 0, "value": "初始稿"}
    commit_revision(store, 0, "第一份修改")
    try:
        commit_revision(store, 0, "持有旧版本的第二份修改")
    except ValueError as error:
        print("拒绝覆盖：", error)
    assert store["value"] == "第一份修改"
```

两份一致结论的来源被合并为2个；第二次写入因为仍持有旧版本号被拒绝，第一份修改得以保留。如果两个结论冲突，合并函数会停止，而不会用最后到达的答案覆盖前者。

这里检查的是来源标识在不在已知集合中，还没有检查内容是否真的支持结论。版本检查也只是单进程示意；数据库里的并发写入，需要在事务或原子条件更新中完成检查和提交。

可以把第二份移交的标题改成不同内容，观察冲突；再把状态改成 `running`，观察未完成任务为什么不能直接汇总。进一步可以让每份报告带上版本、置信依据和待复核项。

## 多 Agent 的两类典型失败

第一类是资源冲突。多个执行者同时改同一个文件，后写入者可能覆盖前面的工作；重复领取同一任务，也可能造成重复外部操作。需要划分所有权、使用版本控制或原子提交，并让协调者知道任务的真实状态。

第二类是错误级联。一个未经核对的假设进入移交包，后续执行者又把它当作事实，并在更长的报告中反复引用。系统看起来形成了共识，却没有增加任何独立支持。

验证者最好能访问与生成阶段不同的证据，例如程序执行结果、原始材料或环境状态。换一个角色名重新读同一段回答，可能发现表达问题，却不足以证明事实正确。

## 怎样比较协作和单个执行者

比较时需要尽量对齐任务、工具与总预算，同时记录任务成功、证据质量、总调用、耗时和协调成本。若多 Agent 使用更多资源，结果变好也不能直接归因于组织方式。

可以分别测试独立子任务、强依赖任务和容易产生冲突的任务，观察收益来自并行、分工还是验证。管理者本身的拆解与汇总质量，也可能成为瓶颈。

原书后段讨论 Agent 社会与模拟。模拟中的集体行为适合作为研究对象和假设来源，但它依赖模型、规则、初始条件与信息分配，不能直接当作现实人类社会的证据，更不能由一个模拟案例证明普遍的群体智能提升。

## 十章之后，把学习路径连成一个小项目

可以从一个只读学习助手开始：明确目标，用工具检索有来源的资料，管理上下文和版本，设计独立评估，最后再判断是否需要额外执行者。这样，协作是为了解决已经发现的问题，而不是项目开始时就必须堆上的结构。

回看全书，前五章帮助建立能执行任务的系统，第六章让结果可测，第七和第八章讨论不同位置的改进，第九和第十章扩展交互与组织方式。每一层都需要回到同一个问题：我们拿到了什么新证据，是否足以支持当前决定？

本章对应[多智能体协作与通信](#/research?direction=rd-012)、[智能体规划](#/research?direction=rd-011)、[智能体评测](#/research?direction=rd-015)及[人—智能体协作](#/research?direction=rd-081)。可以把自己的项目、失败案例和待验证假设关联到这些方向，继续积累真实的学习记录。

## 阅读出处

- 李博杰，《深入理解 AI Agent：设计原理与工程实践》，v1.3，第10章，书内第272—305页；包括共享上下文、拓扑、移交、失败模式和 Agent 社会。
- [作者原始项目与协作实验](https://github.com/bojieli/ai-agent-book)。本文没有运行多模型协作性能实验。
- [全书十章索引](#/books?book=ai-agents-in-depth)。示例是独立编写的契约与版本检查程序，欢迎结合自己的实际任务继续验证。
