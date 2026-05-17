'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Grid2X2,
  LayoutPanelTop,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { sectionService, type SectionVisibilityStatus } from '@/services/section-service';
import { classService } from '@/services/class-service';
import { announcementService } from '@/services/announcement-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  GRADIENT_OPTIONS,
  createDefaultCustomization,
  getFallbackGradient,
  getHeroStyle,
  normalizeCustomization,
  type CardViewMode,
  type ClassCardCustomization,
} from '@/components/class/class-card-theme';
import { cn } from '@/utils/cn';
import { SectionCard } from '@/components/teacher/my-sections/SectionCard';
import { SectionsCalendarCard } from '@/components/teacher/my-sections/SectionsCalendarCard';
import { SectionsUpcomingEventsCard } from '@/components/teacher/my-sections/SectionsUpcomingEventsCard';
import {
  type SectionEventTag,
  type SectionUpcomingEvent,
  toDateKey,
} from '@/components/teacher/my-sections/types';

const STORAGE_KEY_CUSTOMIZE = 'teacher-section-card-customize-v1';
const STORAGE_KEY_VIEW = 'teacher-section-view-mode-v1';
const MAX_SECTION_BANNER_SIZE_BYTES = 12 * 1024 * 1024;

const STATUS_FILTERS: Array<{ value: SectionVisibilityStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'all', label: 'All' },
  { value: 'archived', label: 'Archived' },
  { value: 'hidden', label: 'Hidden' },
];

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getAnnouncementDate(announcement: Announcement) {
  return parseDate(announcement.scheduledAt || announcement.createdAt);
}

function getAnnouncementTag(announcement: Announcement): SectionEventTag {
  const text = `${announcement.title} ${announcement.content}`.toLowerCase();
  if (text.includes('quiz') || text.includes('exam') || text.includes('assessment')) {
    return 'assessment';
  }
  if (text.includes('holiday') || text.includes('break')) {
    return 'holiday';
  }
  if (text.includes('announce')) {
    return 'announcement';
  }
  return 'event';
}

function formatMonthLabel(value: Date) {
  return value.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

function formatTimeLabel(value: Date) {
  const hasTime = value.getHours() !== 0 || value.getMinutes() !== 0;
  if (!hasTime) return 'All Day';
  return value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function shiftMonth(baseDate: Date, monthDelta: number) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + monthDelta, 1);
}

function getSearchableAdviser(section: Section) {
  const firstName = section.adviser?.firstName?.trim() ?? '';
  const lastName = section.adviser?.lastName?.trim() ?? '';
  return `${firstName} ${lastName}`.trim();
}

export default function TeacherSectionsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [sections, setSections] = useState<Section[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classLabelById, setClassLabelById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SectionVisibilityStatus>('active');
  const [viewMode, setViewMode] = useState<CardViewMode>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [customizationBySection, setCustomizationBySection] = useState<Record<string, ClassCardCustomization>>({});
  const [hasHydratedLocalPrefs, setHasHydratedLocalPrefs] = useState(false);
  const [customizingSection, setCustomizingSection] = useState<Section | null>(null);
  const [uploadingThemeImage, setUploadingThemeImage] = useState(false);
  const [savingThemeCustomization, setSavingThemeCustomization] = useState(false);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [updatingVisibilitySectionId, setUpdatingVisibilitySectionId] = useState<string | null>(null);
  const [draftCustomization, setDraftCustomization] = useState<ClassCardCustomization>(
    createDefaultCustomization('oceanic-blue'),
  );
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const sectionsRes = await sectionService.getMy(status);
      const nextSections = sectionsRes.data ?? [];
      setSections(nextSections);

      if (!user?.id) {
        setAnnouncements([]);
        setClassLabelById({});
        return;
      }

      const classesRes = await classService.getByTeacher(user.id, 'active').catch(() => ({ data: [] }));
      const teacherClasses = classesRes.data ?? [];

      setClassLabelById(
        Object.fromEntries(
          teacherClasses.map((classItem) => [
            classItem.id,
            `${classItem.subjectName} • ${classItem.section?.name ?? 'Section'}`,
          ]),
        ),
      );

      const announcementResponses = await Promise.all(
        teacherClasses.slice(0, 12).map((classItem) =>
          announcementService.getByClass(classItem.id, { limit: 4 }).catch(() => ({
            data: [] as Announcement[],
          })),
        ),
      );

      const mergedAnnouncements = announcementResponses
        .flatMap((response) => response.data ?? [])
        .reduce<Map<string, Announcement>>((map, announcement) => {
          map.set(announcement.id, announcement);
          return map;
        }, new Map());

      const sortedAnnouncements = Array.from(mergedAnnouncements.values()).sort((left, right) => {
        const leftTs = getAnnouncementDate(left)?.getTime() ?? 0;
        const rightTs = getAnnouncementDate(right)?.getTime() ?? 0;
        return leftTs - rightTs;
      });

      setAnnouncements(sortedAnnouncements);
    } catch {
      setSections([]);
      setAnnouncements([]);
      setClassLabelById({});
      setError('Unable to load sections right now. Please try again.');
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
        const normalizedEntries = Object.entries(parsed).map(([sectionId, value]) => [
          sectionId,
          normalizeCustomization(value, 'oceanic-blue'),
        ]);
        setCustomizationBySection(Object.fromEntries(normalizedEntries));
      }
      const savedView = window.localStorage.getItem(STORAGE_KEY_VIEW);
      if (savedView === 'card' || savedView === 'wide') {
        setViewMode(savedView);
      }
    } catch {
      // ignore storage parse errors
    } finally {
      setHasHydratedLocalPrefs(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasHydratedLocalPrefs) return;
    window.localStorage.setItem(STORAGE_KEY_VIEW, viewMode);
  }, [hasHydratedLocalPrefs, viewMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasHydratedLocalPrefs) return;
    try {
      window.localStorage.setItem(STORAGE_KEY_CUSTOMIZE, JSON.stringify(customizationBySection));
    } catch {
      // ignore quota errors
    }
  }, [customizationBySection, hasHydratedLocalPrefs]);

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

  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sections;

    return sections.filter((section) => {
      const searchableValues = [
        section.name,
        section.gradeLevel,
        section.schoolYear,
        section.roomNumber,
        getSearchableAdviser(section),
      ].filter((value): value is string => Boolean(value));

      return searchableValues.some((value) => value.toLowerCase().includes(query));
    });
  }, [sections, searchQuery]);

  const sectionEvents = useMemo<SectionUpcomingEvent[]>(() => {
    const now = Date.now();

    const mapped = announcements.flatMap((announcement) => {
      const eventDate = getAnnouncementDate(announcement);
      if (!eventDate) return [];

      return [
        {
          id: announcement.id,
          classId: announcement.classId,
          title: announcement.title,
          subtitle: `${classLabelById[announcement.classId] ?? 'Class update'} • ${formatTimeLabel(eventDate)}`,
          tag: getAnnouncementTag(announcement),
          href: announcement.classId
            ? `/dashboard/teacher/announcements?classId=${announcement.classId}`
            : '/dashboard/teacher/announcements',
          timestamp: eventDate.getTime(),
          dateKey: toDateKey(eventDate),
          dayLabel: String(eventDate.getDate()).padStart(2, '0'),
          monthLabel: formatMonthLabel(eventDate),
        } satisfies SectionUpcomingEvent,
      ];
    });

    const sorted = mapped.sort((left, right) => left.timestamp - right.timestamp);
    const upcomingOnly = sorted.filter((event) => event.timestamp >= now);
    return (upcomingOnly.length > 0 ? upcomingOnly : sorted).slice(0, 16);
  }, [announcements, classLabelById]);

  const eventTagsByDate = useMemo(() => {
    const map = new Map<string, SectionEventTag[]>();
    for (const event of sectionEvents) {
      const tags = map.get(event.dateKey) ?? [];
      if (!tags.includes(event.tag)) tags.push(event.tag);
      map.set(event.dateKey, tags);
    }
    return map;
  }, [sectionEvents]);

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
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Unable to update section visibility.'));
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

  const saveCustomization = async () => {
    if (!customizingSection) return;
    const sectionId = customizingSection.id;
    const nextCustomization = draftCustomization;

    setCustomizationBySection((current) => ({
      ...current,
      [sectionId]: nextCustomization,
    }));
    setCustomizingSection(null);

    try {
      setSavingThemeCustomization(true);
      const response = await sectionService.updatePresentation(sectionId, {
        cardBannerUrl:
          nextCustomization.themeKind === 'image' && nextCustomization.imageUrl
            ? nextCustomization.imageUrl
            : null,
      });

      setSections((current) =>
        current.map((section) => (section.id === sectionId ? response.data : section)),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save card theme.'));
    } finally {
      setSavingThemeCustomization(false);
    }
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
      <div className="space-y-5 p-1">
        <Skeleton className="h-32 rounded-[1.6rem]" />
        <Skeleton className="h-14 rounded-[1.2rem]" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[31rem] rounded-[1.45rem]" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[24rem] rounded-[1.4rem]" />
            <Skeleton className="h-[23rem] rounded-[1.4rem]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 bg-[#f5f3f8] p-1">
      <section className="rounded-[1.35rem] border border-[#e1deea] bg-white p-3.5 shadow-[0_18px_32px_-30px_rgba(22,32,58,0.5)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7e88a1]" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search section, adviser, grade, or room"
              className="h-11 rounded-xl border-[#ddd8e9] bg-[#faf8fd] pl-9 text-[#27304a] placeholder:text-[#8a93ad] focus-visible:ring-[#d81b50]/35"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#e4e0ee] bg-[#f7f5fb] px-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#6f7892]">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </span>

            <div className="inline-flex rounded-full border border-[#e2deea] bg-[#f7f5fb] p-1">
              {STATUS_FILTERS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => setStatus(entry.value)}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
                    status === entry.value
                      ? 'bg-white text-[#11192f] shadow-[0_10px_20px_-16px_rgba(22,32,58,0.5)]'
                      : 'text-[#5c6782] hover:text-[#11192f]',
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-full border border-[#ddd8e8] bg-[#f7f5fb] p-1">
              <button
                type="button"
                data-active={viewMode === 'card'}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full text-[#55617c] transition',
                  viewMode === 'card' && 'bg-white text-[#11192f]',
                )}
                onClick={() => setViewMode('card')}
                aria-label="Card layout"
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-active={viewMode === 'wide'}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full text-[#55617c] transition',
                  viewMode === 'wide' && 'bg-white text-[#11192f]',
                )}
                onClick={() => setViewMode('wide')}
                aria-label="Wide layout"
              >
                <LayoutPanelTop className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-[1.25rem] border border-[#f5c8d6] bg-[#fff1f6] p-4">
          <p className="text-sm font-semibold text-[#9f1c44]">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 border-[#e9a9be] text-[#9f1c44] hover:bg-[#ffe8ef]"
            onClick={() => void fetchData()}
          >
            Try Again
          </Button>
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            {filteredSections.length === 0 ? (
              <div className="grid min-h-[18rem] place-items-center rounded-[1.45rem] border border-dashed border-[#d5d1e2] bg-white p-6 text-center">
                <div>
                  <p className="text-xl font-semibold text-[#1e2944]">No sections match this filter.</p>
                  <p className="mt-1 text-sm text-[#667390]">
                    Try another search term or switch to a different status.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 border-[#ddd8e8] bg-[#faf8fd] text-[#3b4865] hover:bg-[#f4f0fa]"
                    onClick={() => {
                      setSearchQuery('');
                      setStatus('active');
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'grid gap-4',
                  viewMode === 'wide' ? 'grid-cols-1' : 'sm:grid-cols-2',
                )}
              >
                {filteredSections.map((section, index) => {
                  const fallback = getFallbackGradient(index);
                  const theme =
                    customizationBySection[section.id] ??
                    (section.cardBannerUrl
                      ? {
                          ...createDefaultCustomization(fallback),
                          themeKind: 'image' as const,
                          imageUrl: section.cardBannerUrl,
                        }
                      : createDefaultCustomization(fallback));
                  const isMenuOpen = openCardMenuId === section.id;

                  return (
                    <SectionCard
                      key={section.id}
                      section={section}
                      theme={theme}
                      menuOpen={isMenuOpen}
                      statusFilter={status}
                      visibilityUpdating={updatingVisibilitySectionId === section.id}
                      animateDelayMs={Math.min(index, 10) * 45}
                      onOpenSection={openSectionDetails}
                      onToggleMenu={() =>
                        setOpenCardMenuId((current) => (current === section.id ? null : section.id))
                      }
                      onCustomize={() => openCustomize(section, index)}
                      onToggleVisibility={() => void toggleSectionVisibility(section)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <SectionsCalendarCard
              month={calendarMonth}
              selectedDateKey={selectedDateKey}
              eventTagsByDate={eventTagsByDate}
              onSelectDate={setSelectedDateKey}
              onPrevMonth={() => setCalendarMonth((current) => shiftMonth(current, -1))}
              onNextMonth={() => setCalendarMonth((current) => shiftMonth(current, 1))}
            />
            <SectionsUpcomingEventsCard
              events={sectionEvents}
              selectedDateKey={selectedDateKey}
            />
          </aside>
        </section>
      )}

      <Dialog open={Boolean(customizingSection)} onOpenChange={(open) => !open && setCustomizingSection(null)}>
        <DialogContent className="teacher-customize-dialog">
          <DialogHeader>
            <DialogTitle>Customize Section Card Theme</DialogTitle>
            <DialogDescription>
              Choose a gradient or upload an image and reposition it like a section cover.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-customize-dialog__section">
            <p>Theme Type</p>
            <div className="teacher-customize-dialog__mode">
              <button
                type="button"
                data-active={draftCustomization.themeKind === 'gradient'}
                onClick={() => setDraftCustomization((current) => ({ ...current, themeKind: 'gradient' }))}
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
              >
                Image
              </button>
            </div>
          </div>

          <div className="teacher-customize-dialog__section">
            <p>Gradient Palette</p>
            <div className="teacher-customize-dialog__gradients">
              {GRADIENT_OPTIONS.map((gradient) => (
                <button
                  key={gradient.id}
                  type="button"
                  data-active={draftCustomization.gradientId === gradient.id}
                  onClick={() =>
                    setDraftCustomization((current) => ({
                      ...current,
                      themeKind: 'gradient',
                      gradientId: gradient.id,
                    }))
                  }
                >
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
                <div
                  className="teacher-customize-dialog__image-preview"
                  style={getHeroStyle({ ...draftCustomization, themeKind: 'image' })}
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
                <div className="teacher-customize-dialog__image-actions">
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
              <p className="teacher-customize-dialog__empty">No image uploaded yet.</p>
            )}
          </div>

          <DialogFooter className="teacher-customize-dialog__footer">
            <Button type="button" variant="outline" onClick={resetCustomization} disabled={savingThemeCustomization}>
              Reset
            </Button>
            <Button
              type="button"
              className="teacher-home-refresh"
              onClick={() => void saveCustomization()}
              disabled={savingThemeCustomization}
            >
              {savingThemeCustomization ? 'Saving...' : 'Save Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
