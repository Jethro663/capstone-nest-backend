import type { Variants } from 'framer-motion';

export const containerReveal: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.03,
    },
  },
};

export const itemReveal: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.26, ease: 'easeOut' },
  },
};

export function getMotionProps(reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      container: {},
      item: {},
      interactive: {},
    };
  }

  return {
    container: {
      variants: containerReveal,
      initial: 'hidden' as const,
      animate: 'visible' as const,
    },
    item: { variants: itemReveal },
    interactive: {
      whileHover: { y: -2, transition: { duration: 0.16 } },
      whileTap: { scale: 0.98 },
    },
  };
}
