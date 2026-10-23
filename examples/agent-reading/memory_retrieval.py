"""Chapter 3: fictional records, lexical search, no LLM or vector database."""
from datetime import date


def visible_records(records, user, today):
    return [r for r in records
            if r["owner"] in (user, "public")
            and r["valid_until"] >= today
            and r["verified"]]


def retrieve(records, query_terms, limit=2):
    ranked = sorted(records,
                    key=lambda r: (-len(set(r["terms"]) & set(query_terms)),
                                   r["id"]))
    return [r for r in ranked if set(r["terms"]) & set(query_terms)][:limit]


if __name__ == "__main__":
    records = [
        {"id": "old", "owner": "reader-a", "terms": ["学习", "时间"],
         "text": "旧计划：每次60分钟", "valid_until": date(2026, 10, 1),
         "verified": True, "source": "练习用旧计划"},
        {"id": "current", "owner": "reader-a", "terms": ["学习", "时间"],
         "text": "当前计划：每次20分钟", "valid_until": date(2026, 12, 31),
         "verified": True, "source": "练习用读者确认记录"},
        {"id": "private-b", "owner": "reader-b", "terms": ["学习", "时间"],
         "text": "另一位读者的私有计划", "valid_until": date(2026, 12, 31),
         "verified": True, "source": "练习用他人私有记录"},
        {"id": "untrusted", "owner": "public", "terms": ["学习", "时间"],
         "text": "未经核实的修改建议", "valid_until": date(2026, 12, 31),
         "verified": False, "source": "练习用外部材料"},
    ]
    visible = visible_records(records, "reader-a", date(2026, 10, 23))
    hits = retrieve(visible, ["学习", "时间"])
    assert [r["id"] for r in hits] == ["current"]
    for item in hits:
        print(item["text"] + "；来源：" + item["source"])
    print("无匹配时返回：", retrieve(visible, ["图像"]))
