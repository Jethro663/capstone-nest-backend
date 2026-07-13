#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_PDF="${SCRIPT_DIR}/nexora-master-service-manual.pdf"
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/nexora-master-manual.XXXXXX")"
DIAGRAM_DIR="${BUILD_DIR}/diagrams"
NODE_PREFIX="${BUILD_DIR}/node"

cleanup() {
  if [[ "${KEEP_MANUAL_BUILD:-0}" = "1" ]]; then
    echo "Temporary build retained at ${BUILD_DIR}"
  else
    rm -rf "${BUILD_DIR}"
  fi
}
trap cleanup EXIT

for command_name in node npm uv python3; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Required command is unavailable: ${command_name}" >&2
    exit 1
  fi
done

mkdir -p "${DIAGRAM_DIR}" "${NODE_PREFIX}"

python3 - "${SCRIPT_DIR}" "${BUILD_DIR}" <<'PY'
import pathlib
import re
import sys

manual_dir = pathlib.Path(sys.argv[1])
build_dir = pathlib.Path(sys.argv[2])
diagram_dir = build_dir / "diagrams"
chapters = []

for number in range(11):
    matches = sorted(manual_dir.glob(f"{number:02d}-*.md"))
    if len(matches) != 1:
        raise SystemExit(f"Expected one chapter for {number:02d}; found {len(matches)}")
    chapters.append(matches[0])

front_matter = re.compile(r"\A---\s*\n.*?\n---\s*\n", re.DOTALL)
mermaid_fence = re.compile(
    r"```mermaid\s*\n(.*?)\n```",
    re.DOTALL,
)
diagram_number = 0
documents = []

for chapter in chapters:
    source = front_matter.sub("", chapter.read_text(encoding="utf-8"), count=1)

    def extract_diagram(match):
        global diagram_number
        diagram_number += 1
        stem = f"diagram-{diagram_number:03d}"
        (diagram_dir / f"{stem}.mmd").write_text(
            match.group(1).strip() + "\n",
            encoding="utf-8",
        )
        diagram_source = match.group(1).strip()
        if diagram_source.startswith("erDiagram") and diagram_source.count("{") >= 30:
            segments = []
            for segment_number, shift in enumerate(range(0, 91, 9), start=1):
                segments.append(
                    f'<figure class="mermaid-tile">'
                    f'<div class="mermaid-viewport">'
                    f'<img class="mermaid-diagram" src="diagrams/{stem}.svg" '
                    f'style="width:1000%;max-width:none;max-height:none;'
                    f'transform:translateX(-{shift}%);transform-origin:top left" '
                    f'alt="Master entity relationship diagram segment {segment_number}">'
                    f'</div><figcaption>Master ERD fold-out segment '
                    f'{segment_number} of 11</figcaption></figure>'
                )
            return '<section class="mermaid-foldout">' + ''.join(segments) + '</section>'
        return (
            f'<figure class="mermaid-figure">'
            f'<img class="mermaid-diagram" src="diagrams/{stem}.svg" '
            f'alt="Architecture diagram {diagram_number}">'
            f'<figcaption>Diagram {diagram_number}</figcaption>'
            f'</figure>'
        )

    documents.append(mermaid_fence.sub(extract_diagram, source).strip())

combined = "\n\n<div class=\"chapter-break\"></div>\n\n".join(documents)
(build_dir / "combined.md").write_text(combined + "\n", encoding="utf-8")
print(f"Prepared 11 chapters and {diagram_number} Mermaid diagrams")
PY

npm install \
  --prefix "${NODE_PREFIX}" \
  --no-audit \
  --no-fund \
  --silent \
  mermaid@11.12.2 \
  playwright@1.58.2

"${NODE_PREFIX}/node_modules/.bin/playwright" install chromium

node --input-type=module - \
  "${NODE_PREFIX}/node_modules/playwright" \
  "${NODE_PREFIX}/node_modules/mermaid/dist/mermaid.min.js" \
  "${DIAGRAM_DIR}" <<'JS'
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const [playwrightPath, mermaidPath, diagramDir] = process.argv.slice(2);
const { chromium } = require(playwrightPath);
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 1200 } });
  await page.setContent(
    '<!doctype html><html><body><main id="diagram-root"></main></body></html>',
  );
  await page.addScriptTag({ path: mermaidPath });
  await page.evaluate(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
      htmlLabels: false,
      maxTextSize: 1000000,
      flowchart: { htmlLabels: false, useMaxWidth: true, curve: "basis" },
      er: { useMaxWidth: true },
      sequence: { useMaxWidth: true, wrap: true },
    });
  });

  const inputs = fs.readdirSync(diagramDir)
    .filter((name) => name.endsWith(".mmd"))
    .sort();

  for (const input of inputs) {
    const source = fs.readFileSync(path.join(diagramDir, input), "utf8");
    const renderId = "nexora-" + input.replace(/[^a-zA-Z0-9]/g, "-");
    try {
      const svg = await page.evaluate(async ({ renderId, source }) => {
        document.getElementById("diagram-root").replaceChildren();
        return (await mermaid.render(renderId, source)).svg;
      }, { renderId, source });
      fs.writeFileSync(
        path.join(diagramDir, input.replace(/\.mmd$/, ".svg")),
        svg,
        "utf8",
      );
    } catch (error) {
      throw new Error("Mermaid rendering failed for " + input + ": " + error);
    }
  }
  process.stdout.write("Rendered " + inputs.length + " Mermaid diagrams\n");
} finally {
  await browser.close();
}
JS

uv run \
  --quiet \
  --with "weasyprint>=62,<70" \
  --with "markdown>=3.5,<4" \
  --with "pygments>=2.17,<3" \
  python3 - \
  "${BUILD_DIR}/combined.md" \
  "${BUILD_DIR}/manual.html" \
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
        "toc": {"title": "Detailed contents", "toc_depth": "1-3"},
        "codehilite": {"guess_lang": False, "noclasses": True},
    },
    output_format="html5",
)
body = renderer.convert(markdown_path.read_text(encoding="utf-8"))
toc = renderer.toc
cover_match = re.search(
    r'<section class="manual-cover">.*?</section>',
    body,
    flags=re.DOTALL,
)
if not cover_match:
    raise SystemExit("Manual cover section was not found in the rendered HTML")
cover = cover_match.group(0)
body = body[:cover_match.start()] + body[cover_match.end():]

css = r"""
@page {
  size: A4;
  margin: 17mm 13mm 18mm;
  @top-left {
    content: "NEXORA MASTER SERVICE MANUAL";
    color: #6b7280;
    font: 600 7.3pt "DejaVu Sans", sans-serif;
    letter-spacing: .08em;
  }
  @top-right {
    content: string(chapter);
    color: #6b7280;
    font: 7.3pt "DejaVu Sans", sans-serif;
  }
  @bottom-center {
    content: "Page " counter(page) " of " counter(pages);
    color: #6b7280;
    font: 7.3pt "DejaVu Sans", sans-serif;
  }
}
@page:first {
  @top-left { content: none; }
  @top-right { content: none; }
  @bottom-center { content: none; }
}
@page schematic {
  size: A3 landscape;
  margin: 12mm;
  @top-left {
    content: "NEXORA MASTER SERVICE MANUAL — DATABASE FOLD-OUT";
    color: #6b7280;
    font: 600 9pt "DejaVu Sans", sans-serif;
  }
  @bottom-center {
    content: "Page " counter(page) " of " counter(pages);
    color: #6b7280;
    font: 9pt "DejaVu Sans", sans-serif;
  }
}
html {
  color: #172033;
  font: 9.1pt/1.44 "DejaVu Sans", sans-serif;
  hyphens: auto;
}
body { margin: 0; }
h1, h2, h3, h4 {
  color: #111827;
  font-family: "DejaVu Sans", sans-serif;
  break-after: avoid;
}
h1 {
  string-set: chapter content();
  margin: 0 0 8mm;
  border-bottom: 2.2pt solid #b91c1c;
  padding-bottom: 3mm;
  font-size: 22pt;
  line-height: 1.16;
}
h2 {
  margin: 8mm 0 3mm;
  border-left: 3pt solid #b91c1c;
  padding-left: 3mm;
  font-size: 15pt;
}
h3 { margin: 6mm 0 2.5mm; font-size: 11.5pt; }
h4 { margin: 4mm 0 2mm; color: #374151; font-size: 9.7pt; }
p { margin: 0 0 3mm; orphans: 3; widows: 3; }
a { color: #991b1b; text-decoration: none; }
ul, ol { margin: 1.5mm 0 3mm 5mm; padding-left: 4mm; }
li { margin-bottom: 1mm; }
blockquote {
  margin: 4mm 0;
  border-left: 3pt solid #d97706;
  background: #fff7ed;
  padding: 3mm 4mm;
  break-inside: avoid;
}
code {
  color: #7f1d1d;
  background: #f3f4f6;
  padding: .15em .3em;
  font: .88em "DejaVu Sans Mono", monospace;
  overflow-wrap: anywhere;
}
pre {
  margin: 3mm 0 4mm;
  border: .5pt solid #d1d5db;
  border-left: 3pt solid #4b5563;
  background: #f8fafc;
  padding: 3mm;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: 6.8pt/1.38 "DejaVu Sans Mono", monospace;
}
pre code { color: inherit; background: transparent; padding: 0; }
table {
  width: 100%;
  margin: 3mm 0 5mm;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 6.4pt;
  line-height: 1.25;
}
thead { display: table-header-group; }
th {
  color: white;
  background: #7f1d1d;
  font-weight: 700;
  text-align: left;
}
th, td {
  border: .45pt solid #cbd5e1;
  padding: 1.2mm 1.35mm;
  vertical-align: top;
  overflow-wrap: anywhere;
}
tr:nth-child(even) td { background: #f8fafc; }
figure {
  margin: 5mm auto;
  text-align: center;
  break-inside: avoid;
}
.mermaid-diagram {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: 238mm;
  margin: 0 auto;
}
figcaption { margin-top: 1.5mm; color: #6b7280; font-size: 7.5pt; }
.chapter-break { break-before: page; }
.toc { break-after: page; string-set: chapter "Detailed contents"; }
.toc h1 { string-set: chapter "Detailed contents"; }
.toc ul { list-style: none; margin-left: 0; padding-left: 0; }
.toc ul ul { margin-left: 5mm; }
.toc li { margin-bottom: 1.2mm; }
.toc a::after {
  content: leader(".") target-counter(attr(href), page);
  color: #6b7280;
}
.manual-cover {
  width: 210mm;
  height: 297mm;
  min-height: 297mm;
  box-sizing: border-box;
  margin: -17mm -13mm -18mm;
  padding: 32mm 24mm;
  background: #111827;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  break-after: page;
}
.manual-cover h1 {
  color: white;
  border: 0;
  max-width: 155mm;
  margin: 0;
  padding: 0;
  font-size: 31pt;
  line-height: 1.08;
}
.manual-cover p {
  max-width: 145mm;
  margin-top: 7mm;
  color: #fecaca;
  font-size: 12pt;
}
.manual-cover svg { width: 62mm; height: auto; margin-bottom: 12mm; }
.mermaid-foldout { page: schematic; }
.mermaid-tile {
  page: schematic;
  width: 100%;
  height: 270mm;
  margin: 0;
  break-before: page;
  break-after: page;
}
.mermaid-viewport {
  width: 100%;
  height: 252mm;
  overflow: hidden;
}
.mermaid-tile figcaption { margin-top: 3mm; font-size: 9pt; }
"""

document = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Nexora Master Technical and Maintenance Service Manual</title>
  <meta name="author" content="Nexora Engineering">
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
HTML(filename=str(html_path), base_url=str(html_path.parent)).write_pdf(
    str(pdf_path),
    presentational_hints=True,
)
print(f"Wrote {pdf_path}")
PY

if command -v pdfinfo >/dev/null 2>&1; then
  pdfinfo "${OUTPUT_PDF}" | grep -E '^(Pages|Page size|File size):'
fi

echo "Master manual PDF: ${OUTPUT_PDF}"
