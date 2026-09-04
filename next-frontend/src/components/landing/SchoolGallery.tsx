'use client';

import Image from 'next/image';
import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { SchoolPhoto } from './school-content';

type SchoolGalleryProps = {
  photos: readonly SchoolPhoto[];
};

export function SchoolGallery({ photos }: SchoolGalleryProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const shouldReduceMotion = useReducedMotion();

  if (photos.length === 0) {
    return null;
  }

  const selectedPhoto = photos[selectedIndex] ?? photos[0];
  const showPrevious = () => {
    setSelectedIndex((index) => (index === 0 ? photos.length - 1 : index - 1));
  };
  const showNext = () => {
    setSelectedIndex((index) => (index === photos.length - 1 ? 0 : index + 1));
  };

  return (
    <div className="landing-gallery" aria-label="GABHS school photo explorer">
      <div className="landing-gallery__stage">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="landing-gallery__enlarge"
              aria-label="Enlarge selected photograph"
            >
              <AnimatePresence initial={false}>
                <motion.span
                  key={selectedPhoto.src}
                  className="landing-gallery__stage-frame"
                  data-gallery-photo={selectedPhoto.src}
                  initial={shouldReduceMotion ? false : { opacity: 0, scale: 1.012 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.996 }}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 0.36,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Image
                    src={selectedPhoto.src}
                    alt={selectedPhoto.alt}
                    fill
                    sizes="(min-width: 1280px) 76rem, (min-width: 768px) calc(100vw - 6rem), calc(100vw - 2rem)"
                    className="landing-gallery__stage-image"
                  />
                </motion.span>
              </AnimatePresence>
              <span className="landing-gallery__expand-label" aria-hidden="true">
                <Expand className="h-4 w-4" />
                View larger
              </span>
            </button>
          </DialogTrigger>
          <DialogContent className="landing-gallery__dialog max-w-5xl border-none bg-[#120b0c] p-3 text-white sm:rounded-xl sm:p-5">
            <DialogTitle className="sr-only">School photograph</DialogTitle>
            <div className="landing-gallery__dialog-image">
              <Image
                src={selectedPhoto.src}
                alt={selectedPhoto.alt}
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
            <DialogDescription className="px-1 pb-1 text-sm leading-6 text-white/80">
              {selectedPhoto.caption}
            </DialogDescription>
          </DialogContent>
        </Dialog>

        <button
          type="button"
          className="landing-gallery__arrow landing-gallery__arrow--previous"
          aria-label="Previous photograph"
          onClick={showPrevious}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="landing-gallery__arrow landing-gallery__arrow--next"
          aria-label="Next photograph"
          onClick={showNext}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="landing-gallery__caption" aria-live="polite">
        <p>{selectedPhoto.caption}</p>
        <span>
          {String(selectedIndex + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
        </span>
      </div>

      <div className="landing-gallery__thumbnails" aria-label="Choose a school photograph">
        {photos.map((photo, index) => (
          <button
            key={photo.src}
            type="button"
            className="landing-gallery__thumbnail"
            aria-label={`View photograph ${index + 1}: ${photo.alt}`}
            aria-pressed={index === selectedIndex}
            onClick={() => setSelectedIndex(index)}
          >
            <Image
              src={photo.src}
              alt=""
              fill
              sizes="(min-width: 768px) 8rem, 5.5rem"
              className="object-cover"
            />
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
