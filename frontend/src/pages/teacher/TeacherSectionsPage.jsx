import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, ArrowRight } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const TeacherSectionsPage = ({ onViewRoster }) => {
  const { user, loading: authLoading } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMySections = async () => {
    setLoading(true);
    try {
      
      const res = await api.get('/sections/my');
      if (res?.data?.success) setSections(res.data.data);
    } catch (err) {
      console.error('Failed to load my sections', err);
      // Show a clearer message when unauthenticated
      if (err.response?.status === 401) {
        toast.error('Please log in to view your sections');
      } else {
        toast.error('Failed to load your sections');
      }
    } finally {
      setLoading(false);
    }
  };

  // Wait for auth to be ready and user to exist
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setSections([]);
      setLoading(false);
      return;
    }

    fetchMySections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-3">My Sections</h1>
        <p className="text-sm text-muted-foreground mb-6">Sections you are assigned to. You can manage students of your section.</p>

        <div className="bg-white rounded-lg border p-6">
          {loading ? (
            <div className="text-center py-12"><Loader2 className="animate-spin mx-auto" /></div>
          ) : sections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">You are not assigned to any section.</div>
          ) : (
            <ul className="space-y-4">
              {sections.map(s => (
                <li key={s.id} className="flex items-center justify-between border rounded-md p-4">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.gradeLevel} • {s.schoolYear}</div>
                  </div>
                  <div>
                    <button className="px-3 py-2 rounded-md bg-slate-900 text-white" onClick={() => onViewRoster({ _id: s.id, sectionName: s.name, gradeLevel: s.gradeLevel, schoolYear: s.schoolYear })}>
                      View Roster <ArrowRight className="inline-block ml-2" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherSectionsPage;
