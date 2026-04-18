export interface UploadedFile {
  id: string;
  folderId?: string | null;
  teacherId: string;
  classId?: string | null;
  scope: 'private' | 'general';
  subjectKey?: LibrarySubjectKey | null;
  gradeLevel?: LibraryGradeLevel | null;
  teacherVisible?: boolean;
  aiEnabled?: boolean;
  indexStatus?: LibraryIndexStatus;
  indexError?: string | null;
  indexedAt?: string | null;
  contentHash?: string | null;
  fileKind?: LibraryFileKind;
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

export type LibrarySubjectKey =
  | 'math'
  | 'science'
  | 'english'
  | 'filipino'
  | 'ap'
  | 'tle'
  | 'mapeh'
  | 'esp';

export type LibraryGradeLevel = '7' | '8' | '9' | '10';
export type LibraryIndexStatus =
  | 'not_indexed'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';
export type LibraryFileKind = 'pdf' | 'txt' | 'pptx';

export const LIBRARY_SUBJECTS: Array<{ key: LibrarySubjectKey; label: string }> = [
  { key: 'math', label: 'Math' },
  { key: 'science', label: 'Science' },
  { key: 'english', label: 'English' },
  { key: 'filipino', label: 'Filipino' },
  { key: 'ap', label: 'Araling Panlipunan' },
  { key: 'tle', label: 'TLE' },
  { key: 'mapeh', label: 'MAPEH' },
  { key: 'esp', label: 'ESP' },
];

export const LIBRARY_GRADES: LibraryGradeLevel[] = ['7', '8', '9', '10'];

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
  subjectKey?: LibrarySubjectKey;
  gradeLevel?: LibraryGradeLevel;
  teacherVisible?: boolean;
  aiEnabled?: boolean;
  indexStatus?: LibraryIndexStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FileLibraryResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  count: number;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
