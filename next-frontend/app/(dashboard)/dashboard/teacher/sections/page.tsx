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
import { toast } from 'sonner';
import {
  BookCopy,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  LayoutPanelTop,
  MoreHorizontal,
  NotebookPen,
  RefreshCcw,
  Smile,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { sectionService, type SectionVisibilityStatus } from '@/services/section-service';
import { classService } from '@/services/class-service';
import { announcementService } from '@/services/announcement-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Announcement } from '@/types/announcement';
import type { Section } from '@/types/section';

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

interface SectionCardCustomization {
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

const STORAGE_KEY_CUSTOMIZE = 'teacher-section-card-customize-v1';
const STORAGE_KEY_VIEW = 'teacher-section-view-mode-v1';
const MAX_SECTION_BANNER_SIZE_BYTES = 12 * 1024 * 1024;

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

function createDefaultCustomization(gradientId: CardGradientId): SectionCardCustomization {
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

function normalizeCustomization(rawValue: unknown, fallbackGradient: CardGradientId): SectionCardCustomization {
  if (!rawValue || typeof rawValue !== 'object') return createDefaultCustomization(fallbackGradient);
  const value = rawValue as Partial<SectionCardCustomization>;
  const gradientId =
    typeof value.gradientId === 'string' ? toCardGradientId(value.gradientId, fallbackGradient) : fallbackGradient;
  const normalizedImageUrl =
    typeof value.imageUrl === 'string' && !value.imageUrl.startsWith('data:') ? value.imageUrl : null;
  const themeKind: CardThemeKind =
    value.themeKind === 'image' && typeof normalizedImageUrl === 'string' ? 'image' : 'gradient';
  return {
    themeKind,
    gradientId,
    imageUrl: normalizedImageUrl,
    imagePositionX:
      typeof value.imagePositionX === 'number' ? Math.min(Math.max(value.imagePositionX, 0), 100) : 50,
    imagePositionY:
      typeof value.imagePositionY === 'number' ? Math.min(Math.max(value.imagePositionY, 0), 100) : 50,
    imageScale: typeof value.imageScale === 'number' ? Math.min(Math.max(value.imageScale, 100), 170) : 120,
  };
}

function getHeroStyle(customization: SectionCardCustomization): CSSProperties {
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

function formatDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatEventDate(dateValue?: string | null) {
  if (!dateValue) return { day: '--', month: '---' };
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return { day: '--', month: '---' };
  return {
    day: String(date.getDate()),
    month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
  };
}

function getAnnouncementTag(announcement: Announcement): EventTag {
  const content = `${announcement.title} ${announcement.content}`.toLowerCase();
  if (content.includes('quiz') || content.includes('exam') || content.includes('assessment')) return 'assessment';
  if (content.includes('holiday') || content.includes('break')) return 'holiday';
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

function formatAdviserName(section: Section) {
  const firstName = section.adviser?.firstName?.trim() ?? '';
  const lastName = section.adviser?.lastName?.trim() ?? '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName.length > 0 ? fullName : 'Unassigned';
}

function formatAdviserDisplay(section: Section) {
  const lastName = section.adviser?.lastName?.trim();
  return lastName && lastName.length > 0 ? lastName : formatAdviserName(section);
}

function getCardEnterStyle(index: number): CSSProperties {
  const enterDelayVar = '--enter-delay' as const;
  return {
    [enterDelayVar]: `${Math.min(index, 10) * 45}ms`,
  } as CSSProperties;
}

export default function TeacherSectionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SectionVisibilityStatus>('active');
  const [homeTab, setHomeTab] = useState<TeacherHomeTab>('dashboard');
  const [viewMode, setViewMode] = useState<CardViewMode>('card');
  const [customizationBySection, setCustomizationBySection] = useState<Record<string, SectionCardCustomization>>({});
  const [customizingSection, setCustomizingSection] = useState<Section | null>(null);
  const [uploadingThemeImage, setUploadingThemeImage] = useState(false);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [updatingVisibilitySectionId, setUpdatingVisibilitySectionId] = useState<string | null>(null);
  const [draftCustomization, setDraftCustomization] = useState<SectionCardCustomization>(
    createDefaultCustomization('oceanic-blue'),
  );
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const sectionsRes = await sectionService.getMy(status);
      setSections(sectionsRes.data || []);

      if (!user?.id) {
        setAnnouncements([]);
        return;
      }

      const classesRes = await classService.getByTeacher(user.id, 'all');
      const classesData = classesRes.data || [];
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
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
        .slice(0, 18);
      setAnnouncements(merged);
    } catch {
      setSections([]);
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
        const entries = Object.entries(parsed).map(([id, value]) => [id, normalizeCustomization(value, 'oceanic-blue')]);
        setCustomizationBySection(Object.fromEntries(entries));
      }
      const savedView = window.localStorage.getItem(STORAGE_KEY_VIEW);
      if (savedView === 'card' || savedView === 'wide') setViewMode(savedView);
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY_VIEW, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY_CUSTOMIZE, JSON.stringify(customizationBySection));
    } catch {
      // ignore quota errors
    }
  }, [customizationBySection]);

  useEffect(() => {
    if (!openCardMenuId || typeof document === 'undefined') return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('[data-class-card-menu]')) return;
      setOpenCardMenuId(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openCardMenuId]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Set<EventTag>>();
    for (const announcement of announcements) {
      if (!announcement.createdAt) continue;
      const date = new Date(announcement.createdAt);
      if (Number.isNaN(date.getTime())) continue;
      const key = formatDateKey(date);
      if (!map.has(key)) map.set(key, new Set<EventTag>());
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
    () => calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    [calendarMonth],
  );

  const openCustomize = (section: Section, index: number) => {
    setOpenCardMenuId(null);
    const fallback = getFallbackGradient(index);
    const existing = customizationBySection[section.id];
    const fromBanner = section.cardBannerUrl
      ? {
          ...createDefaultCustomization(fallback),
          themeKind: 'image' as const,
          imageUrl: section.cardBannerUrl,
        }
      : createDefaultCustomization(fallback);
    setDraftCustomization(existing ?? fromBanner);
    setCustomizingSection(section);
  };

  const toggleSectionVisibility = useCallback(
    async (section: Section) => {
      const currentlyHidden = status === 'hidden' || Boolean(section.isHidden);
      const nextHidden = !currentlyHidden;
      setUpdatingVisibilitySectionId(section.id);
      setOpenCardMenuId(null);
      try {
        if (currentlyHidden) await sectionService.unhide(section.id);
        else await sectionService.hide(section.id);
        setSections((current) =>
          current.flatMap((item) => {
            if (item.id !== section.id) return [item];
            if (status === 'all') return [{ ...item, isHidden: nextHidden }];
            return [];
          }),
        );
      } finally {
        setUpdatingVisibilitySectionId(null);
      }
    },
    [status],
  );

  const openSectionDetails = useCallback(
    (sectionId: string) => router.push(`/dashboard/teacher/sections/${sectionId}/roster`),
    [router],
  );

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(target.closest('a, button, input, select, textarea, label, [role="button"], [data-class-card-menu]'));

  const handleCardClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>, sectionId: string) => {
      if (isInteractiveTarget(event.target)) return;
      openSectionDetails(sectionId);
    },
    [openSectionDetails],
  );

  const handleCardKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>, sectionId: string) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (isInteractiveTarget(event.target)) return;
      event.preventDefault();
      openSectionDetails(sectionId);
    },
    [openSectionDetails],
  );

  const saveCustomization = () => {
    if (!customizingSection) return;
    setCustomizationBySection((current) => ({ ...current, [customizingSection.id]: draftCustomization }));
    setCustomizingSection(null);
  };

  const resetCustomization = () => {
    if (!customizingSection) return;
    setCustomizationBySection((current) => {
      const next = { ...current };
      delete next[customizingSection.id];
      return next;
    });
    setCustomizingSection(null);
  };

  const handleThemeImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !customizingSection) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }
    if (file.size > MAX_SECTION_BANNER_SIZE_BYTES) {
      toast.error('Image is too large. Please upload a file smaller than 12MB.');
      return;
    }

    try {
      setUploadingThemeImage(true);
      const response = await sectionService.uploadBanner(customizingSection.id, file);
      const uploadedUrl = response.data.cardBannerUrl;
      setDraftCustomization((current) => ({ ...current, themeKind: 'image', imageUrl: uploadedUrl }));
      setSections((current) =>
        current.map((section) => (section.id === customizingSection.id ? response.data.section : section)),
      );
      toast.success('Section banner updated.');
    } catch (error) {
      const statusCode = (error as { response?: { status?: number } })?.response?.status;
      if (statusCode === 413) {
        toast.error('Upload failed. Please use an image smaller than 12MB.');
      } else {
        toast.error(getApiErrorMessage(error, 'Unable to upload section banner.'));
      }
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
        <button type="button" data-active={homeTab === 'dashboard'} onClick={() => setHomeTab('dashboard')}>
          <BookCopy className="h-4 w-4" />
          Dashboard
        </button>
        <button type="button" data-active={homeTab === 'news'} onClick={() => setHomeTab('news')}>
          <NotebookPen className="h-4 w-4" />
          News
        </button>
        <button type="button" data-active={homeTab === 'welcome'} onClick={() => setHomeTab('welcome')}>
          <Smile className="h-4 w-4" />
          Welcome
        </button>
      </section>

      <section className="teacher-home-toolbar">
        <div className="teacher-home-toolbar__left">
          <div className="teacher-home-status">
            {(['active', 'archived', 'hidden'] as const).map((value) => (
              <button key={value} type="button" data-active={status === value} onClick={() => setStatus(value)}>
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="teacher-home-toolbar__right">
          <div className="teacher-home-view-toggle">
            <button type="button" data-active={viewMode === 'card'} onClick={() => setViewMode('card')} title="Grid View">
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button type="button" data-active={viewMode === 'wide'} onClick={() => setViewMode('wide')} title="Wide Card View">
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
          {sections.length === 0 ? (
            <div className="teacher-home-empty">
              <p>No sections in this view.</p>
            </div>
          ) : (
            sections.map((section, index) => {
              const fallbackGradient = getFallbackGradient(index);
              const theme =
                customizationBySection[section.id] ??
                (section.cardBannerUrl
                  ? { ...createDefaultCustomization(fallbackGradient), themeKind: 'image' as const, imageUrl: section.cardBannerUrl }
                  : createDefaultCustomization(fallbackGradient));
              const gradient = getGradientOption(theme.gradientId);
              const heroStyle = getHeroStyle(theme);
              const isMenuOpen = openCardMenuId === section.id;
              const students = section.studentCount ?? 0;
              const adviserName = formatAdviserName(section);

              return (
                <article
                  key={section.id}
                  className="teacher-home-card"
                  data-animate="true"
                  role="link"
                  tabIndex={0}
                  aria-label={`Open ${section.name} section`}
                  style={getCardEnterStyle(index)}
                  onClick={(event) => handleCardClick(event, section.id)}
                  onKeyDown={(event) => handleCardKeyDown(event, section.id)}
                >
                  <div className="teacher-home-card__hero" style={heroStyle}>
                    <div className="teacher-home-card__menu" data-class-card-menu>
                      <button
                        type="button"
                        className="teacher-home-card__menu-trigger"
                        aria-label="Section menu"
                        aria-expanded={isMenuOpen}
                        style={{
                          background:
                            theme.themeKind === 'image' && theme.imageUrl
                              ? 'rgba(14, 27, 46, 0.72)'
                              : gradient.buttonTint,
                        }}
                        onClick={() => setOpenCardMenuId((current) => (current === section.id ? null : section.id))}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                      <div className="teacher-home-card__menu-panel" data-open={isMenuOpen} aria-hidden={!isMenuOpen}>
                        <button type="button" tabIndex={isMenuOpen ? 0 : -1} onClick={() => openCustomize(section, index)}>
                          Customize section
                        </button>
                        <button
                          type="button"
                          tabIndex={isMenuOpen ? 0 : -1}
                          disabled={updatingVisibilitySectionId === section.id}
                          onClick={() => void toggleSectionVisibility(section)}
                        >
                          {status === 'hidden' || section.isHidden ? 'Unhide section' : 'Hide section'}
                        </button>
                      </div>
                    </div>
                    <p>{`GRADE ${section.gradeLevel} - ${section.schoolYear}`}</p>
                  </div>

                  <div className="teacher-home-card__body">
                    <div className="teacher-home-card__title-row">
                      <div className="teacher-home-card__title-copy">
                        <h3>{section.name}</h3>
                        <p>Adviser: {adviserName}</p>
                      </div>
                      <span className="teacher-home-card__state">{section.isActive ? 'Active' : 'Archived'}</span>
                    </div>
                    <div className="teacher-home-card__stats">
                      <article>
                        <strong>{students}</strong>
                        <span>Students</span>
                      </article>
                      <article>
                        <strong>{formatAdviserDisplay(section)}</strong>
                        <span>Adviser</span>
                      </article>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <aside className="teacher-home-events">
          <article className="teacher-home-mini-calendar" style={{ border: '1px solid #dce5f2', borderRadius: '0.76rem', background: '#fff', padding: '0.56rem', display: 'grid', gap: '0.42rem' }}>
            <div className="teacher-home-mini-calendar__head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3>Calendar</h3>
              <div className="teacher-home-mini-calendar__controls" style={{ display: 'inline-flex', gap: '0.24rem' }}>
                <button type="button" aria-label="Previous month" onClick={() => setCalendarMonth((current) => addMonths(current, -1))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button type="button" aria-label="Next month" onClick={() => setCalendarMonth((current) => addMonths(current, 1))}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="teacher-home-mini-calendar__label">{monthLabel}</p>
            <div className="teacher-home-mini-calendar__weekdays" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
              {WEEKDAY_INITIALS.map((weekday, index) => (
                <span key={`${weekday}-${index}`}>{weekday}</span>
              ))}
            </div>
            <div className="teacher-home-mini-calendar__grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.18rem' }}>
              {miniCalendarCells.map((cell) => (
                <div key={cell.dateKey} className="teacher-home-mini-calendar__cell" data-in-month={cell.inMonth} data-is-today={cell.isToday}>
                  <span>{cell.date.getDate()}</span>
                  <div className="teacher-home-mini-calendar__dots">
                    {TAG_ORDER.filter((tag) => cell.tags.includes(tag)).map((tag) => (
                      <i key={tag} data-tag={tag} style={{ background: getEventTagColor(tag) }} />
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

      <Dialog open={Boolean(customizingSection)} onOpenChange={(open) => !open && setCustomizingSection(null)}>
        <DialogContent className="teacher-customize-dialog">
          <DialogHeader>
            <DialogTitle>Customize Section Card Theme</DialogTitle>
            <DialogDescription>Choose a gradient or upload an image and reposition it like a section cover.</DialogDescription>
          </DialogHeader>

          <div className="teacher-customize-dialog__section">
            <p>Theme Type</p>
            <div className="teacher-customize-dialog__mode">
              <button type="button" data-active={draftCustomization.themeKind === 'gradient'} onClick={() => setDraftCustomization((current) => ({ ...current, themeKind: 'gradient' }))}>
                Gradient
              </button>
              <button
                type="button"
                data-active={draftCustomization.themeKind === 'image'}
                onClick={() => setDraftCustomization((current) => ({ ...current, themeKind: current.imageUrl ? 'image' : 'gradient' }))}
                disabled={!draftCustomization.imageUrl}
              >
                Image
              </button>
            </div>
          </div>

          <div className="teacher-customize-dialog__section">
            <p>Gradient Palette</p>
            <div className="teacher-customize-dialog__gradients">
              {GRADIENT_OPTIONS.map((gradient) => (
                <button key={gradient.id} type="button" data-active={draftCustomization.gradientId === gradient.id} onClick={() => setDraftCustomization((current) => ({ ...current, gradientId: gradient.id }))}>
                  <span style={{ background: gradient.background }} />
                  {gradient.label}
                </button>
              ))}
            </div>
          </div>

          <div className="teacher-customize-dialog__section">
            <div className="teacher-customize-dialog__image-head">
              <p>Image Theme</p>
              <label className="teacher-customize-dialog__upload">
                {uploadingThemeImage ? 'Uploading...' : 'Upload Image'}
                <input type="file" accept="image/*" onChange={(event) => void handleThemeImageUpload(event)} />
              </label>
            </div>

            {draftCustomization.imageUrl ? (
              <div className="teacher-customize-dialog__image-tools">
                <div className="teacher-customize-dialog__image-preview" style={getHeroStyle({ ...draftCustomization, themeKind: 'image' })} />
                <div className="teacher-customize-dialog__slider">
                  <label htmlFor="theme-image-position-x">Horizontal</label>
                  <input id="theme-image-position-x" type="range" min={0} max={100} value={draftCustomization.imagePositionX} onChange={(event) => setDraftCustomization((current) => ({ ...current, imagePositionX: Number(event.target.value) }))} />
                </div>
                <div className="teacher-customize-dialog__slider">
                  <label htmlFor="theme-image-position-y">Vertical</label>
                  <input id="theme-image-position-y" type="range" min={0} max={100} value={draftCustomization.imagePositionY} onChange={(event) => setDraftCustomization((current) => ({ ...current, imagePositionY: Number(event.target.value) }))} />
                </div>
                <div className="teacher-customize-dialog__slider">
                  <label htmlFor="theme-image-scale">Zoom</label>
                  <input id="theme-image-scale" type="range" min={100} max={170} value={draftCustomization.imageScale} onChange={(event) => setDraftCustomization((current) => ({ ...current, imageScale: Number(event.target.value) }))} />
                </div>
                <div className="teacher-customize-dialog__image-actions">
                  <Button type="button" variant="outline" onClick={() => setDraftCustomization((current) => ({ ...current, themeKind: 'gradient', imageUrl: null }))}>
                    Remove Image
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDraftCustomization((current) => ({ ...current, themeKind: 'image' }))}>
                    Use Image Theme
                  </Button>
                </div>
              </div>
            ) : (
              <p className="teacher-customize-dialog__empty">No image uploaded yet.</p>
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
