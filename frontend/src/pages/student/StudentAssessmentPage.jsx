import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Eye, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import assessmentService from '@/services/assessmentService';
import StudentAssessmentTakingPage from './StudentAssessmentTakingPage';
import StudentAssessmentResultsPage from './StudentAssessmentResultsPage';

const StudentAssessmentPage = ({ assessment, classItem, onBack }) => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [takingAssessment, setTakingAssessment] = useState(null);
  const [viewingResultId, setViewingResultId] = useState(null);

  useEffect(() => {
    fetchAttempts();
  }, [assessment.id]);

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const res = await assessmentService.getStudentAttempts(assessment.id);
      if (res?.data && Array.isArray(res.data)) {
        setAttempts(res.data);
      }
    } catch (err) {
      console.error('Failed to load attempts', err);
      toast.error('Failed to load assessment attempts');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAttempt = async () => {
    try {
      const res = await assessmentService.startAttempt(assessment.id);
      if (res?.data) {
        setTakingAssessment(res.data);
      }
    } catch (err) {
      console.error('Failed to start attempt', err);
      toast.error('Failed to start assessment attempt');
    }
  };

  const handleViewResults = async (attemptId) => {
    setViewingResultId(attemptId);
  };

  // If taking assessment, show the taking page
  if (takingAssessment) {
    return (
      <StudentAssessmentTakingPage
        assessment={assessment}
        attempt={takingAssessment}
        classItem={classItem}
        onBack={() => {
          setTakingAssessment(null);
          fetchAttempts(); // Reload attempts after completing
        }}
      />
    );
  }

  // If viewing results, show the results page
  if (viewingResultId) {
    const selectedAttempt = attempts.find(a => a.id === viewingResultId);
    if (selectedAttempt) {
      return (
        <StudentAssessmentResultsPage
          attempt={selectedAttempt}
          assessment={assessment}
          onBack={() => setViewingResultId(null)}
        />
      );
    }
  }

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '0',
    fontFamily: 'Arial, sans-serif',
  };

  const headerStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '24px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const backButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  };

  const contentStyle = {
    padding: '32px',
    maxWidth: '900px',
    margin: '0 auto',
  };

  const sectionStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const buttonStyle = {
    padding: '12px 20px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const secondaryButtonStyle = {
    padding: '10px 16px',
    backgroundColor: '#f3f4f6',
    color: '#111827',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const infoGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '16px',
    fontSize: '14px',
  };

  const infoItemStyle = {
    display: 'flex',
    flexDirection: 'column',
  };

  const attemptsListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const attemptCardStyle = {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const placeholderStyle = {
    textAlign: 'center',
    padding: '40px',
    color: '#9ca3af',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <button
          style={backButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={onBack}
        >
          <ArrowLeft size={20} style={{ color: '#111827' }} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {assessment.title}
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
            {assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)} • {assessment.questions?.length || 0} questions
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* Assessment Info */}
        <div style={sectionStyle}>
          {assessment.description && (
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
              {assessment.description}
            </p>
          )}
          
          <div style={infoGridStyle}>
            <div style={infoItemStyle}>
              <span style={{ color: '#6b7280', marginBottom: '4px' }}>Total Points</span>
              <strong style={{ fontSize: '18px', color: '#111827' }}>
                {assessment.totalPoints}
              </strong>
            </div>
            <div style={infoItemStyle}>
              <span style={{ color: '#6b7280', marginBottom: '4px' }}>Passing Score</span>
              <strong style={{ fontSize: '18px', color: '#111827' }}>
                {assessment.passingScore}%
              </strong>
            </div>
            <div style={infoItemStyle}>
              <span style={{ color: '#6b7280', marginBottom: '4px' }}>Questions</span>
              <strong style={{ fontSize: '18px', color: '#111827' }}>
                {assessment.questions?.length || 0}
              </strong>
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
            <button
              style={buttonStyle}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#b91c1c')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc2626')}
              onClick={handleStartAttempt}
            >
              <Play size={16} />
              Start Assessment
            </button>
          </div>
        </div>

        {/* Previous Attempts */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 20px 0' }}>
            My Attempts
          </h2>

          {loading ? (
            <div style={placeholderStyle}>Loading attempts...</div>
          ) : attempts.length === 0 ? (
            <div style={placeholderStyle}>
              <p>No attempts yet. Start an assessment to begin!</p>
            </div>
          ) : (
            <div style={attemptsListStyle}>
              {attempts.map((attempt, idx) => (
                <div key={attempt.id} style={attemptCardStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        backgroundColor: '#f3f4f6',
                        color: '#6b7280',
                        padding: '4px 8px',
                        borderRadius: '4px',
                      }}>
                        Attempt {idx + 1}
                      </span>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        backgroundColor: attempt.passed ? '#dcfce7' : '#fee2e2',
                        color: attempt.passed ? '#15803d' : '#dc2626',
                        padding: '4px 8px',
                        borderRadius: '4px',
                      }}>
                        {attempt.passed ? '✓ PASSED' : '✗ FAILED'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                      <span>Score: <strong>{(attempt.score || 0).toFixed(1)}%</strong></span>
                      <span>Points: <strong>{attempt.score ? (attempt.score * assessment.totalPoints / 100).toFixed(1) : 0}/{assessment.totalPoints}</strong></span>
                      <span>Date: <strong>{new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString()}</strong></span>
                    </div>
                  </div>
                  <button
                    style={secondaryButtonStyle}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#e5e7eb';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }}
                    onClick={() => handleViewResults(attempt.id)}
                  >
                    <Eye size={14} />
                    View Results
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAssessmentPage;
