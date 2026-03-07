export interface UploadedFile {
  id: string;
  teacherId: string;
  classId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  filePath: string;
  uploadedAt: string;
  deletedAt?: string | null;
}

export interface StorageSummary {
  totalFiles: number;
  totalBytes: number;
  totalMB: number;
  totalGB: number;
}
