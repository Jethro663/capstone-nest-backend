export interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  classId: string;
  uploadedBy: string;
  isDeleted: boolean;
  createdAt: string;
}

export interface StorageSummary {
  totalFiles: number;
  totalSizeBytes: number;
  byUser: { userId: string; fileCount: number; totalSize: number }[];
}
