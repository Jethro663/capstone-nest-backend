export const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const GRADE_LEVELS = ['7', '8', '9', '10'] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];

export const GRADING_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
export type GradingPeriod = (typeof GRADING_PERIODS)[number];

export const ASSESSMENT_TYPES = ['quiz', 'exam', 'assignment'] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const QUESTION_TYPES = [
  'multiple_choice',
  'multiple_select',
  'true_false',
  'short_answer',
  'fill_in_blank',
  'dropdown',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const CONTENT_BLOCK_TYPES = ['text', 'image', 'video', 'question', 'file', 'divider'] as const;
export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

export const FEEDBACK_LEVELS = ['immediate', 'standard', 'detailed'] as const;
export type FeedbackLevel = (typeof FEEDBACK_LEVELS)[number];

export const ACCOUNT_STATUSES = ['ACTIVE', 'PENDING', 'SUSPENDED', 'DELETED'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const SCHEDULE_DAYS = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'] as const;
export type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

export const NOTIFICATION_TYPES = [
  'announcement_posted',
  'grade_updated',
  'assessment_published',
  'lesson_published',
  'enrollment_added',
  'enrollment_removed',
] as const;

/** Subject code map per grade level — used when creating classes */
export const SUBJECT_MAP: Record<string, { code: string; name: string }[]> = {
  '7': [
    { code: 'MATH-7', name: 'Mathematics 7' },
    { code: 'SCI-7', name: 'Science 7' },
    { code: 'ENG-7', name: 'English 7' },
    { code: 'FIL-7', name: 'Filipino 7' },
    { code: 'AP-7', name: 'Araling Panlipunan 7' },
    { code: 'TLE-7', name: 'TLE 7' },
    { code: 'MAPEH-7', name: 'MAPEH 7' },
    { code: 'ESP-7', name: 'ESP 7' },
  ],
  '8': [
    { code: 'MATH-8', name: 'Mathematics 8' },
    { code: 'SCI-8', name: 'Science 8' },
    { code: 'ENG-8', name: 'English 8' },
    { code: 'FIL-8', name: 'Filipino 8' },
    { code: 'AP-8', name: 'Araling Panlipunan 8' },
    { code: 'TLE-8', name: 'TLE 8' },
    { code: 'MAPEH-8', name: 'MAPEH 8' },
    { code: 'ESP-8', name: 'ESP 8' },
  ],
  '9': [
    { code: 'MATH-9', name: 'Mathematics 9' },
    { code: 'SCI-9', name: 'Science 9' },
    { code: 'ENG-9', name: 'English 9' },
    { code: 'FIL-9', name: 'Filipino 9' },
    { code: 'AP-9', name: 'Araling Panlipunan 9' },
    { code: 'TLE-9', name: 'TLE 9' },
    { code: 'MAPEH-9', name: 'MAPEH 9' },
    { code: 'ESP-9', name: 'ESP 9' },
  ],
  '10': [
    { code: 'MATH-10', name: 'Mathematics 10' },
    { code: 'SCI-10', name: 'Science 10' },
    { code: 'ENG-10', name: 'English 10' },
    { code: 'FIL-10', name: 'Filipino 10' },
    { code: 'AP-10', name: 'Araling Panlipunan 10' },
    { code: 'TLE-10', name: 'TLE 10' },
    { code: 'MAPEH-10', name: 'MAPEH 10' },
    { code: 'ESP-10', name: 'ESP 10' },
  ],
};
