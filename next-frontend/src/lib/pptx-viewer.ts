import JSZip from 'jszip';

export const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export interface PptxSlide {
  slideNumber: number;
  title: string;
  lines: string[];
}

interface PptxFileLike {
  fileName?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
  fileKind?: string | null;
  metadata?: Record<string, unknown> | null;
}

function parseXml(source: string) {
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new Error('The presentation contains unreadable XML.');
  }
  return document;
}

function elementsByLocalName(document: Document | Element, localName: string) {
  const namespaced = Array.from(document.getElementsByTagNameNS('*', localName));
  if (namespaced.length > 0) return namespaced;
  return Array.from(document.getElementsByTagName(localName));
}

function normalizeTargetPath(target: string) {
  const parts = target.startsWith('/') ? target.slice(1).split('/') : `ppt/${target}`.split('/');
  const normalized: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') normalized.pop();
    else normalized.push(part);
  }
  return normalized.join('/');
}

function naturalSlideSort(left: string, right: string) {
  const leftNumber = Number(left.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
  const rightNumber = Number(right.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
  return leftNumber - rightNumber || left.localeCompare(right);
}

function getFallbackSlidePaths(zip: JSZip) {
  return Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort(naturalSlideSort);
}

async function getOrderedSlidePaths(zip: JSZip) {
  const presentationFile = zip.file('ppt/presentation.xml');
  const relationshipsFile = zip.file('ppt/_rels/presentation.xml.rels');

  if (!presentationFile || !relationshipsFile) {
    return getFallbackSlidePaths(zip);
  }

  const [presentationXml, relationshipsXml] = await Promise.all([
    presentationFile.async('string'),
    relationshipsFile.async('string'),
  ]);
  const presentation = parseXml(presentationXml);
  const relationships = parseXml(relationshipsXml);

  const relationshipTargets = new Map<string, string>();
  for (const relationship of elementsByLocalName(relationships, 'Relationship')) {
    const id = relationship.getAttribute('Id');
    const target = relationship.getAttribute('Target');
    if (id && target) {
      relationshipTargets.set(id, normalizeTargetPath(target));
    }
  }

  const slidePaths = elementsByLocalName(presentation, 'sldId')
    .map((slideId) => slideId.getAttribute('r:id') || slideId.getAttribute('id'))
    .map((relationshipId) => (relationshipId ? relationshipTargets.get(relationshipId) : undefined))
    .filter((path): path is string => Boolean(path));

  return slidePaths.length > 0 ? slidePaths : getFallbackSlidePaths(zip);
}

function extractSlideLines(slideXml: string) {
  const document = parseXml(slideXml);
  return elementsByLocalName(document, 't')
    .map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean);
}

async function toArrayBuffer(input: Blob | ArrayBuffer) {
  if (input instanceof ArrayBuffer) return input;
  if (typeof input.arrayBuffer === 'function') return input.arrayBuffer();
  if (typeof FileReader === 'undefined') {
    throw new Error('This browser cannot read the PowerPoint file.');
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read the PowerPoint file.'));
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }
      reject(new Error('Unable to read the PowerPoint file.'));
    };
    reader.readAsArrayBuffer(input);
  });
}

export async function parsePptxSlides(input: Blob | ArrayBuffer): Promise<PptxSlide[]> {
  const buffer = await toArrayBuffer(input);
  const zip = await JSZip.loadAsync(buffer);
  const slidePaths = await getOrderedSlidePaths(zip);

  const slides = await Promise.all(
    slidePaths.map(async (path, index) => {
      const slideFile = zip.file(path);
      const lines = slideFile ? extractSlideLines(await slideFile.async('string')) : [];
      const fallbackTitle = `Slide ${index + 1}`;
      return {
        slideNumber: index + 1,
        title: lines[0] || fallbackTitle,
        lines: lines.length > 0 ? lines : ['This slide has no readable text content.'],
      };
    }),
  );

  if (slides.length === 0) {
    throw new Error('No slides were found in this PowerPoint file.');
  }

  return slides;
}

export function isPptxFile(file?: PptxFileLike | null) {
  if (!file) return false;
  const metadataSubtype =
    typeof file.metadata?.fileSubtype === 'string' ? file.metadata.fileSubtype : '';
  const name = (file.fileName || file.originalName || '').toLowerCase();
  return (
    file.fileKind === 'pptx' ||
    file.mimeType === PPTX_MIME ||
    metadataSubtype === 'pptx' ||
    name.endsWith('.pptx')
  );
}

export function getFileSubtype(file?: PptxFileLike | File | null) {
  if (!file) return 'file';
  if (typeof File !== 'undefined' && file instanceof File) {
    if (file.type === PPTX_MIME || file.name.toLowerCase().endsWith('.pptx')) return 'pptx';
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
    if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) return 'txt';
    if (file.type.startsWith('image/')) return 'image';
    return 'file';
  }
  const metadataFile = file as PptxFileLike;
  if (isPptxFile(metadataFile)) return 'pptx';
  if (metadataFile.fileKind) return metadataFile.fileKind;
  if (metadataFile.mimeType === 'application/pdf') return 'pdf';
  if (metadataFile.mimeType === 'text/plain') return 'txt';
  if (metadataFile.mimeType?.startsWith('image/')) return 'image';
  return 'file';
}
