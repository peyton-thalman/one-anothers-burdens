"""Search the General Conference corpus for paragraphs. Usage: find_quotes.py <title-or-speaker substring> [keyword ...]"""
import json, re, sys
CORPUS = "/Users/peytonthalman/Projects/conference-language/data/processed/talks.jsonl"
q = sys.argv[1].lower(); kws = [k.lower() for k in sys.argv[2:]]
for line in open(CORPUS):
    t = json.loads(line)
    if q not in (t["title"] + " | " + t["speaker"]).lower(): continue
    hits = [p for p in t["paragraphs"] if not kws or any(k in p.lower() for k in kws)]
    if not hits: continue
    print(f"\n## {t['title']} | {t['speaker']} | {t['month']}/{t['year']} | {t['url']}")
    for p in hits[:6]: print("  -", p[:700])
