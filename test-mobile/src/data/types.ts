export interface Subject {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
}

export interface Lesson {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  status: "completed" | "ongoing" | "locked";
  duration: string;
  xp: number;
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
