import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import teacherService from '@/services/teacherService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TeacherDashboard = () => {
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef(null);
  const { user } = useAuth();

  // Handle navigation using window.location

  // Fetch teacher data from backend
  const fetchTeacherData = async () => {
    try {
      setError(null);
      const [lessonsRes, classesRes, assessmentsRes] = await Promise.all([
        teacherService.getLessons(),
        teacherService.getClasses(),
        teacherService.getAssessments()
      ]);
      setLessons(lessonsRes.data || lessonsRes || []);
      console.log('Classes Response:', classesRes);
      console.log('Assessments Response:', assessmentsRes);
      console.log('Lessons Response:', lessonsRes);
      setClasses(classesRes.data || classesRes || []);
      setAssessments(assessmentsRes.data || assessmentsRes || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      const errorMessage = error?.message || 'Failed to load dashboard data';
      setError(errorMessage);
      if (!lessons.length) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Setup auto-refresh effect
  useEffect(() => {
    // Fetch immediately on mount
    fetchTeacherData();

    // Setup interval for auto-refresh
    if (isAutoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchTeacherData();
      }, refreshInterval);
    }

    // Cleanup interval on unmount or when settings change
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAutoRefresh, refreshInterval]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    setLoading(true);
    fetchTeacherData();
    toast.success('Dashboard updated');
  };

  // Format time since last update
  const formatTimeSince = (date) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
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
  const controlsStyle = {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
    fontSize: '14px'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Dashboard Header */}
        <div style={headerStyle}>
          <h1 style={titleStyle}>Teacher Dashboard</h1>
          <div style={controlsStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500 }}>Auto-refresh:</label>
              <input
                type="checkbox"
                checked={isAutoRefresh}
                onChange={(e) => setIsAutoRefresh(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
            </div>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!isAutoRefresh}
              style={{
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: isAutoRefresh ? 'pointer' : 'not-allowed',
                opacity: isAutoRefresh ? 1 : 0.6
              }}
            >
              <option value={15000}>15s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
            </select>
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                fontSize: '13px',
                fontWeight: 500,
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Last Updated Status */}
        <div style={{ fontSize: '13px', color: '#666' }}>
          Last updated: {formatTimeSince(lastUpdated)}
          {error && <span style={{ color: '#dc2626', marginLeft: '16px' }}>Error: {error}</span>}
        </div>

        {/* Summary Cards */}
        <div style={summaryGridStyle}>
          <Card 
            style={{ cursor: 'pointer' }}
            onClick={() => window.location.href = '/teacher/lessons'}
            className="hover:shadow-lg transition-shadow"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">My Lessons</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{lessons.length}</p>
              <p className="text-xs text-gray-500 mt-1">Click to manage</p>
            </CardContent>
          </Card>

          <Card style={{ cursor: 'pointer' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">My Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{classes.length}</p>
              <p className="text-xs text-gray-500 mt-1">Active classes</p>
            </CardContent>
          </Card>

          <Card 
            style={{ cursor: 'pointer' }}
            onClick={() => window.location.href = '/teacher/assessments'}
            className="hover:shadow-lg transition-shadow"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{assessments.length}</p>
              <p className="text-xs text-gray-500 mt-1">Click to manage</p>
            </CardContent>
          </Card>
        </div>

        {/* Lessons Table */}
        <h2 className="text-xl font-semibold mt-4 mb-2">Recent Lessons (Last 5)</h2>
        {loading && !lessons.length ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading lessons...</div>
        ) : lessons.length > 0 ? (
          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Class</th>
                  <th style={thStyle}>Created</th>
                </tr>
              </thead>
              <tbody>
                {lessons.slice(0, 5).map((lesson) => (
                  <tr key={lesson.id} className="hover:bg-muted/50 transition-colors">
                    <td style={tdStyle}>{lesson.title}</td>
                    <td style={tdStyle}>{lesson.classId?.slice(0, 8) || 'N/A'}</td>
                    <td style={{ ...tdStyle, fontSize: '12px' }}>
                      {new Date(lesson.createdAt).toLocaleDateString()}
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
        <h2 className="text-xl font-semibold mt-8 mb-2">Recent Assessments (Last 5)</h2>
        {loading && !assessments.length ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading assessments...</div>
        ) : assessments.length > 0 ? (
          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {assessments.slice(0, 5).map((assessment) => (
                  <tr key={assessment.id} className="hover:bg-muted/50 transition-colors">
                    <td style={tdStyle}>{assessment.title}</td>
                    <td style={{ ...tdStyle, textTransform: 'uppercase', fontSize: '12px' }}>{assessment.type}</td>
                    <td style={{ ...tdStyle, fontSize: '12px' }}>
                      {assessment.dueDate ? new Date(assessment.dueDate).toLocaleDateString() : 'N/A'}
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
      </div>
    </div>
  );
};

export default TeacherDashboard;
