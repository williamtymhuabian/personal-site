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
