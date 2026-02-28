export interface Section {
  id: string;
  name: string;
  gradeLevel: string;
  schoolYear: string;
  capacity: number;
  roomNumber?: string;
  adviserId?: string;
  adviser?: { id: string; firstName?: string; lastName?: string; email?: string };
  isActive: boolean;
  studentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSectionDto {
  name: string;
  gradeLevel: '7' | '8' | '9' | '10';
  schoolYear: string;
  capacity: number;
  roomNumber?: string;
  adviserId?: string;
}

export interface UpdateSectionDto {
  name?: string;
  gradeLevel?: string;
  schoolYear?: string;
  capacity?: number;
  roomNumber?: string;
  adviserId?: string | null;
  isActive?: boolean;
}
