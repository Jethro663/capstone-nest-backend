import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Search, Check } from 'lucide-react';
import adminService from '@/services/adminService';

const AddStudentsModal = ({ section, onClose, onSuccess }) => {
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');

  // Extract short grade like '7' from section.gradeLevel which might be 'Grade 7' or '7'
  const sectionGradeShort = (s) => {
    if (!s) return null;
    const m = String(s).match(/(\d{1,2})/);
    return m ? m[1] : null;
  };

  // On mount / when section changes, lock gradeFilter to section's grade
  useEffect(() => {
    const g = sectionGradeShort(section?.gradeLevel || section?.grade);
    if (g) setGradeFilter(g);
  }, [section]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = {};
      if (gradeFilter !== 'all') params.gradeLevel = gradeFilter;
      if (search) params.search = search;
      const res = await adminService.getSectionCandidates(section._id || section.id, params);
      if (res?.success) setCandidates(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCandidates(); }, [section, gradeFilter]);

  const toggle = (id) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };

  const handleAdd = async () => {
    if (selected.size === 0) return toast.error('No students selected');
    try {
      const studentIds = Array.from(selected);
      const res = await adminService.addStudentsToSection(section._id || section.id, studentIds);
      if (res?.success) {
        onSuccess(res.data?.createdCount || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to add students');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ width: '90%', maxWidth: 900, background: '#fff', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Add Students to {section.sectionName || section.name}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X /></button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
          {(() => {
            const fixed = sectionGradeShort(section?.gradeLevel || section?.grade);
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} disabled={!!fixed} style={{ padding: 8, borderRadius: 8 }}>
                  {fixed ? (
                    <option value={fixed}>{`Grade ${fixed}`}</option>
                  ) : (
                    <>
                      <option value="all">All Grades</option>
                      <option value="7">Grade 7</option>
                      <option value="8">Grade 8</option>
                      <option value="9">Grade 9</option>
                      <option value="10">Grade 10</option>
                    </>
                  )}
                </select>
                {fixed && <small style={{ color: '#6b7280', fontSize: 12 }}>Restricted to this section's grade</small>}
              </div>
            );
          })()}
          <button onClick={fetchCandidates} style={{ padding: 8, borderRadius: 8, border: 'none', background: '#111827', color: '#fff' }}><Search /></button>
        </div>

        <div style={{ maxHeight: 360, overflow: 'auto', borderTop: '1px solid #eee', paddingTop: 8 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
          ) : candidates.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>No students found.</div>
          ) : (
            <div>
              {candidates.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, borderBottom: '1px solid #f1f1f1', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.firstName} {c.lastName}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{c.email} • {c.gradeLevel || '-'}</div>
                  </div>
                  <div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}>Cancel</button>
          <button onClick={handleAdd} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff' }}>Add Selected</button>
        </div>
      </div>
    </div>
  );
};

export default AddStudentsModal;
