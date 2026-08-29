'use client';

import { BookOpen, type LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { type LoaderVariant } from '@/utils/loader-variant';

export interface AppOrbitLoaderProps {
  variant?: LoaderVariant;
  message?: string;
  icon?: LucideIcon;
}

const CALM_DEFAULT_MESSAGE = 'Preparing your workspace…';
const STUDENT_DEFAULT_MESSAGE = 'Preparing your learning space…';

export function AppOrbitLoader({
  variant = 'calm',
  message,
  icon,
}: AppOrbitLoaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const OrbitIcon = icon ?? (variant === 'student' ? BookOpen : null);
  const copy =
    message ??
    (variant === 'student' ? STUDENT_DEFAULT_MESSAGE : CALM_DEFAULT_MESSAGE);

  return (
    <div
      className={`orbit-loader orbit-loader--${variant}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="app-orbit-loader"
    >
      <div className="orbit-loader__content">
        {prefersReducedMotion ? (
          <div
            className="orbit-loader__system orbit-loader__system--static"
            data-testid="orbit-static"
            aria-hidden="true"
          >
            <div className="orbit-loader__well" />
            <div className="orbit-loader__ring orbit-loader__ring--outer orbit-loader__ring--still">
              <div className="orbit-loader__orb orbit-loader__orb--outer" data-testid="orbit-ring-a">
                {OrbitIcon ? (
                  <OrbitIcon className="orbit-loader__icon" data-testid="orbit-loader-icon" />
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="orbit-loader__system" aria-hidden="true">
            <motion.div
              className="orbit-loader__well"
              animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.div
              className="orbit-loader__ring orbit-loader__ring--outer"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
            >
              <div className="orbit-loader__orb orbit-loader__orb--outer" data-testid="orbit-ring-a">
                {OrbitIcon ? (
                  <OrbitIcon className="orbit-loader__icon" data-testid="orbit-loader-icon" />
                ) : null}
              </div>
            </motion.div>
          </div>
        )}

        <p className="orbit-loader__message">{copy}</p>
      </div>
    </div>
  );
}
