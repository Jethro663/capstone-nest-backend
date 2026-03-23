'use client';

import { AlertTriangle, ShieldAlert, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/utils/cn';

export type ConfirmationTone = 'default' | 'danger';

export interface ConfirmationDialogConfig {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmationTone;
  details?: ReactNode;
  onConfirm: () => Promise<void> | void;
}

interface ConfirmationDialogProps {
  config: ConfirmationDialogConfig | null;
  onClose: () => void;
}

const toneIconMap = {
  default: ShieldAlert,
  danger: Trash2,
} satisfies Record<ConfirmationTone, typeof AlertTriangle>;

export function ConfirmationDialog({ config, onClose }: ConfirmationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!config) {
      setIsSubmitting(false);
    }
  }, [config]);

  if (!config) {
    return null;
  }

  const tone = config.tone ?? 'default';
  const Icon = toneIconMap[tone];

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await config.onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="confirmation-dialog sm:max-w-xl">
        <div className="confirmation-dialog__glow" aria-hidden="true" />
        <DialogHeader className="confirmation-dialog__header">
          <div
            className={cn(
              'confirmation-dialog__icon',
              tone === 'danger' && 'confirmation-dialog__icon--danger',
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-black tracking-tight text-[var(--student-text-strong)]">
              {config.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[var(--student-text-muted)]">
              {config.description}
            </DialogDescription>
          </div>
        </DialogHeader>

        {config.details ? (
          <div className="confirmation-dialog__details">{config.details}</div>
        ) : null}

        <DialogFooter className="gap-3 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="confirmation-dialog__cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {config.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            type="button"
            className={cn(
              'confirmation-dialog__confirm',
              tone === 'danger' && 'confirmation-dialog__confirm--danger',
            )}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Working...' : config.confirmLabel ?? 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
