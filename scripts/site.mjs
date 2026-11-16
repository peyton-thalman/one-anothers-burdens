// Builds the website from the Markdown source:
//   public/index.html       landing page
//   public/read/index.html  online reader
// Usage: node scripts/site.mjs [path/to/guide.md]
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const name = "one-anothers-burdens";
const SITE = "One Another’s Burdens";
const DESC = "A twelve week gospel companion for anyone who loves someone who is suffering, adapted from the Church’s Support Guide and widened to cover every kind of affliction.";

const icon = (d, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  right: icon('<line x1="40" y1="128" x2="216" y2="128"/><polyline points="144 56 216 128 144 200"/>'),
  left: icon('<polyline points="160 208 80 128 160 48"/>', 16),
  down: icon('<line x1="128" y1="144" x2="128" y2="32"/><polyline points="216 144 216 208 40 208 40 144"/><polyline points="168 104 128 144 88 104"/>'),
  check: icon('<polyline points="40 144 96 200 224 72"/>', 16),
  printer: icon('<polyline points="64 80 64 40 192 40 192 80"/><rect x="64" y="152" width="128" height="64"/><path d="M64 176H24V96c0-8.800 7.800-16 17.300-16h173.400c9.500 0 17.300 7.200 17.300 16v80h-40"/>', 16),
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inline = (s) => marked.parseInline(s);
const plain = (s) => s.replace(/[*_`]/g, "");
const pad = (n) => String(n).padStart(2, "0");
const minutes = (s) => Math.max(1, Math.ceil(s.split(/\s+/).length / 220));

// Straight quotes to typographic quotes. The source has no HTML or code, so this is safe.
const smart = (s) =>
  s.replace(/(^|[\s(\[*>—])"/gm, "$1“").replace(/"/g, "”")
   .replace(/(^|[\s(\[*>—“])'/gm, "$1‘").replace(/'/g, "’");

const KINDS = [
  [/^The Big Idea/, "big-idea"], [/^What the Scriptures/, "science"], [/^From Prophets/, "quotes"],
  [/^In Real Life/, "bridges"], [/^Also Worth Knowing/, "science"], [/^Questions/, "questions"], [/Practice Card/, "practice"], [/^Go Deeper/, "deeper"],
];
const kindOf = (h) => (KINDS.find(([re]) => re.test(h)) ?? [, "plain"])[1];

function html(mdText, kind) {
  let out = marked.parse(mdText.replace(/^---\s*$/gm, "")).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
  if (kind === "quotes") {
    out = out.replace(/<blockquote>\s*<p>([\s\S]*?)<\/p>\s*<\/blockquote>/g, (m, p) => {
      const at = p.lastIndexOf("” — ");
      if (at < 0) return `<figure class="quote">${m}</figure>`;
      return `<figure class="quote"><blockquote><p>${p.slice(0, at + 1)}</p></blockquote><figcaption>${p.slice(at + 4)}</figcaption></figure>`;
    });
  }
  return out;
}

function block(heading, body) {
  const kind = kindOf(heading);
  const h = `<h2>${inline(heading)}</h2>`;
  if (kind === "practice") {
    return `<section class="blk practice"><div class="card"><div class="card-top">${h}<button class="print" type="button">${I.printer}Print card</button></div>${html(body, kind)}</div></section>`;
  }
  return `<section class="blk ${kind}">${h}${html(body, kind)}</section>`;
}

// Split a "## " part into its lead text and its "### " blocks.
function blocks(body) {
  const [lead, ...subs] = body.split(/^### /m);
  const out = [];
  if (lead.replace(/^---\s*$/gm, "").trim()) out.push(`<section class="blk lead">${html(lead)}</section>`);
  for (const sub of subs) {
    const nl = sub.indexOf("\n");
    out.push(block(sub.slice(0, nl).trim(), sub.slice(nl + 1)));
  }
  return out.join("\n");
}

function parse(md) {
  const [, ...parts] = smart(md).split(/^## /m);
  const views = [];
  const appendix = [];
  for (const part of parts) {
    const nl = part.indexOf("\n");
    const title = part.slice(0, nl).trim();
    let body = part.slice(nl + 1);
    const ch = title.match(/^Chapter (\d+): (.*)$/);
    if (ch) {
      let themes = [];
      body = body.replace(/^\*Manual themes: (.*)\*\s*$/m, (_, t) => { themes = t.split(", "); return ""; });
      views.push({ id: `chapter-${ch[1]}`, num: pad(ch[1]), label: `Chapter ${pad(ch[1])}`, title: ch[2], short: ch[2], themes, body: blocks(body), mins: minutes(body) });
    } else if (/^Appendix|^Ideas/.test(title)) {
      appendix.push({ title, body });
    } else {
      const [, after = title] = title.match(/: (.*)$/) ?? [];
      views.push({ id: "intro", num: "00", label: "Start here", title: after[0].toUpperCase() + after.slice(1), short: "Start here", themes: [], body: blocks(body), mins: minutes(body) });
    }
  }
  if (appendix.length) {
    views.push({
      id: "appendix", num: "A–B", label: "Appendix", title: "Finding support and leading a group", short: "Appendix", themes: [],
      body: appendix.map((a) => block(a.title, a.body)).join("\n"), mins: minutes(appendix.map((a) => a.body).join(" ")),
    });
  }
  return views;
}

const head = (title, base) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(DESC)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(DESC)}">
  <meta property="og:type" content="website">
  <meta name="theme-color" content="#f7f5f0">
  <meta name="color-scheme" content="light">
  <link rel="icon" href="${base}favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${base}assets/site.css">
  <script>(function(){var d=document.documentElement;d.classList.add("js");try{var s=localStorage.getItem("oab:size");if(s==="s"||s==="l")d.dataset.size=s}catch(e){}})()</script>
</head>`;

const INSIDE = [
  ["The big idea", "The core of the principle in plain words."],
  ["What the scriptures teach", "Key verses, with a line on why they matter here."],
  ["From prophets and apostles", "Quotes from general conference, each linked to the full talk."],
  ["In real life", "How the principle looks across illness, disability, mental illness, addiction, grief, and more."],
  ["Also worth knowing", "What caregivers, counselors, and researchers have learned."],
  ["Questions worth sitting with", "Questions to ponder, journal, or discuss."],
  ["Practice card", "The handout. One main practice for the week, plus a few options."],
  ["Go deeper", "Talks, scriptures, and books."],
];

function size(file) {
  const p = `${root}/public/downloads/${file}`;
  if (!existsSync(p)) return "";
  const kb = statSync(p).size / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

function landing(views) {
  const chapters = views.filter((v) => v.id.startsWith("chapter-"));
  const total = views.reduce((n, v) => n + v.mins, 0);
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  return `${head(`${SITE}: a gospel companion for those who love someone who is suffering`, "")}
<body>
  <a class="skip" href="#main">Skip to content</a>
  <div class="grain" aria-hidden="true"></div>

  <header class="island">
    <a class="brand" href="./">${SITE}</a>
    <nav aria-label="Sections">
      <a href="#inside">What’s inside</a>
      <a href="#chapters">Chapters</a>
      <a href="#downloads">Downloads</a>
    </nav>
    <a class="btn small" href="read/" data-continue><span>Start reading</span></a>
  </header>

  <main id="main" class="wrap">
    <section class="hero">
      <div>
        <p class="label" data-reveal>Gospel companion · Twelve weeks</p>
        <h1 data-reveal style="--d:80ms">${SITE}</h1>
        <p class="sub" data-reveal style="--d:160ms">For anyone who loves someone who is suffering. Twelve gospel principles from the Church’s <em>Support Guide</em>, rewritten to cover illness, disability, mental illness, addiction, aging, grief, and a loved one’s hard choices.</p>
        <div class="actions" data-reveal style="--d:240ms">
          <a class="btn" href="read/" data-continue><span>Start reading</span>${I.right}</a>
          <a class="link" href="downloads/${name}.pdf" download>Download the PDF</a>
        </div>
        <p class="meta num" data-reveal style="--d:320ms"><span>${chapters.length} chapters</span><span>${chapters.length} practice cards</span><span>About ${total} minutes</span></p>
      </div>
      <div class="stack" data-reveal style="--d:240ms" aria-label="A sample practice card from week one">
        <div class="sheet">
          <div class="sheet-top"><span class="label">Practice card</span><span class="num">Week 01</span></div>
          <h2>The comfort list</h2>
          <p>Each night this week, write down one way you felt helped, comforted, or noticed that day, however small.</p>
          <div class="plan"><b>My plan</b><p>When I <u>turn off the light</u>, I will write one line in my comfort list.</p></div>
          <ul class="days" aria-hidden="true">${days.map((d, i) => `<li${i < 4 ? ' class="done"' : ""}><i>${i < 4 ? I.check : ""}</i>${d}</li>`).join("")}</ul>
        </div>
      </div>
    </section>

    <section class="band statement">
      <p class="label" data-reveal>Mosiah 18:8</p>
      <blockquote data-reveal style="--d:80ms">“Ye are desirous to come into the fold of God, and to be called his people, <span>and are willing to bear one another’s burdens, that they may be light.”</span></blockquote>
    </section>

    <section class="band split" id="inside">
      <div class="split-head" data-reveal>
        <p class="label">What’s inside</p>
        <h2 class="h2">Eight parts to every chapter</h2>
        <p class="lede">Each chapter keeps one of the original guide’s twelve principles and its scripture, then rebuilds everything around it for any kind of affliction.</p>
      </div>
      <ol class="rows plain">
        ${INSIDE.map(([t, s], i) => `<li data-reveal style="--d:${i * 60}ms"><div class="row"><span class="num">${pad(i + 1)}</span><span class="row-main"><span class="row-title">${t}</span><span class="row-sub">${s}</span></span></div></li>`).join("\n        ")}
      </ol>
    </section>

    <section class="band" id="chapters">
      <div data-reveal>
        <p class="label">Chapters</p>
        <h2 class="h2">Twelve weeks, one practice at a time</h2>
      </div>
      <ol class="rows" style="margin-top:48px">
        ${chapters.map((c) => `<li data-reveal><a class="row" href="read/#${c.id}"><span class="num">${c.num}</span><span class="row-main"><span class="row-title">${inline(c.title)}</span><span class="row-sub">${inline(c.themes.join(" · "))}</span></span><span class="row-meta">${c.mins} min</span>${I.right}</a></li>`).join("\n        ")}
      </ol>
    </section>

    <section class="band split" id="downloads">
      <div class="split-head" data-reveal>
        <p class="label">Downloads</p>
        <h2 class="h2">Take it with you</h2>
        <p class="lede">The whole guide in one file, ready to print for a class, edit for your group, or keep by the bed.</p>
      </div>
      <ul class="rows">
        <li data-reveal><a class="row dl" href="downloads/${name}.pdf" download><span class="num">PDF</span><span class="row-main"><span class="row-title">Download the PDF</span><span class="row-sub">Best for printing</span></span><span class="row-meta">${size(`${name}.pdf`)}</span>${I.down}</a></li>
        <li data-reveal style="--d:60ms"><a class="row dl" href="downloads/${name}.docx" download><span class="num">DOCX</span><span class="row-main"><span class="row-title">Download for Word</span><span class="row-sub">Best for editing</span></span><span class="row-meta">${size(`${name}.docx`)}</span>${I.down}</a></li>
        <li data-reveal style="--d:120ms"><a class="row dl" href="downloads/${name}.md" download><span class="num">MD</span><span class="row-main"><span class="row-title">Download the Markdown</span><span class="row-sub">Plain text, for your own notes</span></span><span class="row-meta">${size(`${name}.md`)}</span>${I.down}</a></li>
      </ul>
    </section>
  </main>

  <footer class="wrap foot">
    <div class="safety" data-reveal>
      <div>
        <p class="label">A note on safety</p>
        <h2>This guide is for study and discussion. It is not therapy or medical advice.</h2>
      </div>
      <dl>
        <div><dt>988 Suicide &amp; Crisis Lifeline, call or text any time</dt><dd><a href="tel:988">988</a></dd></div>
        <div><dt>Crisis Text Line, text HOME</dt><dd><a href="sms:741741">741741</a></dd></div>
        <div><dt>National Domestic Violence Hotline</dt><dd><a href="tel:18007997233">1&#8209;800&#8209;799&#8209;7233</a></dd></div>
        <div><dt>SAMHSA National Helpline, free, 24/7</dt><dd><a href="tel:18006624357">1&#8209;800&#8209;662&#8209;4357</a></dd></div>
        <div><dt>Emergency</dt><dd><a href="tel:911">911</a></dd></div>
      </dl>
    </div>
    <p class="colophon"><span>${SITE}. An independent study guide adapted from the Church’s <a class="link" href="https://www.churchofjesuschrist.org/study/manual/support-guide-help-for-spouses-and-family-of-those-in-recovery?lang=eng">Support Guide</a>. Not an official publication of The Church of Jesus Christ of Latter-day Saints.</span><a class="link" href="read/">Read online</a></p>
  </footer>

  <script src="assets/app.js" defer></script>
</body>
</html>
`;
}

function reader(views) {
  const view = (v, i) => {
    const prev = views[i - 1], next = views[i + 1];
    return `<article class="view prose" id="${v.id}" data-title="${esc(plain(v.title))}" data-short="${esc(plain(v.short))}">
        <header class="opener">
          <p class="label">${v.label} · ${v.mins} min read</p>
          <h1>${inline(v.title)}</h1>
          ${v.themes.length ? `<ul class="themes" aria-label="Themes">${v.themes.map((t) => `<li>${inline(t)}</li>`).join("")}</ul>` : ""}
        </header>
        ${v.body}
        <nav class="pager" aria-label="More chapters">
          ${prev ? `<a class="prev" href="#${prev.id}"><span class="num">Previous</span><strong>${inline(prev.short)}</strong></a>` : ""}
          ${next ? `<a class="next" href="#${next.id}"><span class="num">Next · ${next.label}</span><strong>${inline(next.title)}${I.right}</strong></a>` : ""}
        </nav>
      </article>`;
  };
  return `${head(`Read · ${SITE}`, "../")}
<body>
  <a class="skip" href="#main">Skip to content</a>
  <div class="grain" aria-hidden="true"></div>
  <div class="progress" aria-hidden="true"></div>

  <header class="island reading">
    <a class="island-home" href="../" aria-label="Back to the ${SITE} home page">${I.left}<span>${SITE}</span></a>
    <span class="island-now" id="now">${views[0].short}</span>
    <button class="icon-btn" id="aa" type="button" aria-label="Reading settings" aria-expanded="false" aria-controls="pop">Aa</button>
    <button class="icon-btn burger" id="tocbtn" type="button" aria-label="Contents" aria-expanded="false" aria-controls="toc"><span></span><span></span></button>
    <div class="pop" id="pop">
      <p class="num">Text size</p>
      <div class="seg" role="group" aria-label="Text size">
        <button type="button" data-size="s">Small</button><button type="button" data-size="m">Medium</button><button type="button" data-size="l">Large</button>
      </div>
      <p class="hint">Use <kbd>←</kbd> and <kbd>→</kbd> to move between chapters.</p>
    </div>
  </header>

  <div class="reader">
    <nav class="toc" id="toc" aria-label="Contents">
      <span class="label">Contents</span>
      <ol>
        ${views.map((v, i) => `<li style="--i:${i + 1}"><a href="#${v.id}"><span class="num">${v.num}</span><span>${inline(v.short)}</span></a></li>`).join("\n        ")}
      </ol>
      <p class="toc-foot" style="--i:${views.length + 1}"><a class="link" href="../downloads/${name}.pdf" download>Download the PDF</a></p>
    </nav>
    <main id="main" class="read-main">
      ${views.map(view).join("\n      ")}
    </main>
  </div>

  <script src="../assets/app.js" defer></script>
</body>
</html>
`;
}

export function buildSite(src = `${root}/${name}.md`) {
  const views = parse(readFileSync(resolve(src), "utf8"));
  mkdirSync(`${root}/public/read`, { recursive: true });
  writeFileSync(`${root}/public/index.html`, landing(views));
  writeFileSync(`${root}/public/read/index.html`, reader(views));
  console.log(`Built site: landing page and reader (${views.length} sections)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildSite(process.argv[2]);
