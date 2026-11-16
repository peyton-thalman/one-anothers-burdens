import json, re, sys
C = "/Users/peytonthalman/Projects/conference-language/data/processed/talks.jsonl"
talks = [json.loads(l) for l in open(C)]
byurl = {t["url"]: t for t in talks}
norm = lambda s: re.sub(r"[^a-z0-9]+", "", s.lower())
md = open(sys.argv[1]).read()
bad = 0
# quotes: > "...." — Speaker, ["Title"](url)
for m in re.finditer(r'^> "(.*?)" — (.*?)\[(.*?)\]\((https://www\.churchofjesuschrist\.org/study/general-conference/[^)]+)\)', md, re.M):
    q, who, title, url = m.groups()
    t = byurl.get(url)
    if not t: print("NO URL", url); bad += 1; continue
    body = norm(re.sub(r"\(\s*[^()]*\d+:\d+[^()]*\)", "", " ".join(t["paragraphs"])))
    qq = norm(re.sub(r"\([^()]*\d+:\d+[^()]*\)", "", q))
    # allow ellipses: check each fragment
    frags = [norm(f) for f in re.split(r"…|\.\.\.", re.sub(r"\([^()]*\d+:\d+[^()]*\)", "", q)) if norm(f)]
    ok = all(f in body for f in frags)
    if not ok: print("QUOTE MISMATCH:", who.strip(), "|", q[:90]); bad += 1
    if norm(title.strip('"“”\'‘’')) not in norm(t["title"]): print("TITLE MISMATCH", title, "vs", t["title"]); bad += 1
# all GC links
for title, url in re.findall(r'\[([^\]]+)\]\((https://www\.churchofjesuschrist\.org/study/general-conference/[^)]+)\)', md):
    t = byurl.get(url)
    if not t: print("NO URL", title, url); bad += 1
    elif norm(title.strip('"“”\'‘’')) not in norm(t["title"]): print("LINK TITLE MISMATCH", title, "|", t["title"]); bad += 1
print("problems:", bad)
