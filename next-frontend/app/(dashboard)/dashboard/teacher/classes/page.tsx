'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BookCopy,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Grid2X2,
  LayoutPanelTop,
  MoreHorizontal,
  NotebookPen,
  RefreshCcw,
  Smile,
  Users,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { announcementService } from '@/services/announcement-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Announcement } from '@/types/announcement';
import type { ClassItem, ClassVisibilityStatus } from '@/types/class';

type TeacherHomeTab = 'dashboard' | 'news' | 'welcome';
type CardViewMode = 'card' | 'wide';
type EventTag = 'assessment' | 'event' | 'holiday';
type CardThemeKind = 'gradient' | 'image';
type CardGradientId =
  | 'oceanic-blue'
  | 'emerald-wave'
  | 'violet-burst'
  | 'sunset-orange'
  | 'rose-dusk'
  | 'slate-night';

interface ClassCardCustomization {
  themeKind: CardThemeKind;
  gradientId: CardGradientId;
  imageUrl: string | null;
  imagePositionX: number;
  imagePositionY: number;
  imageScale: number;
}

interface GradientOption {
  id: CardGradientId;
  label: string;
  background: string;
  accent: string;
  buttonTint: string;
}

const STORAGE_KEY_CUSTOMIZE = 'teacher-class-card-customize-v2';
const STORAGE_KEY_VIEW = 'teacher-class-view-mode-v1';

const GRADIENT_OPTIONS: GradientOption[] = [
  {
    id: 'oceanic-blue',
    label: 'Oceanic Blue',
    background: 'linear-gradient(135deg, #2c4fdd 0%, #3d63f1 100%)',
    accent: '#3557e4',
    buttonTint: 'rgba(24, 46, 172, 0.92)',
  },
  {
    id: 'emerald-wave',
    label: 'Emerald Wave',
    background: 'linear-gradient(135deg, #069f77 0%, #11b68d 100%)',
    accent: '#0fa37f',
    buttonTint: 'rgba(6, 110, 86, 0.92)',
  },
  {
    id: 'violet-burst',
    label: 'Violet Burst',
    background: 'linear-gradient(135deg, #7f22f0 0%, #9944f5 100%)',
    accent: '#8f31f2',
    buttonTint: 'rgba(89, 24, 160, 0.92)',
  },
  {
    id: 'sunset-orange',
    label: 'Sunset Orange',
    background: 'linear-gradient(135deg, #d66a1e 0%, #f08d2d 100%)',
    accent: '#e07e26',
    buttonTint: 'rgba(130, 64, 18, 0.9)',
  },
  {
    id: 'rose-dusk',
    label: 'Rose Dusk',
    background: 'linear-gradient(135deg, #d42756 0%, #ef5f87 100%)',
    accent: '#df3f6b',
    buttonTint: 'rgba(123, 22, 56, 0.9)',
  },
  {
    id: 'slate-night',
    label: 'Slate Night',
    background: 'linear-gradient(135deg, #1d304f 0%, #2e4a73 100%)',
    accent: '#2a446a',
    buttonTint: 'rgba(10, 23, 44, 0.9)',
  },
];

const TAG_ORDER: EventTag[] = ['assessment', 'event', 'holiday'];
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getFallbackGradient(index: number): CardGradientId {
  const fallbackByIndex: CardGradientId[] = ['oceanic-blue', 'emerald-wave', 'violet-burst'];
  return fallbackByIndex[index % fallbackByIndex.length];
}

function createDefaultCustomization(gradientId: CardGradientId): ClassCardCustomization {
  return {
    themeKind: 'gradient',
    gradientId,
    imageUrl: null,
    imagePositionX: 50,
    imagePositionY: 50,
    imageScale: 120,
  };
}

function getGradientOption(gradientId: CardGradientId): GradientOption {
  return GRADIENT_OPTIONS.find((option) => option.id === gradientId) ?? GRADIENT_OPTIONS[0];
}

function toCardGradientId(value: unknown, fallback: CardGradientId): CardGradientId {
  if (typeof value !== 'string') return fallback;
  return (GRADIENT_OPTIONS.find((option) => option.id === value)?.id ?? fallback) as CardGradientId;
}

function parseLegacyToneToGradient(value: unknown, fallback: CardGradientId): CardGradientId {
  if (value === 'blue') return 'oceanic-blue';
  if (value === 'green') return 'emerald-wave';
  if (value === 'violet') return 'violet-burst';
  return fallback;
}

function normalizeCustomization(rawValue: unknown, fallbackGradient: CardGradientId): ClassCardCustomization {
  if (!rawValue || typeof rawValue !== 'object') {
    return createDefaultCustomization(fallbackGradient);
  }

  const value = rawValue as Partial<ClassCardCustomization> & { tone?: string };
  const gradientId =
    typeof value.gradientId === 'string'
      ? toCardGradientId(value.gradientId, fallbackGradient)
      : parseLegacyToneToGradient(value.tone, fallbackGradient);

  const normalizedImageUrl =
    typeof value.imageUrl === 'string' && !value.imageUrl.startsWith('data:')
      ? value.imageUrl
      : null;
  const themeKind: CardThemeKind =
    value.themeKind === 'image' && typeof normalizedImageUrl === 'string' && normalizedImageUrl.length > 0
      ? 'image'
      : 'gradient';

  const x = typeof value.imagePositionX === 'number' ? Math.min(Math.max(value.imagePositionX, 0), 100) : 50;
  const y = typeof value.imagePositionY === 'number' ? Math.min(Math.max(value.imagePositionY, 0), 100) : 50;
  const scale = typeof value.imageScale === 'number' ? Math.min(Math.max(value.imageScale, 100), 220) : 120;

  return {
    themeKind,
    gradientId,
    imageUrl: normalizedImageUrl,
    imagePositionX: x,
    imagePositionY: y,
    imageScale: scale,
  };
}

function getHeroStyle(customization: ClassCardCustomization): CSSProperties {
  const gradient = getGradientOption(customization.gradientId).background;
  if (customization.themeKind === 'image' && customization.imageUrl) {
    return {
      backgroundImage: `linear-gradient(120deg, rgba(8, 23, 44, 0.34), rgba(8, 23, 44, 0.12)), url(${customization.imageUrl})`,
      backgroundSize: `${customization.imageScale}%`,
      backgroundPosition: `${customization.imagePositionX}% ${customization.imagePositionY}%`,
      backgroundRepeat: 'no-repeat',
    };
  }
  return { background: gradient };
}

function formatScheduleLine(classItem: ClassItem) {
  const schedule = classItem.schedules?.[0];
  if (!schedule) return 'Schedule TBA';
  return `${schedule.days.join('/')} ${schedule.startTime}-${schedule.endTime}`;
}

function formatEventDate(dateValue?: string | null) {
  if (!dateValue) return { day: '--', month: '---' };
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return { day: '--', month: '---' };
  return {
    day: String(date.getDate()),
    month: date
      .toLocaleString('en-US', { month: 'short' })
      .toUpperCase(),
  };
}

function formatDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAnnouncementTag(announcement: Announcement): EventTag {
  const content = `${announcement.title} ${announcement.content}`.toLowerCase();
  if (content.includes('quiz') || content.includes('exam') || content.includes('assessment')) {
    return 'assessment';
  }
  if (content.includes('holiday') || content.includes('break')) {
    return 'holiday';
  }
  return 'event';
}

function getEventTagColor(tag: EventTag) {
  if (tag === 'assessment') return '#df4a61';
  if (tag === 'holiday') return '#d4983e';
  return '#3e72cc';
}

function addMonths(baseDate: Date, monthDelta: number) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + monthDelta, 1);
}

export default function TeacherClassesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ClassVisibilityStatus>('active');
  const [homeTab, setHomeTab] = useState<TeacherHomeTab>('dashboard');
  const [viewMode, setViewMode] = useState<CardViewMode>('card');
  const [customizationByClass, setCustomizationByClass] = useState<Record<string, ClassCardCustomization>>({});
  const [customizingClass, setCustomizingClass] = useState<ClassItem | null>(null);
  const [uploadingThemeImage, setUploadingThemeImage] = useState(false);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [updatingVisibilityClassId, setUpdatingVisibilityClassId] = useState<string | null>(null);
  const [draftCustomization, setDraftCustomization] = useState<ClassCardCustomization>(
    createDefaultCustomization('oceanic-blue'),
  );
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const classesRes = await classService.getByTeacher(user.id, status);
      const classesData = classesRes.data || [];
      setClasses(classesData);

      const announcementResponses = await Promise.all(
        classesData.slice(0, 12).map((classItem) =>
          announcementService.getByClass(classItem.id, { limit: 3 }).catch(() => ({
            success: true,
            message: '',
            data: [] as Announcement[],
          })),
        ),
      );

      const merged = announcementResponses
        .flatMap((response) => response.data || [])
        .sort((left, right) => {
          const leftTs = new Date(left.createdAt || 0).getTime();
          const rightTs = new Date(right.createdAt || 0).getTime();
          return rightTs - leftTs;
        })
        .slice(0, 18);
      setAnnouncements(merged);
    } catch {
      setClasses([]);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [status, user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_CUSTOMIZE);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const normalizedEntries = Object.entries(parsed).map(([classId, value]) => [
          classId,
          normalizeCustomization(value, 'oceanic-blue'),
        ]);
        setCustomizationByClass(Object.fromEntries(normalizedEntries));
      }
      const savedView = window.localStorage.getItem(STORAGE_KEY_VIEW);
      if (savedView === 'card' || savedView === 'wide') {
        setViewMode(savedView);
      }
    } catch {
      // ignore storage parse errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY_CUSTOMIZE, JSON.stringify(customizationByClass));
    } catch {
      // ignore storage quota errors; backend image URLs still persist via class banner storage
    }
  }, [customizationByClass]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY_VIEW, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!openCardMenuId || typeof document === 'undefined') return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('[data-class-card-menu]')) return;
      setOpenCardMenuId(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [openCardMenuId]);

  const maxStudents = useMemo(
    () => classes.reduce((max, classItem) => Math.max(max, classItem.enrollments?.length ?? 0), 0),
    [classes],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Set<EventTag>>();
    for (const announcement of announcements) {
      if (!announcement.createdAt) continue;
      const date = new Date(announcement.createdAt);
      if (Number.isNaN(date.getTime())) continue;
      const key = formatDateKey(date);
      if (!map.has(key)) {
        map.set(key, new Set<EventTag>());
      }
      map.get(key)?.add(getAnnouncementTag(announcement));
    }
    return map;
  }, [announcements]);

  const miniCalendarCells = useMemo(() => {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const startOffset = monthStart.getDay();
    const firstCellDate = new Date(monthStart);
    firstCellDate.setDate(monthStart.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstCellDate);
      date.setDate(firstCellDate.getDate() + index);
      const dateKey = formatDateKey(date);
      return {
        date,
        dateKey,
        inMonth: date.getMonth() === calendarMonth.getMonth(),
        isToday: dateKey === formatDateKey(new Date()),
        tags: Array.from(eventsByDate.get(dateKey) ?? []),
      };
    });
  }, [calendarMonth, eventsByDate]);

  const monthLabel = useMemo(
    () =>
      calendarMonth.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [calendarMonth],
  );

  const openCustomize = (classItem: ClassItem, index: number) => {
    setOpenCardMenuId(null);
    const fallback = getFallbackGradient(index);
    const existing = customizationByClass[classItem.id];
    const fromBanner = classItem.cardBannerUrl
      ? {
          ...createDefaultCustomization(fallback),
          themeKind: 'image' as const,
          imageUrl: classItem.cardBannerUrl,
        }
      : createDefaultCustomization(fallback);
    setDraftCustomization(existing ?? fromBanner);
    setCustomizingClass(classItem);
  };

  const toggleClassVisibility = useCallback(
    async (classItem: ClassItem) => {
      const currentlyHidden = status === 'hidden' || Boolean(classItem.isHidden);
      const nextHidden = !currentlyHidden;
      setUpdatingVisibilityClassId(classItem.id);
      setOpenCardMenuId(null);
      try {
        if (currentlyHidden) {
          await classService.unhide(classItem.id);
        } else {
          await classService.hide(classItem.id);
        }
        setClasses((current) =>
          current.flatMap((item) => {
            if (item.id !== classItem.id) return [item];
            if (status === 'all') return [{ ...item, isHidden: nextHidden }];
            return [];
          }),
        );
      } catch {
        // keep current list unchanged when visibility update fails
      } finally {
        setUpdatingVisibilityClassId(null);
      }
    },
    [status],
  );

  const openClassDetails = useCallback(
    (classId: string) => {
      router.push(`/dashboard/teacher/classes/${classId}`);
    },
    [router],
  );

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(
      target.closest('a, button, input, select, textarea, label, [role="button"], [data-class-card-menu]'),
    );

  const handleClassCardClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>, classId: string) => {
      if (isInteractiveTarget(event.target)) return;
      openClassDetails(classId);
    },
    [openClassDetails],
  );

  const handleClassCardKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>, classId: string) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (isInteractiveTarget(event.target)) return;
      event.preventDefault();
      openClassDetails(classId);
    },
    [openClassDetails],
  );

  const saveCustomization = () => {
    if (!customizingClass) return;
    setCustomizationByClass((current) => ({
      ...current,
      [customizingClass.id]: draftCustomization,
    }));
    setCustomizingClass(null);
  };

  const resetCustomization = () => {
    if (!customizingClass) return;
    setCustomizationByClass((current) => {
      const next = { ...current };
      delete next[customizingClass.id];
      return next;
    });
    setCustomizingClass(null);
  };

  const handleThemeImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !customizingClass) return;

    try {
      setUploadingThemeImage(true);
      const response = await classService.uploadBanner(customizingClass.id, file);
      const uploadedUrl = response.data.cardBannerUrl;

      setDraftCustomization((current) => ({
        ...current,
        themeKind: 'image',
        imageUrl: uploadedUrl,
      }));

      setClasses((current) =>
        current.map((classItem) =>
          classItem.id === customizingClass.id ? response.data.class : classItem,
        ),
      );
    } catch {
      // keep dialog state unchanged if upload fails
    } finally {
      setUploadingThemeImage(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-[28rem] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="teacher-home-page">
      <section className="teacher-home-tabs">
        <button
          type="button"
          data-active={homeTab === 'dashboard'}
          onClick={() => setHomeTab('dashboard')}
        >
          <BookCopy className="h-4 w-4" />
          Dashboard
        </button>
        <button type="button" data-active={homeTab === 'news'} onClick={() => setHomeTab('news')}>
          <NotebookPen className="h-4 w-4" />
          News
        </button>
        <button
          type="button"
          data-active={homeTab === 'welcome'}
          onClick={() => setHomeTab('welcome')}
        >
          <Smile className="h-4 w-4" />
          Welcome
        </button>
      </section>

      <section className="teacher-home-toolbar">
        <div className="teacher-home-toolbar__left">
          <div className="teacher-home-status">
            {(['active', 'archived', 'hidden'] as const).map((value) => (
              <button
                key={value}
                type="button"
                data-active={status === value}
                onClick={() => setStatus(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="teacher-home-toolbar__right">
          <div className="teacher-home-view-toggle">
            <button
              type="button"
              data-active={viewMode === 'card'}
              aria-label="Grid View"
              title="Grid View"
              onClick={() => setViewMode('card')}
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              data-active={viewMode === 'wide'}
              aria-label="Wide Card View"
              title="Wide Card View"
              onClick={() => setViewMode('wide')}
            >
              <LayoutPanelTop className="h-4 w-4" />
            </button>
          </div>
          <Button type="button" className="teacher-home-refresh" onClick={() => void fetchData()}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </section>

      <section className="teacher-home-layout">
        <div className={viewMode === 'wide' ? 'teacher-home-cards teacher-home-cards--wide' : 'teacher-home-cards'}>
          {classes.length === 0 ? (
            <div className="teacher-home-empty">
              <p>No classes in this view.</p>
            </div>
          ) : (
            classes.map((classItem, index) => {
              const fallbackGradient = getFallbackGradient(index);
              const theme =
                customizationByClass[classItem.id] ??
                (classItem.cardBannerUrl
                  ? {
                      ...createDefaultCustomization(fallbackGradient),
                      themeKind: 'image' as const,
                      imageUrl: classItem.cardBannerUrl,
                    }
                  : createDefaultCustomization(fallbackGradient));
              const gradient = getGradientOption(theme.gradientId);
              const heroStyle = getHeroStyle(theme);

              const students = classItem.enrollments?.length ?? 0;
              const taskCount = classItem.schedules?.length ?? 0;
              const rosterPercent = maxStudents > 0 ? Math.round((students / maxStudents) * 100) : 0;
              const isMenuOpen = openCardMenuId === classItem.id;

              return (
                <article
                  key={classItem.id}
                  className="teacher-home-card"
                  data-theme-kind={theme.themeKind}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open ${classItem.subjectName} class`}
                  onClick={(event) => handleClassCardClick(event, classItem.id)}
                  onKeyDown={(event) => handleClassCardKeyDown(event, classItem.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="teacher-home-card__hero" style={heroStyle}>
                    <div
                      className="teacher-home-card__menu"
                      data-class-card-menu
                      style={{ alignSelf: 'flex-end', position: 'relative', zIndex: 2 }}
                    >
                      <button
                        type="button"
                        className="teacher-home-card__menu-trigger"
                        aria-label="Class menu"
                        aria-expanded={isMenuOpen}
                        style={{
                          border: 0,
                          width: '1.9rem',
                          height: '1.9rem',
                          borderRadius: '999px',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background:
                            theme.themeKind === 'image' && theme.imageUrl
                              ? 'rgba(14, 27, 46, 0.72)'
                              : gradient.buttonTint,
                        }}
                        onClick={() =>
                          setOpenCardMenuId((current) => (current === classItem.id ? null : classItem.id))
                        }
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                      <div
                        className="teacher-home-card__menu-panel"
                        data-open={isMenuOpen}
                        aria-hidden={!isMenuOpen}
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 'calc(100% + 0.35rem)',
                          minWidth: '10.8rem',
                          borderRadius: '0.68rem',
                          border: '1px solid #dce5f2',
                          background: '#ffffff',
                          boxShadow: '0 14px 30px rgba(22, 37, 63, 0.2)',
                          padding: '0.28rem',
                          display: 'grid',
                          gap: '0.18rem',
                          opacity: isMenuOpen ? 1 : 0,
                          pointerEvents: isMenuOpen ? 'auto' : 'none',
                          transform: isMenuOpen ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.98)',
                          transformOrigin: 'top right',
                          transition: 'opacity 0.2s ease, transform 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                      >
                        <button
                          type="button"
                          tabIndex={isMenuOpen ? 0 : -1}
                          style={{
                            border: 0,
                            background: 'transparent',
                            color: '#1f3555',
                            borderRadius: '0.5rem',
                            minHeight: '2rem',
                            padding: '0.4rem 0.58rem',
                            textAlign: 'left',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          onClick={() => openCustomize(classItem, index)}
                        >
                          Customize class
                        </button>
                        <button
                          type="button"
                          tabIndex={isMenuOpen ? 0 : -1}
                          onClick={() => void toggleClassVisibility(classItem)}
                          disabled={updatingVisibilityClassId === classItem.id}
                          style={{
                            border: 0,
                            background: 'transparent',
                            color: '#1f3555',
                            borderRadius: '0.5rem',
                            minHeight: '2rem',
                            padding: '0.4rem 0.58rem',
                            textAlign: 'left',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            opacity: updatingVisibilityClassId === classItem.id ? 0.58 : 1,
                          }}
                        >
                          {status === 'hidden' || classItem.isHidden ? 'Unhide class' : 'Hide class'}
                        </button>
                      </div>
                    </div>
                    <p>{formatScheduleLine(classItem)}</p>
                  </div>

                  <div className="teacher-home-card__body">
                    <div className="teacher-home-card__title-row">
                      <div>
                        <h3>{classItem.subjectName}</h3>
                        <p>
                          Grade {classItem.section?.gradeLevel ?? classItem.subjectGradeLevel ?? 'TBA'} -{' '}
                          {classItem.section?.name ?? 'Section not set'}
                        </p>
                      </div>
                      <span className="teacher-home-card__state">
                        {classItem.isActive ? 'Active' : 'Archived'}
                      </span>
                    </div>

                    <div className="teacher-home-card__stats">
                      <article>
                        <strong>{students}</strong>
                        <span>Lessons</span>
                      </article>
                      <article>
                        <strong>{taskCount}</strong>
                        <span>Tasks</span>
                      </article>
                    </div>

                    <div className="teacher-home-card__progress">
                      <div className="teacher-home-card__progress-head">
                        <span>Completion</span>
                        <strong>{rosterPercent}%</strong>
                      </div>
                      <div className="teacher-home-card__progress-track">
                        <div style={{ width: `${rosterPercent}%`, background: gradient.accent }} />
                      </div>
                    </div>

                    <div className="teacher-home-card__actions">
                      <Link href={`/dashboard/teacher/assessments?classId=${classItem.id}`}>
                        <NotebookPen className="h-4 w-4" />
                        Assignments
                      </Link>
                      <Link href={`/dashboard/teacher/announcements?classId=${classItem.id}`}>
                        <Bell className="h-4 w-4" />
                        Notify
                      </Link>
                      <Link href={`/dashboard/teacher/classes/${classItem.id}/students/add`}>
                        <Users className="h-4 w-4" />
                        Students
                      </Link>
                      <Link href={`/dashboard/teacher/class-record?classId=${classItem.id}`}>
                        <ClipboardList className="h-4 w-4" />
                        Record
                      </Link>
                      <Link href={`/dashboard/teacher/calendar?classId=${classItem.id}`}>
                        <CalendarDays className="h-4 w-4" />
                        Calendar
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <aside className="teacher-home-events">
          <article
            className="teacher-home-mini-calendar"
            style={{
              border: '1px solid #dce5f2',
              borderRadius: '0.76rem',
              background: '#fff',
              padding: '0.56rem',
              display: 'grid',
              gap: '0.42rem',
            }}
          >
            <div
              className="teacher-home-mini-calendar__head"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}
            >
              <h3>Calendar</h3>
              <div className="teacher-home-mini-calendar__controls" style={{ display: 'inline-flex', gap: '0.24rem' }}>
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setCalendarMonth((current) => addMonths(current, -1))}
                  style={{
                    border: '1px solid #d3deed',
                    background: '#f8fbff',
                    color: '#587499',
                    width: '1.45rem',
                    height: '1.45rem',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => setCalendarMonth((current) => addMonths(current, 1))}
                  style={{
                    border: '1px solid #d3deed',
                    background: '#f8fbff',
                    color: '#587499',
                    width: '1.45rem',
                    height: '1.45rem',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="teacher-home-mini-calendar__label" style={{ margin: 0, color: '#5f7597', fontSize: '0.72rem', fontWeight: 700 }}>
              {monthLabel}
            </p>
            <div
              className="teacher-home-mini-calendar__weekdays"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.18rem' }}
            >
              {WEEKDAY_INITIALS.map((weekday, index) => (
                <span
                  key={`${weekday}-${index}`}
                  style={{ textAlign: 'center', color: '#8599b5', fontSize: '0.58rem', fontWeight: 700 }}
                >
                  {weekday}
                </span>
              ))}
            </div>
            <div
              className="teacher-home-mini-calendar__grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.18rem' }}
            >
              {miniCalendarCells.map((cell) => (
                <div
                  key={cell.dateKey}
                  className="teacher-home-mini-calendar__cell"
                  data-in-month={cell.inMonth}
                  data-is-today={cell.isToday}
                  style={{
                    minHeight: '1.75rem',
                    borderRadius: '0.34rem',
                    border: cell.isToday ? '1px solid #b6c8e5' : '1px solid transparent',
                    background: cell.isToday ? '#edf4ff' : 'transparent',
                    display: 'grid',
                    placeItems: 'center',
                    padding: '0.14rem',
                  }}
                >
                  <span
                    style={{
                      color: cell.inMonth ? '#3d5477' : '#b7c4d8',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {cell.date.getDate()}
                  </span>
                  <div
                    className="teacher-home-mini-calendar__dots"
                    style={{ minHeight: '0.3rem', display: 'inline-flex', alignItems: 'center', gap: '0.14rem' }}
                  >
                    {TAG_ORDER.filter((tag) => cell.tags.includes(tag)).map((tag) => (
                      <i
                        key={tag}
                        data-tag={tag}
                        style={{
                          width: '0.24rem',
                          height: '0.24rem',
                          borderRadius: '999px',
                          display: 'inline-flex',
                          background: getEventTagColor(tag),
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <h3>Upcoming Events</h3>
          <div className="teacher-home-events__list">
            {announcements.length === 0 ? (
              <p className="teacher-home-events__empty">No events available right now.</p>
            ) : (
              announcements.slice(0, 6).map((announcement) => {
                const date = formatEventDate(announcement.createdAt);
                const tag = getAnnouncementTag(announcement);
                const tagClassName =
                  tag === 'assessment'
                    ? 'teacher-home-event-tag teacher-home-event-tag--assessment'
                    : tag === 'holiday'
                      ? 'teacher-home-event-tag teacher-home-event-tag--holiday'
                      : 'teacher-home-event-tag teacher-home-event-tag--event';
                return (
                  <article key={announcement.id} className="teacher-home-event-item">
                    <div className="teacher-home-event-item__date">
                      <strong>{date.day}</strong>
                      <span>{date.month}</span>
                    </div>
                    <div className="teacher-home-event-item__content">
                      <p className="teacher-home-event-item__title">{announcement.title}</p>
                      <p className="teacher-home-event-item__meta">{announcement.author?.firstName || 'Teacher'}</p>
                      <span className={tagClassName}>{tag}</span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
          <Link href="/dashboard/teacher/calendar" className="teacher-home-events__cta">
            View full calendar
          </Link>
        </aside>
      </section>

      <Dialog open={Boolean(customizingClass)} onOpenChange={(open) => !open && setCustomizingClass(null)}>
        <DialogContent className="teacher-customize-dialog">
          <DialogHeader>
            <DialogTitle>Customize Card Theme</DialogTitle>
            <DialogDescription>
              Choose a gradient or upload an image and reposition it like a class cover.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-customize-dialog__section">
            <p>Theme Type</p>
            <div
              className="teacher-customize-dialog__mode"
              style={{
                display: 'inline-grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '0.28rem',
                border: '1px solid #d6e0ed',
                background: '#f6f9fd',
                borderRadius: '999px',
                padding: '0.2rem',
              }}
            >
              <button
                type="button"
                data-active={draftCustomization.themeKind === 'gradient'}
                onClick={() => setDraftCustomization((current) => ({ ...current, themeKind: 'gradient' }))}
                style={{
                  border: 0,
                  background: draftCustomization.themeKind === 'gradient' ? '#fff' : 'transparent',
                  color: draftCustomization.themeKind === 'gradient' ? '#213859' : '#5d7496',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '999px',
                  minHeight: '1.7rem',
                  paddingInline: '0.62rem',
                }}
              >
                Gradient
              </button>
              <button
                type="button"
                data-active={draftCustomization.themeKind === 'image'}
                onClick={() =>
                  setDraftCustomization((current) => ({
                    ...current,
                    themeKind: current.imageUrl ? 'image' : 'gradient',
                  }))
                }
                disabled={!draftCustomization.imageUrl}
                style={{
                  border: 0,
                  background: draftCustomization.themeKind === 'image' ? '#fff' : 'transparent',
                  color: draftCustomization.themeKind === 'image' ? '#213859' : '#5d7496',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '999px',
                  minHeight: '1.7rem',
                  paddingInline: '0.62rem',
                  opacity: draftCustomization.imageUrl ? 1 : 0.5,
                }}
              >
                Image
              </button>
            </div>
          </div>

          <div className="teacher-customize-dialog__section">
            <p>Gradient Palette</p>
            <div
              className="teacher-customize-dialog__gradients"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.4rem' }}
            >
              {GRADIENT_OPTIONS.map((gradient) => (
                <button
                  key={gradient.id}
                  type="button"
                  data-active={draftCustomization.gradientId === gradient.id}
                  onClick={() => setDraftCustomization((current) => ({ ...current, gradientId: gradient.id }))}
                  style={{
                    border: `1px solid ${draftCustomization.gradientId === gradient.id ? '#9eb5d4' : '#d6e0ed'}`,
                    borderRadius: '0.62rem',
                    background: draftCustomization.gradientId === gradient.id ? '#fff' : '#f7fafe',
                    color: '#405673',
                    minHeight: '2.2rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '0.35rem',
                    paddingInline: '0.52rem',
                  }}
                >
                  <span
                    style={{
                      width: '1rem',
                      height: '1rem',
                      borderRadius: '999px',
                      background: gradient.background,
                    }}
                  />
                  {gradient.label}
                </button>
              ))}
            </div>
          </div>

          <div className="teacher-customize-dialog__section">
            <div
              className="teacher-customize-dialog__image-head"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}
            >
              <p>Image Theme</p>
              <label
                className="teacher-customize-dialog__upload"
                style={{
                  border: '1px solid #d0dced',
                  background: '#f8fbff',
                  color: '#435f87',
                  borderRadius: '0.58rem',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  minHeight: '1.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingInline: '0.55rem',
                  cursor: 'pointer',
                }}
              >
                {uploadingThemeImage ? 'Uploading...' : 'Upload Image'}
                <input type="file" accept="image/*" onChange={(event) => void handleThemeImageUpload(event)} />
              </label>
            </div>

            {draftCustomization.imageUrl ? (
              <div className="teacher-customize-dialog__image-tools" style={{ display: 'grid', gap: '0.45rem' }}>
                <div
                  className="teacher-customize-dialog__image-preview"
                  style={{
                    border: '1px solid #d7e3f2',
                    borderRadius: '0.64rem',
                    minHeight: '6.3rem',
                    backgroundColor: '#1f3d68',
                    ...(getHeroStyle({
                      ...draftCustomization,
                      themeKind: 'image',
                    }) as CSSProperties),
                  }}
                />

                <div className="teacher-customize-dialog__slider">
                  <label htmlFor="theme-image-position-x">Horizontal</label>
                  <input
                    id="theme-image-position-x"
                    type="range"
                    min={0}
                    max={100}
                    value={draftCustomization.imagePositionX}
                    onChange={(event) =>
                      setDraftCustomization((current) => ({
                        ...current,
                        imagePositionX: Number(event.target.value),
                      }))
                    }
                  />
                </div>

                <div className="teacher-customize-dialog__slider">
                  <label htmlFor="theme-image-position-y">Vertical</label>
                  <input
                    id="theme-image-position-y"
                    type="range"
                    min={0}
                    max={100}
                    value={draftCustomization.imagePositionY}
                    onChange={(event) =>
                      setDraftCustomization((current) => ({
                        ...current,
                        imagePositionY: Number(event.target.value),
                      }))
                    }
                  />
                </div>

                <div className="teacher-customize-dialog__slider">
                  <label htmlFor="theme-image-scale">Zoom</label>
                  <input
                    id="theme-image-scale"
                    type="range"
                    min={100}
                    max={220}
                    value={draftCustomization.imageScale}
                    onChange={(event) =>
                      setDraftCustomization((current) => ({
                        ...current,
                        imageScale: Number(event.target.value),
                      }))
                    }
                  />
                </div>

                <div className="teacher-customize-dialog__image-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.42rem' }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setDraftCustomization((current) => ({
                        ...current,
                        themeKind: 'gradient',
                        imageUrl: null,
                      }))
                    }
                  >
                    Remove Image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDraftCustomization((current) => ({ ...current, themeKind: 'image' }))}
                  >
                    Use Image Theme
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className="teacher-customize-dialog__empty"
                style={{
                  margin: 0,
                  border: '1px dashed #cad8eb',
                  borderRadius: '0.62rem',
                  background: '#f8fbff',
                  color: '#587194',
                  fontSize: '0.74rem',
                  padding: '0.55rem 0.6rem',
                }}
              >
                No image uploaded yet.
              </p>
            )}
          </div>

          <DialogFooter className="teacher-customize-dialog__footer">
            <Button type="button" variant="outline" onClick={resetCustomization}>
              Reset
            </Button>
            <Button type="button" className="teacher-home-refresh" onClick={saveCustomization}>
              Save Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
