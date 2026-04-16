export const MAX_FILE_SIZE_BYTES = 104_857_600; // 100 MB
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;
export const UPLOAD_DEST = './uploads/library';

export const LIBRARY_FILE_EXTENSIONS = ['.pdf', '.txt', '.pptx'] as const;
