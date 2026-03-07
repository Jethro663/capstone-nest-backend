export interface UploadedFile {
  id: string;
  folderId?: string | null;
  teacherId: string;
  classId?: string | null;
  scope: 'private' | 'general';
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  filePath: string;
  uploadedAt: string;
  deletedAt?: string | null;
  teacher?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  class?: {
    id: string;
    subjectName?: string;
    subjectCode?: string;
  };
  folder?: LibraryFolder | null;
}

export interface LibraryFolder {
  id: string;
  name: string;
  ownerId: string;
  parentId?: string | null;
  scope: 'private' | 'general';
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  owner?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export interface StorageSummary {
  totalFiles: number;
  totalBytes: number;
  totalMB: number;
  totalGB: number;
}

export interface FileLibraryQuery {
  scope?: 'private' | 'general';
  folderId?: string;
  ownerId?: string;
  classId?: string;
  search?: string;
}
