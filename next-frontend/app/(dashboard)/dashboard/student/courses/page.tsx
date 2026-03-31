'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Bell,
  BookOpen,
  ClipboardList,
  Grid2X2,
  LayoutPanelTop,
  LibraryBig,
  Microscope,
  MoreHorizontal,
  Palette,
  Ruler,
  Users,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CourseSurfaceCard } from '@/components/class/CourseSurfaceCard';
import {
  STUDENT_COURSE_PRESENTATION_OPTIONS,
  resolveStudentCoursePresentation,
  toStudentHeroStyle,
} from '@/components/class/student-course-presentation';
import type {
  ClassItem,
  StudentClassPresentationMode,
  StudentClassPresentationPreference,
  StudentCourseViewMode,
} from '@/types/class';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/utils/cn';
import { getTeacherName } from '@/utils/helpers';
import { containerReveal, itemReveal } from '@/components/student/student-motion';

interface ClassWithProgress extends ClassItem {
  progress: number;
  completedCount: number;
  totalLessons: number;
  totalAssessments: number;
  classmatesCount: number;
}

type PrimaryTab = 'all' | 'in_progress' | 'completed';

const PRIMARY_TABS: Array<{ value: PrimaryTab; label: string }> = [
  { value: 'all', label: 'All Courses' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

function toPreferenceMap(preferences: StudentClassPresentationPreference[] | undefined) {
  if (!preferences?.length) return {} as Record<string, StudentClassPresentationPreference>;
  return Object.fromEntries(preferences.map((entry) => [entry.classId, entry]));
}

function getWatermark(token: string) {
  if (token.includes('green')) {
    return <Microscope className="h-28 w-28" />;
  }
  if (token.includes('violet')) {
    return <BookOpen className="h-28 w-28" />;
  }
  return <Ruler className="h-28 w-28" />;
}

export default function StudentCoursesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [courses, setCourses] = useState<ClassWithProgress[]>([]);
  const [hiddenCourses, setHiddenCourses] = useState<ClassWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<PrimaryTab>('all');
  const [viewMode, setViewMode] = useState<StudentCourseViewMode>('card');
  const [presentationByClass, setPresentationByClass] = useState<
    Record<string, StudentClassPresentationPreference>
  >({});
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [customizingCourse, setCustomizingCourse] = useState<ClassWithProgress | null>(null);
  const [customizingIndex, setCustomizingIndex] = useState(0);
  const [draftStyleMode, setDraftStyleMode] = useState<StudentClassPresentationMode>('gradient');
  const [draftStyleToken, setDraftStyleToken] = useState('gradient-blue');
  const [savingCustomization, setSavingCustomization] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [visibleRes, hiddenRes, presentationRes, viewRes] = await Promise.all([
        classService.getByStudent(user.id, 'all').catch(() => ({ data: [] as ClassItem[] })),
        classService.getByStudent(user.id, 'hidden').catch(() => ({ data: [] as ClassItem[] })),
        classService
          .getStudentPresentationPreferences(user.id)
          .catch(() => ({ data: [] as StudentClassPresentationPreference[] })),
        classService
          .getStudentCourseViewPreference(user.id)
          .catch(() => ({ data: { viewMode: 'card' as StudentCourseViewMode } })),
      ]);

      const merged = new Map<string, ClassItem>();
      for (const cls of visibleRes.data || []) {
        merged.set(cls.id, { ...cls, isHidden: false });
      }
      for (const cls of hiddenRes.data || []) {
        merged.set(cls.id, { ...cls, isHidden: true });
      }

      const withProgress = await Promise.all(
        Array.from(merged.values()).map(async (cls) => {
          try {
            const [lessonsRes, completedRes, assessmentsRes] = await Promise.all([
              lessonService.getByClass(cls.id),
              lessonService.getCompletedByClass(cls.id),
              assessmentService.getByClass(cls.id),
            ]);
            const totalLessons = lessonsRes.data?.length ?? 0;
            const completedCount = completedRes.data?.length ?? 0;
            const totalAssessments = assessmentsRes.data?.length ?? 0;
            const classmatesCount = Math.max(0, (cls.enrollments?.length ?? 0) - 1);

            return {
              ...cls,
              totalLessons,
              completedCount,
              totalAssessments,
              classmatesCount,
              progress: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
            } satisfies ClassWithProgress;
          } catch {
            return {
              ...cls,
              totalLessons: 0,
              completedCount: 0,
              totalAssessments: 0,
              classmatesCount: Math.max(0, (cls.enrollments?.length ?? 0) - 1),
              progress: 0,
            } satisfies ClassWithProgress;
          }
        }),
      );

      setCourses(withProgress.filter((entry) => !entry.isHidden));
      setHiddenCourses(withProgress.filter((entry) => entry.isHidden));
      setPresentationByClass(toPreferenceMap(presentationRes.data));
      setViewMode(viewRes.data?.viewMode === 'wide' ? 'wide' : 'card');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!customizingCourse) return;
    const options = STUDENT_COURSE_PRESENTATION_OPTIONS[draftStyleMode];
    if (!options.some((option) => option.token === draftStyleToken)) {
      setDraftStyleToken(options[0].token);
    }
  }, [customizingCourse, draftStyleMode, draftStyleToken]);

  useEffect(() => {
    if (!openMenuId || typeof document === 'undefined') return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('[data-class-card-menu]')) return;
      setOpenMenuId(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [openMenuId]);

  const visibleCourses = useMemo(() => {
    const source = showHiddenOnly ? hiddenCourses : courses;
    if (showHiddenOnly) {
      return source;
    }
    if (tab === 'in_progress') {
      return source.filter((course) => course.progress > 0 && course.progress < 100);
    }
    if (tab === 'completed') {
      return source.filter((course) => course.progress === 100);
    }
    return source;
  }, [courses, hiddenCourses, showHiddenOnly, tab]);

  const enrolledCount = courses.length;
  const totalLessons = courses.reduce((sum, course) => sum + course.totalLessons, 0);
  const totalAssessments = courses.reduce(
    (sum, course) => sum + course.totalAssessments,
    0,
  );
  const totalClassmates = courses.reduce((sum, course) => sum + course.classmatesCount, 0);

  const setAndPersistViewMode = useCallback(
    async (nextViewMode: StudentCourseViewMode) => {
      if (viewMode === nextViewMode || !user?.id) return;
      setViewMode(nextViewMode);
      try {
        await classService.setStudentCourseViewPreference(user.id, nextViewMode);
      } catch {
        setViewMode((current) => (current === 'wide' ? 'card' : 'wide'));
      }
    },
    [user?.id, viewMode],
  );

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(
      target.closest('a, button, input, select, textarea, label, [role="button"], [data-class-card-menu]'),
    );

  const handleCardClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>, classId: string) => {
      if (isInteractiveTarget(event.target)) return;
      router.push(`/dashboard/student/classes/${classId}`);
    },
    [router],
  );

  const handleCardKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>, classId: string) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (isInteractiveTarget(event.target)) return;
      event.preventDefault();
      router.push(`/dashboard/student/classes/${classId}`);
    },
    [router],
  );

  const openCustomize = useCallback(
    (course: ClassWithProgress, index: number) => {
      const existing = presentationByClass[course.id];
      const selected = resolveStudentCoursePresentation(
        existing?.styleMode,
        existing?.styleToken,
        index,
      );
      setCustomizingCourse(course);
      setCustomizingIndex(index);
      setDraftStyleMode(selected.mode);
      setDraftStyleToken(selected.token);
      setOpenMenuId(null);
    },
    [presentationByClass],
  );

  const saveCustomization = useCallback(async () => {
    if (!customizingCourse) return;
    setSavingCustomization(true);
    try {
      const response = await classService.updateStudentPresentation(
        customizingCourse.id,
        {
          styleMode: draftStyleMode,
          styleToken: draftStyleToken,
        },
      );

      setPresentationByClass((current) => ({
        ...current,
        [customizingCourse.id]: response.data,
      }));
      setCustomizingCourse(null);
    } finally {
      setSavingCustomization(false);
    }
  }, [customizingCourse, draftStyleMode, draftStyleToken]);

  const toggleHidden = useCallback(async (course: ClassWithProgress) => {
    setTogglingId(course.id);
    setOpenMenuId(null);
    try {
      if (course.isHidden) {
        await classService.unhide(course.id);
        setHiddenCourses((current) =>
          current.filter((entry) => entry.id !== course.id),
        );
        setCourses((current) => [...current, { ...course, isHidden: false }]);
      } else {
        await classService.hide(course.id);
        setCourses((current) => current.filter((entry) => entry.id !== course.id));
        setHiddenCourses((current) => [...current, { ...course, isHidden: true }]);
      }
    } finally {
      setTogglingId(null);
    }
  }, []);

  const customizationOptions = STUDENT_COURSE_PRESENTATION_OPTIONS[draftStyleMode];

  if (loading) {
    return (
      <div className="student-courses-page space-y-6 p-4 md:p-6">
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((entry) => (
            <Skeleton key={entry} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-12 w-72 rounded-full" />
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {[1, 2, 3].map((entry) => (
            <Skeleton key={entry} className="h-[22rem] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="student-courses-page space-y-6 p-4 md:p-6">
      <motion.header
        className="student-courses-hero"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
      >
        <div className="student-courses-hero__icon">
          <BookOpen className="h-7 w-7" />
        </div>
        <div>
          <h1>My Courses</h1>
          <p>All your enrolled classes</p>
        </div>
      </motion.header>

      <motion.section
        className="student-courses-stats"
        variants={containerReveal}
        initial="hidden"
        animate="visible"
      >
        <motion.article variants={itemReveal}>
          <p>Enrolled</p>
          <strong>{enrolledCount}</strong>
          <span className="student-courses-stat-icon student-courses-stat-icon--red">
            <BookOpen className="h-5 w-5" />
          </span>
        </motion.article>
        <motion.article variants={itemReveal}>
          <p>Total Lessons</p>
          <strong>{totalLessons}</strong>
          <span className="student-courses-stat-icon student-courses-stat-icon--blue">
            <LibraryBig className="h-5 w-5" />
          </span>
        </motion.article>
        <motion.article variants={itemReveal}>
          <p>Assessments</p>
          <strong>{totalAssessments}</strong>
          <span className="student-courses-stat-icon student-courses-stat-icon--orange">
            <ClipboardList className="h-5 w-5" />
          </span>
        </motion.article>
        <motion.article variants={itemReveal}>
          <p>Classmates</p>
          <strong>~{totalClassmates}</strong>
          <span className="student-courses-stat-icon student-courses-stat-icon--green">
            <Users className="h-5 w-5" />
          </span>
        </motion.article>
      </motion.section>

      <section className="student-courses-toolbar">
        <div className="student-courses-tabs" role="tablist" aria-label="Course filters">
          {PRIMARY_TABS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              data-active={!showHiddenOnly && tab === entry.value}
              onClick={() => {
                setShowHiddenOnly(false);
                setTab(entry.value);
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="student-courses-toolbar__right">
          <button
            type="button"
            className="student-courses-hidden-toggle"
            data-active={showHiddenOnly}
            onClick={() => setShowHiddenOnly((current) => !current)}
          >
            Hidden ({hiddenCourses.length})
          </button>

          <div className="teacher-home-view-toggle">
            <button
              type="button"
              data-active={viewMode === 'card'}
              aria-label="Grid View"
              title="Grid View"
              onClick={() => void setAndPersistViewMode('card')}
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              data-active={viewMode === 'wide'}
              aria-label="Wide Card View"
              title="Wide Card View"
              onClick={() => void setAndPersistViewMode('wide')}
            >
              <LayoutPanelTop className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {visibleCourses.length === 0 ? (
        <div className="student-courses-empty">
          {showHiddenOnly
            ? 'No hidden classes yet. Hide a class from the card menu to keep this list organized.'
            : 'No classes match this filter yet.'}
        </div>
      ) : (
        <motion.div
          className={cn(
            'teacher-home-cards student-courses-grid',
            viewMode === 'wide' && 'teacher-home-cards--wide',
          )}
          variants={containerReveal}
          initial="hidden"
          animate="visible"
        >
          {visibleCourses.map((course, index) => {
            const preference = presentationByClass[course.id];
            const choice = resolveStudentCoursePresentation(
              preference?.styleMode,
              preference?.styleToken,
              index,
            );
            const isMenuOpen = openMenuId === course.id;

            return (
              <motion.div key={course.id} variants={itemReveal}>
                <CourseSurfaceCard
                  dataThemeKind={choice.mode}
                  heroStyle={toStudentHeroStyle(choice)}
                  heroMeta={`👩‍🏫 ${getTeacherName(course.teacher).toUpperCase()}`}
                  heroWatermark={getWatermark(choice.token)}
                  title={course.subjectName || course.className || course.name || 'Class'}
                  subtitle={`Grade ${course.section?.gradeLevel ?? course.subjectGradeLevel ?? 'TBA'} - ${course.section?.name ?? 'Section not set'}`}
                  statusLabel={course.isActive ? 'Active' : 'Archived'}
                  stats={[
                    { value: course.totalLessons, label: 'Lessons' },
                    { value: course.totalAssessments, label: 'Tasks' },
                  ]}
                  progressPercent={course.progress}
                  progressColor={choice.accent}
                  actions={[
                    {
                      href: `/dashboard/student/classes/${course.id}?tab=assessments`,
                      icon: ClipboardList,
                      label: 'Tasks',
                    },
                    {
                      href: `/dashboard/student/announcements?classId=${course.id}`,
                      icon: Bell,
                      label: 'Notify',
                    },
                    {
                      href: `/dashboard/student/classes/${course.id}`,
                      icon: Users,
                      label: 'Classmates',
                    },
                    {
                      href: `/dashboard/student/performance?classId=${course.id}`,
                      icon: BookOpen,
                      label: 'Grades',
                    },
                    {
                      href: `/dashboard/student/classes/${course.id}?tab=announcements`,
                      icon: LibraryBig,
                      label: 'Calendar',
                    },
                  ]}
                  ariaLabel={`Open ${course.subjectName} class`}
                  onClick={(event) => handleCardClick(event, course.id)}
                  onKeyDown={(event) => handleCardKeyDown(event, course.id)}
                  style={{ cursor: 'pointer' }}
                  heroControl={(
                    <div className="student-course-card__hero-actions" data-class-card-menu>
                      <button
                        type="button"
                        className="student-course-card__customize"
                        onClick={() => openCustomize(course, index)}
                      >
                        <Palette className="h-3.5 w-3.5" />
                        Customize
                      </button>
                      <div className="teacher-home-card__menu">
                        <button
                          type="button"
                          className="teacher-home-card__menu-trigger"
                          aria-label="Class menu"
                          aria-expanded={isMenuOpen}
                          style={{ background: choice.buttonTint }}
                          onClick={() =>
                            setOpenMenuId((current) =>
                              current === course.id ? null : course.id,
                            )
                          }
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                        <div
                          className="teacher-home-card__menu-panel"
                          data-open={isMenuOpen}
                          aria-hidden={!isMenuOpen}
                        >
                          <button
                            type="button"
                            tabIndex={isMenuOpen ? 0 : -1}
                            onClick={() => openCustomize(course, index)}
                          >
                            Customize class
                          </button>
                          <button
                            type="button"
                            tabIndex={isMenuOpen ? 0 : -1}
                            onClick={() => void toggleHidden(course)}
                            disabled={togglingId === course.id}
                          >
                            {course.isHidden ? 'Restore class' : 'Hide class'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                />
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <Dialog
        open={Boolean(customizingCourse)}
        onOpenChange={(open) => {
          if (!open) setCustomizingCourse(null);
        }}
      >
        <DialogContent className="student-course-customize-dialog">
          <DialogHeader>
            <DialogTitle>Customize Class Card</DialogTitle>
            <DialogDescription>
              This style is saved only for your student account.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-customize-dialog__section">
            <p>Style Mode</p>
            <div className="teacher-customize-dialog__mode">
              {(['solid', 'gradient', 'preset'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  data-active={draftStyleMode === mode}
                  onClick={() => setDraftStyleMode(mode)}
                >
                  {mode === 'solid' ? 'Solid Color' : mode === 'gradient' ? 'Gradient' : 'Preset Design'}
                </button>
              ))}
            </div>
          </div>

          <div className="teacher-customize-dialog__section">
            <p>Choose 1 of 3</p>
            <div className="teacher-customize-dialog__gradients">
              {customizationOptions.map((option) => (
                <button
                  key={option.token}
                  type="button"
                  data-active={draftStyleToken === option.token}
                  onClick={() => setDraftStyleToken(option.token)}
                >
                  <span style={{ background: option.background }} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="student-course-customize-preview">
            <p>Preview</p>
            <div
              className="student-course-customize-preview__card"
              style={toStudentHeroStyle(
                resolveStudentCoursePresentation(
                  draftStyleMode,
                  draftStyleToken,
                  customizingIndex,
                ),
              )}
            />
          </div>

          <DialogFooter className="teacher-customize-dialog__footer">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomizingCourse(null)}
              disabled={savingCustomization}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="teacher-home-refresh"
              onClick={() => void saveCustomization()}
              disabled={savingCustomization}
            >
              {savingCustomization ? 'Saving...' : 'Save Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
