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
