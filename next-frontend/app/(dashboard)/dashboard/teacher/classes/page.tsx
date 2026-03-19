'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Palette, Presentation, School, Sparkles, Wand2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { ClassCard } from '@/components/class/ClassCard';
import {
  CLASS_CARD_PRESETS,
  getClassCardPreset,
} from '@/components/class/class-card-presets';
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { ClassItem, ClassVisibilityStatus } from '@/types/class';

const COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500'];

function getClassColor(code: string) {
  let hash = 0;
  for (let i = 0; i < (code || '').length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function formatScheduleLine(schedule: { days: string[]; startTime: string; endTime: string }) {
  return `${schedule.days.join('/')} ${schedule.startTime}-${schedule.endTime}`;
}

export default function TeacherClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ClassVisibilityStatus>('active');
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>(CLASS_CARD_PRESETS[0]?.id || 'aurora');
  const [savingPresentation, setSavingPresentation] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const response = await classService.getByTeacher(user.id, tab);
      setClasses(response.data || []);
 
    } catch {
      // Keep the page usable even if the class list fails once.
    } finally {
      setLoading(false);
    }
  }, [tab, user?.id]);

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
      const response = await classService.updatePresentation(editingClass.id, {
        cardPreset: selectedPreset,
      });
      syncClass(response.data);
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
      const response = await classService.uploadBanner(editingClass.id, file);
      syncClass(response.data.class);
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
      const response = await classService.updatePresentation(editingClass.id, {
        cardPreset: selectedPreset,
        cardBannerUrl: null,
      });
      syncClass(response.data);
      toast.success('Custom banner removed');
    } catch {
      toast.error('Failed to remove custom banner');
    } finally {
      setSavingPresentation(false);
    }
  };

  const totalStudents = useMemo(
    () => classes.reduce((sum, entry) => sum + (entry.enrollments?.length ?? 0), 0),
    [classes],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-32 rounded-[1.5rem]" />
          ))}
 
        </div>
        <Skeleton className="h-[28rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      badge="Teacher Classes"
      title="Classes That Feel Ready to Teach"
      description="Manage active, archived, and hidden classes in one livelier workspace, with class presentation controls and quicker visual scanning built into the same flow."
      actions={(
        <>
          <Link href="/dashboard/teacher">
            <Button variant="outline" className="teacher-button-outline rounded-xl px-4 font-black">
              Back to Dashboard
            </Button>
          </Link>
          <Button className="teacher-button-solid rounded-xl px-4 font-black" onClick={fetchData}>
            Refresh Classes
          </Button>
        </>
      )}
      stats={(
        <>
          <TeacherStatCard
            label="Visible Classes"
            value={classes.length}
            caption={tab === 'active' ? 'Currently in teaching rotation' : 'Shown in this view'}
            icon={School}
            accent="sky"
          />
          <TeacherStatCard
            label="Students"
            value={totalStudents}
            caption="Across the classes in this tab"
            icon={Presentation}
            accent="teal"
          />
          <TeacherStatCard
            label="Schedules"
            value={classes.reduce((sum, entry) => sum + (entry.schedules?.length ?? 0), 0)}
            caption="Mapped schedule blocks"
            icon={Sparkles}
            accent="amber"
          />
          <TeacherStatCard
            label="Card Styling"
            value={editingClass ? 'Editing' : 'Ready'}
            caption={editingClass ? editingClass.subjectName : 'Choose a class to customize'}
            icon={Wand2}
            accent="rose"
          />
        </>
      )}
    >
      <TeacherSectionCard
        title="Class Views"
        description="Swap between active, archived, and hidden classes without losing the new visual rhythm."
      >
        <div className="teacher-dashboard-tab-row">
          {(['active', 'archived', 'hidden'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="teacher-tab px-4 text-sm font-black"
              data-state={tab === value ? 'active' : 'inactive'}
              onClick={() => setTab(value)}
            >
              {value === 'active' ? 'Active' : value === 'archived' ? 'Archived' : 'Hidden'}
            </button>
          ))}
        </div>
      </TeacherSectionCard>

      <TeacherSectionCard
        title="Your Teaching Spaces"
        description="These cards stay interactive and customizable, but now sit inside a more deliberate teacher command center."
        action={(
          <div className="teacher-dashboard-chip">
            <Palette className="h-4 w-4" />
            Customize from any class card
          </div>
        )}
      >
        {classes.length === 0 ? (
          <TeacherEmptyState
            title="No classes in this view"
            description={
              tab === 'hidden'
                ? 'Hidden classes stay here until you restore them to your regular workspace.'
                : 'Once classes are assigned to you, they will appear here with stronger scheduling and customization context.'
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {classes.map((course) => (
              <Link key={course.id} href={`/dashboard/teacher/classes/${course.id}`}>
                <ClassCard
                  classItem={course}
                  className="teacher-dashboard-class-card"
                  subtitle={`${course.section?.name || 'Standard Section'} â€¢ Grade ${course.section?.gradeLevel || course.subjectGradeLevel || 'TBA'}`}
                  meta={[
                    `${course.enrollments?.length ?? 0} students`,
                    course.room ? `Room ${course.room}` : 'Room TBA',
                  ]}
                  action={(
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="shrink-0 rounded-xl bg-white/80 font-black text-slate-700 shadow-sm hover:bg-white"
                      onClick={(event) => {
                        event.preventDefault();
                        setEditingClass(course);
                      }}
                    >
                      <Palette className="mr-1 h-4 w-4" />
                      Customize
                    </Button>
                  )}
                  footer={(
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {(course.schedules?.length ?? 0) === 0 ? (
                        <p className="font-medium">Schedule: TBA</p>
                      ) : (
                        <>
                          {(course.schedules ?? []).slice(0, 2).map((schedule) => (
                            <p key={schedule.id} className="truncate font-medium">
                              {formatScheduleLine(schedule)}
                            </p>
                          ))}
                          {(course.schedules?.length ?? 0) > 2 && (
                            <p className="text-[11px] text-muted-foreground">
                              +{(course.schedules?.length ?? 0) - 2} more schedule(s)
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                />
              </Link>
            ))}
          </div>
        )}
      </TeacherSectionCard>

      <Dialog open={Boolean(editingClass)} onOpenChange={(open) => !open && setEditingClass(null)}>
        <DialogContent className="max-w-5xl rounded-[1.8rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-[var(--teacher-text-strong)]">
              Customize Class Card
            </DialogTitle>
          </DialogHeader>

          {editingClass ? (
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="space-y-4">
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                  Live Preview
                </p>
                <ClassCard
                  classItem={{ ...editingClass, cardPreset: selectedPreset }}
                  subtitle={`${editingClass.section?.name || 'Standard Section'} â€¢ Grade ${editingClass.section?.gradeLevel || editingClass.subjectGradeLevel || 'TBA'}`}
                  meta={[
                    `${editingClass.enrollments?.length ?? 0} students`,
                    editingClass.room ? `Room ${editingClass.room}` : 'Room TBA',
                  ]}
                  footer={(
                    <p className="text-xs text-muted-foreground">
                      Changes here apply to both teacher and student dashboards.
                    </p>
                  )}
                />
              </div>

              <div className="space-y-5">
                <div className="teacher-dashboard-dialog-card">
                  <div className="space-y-3">
                    <p className="text-sm font-black text-[var(--teacher-text-strong)]">Preset</p>
                    <div className="grid grid-cols-2 gap-3">
                      {CLASS_CARD_PRESETS.map((preset) => {
                        const active = preset.id === selectedPreset;

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setSelectedPreset(preset.id)}
                            className={`teacher-dashboard-preset ${active ? 'teacher-dashboard-preset--active' : ''}`}
                          >
                            <div className={`h-12 rounded-xl ${preset.bannerClass}`} />
                            <p className="mt-2 text-sm font-black text-slate-900">{preset.label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    className="teacher-button-solid rounded-xl font-black"
                    onClick={handleSavePresentation}
                    disabled={savingPresentation}
                  >
                    {savingPresentation ? 'Saving...' : 'Save Preset'}
                  </Button>
                </div>

                <div className="teacher-dashboard-dialog-card">
                  <div className="space-y-2">
                    <p className="text-sm font-black text-[var(--teacher-text-strong)]">Custom Banner</p>
                    <p className="text-xs leading-6 text-[var(--teacher-text-muted)]">
                      Upload a header image to override the preset background while keeping the class card structure.
                    </p>
                  </div>

                  <label className="teacher-dashboard-upload">
                    <Palette className="h-4 w-4" />
                    {uploadingBanner ? 'Uploading...' : 'Upload Banner'}
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
                    <Button
                      variant="outline"
                      className="teacher-button-outline rounded-xl font-black"
                      onClick={handleRemoveBanner}
                      disabled={savingPresentation}
                    >
                      Remove Custom Banner
                    </Button>
                  ) : null}

                  <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm text-[var(--teacher-text-muted)]">
                    Active preset:{' '}
                    <span className="font-black text-[var(--teacher-text-strong)]">
                      {getClassCardPreset(selectedPreset).label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </TeacherPageShell>
 
  );
}

