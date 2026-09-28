'use client';

import { Filter } from 'lucide-react';

import { cn } from '@/utils/cn';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

export type TableFilterRole = 'student' | 'teacher' | 'admin';

export interface TableFilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface TableFilterSelectProps {
  ariaLabel: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly TableFilterOption[];
  role: TableFilterRole;
  className?: string;
  disabled?: boolean;
}

export function TableFilterSelect({
  ariaLabel,
  value,
  onValueChange,
  options,
  role,
  className,
  disabled,
}: TableFilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        aria-label={ariaLabel}
        variant={role}
        data-filter-role={role}
        className={cn('table-filter-select', className)}
      >
        <span className="table-filter-select__value">
          <Filter
            className="table-filter-select__icon"
            data-testid="table-filter-icon"
            aria-hidden="true"
          />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent
        className={cn(
          'table-filter-select__content',
          `table-filter-select__content--${role}`,
        )}
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
