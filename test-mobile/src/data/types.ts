export interface Subject {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  section?: string;
  teacherName?: string;
  subjectCode?: string;
}

export interface Lesson {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  status: "completed" | "ongoing" | "locked";
  duration: string;
  xp: number;
  order?: number;
}

export interface Assessment {
  id: string;
  subjectId: string;
  title: string;
  subject: string;
  dueDate: string;
  status: "pending" | "late" | "completed" | "missing";
  score?: number;
  totalScore: number;
  emoji: string;
  classId?: string;
  attempts?: unknown[];
  raw?: Record<string, unknown>;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  earned: boolean;
  earnedDate?: string;
}

export interface LxpRecommendation {
  id: string;
  type: "lesson" | "retry";
  title: string;
  subject: string;
  reason: string;
  emoji: string;
  xp: number;
  urgent: boolean;
  completed?: boolean;
}

export interface UserProfile {
  name: string;
  grade: string;
  section: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
  joinDate: string;
  totalLessonsCompleted: number;
  averageScore: number;
  studyHours: number;
}

export interface AnnouncementPreview {
  id: string;
  classId: string;
  title: string;
  content: string;
  subject: string;
  emoji: string;
  isPinned: boolean;
  createdAt: string;
}

export type SubjectCard = Subject;
export type LessonCard = Lesson;
export type AssessmentCard = Assessment;
export type AchievementCard = Achievement;
export type TutorRecommendationCard = LxpRecommendation;
export type UserProfileSummary = UserProfile;
