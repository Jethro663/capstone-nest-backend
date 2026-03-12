'use client';

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, Palette, Sparkles, Star, Sun, Moon, Droplet, CandyCane, Sparkle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTheme } from '@/providers/ThemeProvider';
import { cn } from '@/utils/cn';
import type { ThemeId } from '@/lib/themes';

// CSS for infinite animations (much better performance than Framer Motion)
const animationStyles = `
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes pulse-scale {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.2); opacity: 1; }
  }
  @keyframes float-dot {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-2px); }
  }
  @keyframes shimmer {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }
  .animate-spin-slow { animation: spin-slow 2s linear infinite; }
  .animate-pulse-scale { animation: pulse-scale 2s ease-in-out infinite; }
  .animate-float-dot { animation: float-dot 1.5s ease-in-out infinite; }
  .animate-shimmer { animation: shimmer 2s ease-in-out infinite; }
`;

// Theme icons mapping
const themeIcons = {
  'nexora-red': Palette,
  'dark': Moon,
  'soft-ocean': Droplet,
  'dark-void': Star,
  'candy-land': CandyCane,
  'fairy-land': Sparkle,
  'sunset': Sun,
  'aurora-borealis': Sparkles,
  'stone-mountain': Star,
};

// Theme descriptions for students
const studentDescriptions = {
  'nexora-red': 'Your classic school colors - familiar and focused!',
  'dark': 'Night mode for late-night studying - easy on the eyes!',
  'soft-ocean': 'Calm blues to help you focus and relax!',
  'dark-void': 'Space explorer theme - out of this world!',
  'candy-land': 'Sweet and fun colors to make learning delicious!',
  'fairy-land': 'Magical sparkles to make studying enchanting!',
  'sunset': 'Warm sunset colors for cozy learning sessions!',
  'aurora-borealis': 'Dancing northern lights - mystical and inspiring!',
  'stone-mountain': 'Natural earth tones - grounded and peaceful!',
};

// Throttle function
function throttle(func: (...args: any[]) => void, limit: number) {
  let inThrottle: boolean;
  return function (this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Memoized confetti component
const ConfettiParticles = memo(function ConfettiParticles({ color }: { color: string }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            backgroundColor: color,
          }}
          initial={{ y: -10, opacity: 0 }}
          animate={{ 
            y: `calc(100vh + ${Math.random() * 100}px)`,
            opacity: [1, 0.8, 0],
            rotate: [0, 360],
            x: [0, (Math.random() - 0.5) * 200]
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            ease: 'easeOut',
            delay: i * 0.08
          }}
        />
      ))}
    </div>
  );
});

export function StudentThemeSwitcher() {
  const reduceMotion = useReducedMotion();
  const { theme, themes, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiColor, setConfettiColor] = useState('');

  // Throttled scroll handler - max 60fps
  const throttledScroll = useMemo(
    () => throttle(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      const max = scrollHeight - clientHeight;
      setScrollProgress(max > 0 ? scrollTop / max : 0);
    }, 16),
    []
  );

  const handleScroll = useCallback(() => {
    throttledScroll();
  }, [throttledScroll]);

  const handleThemeChange = useCallback((themeId: ThemeId) => {
    const selectedTheme = themes.find(t => t.id === themeId);
    if (selectedTheme && !reduceMotion) {
      setConfettiColor(selectedTheme.preview[1]);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
    setTheme(themeId);
    setOpen(false);
  }, [themes, setTheme, reduceMotion]);

  // Auto-scroll to active theme when opened
  useEffect(() => {
    if (open && scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.querySelector('[data-active="true"]');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [open]);

  return (
    <>
      <style>{animationStyles}</style>
      {showConfetti && <ConfettiParticles color={confettiColor} />}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="student-theme-trigger group relative overflow-hidden"
            aria-label="Select theme"
          >
            {/* Animated background for trigger */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--student-accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <span className="student-theme-trigger__icon relative z-10">
              <motion.div
                animate={open ? { rotate: 180, scale: 1.1 } : { rotate: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <Palette className="h-4 w-4" />
              </motion.div>
            </span>
            
            <span className="hidden min-w-0 text-left sm:block relative z-10">
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
                open && 'rotate-180 text-[var(--student-accent)]'
              )}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={12}
          className="w-[min(24rem,calc(100vw-1.5rem))] max-h-[70vh] border-[var(--student-outline)] bg-[var(--student-elevated)] p-0 text-[var(--student-text-strong)] shadow-[var(--student-shadow-hover)] backdrop-blur-xl"
        >
          <AnimatePresence initial={false} mode="wait">
            {open ? (
              <motion.div
                key="theme-panel"
                initial={reduceMotion ? false : { 
                  opacity: 0, 
                  y: 16, 
                  scale: 0.95,
                  rotateX: 10
                }}
                animate={reduceMotion ? {} : { 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  rotateX: 0
                }}
                exit={reduceMotion ? {} : { 
                  opacity: 0, 
                  y: -8, 
                  scale: 0.98,
                  rotateX: -5
                }}
                transition={{ 
                  duration: 0.35, 
                  ease: [0.34, 1.56, 0.64, 1],
                  rotateX: { duration: 0.4, ease: 'easeOut' }
                }}
                className="space-y-4 p-5"
              >
                {/* Header with sparkle effect */}
                <div className="relative">
                  <div className="absolute -top-2 -left-2 w-6 h-6 will-change-transform">
                    {!reduceMotion ? (
                      <div className="animate-spin-slow">
                        <Sparkles className="w-full h-full text-[var(--student-accent)]" />
                      </div>
                    ) : (
                      <Sparkles className="w-full h-full text-[var(--student-accent)]" />
                    )}
                  </div>
                  
                  <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--student-accent)] mb-1">
                    Choose Your Vibe
                  </p>
                  <h3 className="text-lg font-black text-[var(--student-text-strong)] mb-2">
                    Pick Your Theme
                  </h3>
                  <p className="text-sm text-[var(--student-text-muted)] leading-relaxed">
                    Make learning fun! Pick a theme that matches your mood and style. 
                    Your choice will be saved for next time.
                  </p>
                  
                  {/* Scroll progress indicator */}
                  <div className="mt-3">
                    <div className="h-1 bg-[var(--student-outline)] rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-[var(--student-accent)] rounded-full will-change-transform"
                        style={{ scaleX: scrollProgress, transformOrigin: 'left' }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>

                <LayoutGroup id="student-theme-options">
                  {/* Scrollable theme list */}
                  <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="max-h-[320px] overflow-y-auto space-y-3 pr-2 custom-scrollbar"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'var(--student-accent-soft) transparent'
                    }}
                  >
                    {themes.map((option, index) => {
                      const isActive = option.id === theme;
                      const IconComponent = themeIcons[option.id as keyof typeof themeIcons] || Palette;
                      const studentDesc = studentDescriptions[option.id as keyof typeof studentDescriptions] || option.description;

                      return (
                        <motion.button
                          key={option.id}
                          type="button"
                          layout
                          data-active={isActive}
                          onClick={() => handleThemeChange(option.id)}
                          whileHover={reduceMotion ? undefined : { 
                            y: -2,
                            scale: 1.02,
                            transition: { duration: 0.2 }
                          }}
                          whileTap={reduceMotion ? undefined : { 
                            scale: 0.98,
                            transition: { duration: 0.1 }
                          }}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ 
                            duration: 0.2, 
                            delay: Math.min(index * 0.03, 0.15),
                            ease: 'easeOut'
                          }}
                          className={cn(
                            'relative group flex w-full items-center gap-4 overflow-hidden rounded-2xl border-2 p-4 transition-all duration-300 hover:shadow-lg will-change-transform',
                            isActive
                              ? 'border-[var(--student-accent)] bg-[var(--student-accent-soft)] shadow-[var(--student-shadow-hover)] ring-2 ring-[var(--student-accent)]/20'
                              : 'border-[var(--student-outline)] bg-[var(--student-surface)] hover:border-[var(--student-accent-soft-strong)] hover:bg-[var(--student-surface-soft)]'
                          )}
                        >
                          {/* Active theme glow effect */}
                          {isActive && (
                            <motion.div
                              layoutId="student-theme-active"
                              className="absolute inset-0 rounded-2xl border-2 border-[var(--student-accent)] pointer-events-none"
                              initial={{ scale: 0.9 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.3, ease: 'easeOut' }}
                            />
                          )}

                          {/* Theme preview with animated gradient */}
                          <div className="relative flex-shrink-0 w-16 h-12 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg will-change-transform">
                            {/* Animated gradient overlay */}
                            {!reduceMotion && (
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-shimmer"
                                animate={{ x: [0, 5, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                              />
                            )}
                            
                            <div className="relative flex gap-1 p-1 h-full">
                              {option.preview.map((swatch, swatchIndex) => (
                                <motion.span
                                  key={swatch}
                                  className="flex-1 rounded-full shadow-sm will-change-transform"
                                  style={{ background: swatch }}
                                  initial={{ height: 0 }}
                                  animate={{ height: '100%' }}
                                  transition={{ duration: 0.4, delay: swatchIndex * 0.08 }}
                                />
                              ))}
                            </div>
                            
                            {/* Floating accent dot */}
                            {!reduceMotion && (
                              <div className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-float-dot will-change-transform" />
                            )}
                          </div>

                          {/* Theme info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <IconComponent className={cn(
                                "w-5 h-5 transition-colors duration-300",
                                isActive ? "text-[var(--student-accent)]" : "text-[var(--student-text-muted)] group-hover:text-[var(--student-accent)]"
                              )} />
                              <span className="text-base font-bold text-[var(--student-text-strong)]">
                                {option.label}
                              </span>
                              {isActive && (
                                <motion.span
                                  className="text-xs font-semibold text-[var(--student-accent)] bg-white/50 px-2 py-1 rounded-full"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  Active
                                </motion.span>
                              )}
                            </div>
                            <p className="text-sm text-[var(--student-text-muted)] leading-relaxed">
                              {studentDesc}
                            </p>
                          </div>

                          {/* Selection indicator */}
                          <motion.div
                            className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--student-elevated)] border-2 border-[var(--student-outline)] flex items-center justify-center transition-all duration-300 will-change-transform"
                            animate={{
                              scale: isActive ? 1.1 : 1,
                              borderColor: isActive ? 'var(--student-accent)' : 'var(--student-outline)',
                              backgroundColor: isActive ? 'var(--student-accent-soft)' : 'var(--student-elevated)'
                            }}
                          >
                            {isActive ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                              >
                                <Check className="w-5 h-5 text-[var(--student-accent)]" />
                              </motion.div>
                            ) : (
                              <Palette className="w-5 h-5 text-[var(--student-text-muted)] group-hover:text-[var(--student-accent)] transition-colors duration-300" />
                            )}
                          </motion.div>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Footer with fun message */}
                  <motion.div
                    className="pt-3 border-t border-[var(--student-outline)]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  >
                    <p className="text-xs text-[var(--student-text-muted)] text-center italic">
                      "Learning is more fun when it looks awesome! ✨"
                    </p>
                  </motion.div>
                </LayoutGroup>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </PopoverContent>
      </Popover>
    </>
  );
}
