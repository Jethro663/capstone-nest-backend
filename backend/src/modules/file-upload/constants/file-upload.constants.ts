export const MAX_FILE_SIZE_BYTES = 104_857_600; // 100 MB
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/octet-stream',
] as const;
export const UPLOAD_ROOT = process.env.UPLOAD_DIR || './uploads';
export const UPLOAD_DEST = `${UPLOAD_ROOT}/library`;

export const LIBRARY_FILE_EXTENSIONS = [
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
] as const;
