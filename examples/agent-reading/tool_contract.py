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
