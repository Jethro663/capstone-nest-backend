'use client';

import { useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, Palette } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTheme } from '@/providers/ThemeProvider';
import { cn } from '@/utils/cn';

export function StudentThemeSwitcher() {
  const reduceMotion = useReducedMotion();
  const { theme, themes, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="student-theme-trigger"
          aria-label="Select theme"
        >
          <span className="student-theme-trigger__icon">
            <Palette className="h-4 w-4" />
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.22em] text-[var(--student-text-muted)]">
              Theme
            </span>
            <span className="block truncate text-sm font-bold text-[var(--student-text-strong)]">
              {resolvedTheme.label}
            </span>
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-[var(--student-text-muted)] transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(22rem,calc(100vw-1.5rem))] border-[var(--student-outline)] bg-[var(--student-elevated)] p-0 text-[var(--student-text-strong)] shadow-[var(--student-shadow-hover)]"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {open ? (
            <motion.div
              key="theme-panel"
              initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? {} : { opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="space-y-4 p-4"
            >
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--student-accent)]">
                  Student Theme
                </p>
                <h3 className="text-base font-black text-[var(--student-text-strong)]">
                  Shift the mood of your workspace
                </h3>
                <p className="text-sm text-[var(--student-text-muted)]">
                  The selected theme stays on this browser until you change it again.
                </p>
              </div>

              <LayoutGroup id="student-theme-options">
                <div className="space-y-2">
                  {themes.map((option) => {
                    const isActive = option.id === theme;

                    return (
                      <motion.button
                        key={option.id}
                        type="button"
                        layout
                        onClick={() => {
                          setTheme(option.id);
                          setOpen(false);
                        }}
                        whileHover={reduceMotion ? undefined : { y: -1 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                        className={cn(
                          'relative flex w-full items-center gap-3 overflow-hidden rounded-[1.25rem] border px-3 py-3 text-left transition-colors',
                          isActive
                            ? 'border-[var(--student-accent)] bg-[var(--student-accent-soft)]'
                            : 'border-[var(--student-outline)] bg-[var(--student-surface)] hover:border-[var(--student-accent-soft-strong)] hover:bg-[var(--student-surface-soft)]',
                        )}
                      >
                        {isActive ? (
                          <motion.span
                            layoutId="student-theme-active"
                            className="absolute inset-0 rounded-[1.25rem] border border-[var(--student-accent)]"
                          />
                        ) : null}

                        <span className="relative flex gap-1">
                          {option.preview.map((swatch) => (
                            <span
                              key={swatch}
                              className="h-8 w-4 rounded-full border border-white/20 shadow-sm"
                              style={{ background: swatch }}
                            />
                          ))}
                        </span>

                        <span className="relative min-w-0 flex-1">
                          <span className="block text-sm font-black text-[var(--student-text-strong)]">
                            {option.label}
                          </span>
                          <span className="block text-xs leading-5 text-[var(--student-text-muted)]">
                            {option.description}
                          </span>
                        </span>

                        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[var(--student-elevated)] text-[var(--student-accent)]">
                          {isActive ? <Check className="h-4 w-4" /> : <Palette className="h-4 w-4" />}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </LayoutGroup>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
