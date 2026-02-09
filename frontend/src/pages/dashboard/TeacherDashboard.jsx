import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import teacherService from '@/services/teacherService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import CreateLessonModal from '@/components/modals/CreateLessonModal';
import CreateAssessmentModal from '@/components/modals/CreateAssessmentModal';

const TeacherDashboard = () => {
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      const [lessonsRes, classesRes, assessmentsRes] = await Promise.all([
        teacherService.getLessons(),
        teacherService.getClasses(),
        teacherService.getAssessments()
      ]);
      setLessons(lessonsRes.data || []);
      setClasses(classesRes.data || []);
      setAssessments(assessmentsRes.data || []);
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await teacherService.deleteLesson(id);
      toast.success('Lesson deleted successfully');
      fetchTeacherData();
    } catch (error) {
      toast.error('Failed to delete lesson');
    }
  };

  // -------------------------
  // Inline Styles
  // -------------------------
  const containerStyle = {
    width: '100%',
    minHeight: '100vh',
    padding: '40px 20px',
    background: '#f2f2f2',
    display: 'flex',
    justifyContent: 'center'
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '1200px',
    background: '#fff',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center'
  };

  const titleStyle = { fontSize: '28px', fontWeight: 'bold', margin: 0 };
  const summaryGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  };
  const tableContainerStyle = {
    borderRadius: '12px',
    border: '1px solid #ddd',
    overflowX: 'auto',
    background: '#fff'
  };
  const tableStyle = { width: '100%', borderCollapse: 'collapse' };
  const thStyle = {
    textAlign: 'left',
    padding: '12px 16px',
    fontWeight: 600,
    fontSize: '13px',
    textTransform: 'uppercase',
    color: '#4b5563',
    borderBottom: '1px solid #ddd'
  };
  const tdStyle = { padding: '12px 16px', fontSize: '14px', color: '#111827' };
  const actionBtnStyle = { border: 'none', background: 'transparent', cursor: 'pointer' };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* ------------------------- */}
        {/* Modals */}
        {/* ------------------------- */}
        {isCreateModalOpen && (
          <CreateLessonModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            classes={classes}
            onLessonCreated={fetchTeacherData}
          />
        )}

        {isAssessmentModalOpen && (
          <CreateAssessmentModal
            isOpen={isAssessmentModalOpen}
            onClose={() => setIsAssessmentModalOpen(false)}
            classes={classes}
            onAssessmentCreated={fetchTeacherData}
          />
        )}

        {/* ------------------------- */}
        {/* Dashboard content (hidden when modal is open) */}
        {/* ------------------------- */}
        {!isCreateModalOpen && !isAssessmentModalOpen && (
          <>
            {/* Dashboard Header */}
            <div style={headerStyle}>
              <h1 style={titleStyle}>Teacher Dashboard</h1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button onClick={() => setIsCreateModalOpen(true)}>Create New Lesson</Button>
                <Button onClick={() => setIsAssessmentModalOpen(true)} variant="outline">
                  Create New Assessment
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div style={summaryGridStyle}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">My Lessons</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{lessons.length}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">My Classes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{classes.length}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Assessments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{assessments.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Lessons Table */}
            <h2 className="text-xl font-semibold mt-4 mb-2">Manage Your Lessons</h2>
            {loading ? (
              <p>Loading lessons...</p>
            ) : lessons.length > 0 ? (
              <div style={tableContainerStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Title</th>
                      <th style={thStyle}>Type</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.map((lesson) => (
                      <tr key={lesson.id} className="hover:bg-muted/50 transition-colors">
                        <td style={tdStyle}>{lesson.title}</td>
                        <td style={{ ...tdStyle, textTransform: 'uppercase', fontSize: '12px' }}>{lesson.contentType}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                          <button
                            style={actionBtnStyle}
                            onClick={() => toast.info('Edit feature - Backend ready placeholder')}
                          >
                            Edit
                          </button>
                          <button style={actionBtnStyle} onClick={() => handleDeleteLesson(lesson.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  You haven't created any lessons yet.
                </CardContent>
              </Card>
            )}

            {/* Assessments Table */}
            <h2 className="text-xl font-semibold mt-8 mb-2">Manage Your Assessments</h2>
            {loading ? (
              <p>Loading assessments...</p>
            ) : assessments.length > 0 ? (
              <div style={tableContainerStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Title</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Due Date</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map((assessment) => (
                      <tr key={assessment.id} className="hover:bg-muted/50 transition-colors">
                        <td style={tdStyle}>{assessment.title}</td>
                        <td style={{ ...tdStyle, textTransform: 'uppercase', fontSize: '12px' }}>{assessment.type}</td>
                        <td style={{ ...tdStyle, fontSize: '12px' }}>{new Date(assessment.dueDate).toLocaleDateString()}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                          <button style={actionBtnStyle}>Edit</button>
                          <button style={actionBtnStyle}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  You haven't created any assessments yet.
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
