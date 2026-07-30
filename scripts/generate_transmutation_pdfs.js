const fs = require('fs');
const path = require('path');
let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch (e) {
  PDFDocument = require(path.resolve(__dirname, '../backend/node_modules/pdfkit'));
}

function buildPdf(filename, title, bands) {
  const doc = new PDFDocument({ margin: 36, size: 'A4' });
  const stream = fs.createWriteStream(filename);
  doc.pipe(stream);

  // Title
  doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica-Oblique').text('Official School Class Record Transmutation Table', { align: 'center' });
  doc.moveDown(1);

  // Table Headers
  const startX = 54;
  let startY = doc.y;
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('INITIAL GRADE RANGE', startX, startY, { width: 220 });
  doc.text('TRANSMUTED GRADE', startX + 240, startY, { width: 180 });
  doc.moveDown(0.3);

  // Line separator
  doc.moveTo(startX, doc.y).lineTo(startX + 450, doc.y).stroke('#999999');
  doc.moveDown(0.5);

  doc.fontSize(9).font('Helvetica');

  bands.forEach((band) => {
    if (doc.y > 750) {
      doc.addPage();
      startY = doc.y;
    }
    const rangeStr = band.min === band.max ? `${band.min.toFixed(2)}` : `${band.min.toFixed(2)} - ${band.max.toFixed(2)}`;
    const yPos = doc.y;
    doc.text(rangeStr, startX, yPos, { width: 220 });
    doc.text(String(band.transmuted), startX + 240, yPos, { width: 180 });
    doc.moveDown(0.25);
  });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

const newBands = [
  { min: 99.50, max: 100.00, transmuted: 100 },
  { min: 97.50, max: 99.49, transmuted: 99 },
  { min: 96.00, max: 97.49, transmuted: 98 },
  { min: 95.00, max: 95.99, transmuted: 97 },
  { min: 94.00, max: 94.99, transmuted: 96 },
  { min: 93.00, max: 93.99, transmuted: 95 },
  { min: 92.00, max: 92.99, transmuted: 94 },
  { min: 91.00, max: 91.99, transmuted: 93 },
  { min: 90.00, max: 90.99, transmuted: 92 },
  { min: 89.00, max: 89.99, transmuted: 91 },
  { min: 88.00, max: 88.99, transmuted: 90 },
  { min: 87.00, max: 87.99, transmuted: 89 },
  { min: 86.00, max: 86.99, transmuted: 88 },
  { min: 85.00, max: 85.99, transmuted: 87 },
  { min: 84.00, max: 84.99, transmuted: 86 },
  { min: 83.00, max: 83.99, transmuted: 85 },
  { min: 82.00, max: 82.99, transmuted: 84 },
  { min: 81.00, max: 81.99, transmuted: 83 },
  { min: 80.00, max: 80.99, transmuted: 82 },
  { min: 79.00, max: 79.99, transmuted: 81 },
  { min: 78.00, max: 78.99, transmuted: 80 },
  { min: 77.00, max: 77.99, transmuted: 79 },
  { min: 76.00, max: 76.99, transmuted: 78 },
  { min: 75.00, max: 75.99, transmuted: 77 },
  { min: 73.00, max: 74.99, transmuted: 76 },
  { min: 70.00, max: 72.99, transmuted: 75 },
  { min: 68.00, max: 69.99, transmuted: 74 },
  { min: 66.00, max: 67.99, transmuted: 73 },
  { min: 64.00, max: 65.99, transmuted: 72 },
  { min: 62.00, max: 63.99, transmuted: 71 },
  { min: 60.00, max: 61.99, transmuted: 70 },
  { min: 58.00, max: 59.99, transmuted: 69 },
  { min: 56.00, max: 57.99, transmuted: 68 },
  { min: 54.00, max: 55.99, transmuted: 67 },
  { min: 52.00, max: 53.99, transmuted: 66 },
  { min: 50.00, max: 51.99, transmuted: 65 },
  { min: 48.00, max: 49.99, transmuted: 64 },
  { min: 46.00, max: 47.99, transmuted: 63 },
  { min: 43.00, max: 45.99, transmuted: 62 },
  { min: 40.00, max: 42.99, transmuted: 61 },
  { min: 25.00, max: 39.99, transmuted: 60 },
  { min: 0.00, max: 24.99, transmuted: 60 }
];

const oldBands = [
  { min: 100.00, max: 100.00, transmuted: 100 },
  { min: 98.40, max: 99.99, transmuted: 99 },
  { min: 96.80, max: 98.39, transmuted: 98 },
  { min: 95.20, max: 96.79, transmuted: 97 },
  { min: 93.60, max: 95.19, transmuted: 96 },
  { min: 92.00, max: 93.59, transmuted: 95 },
  { min: 90.40, max: 91.99, transmuted: 94 },
  { min: 88.80, max: 90.30, transmuted: 93 },
  { min: 87.20, max: 88.79, transmuted: 92 },
  { min: 85.60, max: 87.19, transmuted: 91 },
  { min: 84.00, max: 85.59, transmuted: 90 },
  { min: 82.40, max: 83.99, transmuted: 89 },
  { min: 80.80, max: 82.39, transmuted: 88 },
  { min: 79.20, max: 80.79, transmuted: 87 },
  { min: 77.60, max: 79.19, transmuted: 86 },
  { min: 76.00, max: 77.59, transmuted: 85 },
  { min: 74.40, max: 75.99, transmuted: 84 },
  { min: 72.80, max: 74.39, transmuted: 83 },
  { min: 71.20, max: 72.79, transmuted: 82 },
  { min: 69.60, max: 71.19, transmuted: 81 },
  { min: 68.00, max: 69.59, transmuted: 80 },
  { min: 66.40, max: 67.99, transmuted: 79 },
  { min: 64.80, max: 66.39, transmuted: 78 },
  { min: 63.20, max: 64.79, transmuted: 77 },
  { min: 61.60, max: 63.19, transmuted: 76 },
  { min: 60.00, max: 61.59, transmuted: 75 },
  { min: 56.00, max: 59.99, transmuted: 74 },
  { min: 52.00, max: 55.99, transmuted: 73 },
  { min: 48.00, max: 51.99, transmuted: 72 },
  { min: 44.00, max: 47.99, transmuted: 71 },
  { min: 40.00, max: 43.99, transmuted: 70 },
  { min: 36.00, max: 39.99, transmuted: 69 },
  { min: 32.00, max: 35.99, transmuted: 68 },
  { min: 28.00, max: 31.99, transmuted: 67 },
  { min: 24.00, max: 27.99, transmuted: 66 },
  { min: 20.00, max: 23.99, transmuted: 65 },
  { min: 16.00, max: 19.99, transmuted: 64 },
  { min: 12.00, max: 15.99, transmuted: 63 },
  { min: 8.00, max: 11.99, transmuted: 62 },
  { min: 4.00, max: 7.99, transmuted: 61 },
  { min: 0.00, max: 3.99, transmuted: 60 }
];

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const publicDir = path.resolve(__dirname, '../next-frontend/public');

  const file1 = path.join(rootDir, 'transmutation_table_new.pdf');
  const file2 = path.join(rootDir, 'transmutation_table_old.pdf');

  await buildPdf(file1, 'NEW TRANSMUTATION TABLE', newBands);
  await buildPdf(file2, 'OLD TRANSMUTATION TABLE (DepEd Order No. 8 s. 2015)', oldBands);

  if (fs.existsSync(publicDir)) {
    fs.copyFileSync(file1, path.join(publicDir, 'transmutation_table_new.pdf'));
    fs.copyFileSync(file2, path.join(publicDir, 'transmutation_table_old.pdf'));
  }

  console.log('✅ Generated PDF files:');
  console.log(' - ' + file1);
  console.log(' - ' + file2);
}

main().catch((err) => {
  console.error('❌ Error generating PDFs:', err);
  process.exit(1);
});
