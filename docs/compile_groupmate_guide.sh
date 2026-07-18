#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_MD="${SCRIPT_DIR}/HOW_THE_PROJECT_WORKS_GROUPMATE_GUIDE.md"
OUTPUT_PDF="${SCRIPT_DIR}/How_The_Project_Works_Groupmate_Guide.pdf"
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/nexora-groupmate-guide.XXXXXX")"

cleanup() {
  if [[ "${KEEP_GROUPMATE_GUIDE_BUILD:-0}" = "1" ]]; then
    echo "Temporary build retained at ${BUILD_DIR}"
  else
    rm -rf "${BUILD_DIR}"
  fi
}
trap cleanup EXIT

for command_name in uv python3; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Required command is unavailable: ${command_name}" >&2
    exit 1
  fi
done

if [[ ! -s "${SOURCE_MD}" ]]; then
  echo "Guide source is missing or empty: ${SOURCE_MD}" >&2
  exit 1
fi

uv run \
  --quiet \
  --with "weasyprint>=62,<70" \
  --with "markdown>=3.5,<4" \
  --with "pygments>=2.17,<3" \
  python3 - \
  "${SOURCE_MD}" \
  "${BUILD_DIR}/groupmate-guide.html" \
  "${OUTPUT_PDF}" <<'PY'
import pathlib
import re
import sys

import markdown
from weasyprint import HTML

markdown_path = pathlib.Path(sys.argv[1])
html_path = pathlib.Path(sys.argv[2])
pdf_path = pathlib.Path(sys.argv[3])

renderer = markdown.Markdown(
    extensions=["extra", "toc", "codehilite", "sane_lists"],
    extension_configs={
        "toc": {"title": "Contents", "toc_depth": "1-3"},
        "codehilite": {"guess_lang": False, "noclasses": True},
    },
    output_format="html5",
)
body = renderer.convert(markdown_path.read_text(encoding="utf-8"))
toc = renderer.toc

cover_match = re.search(
    r'<section class="guide-cover">.*?</section>',
    body,
    flags=re.DOTALL,
)
if not cover_match:
    raise SystemExit("Guide cover section was not found")
cover = cover_match.group(0)
body = body[:cover_match.start()] + body[cover_match.end():]

css = r"""
@page {
  size: A4;
  margin: 17mm 15mm 19mm;
  @top-left {
    content: "NEXORA · GROUPMATE GUIDE";
    color: #64748b;
    font: 700 7pt "DejaVu Sans", sans-serif;
    letter-spacing: .12em;
  }
  @top-right {
    content: string(section);
    color: #64748b;
    font: 7pt "DejaVu Sans", sans-serif;
  }
  @bottom-center {
    content: "Page " counter(page) " of " counter(pages);
    color: #64748b;
    font: 7pt "DejaVu Sans", sans-serif;
  }
}
@page:first {
  @top-left { content: none; }
  @top-right { content: none; }
  @bottom-center { content: none; }
}
html {
  color: #1e293b;
  font: 9.35pt/1.52 "DejaVu Sans", sans-serif;
  hyphens: auto;
}
body { margin: 0; }
h1, h2, h3, h4 {
  color: #0f172a;
  font-family: "DejaVu Sans", sans-serif;
  break-after: avoid;
}
h1 {
  margin: 0 0 5mm;
  padding-bottom: 3mm;
  border-bottom: 2.5pt solid #0f766e;
  font-size: 24pt;
  line-height: 1.12;
}
h2 {
  string-set: section content();
  margin: 8mm 0 3mm;
  padding: 2.4mm 3mm;
  border-left: 3.5pt solid #0f766e;
  background: #f0fdfa;
  font-size: 15pt;
  line-height: 1.2;
}
h3 {
  margin: 5.5mm 0 2.5mm;
  color: #115e59;
  font-size: 11.5pt;
}
h4 { margin: 4.5mm 0 2mm; font-size: 10pt; }
.guide-subtitle {
  margin: -2mm 0 7mm;
  color: #64748b;
  font-size: 11pt;
}
p { margin: 0 0 3mm; orphans: 3; widows: 3; }
strong { color: #0f172a; }
a { color: #0f766e; text-decoration: none; }
ul, ol { margin: 1.5mm 0 3.5mm 4mm; padding-left: 5mm; }
li { margin-bottom: 1.1mm; }
li::marker { color: #0f766e; font-weight: 700; }
blockquote {
  margin: 4mm 0;
  padding: 3.5mm 4mm;
  border: .5pt solid #99f6e4;
  border-left: 3.5pt solid #0f766e;
  border-radius: 1.5mm;
  background: #f0fdfa;
  break-inside: avoid;
}
blockquote p:last-child { margin-bottom: 0; }
code {
  color: #7f1d1d;
  background: #f1f5f9;
  padding: .12em .3em;
  font: .88em "DejaVu Sans Mono", monospace;
  overflow-wrap: anywhere;
}
pre {
  margin: 3mm 0 4mm;
  padding: 3.2mm;
  border: .5pt solid #cbd5e1;
  border-left: 3pt solid #334155;
  border-radius: 1.5mm;
  background: #f8fafc;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: 7pt/1.42 "DejaVu Sans Mono", monospace;
  break-inside: avoid;
}
pre code { color: inherit; background: transparent; padding: 0; }
table {
  width: 100%;
  margin: 3mm 0 5mm;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 7.15pt;
  line-height: 1.32;
}
thead { display: table-header-group; }
tr { break-inside: avoid; }
th {
  color: white;
  background: #115e59;
  font-weight: 700;
  text-align: left;
}
th, td {
  border: .45pt solid #cbd5e1;
  padding: 1.5mm 1.6mm;
  vertical-align: top;
  overflow-wrap: anywhere;
}
tr:nth-child(even) td { background: #f8fafc; }
.page-break { break-before: page; height: 0; }
.toc {
  break-after: page;
  string-set: section "Contents";
}
.toc h1 { font-size: 22pt; }
.toc ul { list-style: none; margin-left: 0; padding-left: 0; }
.toc ul ul { margin-left: 5mm; }
.toc li { margin-bottom: 1.2mm; }
.toc a::after {
  content: leader(".") target-counter(attr(href), page);
  color: #94a3b8;
}
.guide-cover {
  width: 210mm;
  height: 297mm;
  min-height: 297mm;
  box-sizing: border-box;
  margin: -17mm -15mm -19mm;
  padding: 30mm 25mm;
  background: linear-gradient(150deg, #0f172a 0%, #134e4a 68%, #0f766e 100%);
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  break-after: page;
}
.guide-cover .cover-eyebrow {
  margin-bottom: 14mm;
  color: #99f6e4;
  font-size: 10pt;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
}
.guide-cover .cover-mark {
  width: 32mm;
  height: 32mm;
  margin-bottom: 13mm;
  border: 1.2pt solid #5eead4;
  border-radius: 8mm;
  background: #f8fafc;
  color: #0f766e;
  font-size: 23mm;
  font-weight: 800;
  line-height: 32mm;
  text-align: center;
}
.guide-cover h1 {
  max-width: 155mm;
  margin: 0;
  padding: 0;
  border: 0;
  color: white;
  font-size: 34pt;
  line-height: 1.05;
}
.guide-cover .cover-subtitle {
  max-width: 145mm;
  margin-top: 7mm;
  color: #ccfbf1;
  font-size: 14pt;
  line-height: 1.35;
}
.guide-cover .cover-meta {
  margin-top: 28mm;
  color: #a7f3d0;
  font-size: 9pt;
}
"""

document = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>How the Project Works — Nexora Groupmate Guide</title>
  <meta name="author" content="Nexora Engineering">
  <meta name="subject" content="Beginner onboarding guide for the Nexora LMS/LXP">
  <style>{css}</style>
</head>
<body>
  {cover}
  <section class="toc">{toc}</section>
  {body}
</body>
</html>
"""

html_path.write_text(document, encoding="utf-8")
HTML(filename=str(html_path), base_url=str(markdown_path.parent.parent)).write_pdf(
    str(pdf_path),
    presentational_hints=True,
)
print(f"Wrote {pdf_path}")
PY

if command -v pdfinfo >/dev/null 2>&1; then
  pdfinfo "${OUTPUT_PDF}" | grep -E '^(Title|Author|Pages|Page size|File size):'
fi

echo "Groupmate guide PDF: ${OUTPUT_PDF}"
