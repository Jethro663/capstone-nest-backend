'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { AdminPageShell, AdminSectionCard, AdminStatCard } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { academicStateService } from '@/services/academic-state-service';
import type { AcademicStateCurrent, AcademicStateImpactPreview } from '@/types/academic-state';

function deriveSchoolYearChoices(current: string) {
  const match = current.match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    const now = new Date().getFullYear();
    return [`${now - 1}-${now}`, `${now}-${now + 1}`, `${now + 1}-${now + 2}`];
  }

  const start = Number(match[1]);
  return [start - 1, start, start + 1, start + 2].map(
    (year) => `${year}-${year + 1}`,
  );
}

export default function AdminSystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshingPreview, setRefreshingPreview] = useState(false);
  const [submittingTransition, setSubmittingTransition] = useState(false);
  const [currentState, setCurrentState] = useState<AcademicStateCurrent | null>(null);
  const [targetSchoolYear, setTargetSchoolYear] = useState('');
  const [preview, setPreview] = useState<AcademicStateImpactPreview | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transitionStep, setTransitionStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');

  const [notifyingTeachers, setNotifyingTeachers] = useState(false);

  const handleNotifyTeachers = async () => {
    try {
      setNotifyingTeachers(true);
      const res = await academicStateService.notifyTeachers();
      toast.success(res.data.message || 'Teachers notified successfully');
    } catch {
      toast.error('Failed to dispatch teacher notifications');
    } finally {
      setNotifyingTeachers(false);
    }
  };

  const schoolYearOptions = useMemo(
    () => deriveSchoolYearChoices(currentState?.schoolYear ?? ''),
    [currentState?.schoolYear],
  );

  const promotionReadiness = preview?.impact.promotionReadiness ?? null;
  const transitionBlocked = Boolean(promotionReadiness?.transitionBlocked);
  const loadCurrentState = useCallback(async () => {
    const response = await academicStateService.getCurrent();
    const current = response.data;
    setCurrentState(current);
    setTargetSchoolYear((prev) => prev || current.schoolYear);
  }, []);

  const loadImpactPreview = useCallback(async (schoolYear: string) => {
    setRefreshingPreview(true);
    try {
      const response = await academicStateService.getImpactPreview({
        schoolYear,
      });
      setPreview(response.data);
    } catch {
      toast.error('Failed to compute transition impact preview');
      setPreview(null);
    } finally {
      setRefreshingPreview(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadCurrentState();
      } catch {
        toast.error('Failed to load academic system state');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [loadCurrentState]);

  useEffect(() => {
    if (!targetSchoolYear) return;
    void loadImpactPreview(targetSchoolYear);
  }, [loadImpactPreview, targetSchoolYear]);

  const openTransitionDialog = () => {
    if (!preview) {
      toast.error('Impact preview is not ready yet. Try again in a moment.');
      return;
    }
    if (transitionBlocked) {
      toast.error(
        promotionReadiness?.message ??
          'Resolve active student finalization, promotion, and retention first.',
      );
      return;
    }

    setTransitionStep(1);
    setCurrentPassword('');
    setConfirmationText('');
    setDialogOpen(true);
  };

  const runTransition = async () => {
    if (!currentState || !preview) return;
    if (!currentPassword.trim()) {
      toast.error('Enter your password to continue.');
      return;
    }
    if (confirmationText !== preview.transitionConfirmationText) {
      toast.error('Confirmation text does not match.');
      return;
    }
    if (transitionBlocked) {
      toast.error(
        promotionReadiness?.message ??
          'Resolve active student finalization, promotion, and retention first.',
      );
      return;
    }

    try {
      setSubmittingTransition(true);
      const response = await academicStateService.transition({
        schoolYear: targetSchoolYear,
        currentPassword,
        confirmationText,
      });
      setCurrentState(response.data.state);
      await loadImpactPreview(targetSchoolYear);
      toast.success(
        `Academic state updated. Archived ${response.data.impact.sectionsArchived} sections and ${response.data.impact.classesArchived} classes, then created ${response.data.impact.reusableSectionsCreated} reusable sections and ${response.data.impact.reusableClassesCreated} reusable classes.`,
      );
      setDialogOpen(false);
    } catch {
      toast.error('Failed to transition academic state');
    } finally {
      setSubmittingTransition(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-[1.25rem]" />
        <Skeleton className="h-80 rounded-[1.25rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      title="System Settings"
      description="Set the active school year for the whole LMS with a guarded transition flow."
      stats={(
        <>
          <AdminStatCard
            label="Active School Year"
            value={currentState?.schoolYear ?? '--'}
            caption="System-wide default context"
            icon={CalendarClock}
            accent="sky"
          />
          <AdminStatCard
            label="Active Quarter"
            value={currentState?.quarter ?? '--'}
            caption="Informational only"
            icon={ArrowRightLeft}
            accent="emerald"
          />
        </>
      )}
    >
      <AdminSectionCard
        title="Academic State"
        description="Preview impact before transitioning. This requires a second confirmation and admin password."
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={handleNotifyTeachers}
              disabled={notifyingTeachers}
              className="rounded-xl font-bold border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
            >
              {notifyingTeachers ? 'Notifying...' : 'Notify Teachers to Finalize Grades'}
            </Button>
            <Button
              onClick={openTransitionDialog}
              className="admin-button-solid rounded-xl font-black"
              disabled={refreshingPreview || !preview || transitionBlocked}
            >
              Transition State
            </Button>
          </div>
        )}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-black text-[var(--admin-text-strong)]">Target School Year</span>
            <select
              value={targetSchoolYear}
              onChange={(event) => setTargetSchoolYear(event.target.value)}
              className="admin-input h-11 w-full rounded-xl"
            >
              {schoolYearOptions.map((schoolYear) => (
                <option key={schoolYear} value={schoolYear}>
                  {schoolYear}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2 rounded-xl border border-[var(--admin-outline)] bg-[var(--admin-surface-soft)] p-3">
            <p className="text-sm font-black text-[var(--admin-text-strong)]">Impact Preview</p>
            {refreshingPreview ? (
              <p className="text-xs text-[var(--admin-text-muted)]">Calculating transition impact...</p>
            ) : preview ? (
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p className="text-[var(--admin-text-muted)]">
                  Draft records to finalize: <strong>{preview.impact.classRecordsToFinalize}</strong>
                </p>
                <p className="text-[var(--admin-text-muted)]">
                  Active enrollments to complete: <strong>{preview.impact.enrollmentsToComplete}</strong>
                </p>
                <p className="text-[var(--admin-text-muted)]">
                  Classes to archive: <strong>{preview.impact.classesToArchive}</strong>
                </p>
                <p className="text-[var(--admin-text-muted)]">
                  Sections to archive: <strong>{preview.impact.sectionsToArchive}</strong>
                </p>
                <p className="text-[var(--admin-text-muted)]">
                  Reusable classes to create: <strong>{preview.impact.reusableClassesToCreate}</strong>
                </p>
                <p className="text-[var(--admin-text-muted)]">
                  Reusable sections to create: <strong>{preview.impact.reusableSectionsToCreate}</strong>
                </p>
                <p className="text-[var(--admin-text-muted)] sm:col-span-2">
                  School events to archive: <strong>{preview.impact.schoolEventsToArchive}</strong>
                </p>
                <div className={`sm:col-span-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                  preview.impact.promotionReadiness.transitionBlocked
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}>
                  {preview.impact.promotionReadiness.transitionBlocked
                    ? preview.impact.promotionReadiness.message
                    : 'No active students are blocking the transition.'}
                  {preview.impact.promotionReadiness.studentsMissingFinalizedGrades > 0 ? (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-red-200 pt-2">
                      <span className="block text-xs font-bold text-red-800">
                        {preview.impact.promotionReadiness.studentsMissingFinalizedGrades} active student(s) still need finalized grades before transitioning.
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleNotifyTeachers}
                        disabled={notifyingTeachers}
                        className="rounded-lg font-black bg-amber-600 text-white hover:bg-amber-700"
                      >
                        {notifyingTeachers ? 'Sending Notifications...' : 'Notify Unfinalized Teachers'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--admin-text-muted)]">Unable to load impact preview.</p>
            )}
          </div>
        </div>
      </AdminSectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Academic State Transition</DialogTitle>
            <DialogDescription>
              This archives the old school year, clears active assignments and schedules, then creates reusable classes and sections for the target year while keeping learning content.
            </DialogDescription>
          </DialogHeader>

          {transitionStep === 1 ? (
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
                <div className="space-y-1 text-sm text-amber-900">
                  <p>Current School Year: {preview?.current.schoolYear}</p>
                  <p>Target School Year: {targetSchoolYear}</p>
                  <p>Current Quarter: {preview?.current.quarter}</p>
                  <p>
                    {preview?.impact.classRecordsToFinalize ?? 0} draft class records will be finalized.
                  </p>
                  <p>
                    {preview?.impact.enrollmentsToComplete ?? 0} active student enrollments will be marked completed so students can be reassigned.
                  </p>
                  <p>
                    {preview?.impact.sectionsToArchive ?? 0} sections and {preview?.impact.classesToArchive ?? 0} classes will be archived.
                  </p>
                  <p>
                    {preview?.impact.reusableSectionsToCreate ?? 0} reusable sections and {preview?.impact.reusableClassesToCreate ?? 0} reusable classes will be created for {targetSchoolYear}.
                  </p>
                  <p>
                    Class rooms and content are retained, but every new class schedule starts blank for fresh editing.
                  </p>
                  <p>
                    {preview?.impact.schoolEventsToArchive ?? 0} school events will be archived.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-black">Admin Password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Re-enter your password"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black">Confirmation Text</Label>
                <Input
                  value={confirmationText}
                  onChange={(event) => setConfirmationText(event.target.value)}
                  placeholder={preview?.transitionConfirmationText ?? ''}
                />
                <p className="text-xs text-[var(--admin-text-muted)]">
                  Type exactly: {preview?.transitionConfirmationText ?? ''}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {transitionStep === 1 ? (
              <Button
                className="rounded-xl bg-red-600 font-black text-white hover:bg-red-700"
                onClick={() => setTransitionStep(2)}
              >
                Continue
              </Button>
            ) : (
              <Button
                className="rounded-xl bg-red-600 font-black text-white hover:bg-red-700 disabled:bg-red-300 disabled:text-white"
                onClick={() => void runTransition()}
                disabled={
                  submittingTransition ||
                  transitionBlocked ||
                  !currentPassword.trim() ||
                  confirmationText !== (preview?.transitionConfirmationText ?? '')
                }
              >
                {submittingTransition ? 'Applying...' : 'Confirm Transition'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
