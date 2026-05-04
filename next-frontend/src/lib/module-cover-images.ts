import type { Area } from 'react-easy-crop';

export const DEFAULT_MODULE_GRADIENT = 'oceanic-blue';

export const MODULE_GRADIENT_OPTIONS = [
  { id: 'oceanic-blue', label: 'Oceanic Blue', background: 'linear-gradient(135deg, #2b4fdd 0%, #3c62f0 100%)' },
  { id: 'emerald-wave', label: 'Emerald Wave', background: 'linear-gradient(135deg, #089f79 0%, #10b78f 100%)' },
  { id: 'violet-burst', label: 'Violet Burst', background: 'linear-gradient(135deg, #7f22f0 0%, #9a44f6 100%)' },
  { id: 'sunset-orange', label: 'Sunset Orange', background: 'linear-gradient(135deg, #d76a1f 0%, #f08d2d 100%)' },
  { id: 'rose-dusk', label: 'Rose Dusk', background: 'linear-gradient(135deg, #d42756 0%, #ef5f87 100%)' },
  { id: 'slate-night', label: 'Slate Night', background: 'linear-gradient(135deg, #1d304f 0%, #2e4a73 100%)' },
] as const;

export const MODULE_STOCK_IMAGE_OPTIONS = [
  { id: 'math', label: 'Math stock image', imageUrl: '/images/modules/module-stock-math.svg' },
  { id: 'science', label: 'Science stock image', imageUrl: '/images/modules/module-stock-science.svg' },
  { id: 'english', label: 'English stock image', imageUrl: '/images/modules/module-stock-english.svg' },
  { id: 'filipino', label: 'Filipino stock image', imageUrl: '/images/modules/module-stock-filipino.svg' },
  { id: 'ap', label: 'Araling Panlipunan stock image', imageUrl: '/images/modules/module-stock-ap.svg' },
  { id: 'tle', label: 'TLE stock image', imageUrl: '/images/modules/module-stock-tle.svg' },
  { id: 'mapeh', label: 'MAPEH stock image', imageUrl: '/images/modules/module-stock-mapeh.svg' },
  { id: 'esp', label: 'ESP stock image', imageUrl: '/images/modules/module-stock-esp.svg' },
] as const;

export const MODULE_COVER_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MODULE_COVER_MIN_WIDTH = 320;
export const MODULE_COVER_MIN_HEIGHT = 180;
export const MODULE_COVER_MAX_WIDTH = 6000;
export const MODULE_COVER_MAX_HEIGHT = 6000;

const ALLOWED_MODULE_COVER_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const ALLOWED_MODULE_COVER_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function getModuleCoverExtension(name: string) {
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : '';
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image preview could not be loaded.'));
    image.src = url;
  });
}

export async function validateModuleCoverFile(file: File) {
  const extension = getModuleCoverExtension(file.name);

  if (!ALLOWED_MODULE_COVER_EXTENSIONS.has(extension)) {
    throw new Error('Only PNG, JPG, JPEG, and WebP images are allowed.');
  }

  if (!ALLOWED_MODULE_COVER_MIME_TYPES.has(file.type)) {
    throw new Error('Only PNG, JPG, JPEG, and WebP images are allowed.');
  }

  if (file.size <= 0) {
    throw new Error('The selected image file is empty.');
  }

  if (file.size > MODULE_COVER_MAX_FILE_SIZE_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }

  const previewUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(previewUrl);
    const width = image.naturalWidth;
    const height = image.naturalHeight;

    if (width < MODULE_COVER_MIN_WIDTH || height < MODULE_COVER_MIN_HEIGHT) {
      throw new Error(`Image must be at least ${MODULE_COVER_MIN_WIDTH}x${MODULE_COVER_MIN_HEIGHT}px.`);
    }

    if (width > MODULE_COVER_MAX_WIDTH || height > MODULE_COVER_MAX_HEIGHT) {
      throw new Error(`Image must not exceed ${MODULE_COVER_MAX_WIDTH}x${MODULE_COVER_MAX_HEIGHT}px.`);
    }

    return { width, height };
  } finally {
    URL.revokeObjectURL(previewUrl);
  }
}

export async function createCroppedModuleCoverBlob(
  sourceUrl: string,
  cropAreaPixels: Area | null,
) {
  const image = await loadImage(sourceUrl);
  const canvas = document.createElement('canvas');
  const safeArea = cropAreaPixels ?? {
    width: image.naturalWidth,
    height: image.naturalHeight,
    x: 0,
    y: 0,
  };

  canvas.width = Math.max(1, Math.round(safeArea.width));
  canvas.height = Math.max(1, Math.round(safeArea.height));

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Image editor is unavailable right now.');
  }

  context.drawImage(
    image,
    safeArea.x,
    safeArea.y,
    safeArea.width,
    safeArea.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to process the cropped image.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

export function sanitizeModuleCoverUploadName(name: string) {
  const extension = getModuleCoverExtension(name);
  const baseName = extension ? name.slice(0, -extension.length) : name;
  const sanitizedBaseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return sanitizedBaseName || 'module-cover';
}
