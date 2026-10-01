import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '../../..');
const requireFromFrontend = createRequire(
  path.join(repoRoot, 'next-frontend', 'package.json'),
);

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function annotateImage({ inputPath, outputPath, annotations }) {
  const sharp = requireFromFrontend('sharp');
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Cannot annotate image without dimensions: ${inputPath}`);
  }

  const circles = annotations
    .map((annotation) => {
      const x = Math.round((annotation.xPercent / 100) * metadata.width);
      const y = Math.round((annotation.yPercent / 100) * metadata.height);
      const radius = Math.max(16, Math.round(metadata.width * 0.014));
      const fontSize = Math.max(18, Math.round(radius * 1.15));
      return [
        `<circle cx="${x}" cy="${y}" r="${radius + 4}" fill="#ffffff" fill-opacity="0.96"/>`,
        `<circle cx="${x}" cy="${y}" r="${radius}" fill="#DC2626"/>`,
        `<text x="${x}" y="${y}" dominant-baseline="central" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${escapeXml(annotation.number)}</text>`,
      ].join('');
    })
    .join('');
  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${metadata.width}" height="${metadata.height}">${circles}</svg>`,
  );

  await mkdir(path.dirname(outputPath), { recursive: true });
  await image.composite([{ input: overlay, top: 0, left: 0 }]).png().toFile(outputPath);
  return {
    outputPath,
    width: metadata.width,
    height: metadata.height,
    labels: annotations.map(({ number, label }) => ({ number, label })),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  process.stderr.write('Import annotateImage from capture-web.mjs; no standalone CLI is provided.\n');
}
