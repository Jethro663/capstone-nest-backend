'use client';

import type { ReactElement, ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActionTooltipProps {
  label: ReactNode;
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function ActionTooltip({ label, children, side = 'top' }: ActionTooltipProps) {
  return (
    <TooltipProvider delayDuration={130}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side}>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

