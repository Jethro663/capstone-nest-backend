// Mock data service for assessments, lessons, and user profile

export const mockAssessments = [
  {
    id: 1,
    title: 'Basic English Grammar',
    subject: 'English',
    difficulty: 'Easy',
    description: 'Test your knowledge on basic grammar rules',
    totalQuestions: 10,
    completedQuestions: 7,
    dueDate: '2026-03-20',
    isCompleted: false,
    score: null,
    timeLimit: 15,
  },
  {
    id: 2,
    title: 'Mathematics',
    subject: 'Mathematics',
    difficulty: 'Hard',
    description: 'Challenge yourself with advanced math concepts',
    totalQuestions: 15,
    completedQuestions: 0,
    dueDate: '2026-03-18',
    isCompleted: false,
    score: null,
    timeLimit: 30,
  },
  {
    id: 3,
    title: 'History',
    subject: 'History',
    difficulty: 'Medium',
    description: 'Explore major civilizations throughout history',
    totalQuestions: 12,
    completedQuestions: 12,
    dueDate: '2026-03-15',
    isCompleted: true,
    score: 92,
    timeLimit: 20,
  },
  {
    id: 4,
    title: 'Biology',
    subject: 'Science',
    difficulty: 'Medium',
    description: 'Understand the steps of scientific research',
    totalQuestions: 8,
    completedQuestions: 4,
    dueDate: '2026-03-25',
    isCompleted: false,
    score: null,
    timeLimit: 12,
  },
];

export const mockLessons = [
  {
    id: 1,
    title: 'Introduction to Literature',
    subject: 'English',
    difficulty: 'Easy',
    description: 'Learn the basics of literary analysis',
    duration: 12,
    progress: 100,
    isCompleted: true,
    isContinued: false,
    thumbnail: '📚',
  },
  {
    id: 2,
    title: 'Algebra Fundamentals',
    subject: 'Mathematics',
    difficulty: 'Medium',
    description: 'Master the foundation of algebra',
    duration: 18,
    progress: 65,
    isCompleted: false,
    isContinued: true,
    thumbnail: '🔢',
  },
  {
    id: 3,
    title: 'Ancient Egypt',
    subject: 'History',
    difficulty: 'Easy',
    description: 'Discover the mysteries of ancient Egypt',
    duration: 15,
    progress: 80,
    isCompleted: false,
    isContinued: true,
    thumbnail: '🏛️',
  },
  {
    id: 4,
    title: 'Photosynthesis Process',
    subject: 'Biology',
    difficulty: 'Medium',
    description: 'Understanding how plants create energy',
    duration: 14,
    progress: 0,
    isCompleted: false,
    isContinued: false,
    thumbnail: '🌱',
  },
  {
    id: 5,
    title: 'World War II Timeline',
    subject: 'History',
    difficulty: 'Hard',
    description: 'Comprehensive overview of WWII events',
    duration: 25,
    progress: 0,
    isCompleted: false,
    isContinued: false,
    thumbnail: '⚔️',
  },
  {
    id: 6,
    title: 'Quadratic Equations',
    subject: 'Mathematics',
    difficulty: 'Hard',
    description: 'Solve and graph quadratic equations',
    duration: 20,
    progress: 0,
    isCompleted: false,
    isContinued: false,
    thumbnail: '📈',
  },
];

export const mockUserProfile = {
  id: 1,
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com',
  avatar: '👤',
  totalLessonsCompleted: 12,
  totalAssessmentsTaken: 8,
  currentStreak: 14,
  totalXP: 2450,
  level: 8,
  bio: 'Passionate learner exploring new subjects every day!',
  joinDate: '2025-09-15',
  averageScore: 87,
  badges: [
    {
      id: 1,
      name: 'First Lesson',
      icon: '🎯',
      unlockedDate: '2025-09-15',
      rarity: 'common',
    },
    {
      id: 2,
      name: 'Week Warrior',
      icon: '⚡',
      unlockedDate: '2025-09-22',
      rarity: 'uncommon',
    },
    {
      id: 3,
      name: '100 XP Club',
      icon: '💯',
      unlockedDate: '2025-10-01',
      rarity: 'uncommon',
    },
    {
      id: 4,
      name: 'Streak Master',
      icon: '🔥',
      unlockedDate: '2025-11-15',
      rarity: 'rare',
    },
    {
      id: 5,
      name: 'Knowledge Seeker',
      icon: '🧠',
      unlockedDate: '2026-02-28',
      rarity: 'uncommon',
    },
    {
      id: 6,
      name: 'Perfectionist',
      icon: '⭐',
      unlockedDate: '2026-03-05',
      rarity: 'rare',
    },
  ],
  stats: {
    lessonsThisWeek: 8,
    lessonsThisMonth: 28,
    assessmentsThisMonth: 5,
    totalStudyTime: 324, // in minutes
  },
};

// Service functions
export const getAssessments = async () => {
  // Simulate API delay
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockAssessments), 500);
  });
};

export const getLessons = async () => {
  // Simulate API delay
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockLessons), 500);
  });
};

export const getUserProfile = async () => {
  // Simulate API delay
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockUserProfile), 400);
  });
};

export const getAssessmentById = async (id) => {
  const assessment = mockAssessments.find((a) => a.id === id);
  return new Promise((resolve) => {
    setTimeout(() => resolve(assessment), 300);
  });
};

export const getLessonById = async (id) => {
  const lesson = mockLessons.find((l) => l.id === id);
  return new Promise((resolve) => {
    setTimeout(() => resolve(lesson), 300);
  });
};

export const getDifficultyColor = (difficulty) => {
  const colors = {
    Easy: '#10b981',
    Medium: '#f59e0b',
    Hard: '#ef4444',
  };
  return colors[difficulty] || '#9ca3af';
};

export const getDifficultyEmoji = (difficulty) => {
  const emoji = {
    Easy: '⭐',
    Medium: '⭐⭐',
    Hard: '⭐⭐⭐',
  };
  return emoji[difficulty] || '';
};

export const getJAcademyStats = async () => {
  // Aggregate subject-wise progress and badges
  const lessons = await getLessons();
  const assessments = await getAssessments();
  const profile = await getUserProfile();

  // subjects from lessons
  const subjects = {};
  lessons.forEach((l) => {
    if (!subjects[l.subject]) {
      subjects[l.subject] = { subject: l.subject, lessonsTotal: 0, lessonsCompleted: 0, assessmentsTotal: 0, assessmentsPassed: 0, progress: 0 };
    }
    subjects[l.subject].lessonsTotal += 1;
    if (l.isCompleted) subjects[l.subject].lessonsCompleted += 1;
    subjects[l.subject].progress += l.progress;
  });

  // average progress per subject
  Object.keys(subjects).forEach((k) => {
    const s = subjects[k];
    s.progress = Math.round(s.progress / s.lessonsTotal) || 0;
  });

  // assessments counts
  assessments.forEach((a) => {
    if (!subjects[a.subject]) {
      subjects[a.subject] = { subject: a.subject, lessonsTotal: 0, lessonsCompleted: 0, assessmentsTotal: 0, assessmentsPassed: 0, progress: 0 };
    }
    subjects[a.subject].assessmentsTotal += 1;
    if (a.isCompleted && a.score >= 70) subjects[a.subject].assessmentsPassed += 1;
  });

  const subjectArray = Object.values(subjects);

  const overallProgress = subjectArray.length
    ? Math.round(subjectArray.reduce((acc, s) => acc + s.progress, 0) / subjectArray.length)
    : 0;

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        overallProgress,
        totalXP: profile.totalXP || 0,
        subjects: subjectArray,
        badges: profile.badges || [],
        remarks: 'Great progress — focus on Mathematics and Biology to improve overall score.',
      });
    }, 500);
  });
};
