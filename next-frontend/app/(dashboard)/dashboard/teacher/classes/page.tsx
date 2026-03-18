'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Palette } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { ClassCard } from '@/components/class/ClassCard';
import {
  CLASS_CARD_PRESETS,
  getClassCardPreset,
} from '@/components/class/class-card-presets';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { ClassItem } from '@/types/class';

function formatTime(time?: string) {
  if (!time) return '';
  const [hourRaw, minuteRaw] = time.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;

  const period = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${String(minute).padStart(2, '0')} ${period}`;
}

function formatDays(days?: string[]) {
  if (!days?.length) return 'TBA';
  return days.join('/');
}

function formatScheduleLine(schedule?: { days?: string[]; startTime?: string; endTime?: string }) {
  if (!schedule) return 'TBA';
  const days = formatDays(schedule.days);
  const start = formatTime(schedule.startTime);
  const end = formatTime(schedule.endTime);
  return start && end ? `${days} • ${start}-${end}` : days;
}

export default function TeacherClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [selectedPreset, setSelectedPreset] = useState('aurora');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [savingPresentation, setSavingPresentation] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await classService.getByTeacher(user.id);
      setClasses(res.data || []);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (editingClass) {
      setSelectedPreset(editingClass.cardPreset || 'aurora');
    }
  }, [editingClass]);

  const syncClass = (updated: ClassItem) => {
    setClasses((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
    setEditingClass(updated);
  };

  const handleSavePresentation = async () => {
    if (!editingClass) return;
    try {
      setSavingPresentation(true);
      const res = await classService.updatePresentation(editingClass.id, {
        cardPreset: selectedPreset,
      });
      syncClass(res.data);
      toast.success('Class card updated');
    } catch {
      toast.error('Failed to update class card');
    } finally {
      setSavingPresentation(false);
    }
  };

  const handleBannerUpload = async (file: File) => {
    if (!editingClass) return;
    try {
      setUploadingBanner(true);
      const res = await classService.uploadBanner(editingClass.id, file);
      syncClass(res.data.class);
      toast.success('Banner uploaded');
    } catch {
      toast.error('Failed to upload class banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    if (!editingClass) return;
    try {
      setSavingPresentation(true);
      const res = await classService.updatePresentation(editingClass.id, {
        cardPreset: selectedPreset,
        cardBannerUrl: null,
      });
      syncClass(res.data);
      toast.success('Custom banner removed');
    } catch {
      toast.error('Failed to remove custom banner');
    } finally {
      setSavingPresentation(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-[1.5rem]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Classes</h1>
        <p className="text-muted-foreground">Manage your assigned classes and customize each class card.</p>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium">No classes assigned</p>
            <p className="text-sm text-muted-foreground">Contact your administrator to get classes assigned.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/dashboard/teacher/classes/${cls.id}`}>
              <ClassCard
                classItem={cls}
                subtitle={`${cls.section?.name || 'Standard Section'} • Grade ${cls.section?.gradeLevel || cls.subjectGradeLevel || 'TBA'}`}
                meta={[
                  `${cls.enrollments?.length ?? 0} students`,
                  cls.room ? `Room ${cls.room}` : 'Room TBA',
                ]}
                action={
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    onClick={(event) => {
                      event.preventDefault();
                      setEditingClass(cls);
                    }}
                  >
                    <Palette className="mr-1 h-4 w-4" /> Customize
                  </Button>
                }
                footer={
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {(cls.schedules?.length ?? 0) === 0 ? (
                      <p className="font-medium">Schedule: TBA</p>
                    ) : (
                      <>
                        {(cls.schedules ?? []).slice(0, 2).map((schedule) => (
                          <p key={schedule.id} className="font-medium truncate">
                            {formatScheduleLine(schedule)}
                          </p>
                        ))}
                        {(cls.schedules?.length ?? 0) > 2 && (
                          <p className="text-[11px] text-muted-foreground">+{(cls.schedules?.length ?? 0) - 2} more schedule(s)</p>
                        )}
                      </>
                    )}
                  </div>
                }
              />
            </Link>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editingClass)} onOpenChange={(open) => !open && setEditingClass(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Customize Class Card</DialogTitle>
          </DialogHeader>

          {editingClass ? (
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Preview</p>
                <ClassCard
                  classItem={{ ...editingClass, cardPreset: selectedPreset }}
                  subtitle={`${editingClass.section?.name || 'Standard Section'} • Grade ${editingClass.section?.gradeLevel || editingClass.subjectGradeLevel || 'TBA'}`}
                  meta={[
                    `${editingClass.enrollments?.length ?? 0} students`,
                    editingClass.room ? `Room ${editingClass.room}` : 'Room TBA',
                  ]}
                  footer={<p className="text-xs text-muted-foreground">Changes here apply to both teacher and student dashboards.</p>}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Preset</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CLASS_CARD_PRESETS.map((preset) => {
                      const active = preset.id === selectedPreset;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedPreset(preset.id)}
                          className={`rounded-xl border p-3 text-left transition ${active ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-400'}`}
                        >
                          <div className={`h-12 rounded-lg ${preset.bannerClass}`} />
                          <p className="mt-2 text-sm font-semibold">{preset.label}</p>
                        </button>
                      );
                    })}
                  </div>
                  <Button onClick={handleSavePresentation} disabled={savingPresentation}>
                    {savingPresentation ? 'Saving...' : 'Save preset'}
                  </Button>
                </div>

                <div className="space-y-2 rounded-2xl border p-4">
                  <p className="text-sm font-medium">Custom banner</p>
                  <p className="text-xs text-muted-foreground">
                    Upload a header image to override the preset banner background.
                  </p>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
                    <Palette className="h-4 w-4" />
                    {uploadingBanner ? 'Uploading...' : 'Upload banner'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleBannerUpload(file);
                        event.target.value = '';
                      }}
                    />
                  </label>
                  {editingClass.cardBannerUrl ? (
                    <Button variant="outline" onClick={handleRemoveBanner} disabled={savingPresentation}>
                      Remove custom banner
                    </Button>
                  ) : null}
                </div>

                <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
                  Active preset: <span className="font-semibold text-slate-900">{getClassCardPreset(selectedPreset).label}</span>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
