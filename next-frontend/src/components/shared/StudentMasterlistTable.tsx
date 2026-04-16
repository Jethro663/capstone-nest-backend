'use client';

import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export type MasterlistSortField =
  | 'lastName'
  | 'firstName'
  | 'email'
  | 'gradeLevel'
  | 'lrn'
  | 'eligibility';
export type MasterlistSortDirection = 'asc' | 'desc';
export type MasterlistEligibilityFilter = 'all' | 'eligible' | 'mismatch';

export interface StudentMasterlistRow {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  lrn?: string | null;
  gradeLevel?: string | null;
  sectionName?: string | null;
  profilePicture?: string | null;
  isEligible: boolean;
  disabledReason?: string | null;
}

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.trim()?.charAt(0) || '';
  const last = lastName?.trim()?.charAt(0) || '';
  return `${first}${last}`.toUpperCase() || 'ST';
}

type FilterOption = { value: string; label: string };

export function StudentMasterlistTable({
  title,
  description,
  rows,
  loading,
  total,
  page,
  totalPages,
  selectedIds,
  searchValue,
  onSearchChange,
  eligibility,
  onEligibilityChange,
  gradeFilter,
  onGradeFilterChange,
  gradeOptions = [],
  sectionFilter,
  onSectionFilterChange,
  sectionOptions = [],
  sortBy,
  sortDirection,
  onSortByChange,
  onSortDirectionChange,
  onToggleRow,
  onSelectAllEligible,
  onClearSelection,
  onPageChange,
  onOpenProfile,
}: {
  title: string;
  description: string;
  rows: StudentMasterlistRow[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  selectedIds: string[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  eligibility: MasterlistEligibilityFilter;
  onEligibilityChange: (value: MasterlistEligibilityFilter) => void;
  gradeFilter?: string;
  onGradeFilterChange?: (value: string) => void;
  gradeOptions?: FilterOption[];
  sectionFilter?: string;
  onSectionFilterChange?: (value: string) => void;
  sectionOptions?: FilterOption[];
  sortBy: MasterlistSortField;
  sortDirection: MasterlistSortDirection;
  onSortByChange: (field: MasterlistSortField) => void;
  onSortDirectionChange: (direction: MasterlistSortDirection) => void;
  onToggleRow: (rowId: string) => void;
  onSelectAllEligible: () => void;
  onClearSelection: () => void;
  onPageChange: (nextPage: number) => void;
  onOpenProfile?: (rowId: string) => void;
}) {
  const selectedEligibleCount = rows.filter((row) => selectedIds.includes(row.id) && row.isEligible).length;

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--teacher-outline)] bg-white p-4">
      <div className="space-y-1">
        <h3 className="text-base font-black text-[var(--teacher-text-strong)]">{title}</h3>
        <p className="text-sm text-[var(--teacher-text-muted)]">{description}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--teacher-text-muted)]" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, email, or LRN"
            className="teacher-input pl-10"
          />
        </div>

        <select
          value={eligibility}
          onChange={(event) => onEligibilityChange(event.target.value as MasterlistEligibilityFilter)}
          className="teacher-input h-10 rounded-xl"
        >
          <option value="all">All eligibility</option>
          <option value="eligible">Eligible only</option>
          <option value="mismatch">Mismatches only</option>
        </select>

        <select
          value={gradeFilter || ''}
          onChange={(event) => onGradeFilterChange?.(event.target.value)}
          className="teacher-input h-10 rounded-xl"
          disabled={!onGradeFilterChange}
        >
          <option value="">All grade levels</option>
          {gradeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select
          value={sectionFilter || ''}
          onChange={(event) => onSectionFilterChange?.(event.target.value)}
          className="teacher-input h-10 rounded-xl"
          disabled={!onSectionFilterChange}
        >
          <option value="">All sections</option>
          {sectionOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full px-3 py-1 font-semibold">{total} total</Badge>
        <Badge className="rounded-full bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-600">
          {selectedEligibleCount} selected
        </Badge>
        <Button variant="outline" size="sm" onClick={onSelectAllEligible}>Select Eligible on Page</Button>
        <Button variant="outline" size="sm" onClick={onClearSelection}>Clear Selection</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--teacher-outline)]">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--teacher-surface-soft)]">
            <tr className="border-b border-[var(--teacher-outline)] text-left">
              <th className="px-3 py-2">Select</th>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">
                <button type="button" className="inline-flex items-center gap-1 font-semibold" onClick={() => onSortByChange('lrn')}>
                  LRN <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" className="inline-flex items-center gap-1 font-semibold" onClick={() => onSortByChange('gradeLevel')}>
                  Grade <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="px-3 py-2">Section</th>
              <th className="px-3 py-2">
                <button type="button" className="inline-flex items-center gap-1 font-semibold" onClick={() => onSortByChange('eligibility')}>
                  Eligibility <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="px-3 py-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-semibold"
                  onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
                >
                  Order ({sortDirection.toUpperCase()}) <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="border-b border-[var(--teacher-outline)]">
                  <td colSpan={7} className="px-3 py-2"><Skeleton className="h-10 w-full rounded-lg" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-[var(--teacher-text-muted)]">
                  No students found for current filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const selected = selectedIds.includes(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-[var(--teacher-outline)] ${selected ? 'bg-red-50/60' : 'bg-white'} ${!row.isEligible ? 'opacity-70' : ''}`}
                  >
                    <td className="px-3 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!row.isEligible}
                        onChange={() => onToggleRow(row.id)}
                        className="mt-2 h-4 w-4"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 border border-[var(--teacher-outline)]">
                          {row.profilePicture ? <AvatarImage src={row.profilePicture} alt={`${row.firstName || ''} ${row.lastName || ''}`.trim()} /> : null}
                          <AvatarFallback>{getInitials(row.firstName, row.lastName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          {onOpenProfile ? (
                            <button
                              type="button"
                              onClick={() => onOpenProfile(row.id)}
                              className="font-semibold text-[var(--teacher-text-strong)] hover:underline"
                            >
                              {row.firstName} {row.lastName}
                            </button>
                          ) : (
                            <p className="font-semibold text-[var(--teacher-text-strong)]">{row.firstName} {row.lastName}</p>
                          )}
                          <p className="text-xs text-[var(--teacher-text-muted)]">{row.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">{row.lrn || '--'}</td>
                    <td className="px-3 py-2">{row.gradeLevel ? `Grade ${row.gradeLevel}` : '--'}</td>
                    <td className="px-3 py-2">{row.sectionName || '--'}</td>
                    <td className="px-3 py-2">
                      {row.isEligible ? (
                        <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Available</Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-full px-3 py-1">{row.disabledReason || 'Not eligible'}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-[var(--teacher-text-muted)]">{sortBy}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--teacher-text-muted)]">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
