import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus, Trash2, Loader2, Search } from 'lucide-react';
import api from '@/services/api';
import adminService from '@/services/adminService';
import AddStudentsModal from '@/components/modals/AddStudentsModal';

const SectionRosterPage = ({ section, onBack }) => {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const res = await adminService.getSectionRoster(section._id || section.id);
      if (res?.success) {
        setRoster(res.data);
      }
    } catch (err) {
      console.error('Failed to load roster', err);
      toast.error('Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const handleRemove = async (studentId) => {
    if (!confirm('Remove this student from the section?')) return;
    setRemovingId(studentId);
    try {
      await adminService.removeStudentFromSection(section._id || section.id, studentId);
      toast.success('Student removed from section');
      setRoster(prev => prev.filter(r => r.studentId !== studentId));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to remove student');
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddSuccess = (addedCount) => {
    if (addedCount > 0) {
      toast.success(`${addedCount} students added`);
      fetchRoster();
    }
    setIsAddOpen(false);
  };

  const containerStyle = { width: '100%', minHeight: '100vh', padding: '40px 20px', background: '#f2f2f2', display: 'flex', justifyContent: 'center' };
  const cardStyle = { width: '100%', maxWidth: '1200px', background: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <ArrowLeft />
            </button>
            <div>
              <h2 style={{ margin: 0 }}>{section.sectionName || section.name}</h2>
              <small style={{ color: '#6b7280' }}>{section.gradeLevel} • {section.schoolYear}</small>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setIsAddOpen(true)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}>
              <UserPlus size={16} /> Add Students
            </button>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: 20 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Loader2 className="animate-spin" size={20} />
            </div>
          ) : roster.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>No students in this section.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 8px', width: 40 }}>#</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Student</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Grade</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r, idx) => (
                  <tr key={r.enrollmentId || r.studentId} style={{ borderTop: '1px solid #f1f1f1' }}>
                    <td style={{ padding: '12px 8px' }}>{idx + 1}</td>
                    <td style={{ padding: '12px 8px' }}>{r.student?.firstName} {r.student?.lastName}</td>
                    <td style={{ padding: '12px 8px' }}>{r.student?.email}</td>
                    <td style={{ padding: '12px 8px' }}>{r.student?.profile?.gradeLevel || '-'}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <button onClick={() => handleRemove(r.studentId)} disabled={removingId === r.studentId} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {isAddOpen && (
          <AddStudentsModal
            section={section}
            onClose={() => setIsAddOpen(false)}
            onSuccess={handleAddSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default SectionRosterPage;
