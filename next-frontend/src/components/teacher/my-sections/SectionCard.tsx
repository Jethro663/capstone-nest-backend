'use client';

import Link from 'next/link';
import { type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { ArrowRight, CalendarDays, MoreHorizontal, School, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { ClassCardCustomization } from '@/components/class/class-card-theme';
import { getGradientOption, getHeroStyle } from '@/components/class/class-card-theme';
import type { Section } from '@/types/section';
import type { SectionVisibilityStatus } from '@/services/section-service';
import { cn } from '@/utils/cn';

interface SectionCardProps {
  section: Section;
  theme: ClassCardCustomization;
  menuOpen: boolean;
  statusFilter: SectionVisibilityStatus;
  visibilityUpdating: boolean;
  animateDelayMs: number;
  onOpenSection: (sectionId: string) => void;
  onToggleMenu: () => void;
  onCustomize: () => void;
  onToggleVisibility: () => void;
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('a, button, input, select, textarea, label, [role="button"], [data-class-card-menu]'))
  );
}

function getAdviserName(section: Section) {
  const firstName = section.adviser?.firstName?.trim() ?? '';
  const lastName = section.adviser?.lastName?.trim() ?? '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName.length > 0 ? fullName : 'Unassigned adviser';
}

function getSectionStatus(section: Section, statusFilter: SectionVisibilityStatus) {
  if (statusFilter === 'hidden' || section.isHidden) return 'Hidden';
  if (!section.isActive) return 'Archived';
  return 'Active';
}

function getStatusClass(status: string) {
  if (status === 'Hidden') return 'border-[#d8deec] bg-[#f3f7fd] text-[#4d617f]';
  if (status === 'Archived') return 'border-[#d8deec] bg-[#f3f7fd] text-[#4d617f]';
  return 'border-[#fbcada] bg-[#fff1f6] text-[#c31645]';
}

export function SectionCard({
  section,
  theme,
  menuOpen,
  statusFilter,
  visibilityUpdating,
  animateDelayMs,
  onOpenSection,
  onToggleMenu,
  onCustomize,
  onToggleVisibility,
}: SectionCardProps) {
  const sectionStatus = getSectionStatus(section, statusFilter);
  const gradient = getGradientOption(theme.gradientId);
  const heroStyle = getHeroStyle(theme);
  const students = section.studentCount ?? 0;
  const capacity = Math.max(1, section.capacity ?? 1);
  const occupancy = Math.min(100, Math.round((students / capacity) * 100));
  const ctaLabel = occupancy >= 60 ? 'Continue Learning' : 'Open Class';
  const cardStyle = { '--enter-delay': `${animateDelayMs}ms` } as CSSProperties;

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (isInteractiveTarget(event.target)) return;
    onOpenSection(section.id);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (isInteractiveTarget(event.target)) return;
    event.preventDefault();
    onOpenSection(section.id);
  };

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`Open ${section.name}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      style={cardStyle}
      className={cn(
        'group overflow-hidden rounded-[1.45rem] border border-[#e1deeb] bg-white shadow-[0_20px_36px_-30px_rgba(17,25,47,0.55),inset_0_1px_0_rgba(255,255,255,0.9)] transition',
        'hover:-translate-y-1 hover:border-[#d4d0df] hover:shadow-[0_26px_40px_-28px_rgba(17,25,47,0.55)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d81b50]/40 focus-visible:ring-offset-2',
      )}
    >
      <div className="relative min-h-[8.4rem] overflow-hidden px-5 pb-4 pt-4" style={heroStyle}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:16px_16px]" />
        <div className="relative flex items-start justify-between gap-2">
          <span
            className={cn(
              'inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em]',
              getStatusClass(sectionStatus),
            )}
          >
            {sectionStatus}
          </span>

          <div className="relative" data-class-card-menu>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full border border-white/35 text-white transition hover:brightness-110"
              aria-label="Section card menu"
              aria-expanded={menuOpen}
              style={{
                background:
                  theme.themeKind === 'image' && theme.imageUrl
                    ? 'rgba(15, 25, 47, 0.68)'
                    : gradient.buttonTint,
              }}
              onClick={onToggleMenu}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            <div
              data-open={menuOpen}
              className={cn(
                'absolute right-0 top-[calc(100%+0.4rem)] z-30 grid min-w-[11rem] gap-1 rounded-xl border border-[#ddd9e8] bg-white p-1.5 shadow-[0_18px_30px_-24px_rgba(17,25,47,0.45)] transition',
                menuOpen
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none -translate-y-1 opacity-0',
              )}
            >
              <button
                type="button"
                tabIndex={menuOpen ? 0 : -1}
                className="rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-[#2f3f5d] transition hover:bg-[#f3f0f9]"
                onClick={onCustomize}
              >
                Customize section
              </button>
              <button
                type="button"
                tabIndex={menuOpen ? 0 : -1}
                disabled={visibilityUpdating}
                className="rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-[#2f3f5d] transition hover:bg-[#f3f0f9] disabled:opacity-50"
                onClick={onToggleVisibility}
              >
                {sectionStatus === 'Hidden' ? 'Unhide section' : 'Hide section'}
              </button>
            </div>
          </div>
        </div>

        <div className="relative mt-4 text-white">
          <h3 className="line-clamp-2 text-[2rem] font-semibold leading-[1.05] tracking-tight">{section.name}</h3>
          <p className="mt-2 text-sm font-medium text-white/90">
            Grade {section.gradeLevel} • {section.schoolYear}
          </p>
          <p className="mt-0.5 text-sm text-white/80">{section.roomNumber ? `Room ${section.roomNumber}` : 'Room TBA'}</p>
        </div>
      </div>

      <div className="space-y-4 px-5 pb-5 pt-4">
        <div className="rounded-2xl border border-[#e8e4ef] bg-[#faf9fd] px-3 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6f7994]">Adviser</p>
          <p className="mt-1 text-[1.02rem] font-semibold text-[#11192f]">{getAdviserName(section)}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-[#e8e4ef] bg-[#faf9fd] px-3 py-2.5">
            <p className="text-2xl font-semibold leading-none text-[#11192f]">{students}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#727d97]">Students</p>
          </div>
          <div className="rounded-2xl border border-[#e8e4ef] bg-[#faf9fd] px-3 py-2.5">
            <p className="text-2xl font-semibold leading-none text-[#11192f]">{capacity}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#727d97]">Capacity</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e8e4ef] bg-[#fbf9fd] px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-[#576380]">
              <Users className="h-3.5 w-3.5 text-[#d81b50]" />
              Occupancy
            </span>
            <span className="text-[#d81b50]">{occupancy}%</span>
          </div>
          <Progress
            value={occupancy}
            className="h-2.5 bg-[#f2d7e1]"
            indicatorClassName="bg-gradient-to-r from-[#d81b50] to-[#ef476f]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/dashboard/teacher/calendar?sectionId=${section.id}`}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#dbd7e7] bg-[#f2f0f9] text-sm font-semibold text-[#2f3f5d] transition hover:bg-[#ebe8f5]"
          >
            <CalendarDays className="h-4 w-4" />
            View Schedule
          </Link>
          <Button
            type="button"
            className="h-11 rounded-xl bg-[#d81b50] text-sm font-semibold text-white hover:bg-[#c51647]"
            onClick={(event) => {
              event.stopPropagation();
              onOpenSection(section.id);
            }}
          >
            {ctaLabel}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-[#eff4ff] px-2.5 py-1 text-xs font-semibold text-[#35548e]">
          <School className="h-3.5 w-3.5" />
          {sectionStatus === 'Active' ? 'Ready for class updates' : 'Review section details'}
        </div>
      </div>
    </article>
  );
}
