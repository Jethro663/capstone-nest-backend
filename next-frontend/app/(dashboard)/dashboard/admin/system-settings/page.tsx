'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, CalendarClock, ShieldCheck } from 'lucide-react';
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

  const schoolYearOptions = useMemo(
    () => deriveSchoolYearChoices(currentState?.schoolYear ?? ''),
    [currentState?.schoolYear],
  );

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
        `Academic state updated. ${response.data.impact.classRecordsFinalized} class records finalized, ${response.data.impact.schoolEventsArchived} events archived.`,
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
      badge="Admin Settings"
      title="System Settings"
      description="Set the active school year for the whole LMS with a guarded transition flow."
      icon={ShieldCheck}
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
          <Button
            onClick={openTransitionDialog}
            className="admin-button-solid rounded-xl font-black"
            disabled={refreshingPreview || !preview}
          >
            Transition State
          </Button>
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
              <div className="space-y-1 text-sm">
                <p className="text-[var(--admin-text-muted)]">
                  Class records to finalize: <strong>{preview.impact.classRecordsToFinalize}</strong>
                </p>
                <p className="text-[var(--admin-text-muted)]">
                  School events to archive: <strong>{preview.impact.schoolEventsToArchive}</strong>
                </p>
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
              This action affects class records and school events system-wide.
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
                className="admin-button-solid rounded-xl font-black"
                onClick={() => void runTransition()}
                disabled={submittingTransition}
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
