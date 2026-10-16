"""Extract the CCF 2026 seventh-edition original PDF; no third-party JSON.

Run with Python + PyMuPDF: python scripts/update-ccf.py [--pdf local.pdf]
The default download is the original PDF reproduced by Zhejiang Gongshang
University Library. Recheck the CCF release page before changing editions.
"""
import argparse
from datetime import datetime, timezone, timedelta
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import urllib.request

import fitz

ROOT = Path(__file__).resolve().parent.parent
SOURCE = "https://www.ccf.org.cn/Academic_Evaluation/By_category/"
MIRROR_PAGE = "https://lib.zjgsu.edu.cn/2026/0414/c1056a221631/page.htm"
PDF_URL = "https://lib.zjgsu.edu.cn/_upload/article/files/f5/b1/f4f7201343b88c0f10564f590ebe/854a3c68-36a6-4698-a359-5184d5e30a0c.pdf"
PDF_SHA256 = "271b630b576bf8a4f802e767f5694caded93680e22b3a19bef7902591c45c1d3"
CATEGORIES = [
    ("systems", "计算机体系结构/并行与分布计算/存储系统"),
    ("network", "计算机网络"), ("security", "网络与信息安全"),
    ("software", "软件工程/系统软件/程序设计语言"),
    ("data", "数据库/数据挖掘/内容检索"), ("theory", "计算机科学理论"),
    ("graphics", "计算机图形学与多媒体"), ("ai", "人工智能"),
    ("hci", "人机交互与普适计算"), ("interdisciplinary", "交叉/综合/新兴"),
]
# Counts independently checked against all 60 original PDF table sections.
EXPECTED = [
    (6, 10, 12, 11, 26, 30), (3, 6, 12, 4, 10, 20),
    (3, 5, 9, 6, 11, 29), (4, 12, 9, 10, 20, 27),
    (4, 14, 16, 5, 13, 13), (3, 13, 12, 5, 10, 10),
    (4, 9, 15, 4, 14, 17), (4, 21, 39, 7, 14, 22),
    (2, 8, 5, 4, 7, 15), (4, 15, 16, 2, 7, 13),
]


def clean(value):
    value = re.sub(r"\s+", " ", value or "").strip()
    value = re.sub(r"(?<=[\u4e00-\u9fff]) +(?=[\u4e00-\u9fff])", "", value)
    return re.sub(r"(?<=-) +(?=[A-Za-z])", "", value)


def extract(pdf):
    doc = fitz.open(pdf)
    if doc.page_count != 72:
        raise ValueError("Unexpected edition: expected the reviewed 72-page PDF")
    venues = []
    category = venue_type = rank = None
    previous_seq = 0
    sections = set()
    for page_no, page in enumerate(doc):
        text = page.get_text()
        for category_id, category_name in CATEGORIES:
            if category_name in re.sub(r"\s+", "", text):
                category = category_id
        if "中国计算机学会推荐国际学术期刊" in text:
            venue_type = "journal"
        if "中国计算机学会推荐国际学术会议" in text and page_no > 0:
            venue_type = "conference"
        match = re.search(r"[一二三]、\s*([ABC])\s*类", text)
        if match:
            rank = match[1]
            previous_seq = 0
            sections.add((category, venue_type, rank))
        for table in page.find_tables().tables:
            for row in table.extract():
                if not str(row[0] or "").strip().isdigit():
                    continue
                if len(row) != 5 or not all((category, venue_type, rank)):
                    raise ValueError(f"Unexpected table on PDF page {page_no + 1}")
                seq = int(row[0])
                if seq != previous_seq + 1:
                    raise ValueError(f"Missing or duplicate row: PDF page {page_no + 1}, row {seq}")
                previous_seq = seq
                abbr, name, publisher, url = map(clean, row[1:])
                url = re.sub(r"\s+", "", url)
                # Keep historical-name annotations as data, rather than losing
                # them when cleaning wrapped table cells.
                notes = []
                for field in (abbr, name, publisher):
                    notes.extend(re.findall(r"（原[^）]*）", field))
                abbr = re.sub(r"（原[^）]*）", "", abbr).strip()
                name = re.sub(r"（原[^）]*）", "", name).strip()
                publisher = re.sub(r"（原[^）]*）", "", publisher).strip()
                abbr = abbr.replace("SIG-METRICS", "SIGMETRICS").replace("CODES+ ISSS", "CODES+ISSS").replace("PACM PL", "PACMPL").replace("JCOMPLEXI TY", "JCOMPLEXITY").replace("INTER-SPEECH", "INTERSPEECH")
                publisher = re.sub(r"\s*/\s*", "/", publisher)
                venue = {
                    "id": f"{category}-{venue_type}-{hashlib.sha256(name.encode('utf-8')).hexdigest()[:12]}",
                    "categoryId": category, "type": venue_type, "rank": rank,
                    "abbr": abbr, "name": name, "publisher": publisher, "url": url,
                }
                if notes:
                    venue["note"] = "；".join(notes)
                if not url:
                    venue["note"] = (venue.get("note", "") + "；原版目录未提供网址。").lstrip("；")
                if not name:
                    raise ValueError(f"Missing venue name: {venue['id']}")
                if url and not re.match(r"^https?://[^\s]+$", url):
                    raise ValueError(f"Invalid URL in {venue['id']}: {url}")
                venues.append(venue)
    counts = Counter((v["categoryId"], v["type"], v["rank"]) for v in venues)
    if len(sections) != 60 or len(venues) != 681:
        raise ValueError(f"Incomplete extraction: {len(sections)} sections, {len(venues)} rows")
    for (category_id, _), expected in zip(CATEGORIES, EXPECTED):
        actual = tuple(counts[category_id, t, r] for t in ("journal", "conference") for r in "ABC")
        if actual != expected:
            raise ValueError(f"Section counts differ for {category_id}: {actual}")
    for abbr, expected_rank in {"ICML": "A", "CVPR": "A", "ICLR": "A", "ICRA": "B", "IJCAI": "B", "IROS": "C"}.items():
        matches = [v for v in venues if v["abbr"] == abbr]
        if len(matches) != 1 or matches[0]["rank"] != expected_rank:
            raise ValueError(f"Reviewed AI entry differs: {abbr}")
    return venues


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path)
    args = parser.parse_args()
    pdf = args.pdf or ROOT / ".private/ccf-2026-official-mirror.pdf"
    if not pdf.exists():
        pdf.parent.mkdir(parents=True, exist_ok=True)
        pdf.write_bytes(urllib.request.urlopen(PDF_URL, timeout=30).read())
    actual_hash = hashlib.sha256(pdf.read_bytes()).hexdigest()
    if actual_hash != PDF_SHA256:
        raise ValueError("PDF changed; review the new original before regenerating data")
    venues = extract(pdf)
    catalog = {
        "edition": "第七版（2026年3月正式版，4月9日勘误更新）",
        "updatedAt": "2026-04-09", "checkedAt": datetime.now(timezone(timedelta(hours=8))).date().isoformat(),
        "sourceUrl": SOURCE, "sourcePdfUrl": PDF_URL,
        "sourceMirrorPage": MIRROR_PAGE,
        "sourceNote": "数据直接提取自浙江工商大学图书馆转载的CCF原版正式目录PDF。核验时CCF官网直连返回WAF挑战页；官网搜索索引确认第七版于2026-03-31正式发布、2026-04-09勘误更新，PDF元数据日期为2026-04-09。链接保留原目录参考网址，多为DBLP索引，并非会议当年官网。",
        "sourceSha256": actual_hash,
        "categories": [{"id": i, "name": n} for i, n in CATEGORIES],
        "venues": venues,
    }
    output = ROOT / "data/ccf-catalog.json"
    output.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(venues)} venues to {output}")
    print("Types:", dict(Counter(v["type"] for v in venues)))
    print("Ranks:", dict(Counter(v["rank"] for v in venues)))


if __name__ == "__main__":
    main()
