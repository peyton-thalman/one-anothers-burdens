// Builds public/downloads/{guide}.pdf, .docx and .md from the Markdown source,
// then rebuilds the website (landing page and online reader) from the same source.
// Usage: node scripts/build.mjs [path/to/guide.md]
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import HTMLtoDOCX from "html-to-docx";
import { buildSite } from "./site.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(process.argv[2] ?? `${root}/one-anothers-burdens.md`);
const out = `${root}/public/downloads`;
const name = "one-anothers-burdens";
mkdirSync(out, { recursive: true });

const md = readFileSync(src, "utf8");
const body = marked.parse(md);

const css = `
  @page { size: Letter; margin: 0.9in 0.85in; }
  body { font-family: Georgia, "Times New Roman", serif; font-size: 11pt; line-height: 1.55; color: #222; }
  h1 { font-size: 26pt; margin: 0 0 4pt; }
  h2 { font-size: 17pt; margin-top: 28pt; padding-top: 10pt; border-top: 1px solid #ccc; break-before: page; }
  h2:first-of-type { break-before: auto; }
  h3 { font-size: 12.5pt; margin-top: 16pt; color: #3b5b4a; }
  blockquote { margin: 10pt 0; padding: 4pt 12pt; border-left: 3px solid #9bb5a6; color: #333; background: #f5f8f6; }
  table { border-collapse: collapse; width: 100%; font-size: 10pt; margin: 8pt 0; }
  th, td { border: 1px solid #ccc; padding: 5pt 7pt; text-align: left; vertical-align: top; }
  th { background: #eef2ef; }
  hr { display: none; }
  li { margin: 2pt 0; }
  h3, blockquote, tr { break-inside: avoid; }
`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>One Another’s Burdens</title><style>${css}</style></head><body>${body}</body></html>`;
const htmlPath = `${out}/${name}.html`;
writeFileSync(htmlPath, html);

// PDF via headless Chrome
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
execFileSync(chrome, [
  "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
  `--print-to-pdf=${out}/${name}.pdf`, `file://${htmlPath}`,
], { stdio: "ignore" });

// DOCX
const docx = await HTMLtoDOCX(`<!doctype html><html><body>${body}</body></html>`, null, {
  title: "One Another’s Burdens", font: "Georgia", fontSize: 22, table: { row: { cantSplit: true } },
});
writeFileSync(`${out}/${name}.docx`, docx);

copyFileSync(src, `${out}/${name}.md`);
console.log("Built PDF, DOCX, MD in", out);

buildSite(src);
