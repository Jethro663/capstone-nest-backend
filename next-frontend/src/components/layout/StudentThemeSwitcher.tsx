'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  Droplet,
  Moon,
  Palette,
  Sparkle,
  Sparkles,
  Star,
  Sun,
  CandyCane,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTheme } from '@/providers/ThemeProvider';
import { cn } from '@/utils/cn';
import type { ThemeId } from '@/lib/themes';

const themeIcons = {
  'nexora-red': Palette,
  dark: Moon,
  'soft-ocean': Droplet,
  'dark-void': Star,
  'candy-land': CandyCane,
  'fairy-land': Sparkle,
  sunset: Sun,
  'aurora-borealis': Sparkles,
  'stone-mountain': Star,
} satisfies Record<ThemeId, typeof Palette>;

const studentDescriptions = {
  'nexora-red': 'Your classic school colors - familiar and focused.',
  dark: 'Night mode for late study sessions.',
  'soft-ocean': 'Calm blues that keep the page feeling light.',
  'dark-void': 'A cosmic palette with deeper contrast.',
  'candy-land': 'Bright playful colors for a lighter mood.',
  'fairy-land': 'Soft magical accents with a warmer glow.',
  sunset: 'Warm oranges and pinks for a cozy study space.',
  'aurora-borealis': 'Cool neon hues inspired by northern lights.',
  'stone-mountain': 'Grounded earth tones with steady contrast.',
} satisfies Record<ThemeId, string>;

export function StudentThemeSwitcher() {
  const reduceMotion = useReducedMotion();
  const { theme, themes, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const sortedThemes = useMemo(
    () => [...themes].sort((left, right) => left.label.localeCompare(right.label)),
    [themes],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="student-theme-trigger group relative overflow-hidden"
          aria-label="Select theme"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--student-accent)]/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <span className="student-theme-trigger__icon relative z-10">
            <motion.div
              animate={open ? { rotate: 180, scale: 1.08 } : { rotate: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <Palette className="h-4 w-4" />
            </motion.div>
          </span>

          <span className="relative z-10 hidden min-w-0 text-left sm:block">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.22em] text-[var(--student-text-muted)]">
              Theme
            </span>
            <span className="block truncate text-sm font-bold text-[var(--student-text-strong)]">
              {resolvedTheme.label}
            </span>
          </span>

          <ChevronDown
            className={cn(
              'h-4 w-4 text-[var(--student-text-muted)] transition-all duration-300',
              open && 'rotate-180 text-[var(--student-accent)]',
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={12}
        className="w-[min(24rem,calc(100vw-1.5rem))] border-[var(--student-outline)] bg-[var(--student-elevated)] p-0 text-[var(--student-text-strong)] shadow-[var(--student-shadow-hover)] backdrop-blur-xl"
      >
        <AnimatePresence initial={false} mode="wait">
          {open ? (
            <motion.div
              key="student-theme-panel"
              initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? {} : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="space-y-4 p-5"
            >
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--student-accent)]">
                  Choose Your Vibe
                </p>
                <h3 className="text-lg font-black text-[var(--student-text-strong)]">
                  Pick Your Theme
                </h3>
                <p className="text-sm leading-relaxed text-[var(--student-text-muted)]">
                  Switch the student dashboard to the palette that feels best for your study session.
                </p>
              </div>

              <div className="max-h-[320px] space-y-3 overflow-y-auto pr-2">
                {sortedThemes.map((option, index) => {
                  const isActive = option.id === theme;
                  const IconComponent = themeIcons[option.id];
                  const studentDescription =
                    studentDescriptions[option.id] || option.description;

                  return (
                    <motion.button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setTheme(option.id);
                        setOpen(false);
                      }}
                      whileHover={reduceMotion ? undefined : { y: -2 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                      initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                      animate={reduceMotion ? {} : { opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.18,
                        delay: Math.min(index * 0.03, 0.12),
                        ease: 'easeOut',
                      }}
                      className={cn(
                        'group flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-200',
                        isActive
                          ? 'border-[var(--student-accent)] bg-[var(--student-accent-soft)] shadow-[var(--student-shadow-hover)]'
                          : 'border-[var(--student-outline)] bg-[var(--student-surface)] hover:border-[var(--student-accent-soft-strong)] hover:bg-[var(--student-surface-soft)]',
                      )}
                    >
                      <div className="flex h-12 w-16 shrink-0 gap-1 overflow-hidden rounded-xl border border-white/30 p-1 shadow-sm">
                        {option.preview.map((swatch) => (
                          <span
                            key={swatch}
                            className="flex-1 rounded-full"
                            style={{ background: swatch }}
                          />
                        ))}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-3">
                          <IconComponent
                            className={cn(
                              'h-5 w-5 transition-colors duration-200',
                              isActive
                                ? 'text-[var(--student-accent)]'
                                : 'text-[var(--student-text-muted)] group-hover:text-[var(--student-accent)]',
                            )}
                          />
                          <span className="text-base font-bold text-[var(--student-text-strong)]">
                            {option.label}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-[var(--student-text-muted)]">
                          {studentDescription}
                        </p>
                      </div>

                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200',
                          isActive
                            ? 'border-[var(--student-accent)] bg-[var(--student-accent-soft)] text-[var(--student-accent)]'
                            : 'border-[var(--student-outline)] bg-[var(--student-elevated)] text-[var(--student-text-muted)]',
                        )}
                      >
                        {isActive ? <Check className="h-5 w-5" /> : <Palette className="h-5 w-5" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="border-t border-[var(--student-outline)] pt-3">
                <p className="text-center text-xs italic text-[var(--student-text-muted)]">
                  &quot;Learning feels better when the interface does too.&quot;
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
