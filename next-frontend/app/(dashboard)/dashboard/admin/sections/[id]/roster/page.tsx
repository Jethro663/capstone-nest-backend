'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { sectionService, type RosterStudent } from '@/services/section-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Section } from '@/types/section';

interface Candidate {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  gradeLevel?: string;
}

export default function AdminSectionRosterPage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = params.id as string;

  const [section, setSection] = useState<Section | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [candidateSearch, setCandidateSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sectionRes, rosterRes] = await Promise.all([
        sectionService.getById(sectionId),
        sectionService.getRoster(sectionId),
      ]);
      setSection(sectionRes.data);
      setRoster(rosterRes.data || []);
    } catch {
      toast.error('Failed to load roster');
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAddStudents = async () => {
    try {
      const res = await sectionService.getCandidates(sectionId);
      setCandidates(res.data || []);
      setSelectedIds([]);
      setCandidateSearch('');
      setShowAddStudents(true);
    } catch {
      toast.error('Failed to load candidates');
    }
  };

  const handleAddStudents = async () => {
    if (selectedIds.length === 0) return;
    try {
      await sectionService.addStudents(sectionId, selectedIds);
      toast.success(`Added ${selectedIds.length} student(s)`);
      setShowAddStudents(false);
      fetchData();
    } catch {
      toast.error('Failed to add students');
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Remove this student from the section?')) return;
    try {
      await sectionService.removeStudent(sectionId, studentId);
      toast.success('Student removed');
      setRoster((prev) => prev.filter((s) => s.id !== studentId));
    } catch {
      toast.error('Failed to remove student');
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (!candidateSearch) return true;
    const q = candidateSearch.toLowerCase();
    return (
      c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">← Back</Button>
        <h1 className="text-2xl font-bold">{section?.name} — Roster</h1>
        <p className="text-muted-foreground">
          Grade {section?.gradeLevel} • {section?.schoolYear} • {roster.length} students
        </p>
      </div>

      <div className="flex items-center justify-end">
        <Button size="sm" onClick={handleOpenAddStudents}>+ Add Students</Button>
      </div>

      {roster.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">No students in this section yet.</CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>LRN</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{s.firstName} {s.lastName}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  <TableCell className="text-muted-foreground">{s.lrn || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleRemoveStudent(s.id)}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add Students Modal */}
      <Dialog open={showAddStudents} onOpenChange={setShowAddStudents}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Students to {section?.name}</DialogTitle></DialogHeader>
          <Input placeholder="Search students..." value={candidateSearch} onChange={(e) => setCandidateSearch(e.target.value)} />
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No candidates available.</p>
            ) : (
              filteredCandidates.map((c) => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() =>
                      setSelectedIds((prev) =>
                        prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                      )
                    }
                  />
                  <span className="text-sm">{c.firstName} {c.lastName} — {c.email}</span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStudents(false)}>Cancel</Button>
            <Button onClick={handleAddStudents} disabled={selectedIds.length === 0}>
              Add {selectedIds.length} Student(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
