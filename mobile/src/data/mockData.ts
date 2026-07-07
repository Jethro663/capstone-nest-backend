import type {
  Achievement,
  Assessment,
  Lesson,
  LxpRecommendation,
  Subject,
  UserProfile,
} from "./types";

export const subjects: Subject[] = [
  {
    id: "math",
    name: "Mathematics",
    emoji: "📐",
    color: "#FF6B6B",
    bgColor: "#FFF0F0",
    progress: 45,
    totalLessons: 20,
    completedLessons: 9,
  },
  {
    id: "science",
    name: "Science",
    emoji: "🔬",
    color: "#4CAF50",
    bgColor: "#F0FFF0",
    progress: 30,
    totalLessons: 18,
    completedLessons: 5,
  },
  {
    id: "english",
    name: "English",
    emoji: "📚",
    color: "#60C3F5",
    bgColor: "#F0F8FF",
    progress: 70,
    totalLessons: 15,
    completedLessons: 10,
  },
  {
    id: "history",
    name: "History",
    emoji: "🏛️",
    color: "#FFB830",
    bgColor: "#FFFBF0",
    progress: 15,
    totalLessons: 16,
    completedLessons: 2,
  },
  {
    id: "filipino",
    name: "Filipino",
    emoji: "🌺",
    color: "#A855F7",
    bgColor: "#FAF0FF",
    progress: 60,
    totalLessons: 14,
    completedLessons: 8,
  },
  {
    id: "art",
    name: "Arts & Music",
    emoji: "🎨",
    color: "#F97316",
    bgColor: "#FFF5F0",
    progress: 20,
    totalLessons: 10,
    completedLessons: 2,
  },
];

export const lessons: Record<string, Lesson[]> = {
  math: [
    { id: "m1", subjectId: "math", title: "Introduction to Algebra", description: "Variables, expressions & equations", status: "completed", duration: "25 min", xp: 50 },
    { id: "m2", subjectId: "math", title: "Linear Equations", description: "Solving one & two-step equations", status: "completed", duration: "30 min", xp: 60 },
    { id: "m3", subjectId: "math", title: "Quadratic Equations", description: "Factoring & quadratic formula", status: "ongoing", duration: "40 min", xp: 80 },
    { id: "m4", subjectId: "math", title: "Polynomials", description: "Operations with polynomials", status: "locked", duration: "35 min", xp: 70 },
    { id: "m5", subjectId: "math", title: "Functions & Graphs", description: "Graphing and interpreting functions", status: "locked", duration: "45 min", xp: 90 },
  ],
  science: [
    { id: "s1", subjectId: "science", title: "Cell Biology", description: "Structure and function of cells", status: "completed", duration: "30 min", xp: 50 },
    { id: "s2", subjectId: "science", title: "Photosynthesis", description: "How plants make food", status: "ongoing", duration: "25 min", xp: 55 },
    { id: "s3", subjectId: "science", title: "Human Anatomy", description: "Systems of the human body", status: "locked", duration: "40 min", xp: 80 },
    { id: "s4", subjectId: "science", title: "Forces & Motion", description: "Newton's laws of motion", status: "locked", duration: "35 min", xp: 70 },
  ],
  english: [
    { id: "e1", subjectId: "english", title: "Parts of Speech", description: "Nouns, verbs, adjectives & more", status: "completed", duration: "20 min", xp: 40 },
    { id: "e2", subjectId: "english", title: "Sentence Structure", description: "Simple, compound & complex sentences", status: "completed", duration: "25 min", xp: 50 },
    { id: "e3", subjectId: "english", title: "Essay Writing", description: "Introduction, body & conclusion", status: "completed", duration: "35 min", xp: 70 },
    { id: "e4", subjectId: "english", title: "Reading Comprehension", description: "Analyzing texts and passages", status: "ongoing", duration: "30 min", xp: 60 },
    { id: "e5", subjectId: "english", title: "Literature Analysis", description: "Themes, motifs & literary devices", status: "locked", duration: "40 min", xp: 80 },
  ],
  history: [
    { id: "h1", subjectId: "history", title: "Ancient Civilizations", description: "Egypt, Greece, and Rome", status: "completed", duration: "30 min", xp: 60 },
    { id: "h2", subjectId: "history", title: "Medieval Period", description: "Feudalism and the Middle Ages", status: "ongoing", duration: "35 min", xp: 70 },
    { id: "h3", subjectId: "history", title: "Renaissance", description: "Art, science & exploration", status: "locked", duration: "30 min", xp: 60 },
    { id: "h4", subjectId: "history", title: "World Wars", description: "WWI and WWII overview", status: "locked", duration: "45 min", xp: 90 },
  ],
  filipino: [
    { id: "f1", subjectId: "filipino", title: "Mga Bahagi ng Pananalita", description: "Pangngalan, Pandiwa, at Pang-uri", status: "completed", duration: "25 min", xp: 50 },
    { id: "f2", subjectId: "filipino", title: "Pagsulat ng Sanaysay", description: "Paano sumulat ng maayos na sanaysay", status: "completed", duration: "30 min", xp: 60 },
    { id: "f3", subjectId: "filipino", title: "Panitikan", description: "Mga Klasikong Akda sa Pilipinas", status: "ongoing", duration: "35 min", xp: 70 },
    { id: "f4", subjectId: "filipino", title: "Komunikasyon", description: "Epektibong pakikipag-usap", status: "locked", duration: "25 min", xp: 50 },
  ],
  art: [
    { id: "a1", subjectId: "art", title: "Color Theory", description: "Primary, secondary & tertiary colors", status: "completed", duration: "20 min", xp: 40 },
    { id: "a2", subjectId: "art", title: "Music Fundamentals", description: "Notes, rhythm & melody basics", status: "ongoing", duration: "30 min", xp: 60 },
    { id: "a3", subjectId: "art", title: "Drawing Techniques", description: "Perspective, shading & composition", status: "locked", duration: "35 min", xp: 70 },
  ],
};

export const assessments: Assessment[] = [
  { id: "a1", subjectId: "math", title: "Algebra Quiz", subject: "Mathematics", dueDate: "Mar 20, 2026", status: "pending", totalScore: 100, emoji: "📐" },
  { id: "a2", subjectId: "science", title: "Cell Biology Report", subject: "Science", dueDate: "Mar 18, 2026", status: "late", totalScore: 50, emoji: "🔬" },
  { id: "a3", subjectId: "english", title: "Essay: My Hero", subject: "English", dueDate: "Mar 15, 2026", status: "completed", score: 92, totalScore: 100, emoji: "📚" },
  { id: "a4", subjectId: "history", title: "Ancient Civilizations Test", subject: "History", dueDate: "Mar 25, 2026", status: "pending", totalScore: 80, emoji: "🏛️" },
  { id: "a5", subjectId: "math", title: "Linear Equations Exam", subject: "Mathematics", dueDate: "Mar 10, 2026", status: "missing", totalScore: 100, emoji: "📐" },
  { id: "a6", subjectId: "filipino", title: "Sanaysay Submission", subject: "Filipino", dueDate: "Mar 22, 2026", status: "pending", totalScore: 60, emoji: "🌺" },
  { id: "a7", subjectId: "science", title: "Forces & Motion Quiz", subject: "Science", dueDate: "Mar 28, 2026", status: "pending", totalScore: 50, emoji: "🔬" },
  { id: "a8", subjectId: "english", title: "Reading Comprehension", subject: "English", dueDate: "Mar 12, 2026", status: "completed", score: 88, totalScore: 100, emoji: "📚" },
];

export const achievements: Achievement[] = [
  { id: "ach1", title: "First Steps", description: "Complete your first lesson", emoji: "👣", earned: true, earnedDate: "Mar 1, 2026" },
  { id: "ach2", title: "Streak Master", description: "Maintain a 7-day study streak", emoji: "🔥", earned: true, earnedDate: "Mar 10, 2026" },
  { id: "ach3", title: "Quiz Champion", description: "Score 90%+ on 3 assessments", emoji: "🏆", earned: true, earnedDate: "Mar 15, 2026" },
  { id: "ach4", title: "Bookworm", description: "Complete 10 English lessons", emoji: "📖", earned: false },
  { id: "ach5", title: "Math Wizard", description: "Master all algebra topics", emoji: "🧙", earned: false },
  { id: "ach6", title: "Science Explorer", description: "Complete all Science lessons", emoji: "🚀", earned: false },
  { id: "ach7", title: "Polyglot", description: "Study 3 language subjects", emoji: "🌍", earned: true, earnedDate: "Mar 8, 2026" },
  { id: "ach8", title: "Speed Runner", description: "Complete 5 lessons in one day", emoji: "⚡", earned: false },
];

export const lxpRecommendations: LxpRecommendation[] = [
  { id: "r1", type: "lesson", title: "Review: Quadratic Equations", subject: "Mathematics", reason: "Low quiz score", emoji: "📐", xp: 80, urgent: true },
  { id: "r2", type: "retry", title: "Cell Biology Report", subject: "Science", reason: "Overdue assignment", emoji: "🔬", xp: 50, urgent: true },
  { id: "r3", type: "lesson", title: "Medieval Period Review", subject: "History", reason: "Weak area detected", emoji: "🏛️", xp: 70, urgent: false },
  { id: "r4", type: "lesson", title: "Color Theory Deep Dive", subject: "Arts & Music", reason: "Build on completed basics", emoji: "🎨", xp: 40, urgent: false },
];

export const aiMentorMessages = [
  "You should review Algebra basics! Your quiz score shows some gaps. 📊",
  "You're doing great in English! Keep it up with the Reading Comprehension lesson. 📚",
  "Don't forget your Science report — it's already late! Submit it now! 🔬",
  "7-day streak! You're on fire! Keep studying to maintain it! 🔥",
  "Try the Medieval Period lesson to strengthen your History score. 🏛️",
];

export const userProfile: UserProfile = {
  name: "Alex Johnson",
  grade: "Grade 10",
  section: "Section A - Magsaysay",
  avatar: "🎓",
  xp: 1250,
  level: 8,
  streak: 7,
  joinDate: "January 2026",
  totalLessonsCompleted: 36,
  averageScore: 87,
  studyHours: 24,
};
