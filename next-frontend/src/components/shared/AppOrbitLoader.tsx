'use client';

import { BookOpen, type LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { type LoaderVariant } from '@/utils/loader-variant';

export interface AppOrbitLoaderProps {
  variant?: LoaderVariant;
  message?: string;
  icon?: LucideIcon;
  fullScreen?: boolean;
}

const CALM_DEFAULT_MESSAGE = 'Loading your portal...';
const STUDENT_DEFAULT_MESSAGE = 'Wait a minute!';

export function AppOrbitLoader({
  variant = 'calm',
  message,
  icon,
  fullScreen = true,
}: AppOrbitLoaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const OrbitIcon = icon ?? (variant === 'student' ? BookOpen : null);
  const copy =
    message ??
    (variant === 'student' ? STUDENT_DEFAULT_MESSAGE : CALM_DEFAULT_MESSAGE);

  return (
    <div
      className={`orbit-loader ${fullScreen ? 'orbit-loader--fullscreen' : ''} orbit-loader--${variant}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="app-orbit-loader"
    >
      <div className="orbit-loader__backdrop" aria-hidden="true" />
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
            <div className="orbit-loader__ring orbit-loader__ring--inner orbit-loader__ring--still">
              <div className="orbit-loader__orb orbit-loader__orb--inner" data-testid="orbit-ring-b" />
            </div>
          </div>
        ) : (
          <motion.div
            className="orbit-loader__system"
            initial={false}
            animate={{ rotate: 360 }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
            aria-hidden="true"
          >
            <div className="orbit-loader__well" />

            <motion.div
              className="orbit-loader__ring orbit-loader__ring--outer"
              initial={false}
              animate={{ rotate: 360 }}
              transition={{ duration: 2.1, repeat: Infinity, ease: 'linear' }}
            >
              <div className="orbit-loader__orb orbit-loader__orb--outer" data-testid="orbit-ring-a">
                {OrbitIcon ? (
                  <OrbitIcon className="orbit-loader__icon" data-testid="orbit-loader-icon" />
                ) : null}
              </div>
            </motion.div>

            <motion.div
              className="orbit-loader__ring orbit-loader__ring--inner"
              initial={false}
              animate={{ rotate: -360 }}
              transition={{ duration: 1.65, repeat: Infinity, ease: 'linear' }}
            >
              <div className="orbit-loader__orb orbit-loader__orb--inner" data-testid="orbit-ring-b" />
            </motion.div>
          </motion.div>
        )}

        <p className="orbit-loader__message">{copy}</p>
      </div>
    </div>
  );
}
