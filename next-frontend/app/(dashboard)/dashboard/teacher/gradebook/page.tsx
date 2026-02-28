'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { gradebookService } from '@/services/gradebook-service';
import { classService } from '@/services/class-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import { dashboardService } from '@/services/dashboard-service';
import type { Gradebook, GradebookCategory, FinalGrade } from '@/types/gradebook';
import type { ClassItem } from '@/types/class';
import type { GradingPeriod } from '@/utils/constants';

export default function GradebookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClassId = searchParams.get('classId');
  const { user } = useAuth();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(preselectedClassId || '');
  const [gradebooks, setGradebooks] = useState<Gradebook[]>([]);
  const [selectedGradebook, setSelectedGradebook] = useState<Gradebook | null>(null);
  const [finalGrades, setFinalGrades] = useState<FinalGrade[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateGradebook, setShowCreateGradebook] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [gradingPeriod, setGradingPeriod] = useState<string>('Q1');
  const [catName, setCatName] = useState('');
  const [catWeight, setCatWeight] = useState(25);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await dashboardService.getTeacherClasses();
        setClasses(res.data || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  // Fetch gradebooks for selected class
  const fetchGradebooks = useCallback(async () => {
    if (!selectedClassId) return;
    try {
      const res = await gradebookService.getByClass(selectedClassId);
      const gbs = Array.isArray(res.data) ? res.data : [];
      setGradebooks(gbs);
      if (gbs.length > 0) {
        setSelectedGradebook(gbs[0]);
      } else {
        setSelectedGradebook(null);
      }
    } catch {
      toast.error('Failed to load gradebooks');
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchGradebooks();
  }, [fetchGradebooks]);

  // Fetch grades for selected gradebook
  useEffect(() => {
    if (!selectedGradebook) return;
    const fetchGrades = async () => {
      try {
        const res = await gradebookService.previewGrades(selectedGradebook.id);
        setFinalGrades(Array.isArray(res.data) ? res.data : []);
      } catch {
        setFinalGrades([]);
      }
    };
    fetchGrades();
  }, [selectedGradebook]);

  const handleCreateGradebook = async () => {
    if (!selectedClassId) return;
    try {
      const res = await gradebookService.create({
        classId: selectedClassId,
        gradingPeriod: gradingPeriod as GradingPeriod,
      });
      toast.success('Gradebook created');
      setShowCreateGradebook(false);
      fetchGradebooks();
    } catch {
      toast.error('Failed to create gradebook');
    }
  };

  const handleCreateCategory = async () => {
    if (!selectedGradebook || !catName.trim()) return;
    try {
      await gradebookService.createCategory(selectedGradebook.id, {
        name: catName,
        weightPercentage: catWeight,
      });
      toast.success('Category added');
      setShowCreateCategory(false);
      setCatName('');
      setCatWeight(25);
      fetchGradebooks();
    } catch {
      toast.error('Failed to create category');
    }
  };

  const handleFinalize = async () => {
    if (!selectedGradebook || !confirm('Finalize grades? This cannot be undone.')) return;
    try {
      await gradebookService.finalize(selectedGradebook.id);
      toast.success('Grades finalized');
      fetchGradebooks();
    } catch {
      toast.error('Failed to finalize');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">← Back</Button>
        <h1 className="text-2xl font-bold">Gradebook</h1>
      </div>

      {/* Class selector */}
      <div className="flex items-center gap-4">
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm min-w-[250px]"
        >
          <option value="">Select a class...</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.subjectName} — {c.section?.name}</option>
          ))}
        </select>
        <Button size="sm" onClick={() => setShowCreateGradebook(true)} disabled={!selectedClassId}>
          + New Gradebook
        </Button>
      </div>

      {/* Period tabs */}
      {gradebooks.length > 0 && (
        <div className="flex gap-2">
          {gradebooks.map((gb) => (
            <Button
              key={gb.id}
              variant={selectedGradebook?.id === gb.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedGradebook(gb)}
            >
              {gb.gradingPeriod}
              <Badge variant="secondary" className="ml-2">{gb.status}</Badge>
            </Button>
          ))}
        </div>
      )}

      {!selectedGradebook && selectedClassId && (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No gradebooks yet. Create one to get started.</CardContent></Card>
      )}

      {selectedGradebook && (
        <>
          {/* Categories */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Categories</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowCreateCategory(true)}>+ Add Category</Button>
              </div>
            </CardHeader>
            <CardContent>
              {(!selectedGradebook.categories || selectedGradebook.categories.length === 0) ? (
                <p className="text-sm text-muted-foreground">No categories. Add categories to organize grades.</p>
              ) : (
                <div className="space-y-2">
                  {selectedGradebook.categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{cat.weightPercentage}% weight • {cat.items?.length ?? 0} items</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grade Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Grade Preview</CardTitle>
                {selectedGradebook.status === 'draft' && (
                  <Button size="sm" onClick={handleFinalize}>Finalize Grades</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {finalGrades.length === 0 ? (
                <p className="text-sm text-muted-foreground">No grades to display.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Grade %</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finalGrades.map((fg) => (
                      <TableRow key={fg.studentId}>
                        <TableCell>{fg.student?.firstName} {fg.student?.lastName}</TableCell>
                        <TableCell>{fg.finalPercentage.toFixed(1)}%</TableCell>
                        <TableCell>
                          <Badge variant={fg.remarks === 'Passed' ? 'default' : 'destructive'}>
                            {fg.remarks}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Gradebook Modal */}
      <Dialog open={showCreateGradebook} onOpenChange={setShowCreateGradebook}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Gradebook</DialogTitle></DialogHeader>
          <div>
            <Label>Grading Period</Label>
            <select value={gradingPeriod} onChange={(e) => setGradingPeriod(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm mt-1">
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateGradebook(false)}>Cancel</Button>
            <Button onClick={handleCreateGradebook}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Modal */}
      <Dialog open={showCreateCategory} onOpenChange={setShowCreateCategory}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Written Work" /></div>
            <div><Label>Weight (%)</Label><Input type="number" value={catWeight} onChange={(e) => setCatWeight(Number(e.target.value))} min={1} max={100} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCategory(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} disabled={!catName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
