import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import assessmentService from '@/services/assessmentService';

const StudentAssessmentResultsPage = ({ attempt, assessment, onBack }) => {
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [attempt.id]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await assessmentService.getAttemptResults(attempt.id);
      if (res?.data) {
        setResultData(res.data);
      }
    } catch (err) {
      console.error('Failed to load results', err);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

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

  const scoreCardStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  };

  const scoreItemStyle = {
    textAlign: 'center',
    padding: '24px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  };

  const scoreNumberStyle = {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#111827',
    margin: '0 0 8px 0',
  };

  const scoreLabelStyle = {
    fontSize: '14px',
    color: '#6b7280',
  };

  const feedbackBannerStyle = (status) => ({
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    backgroundColor:
      status === 'unlocked' ? '#f0fdf4' :
      status === 'locked' ? '#fef3c7' :
      '#fef2f2',
    border:
      status === 'unlocked' ? '1px solid #bbf7d0' :
      status === 'locked' ? '1px solid #fde68a' :
      '1px solid #fecaca',
  });

  const feedbackMessageStyle = (status) => ({
    fontSize: '14px',
    color:
      status === 'unlocked' ? '#15803d' :
      status === 'locked' ? '#92400e' :
      '#dc2626',
    margin: 0,
  });

  const questionListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const questionCardStyle = (isCorrect) => ({
    padding: '16px',
    border: `2px solid ${isCorrect ? '#d1fae5' : '#fee2e2'}`,
    borderRadius: '8px',
    backgroundColor: isCorrect ? '#f0fdf4' : '#fef2f2',
  });

  const questionHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  };

  const placeholderStyle = {
    textAlign: 'center',
    padding: '40px',
    color: '#9ca3af',
  };

  if (loading) {
    return (
      <div style={containerStyle}>
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
              Results
            </p>
          </div>
        </div>
        <div style={contentStyle}>
          <div style={placeholderStyle}>Loading results...</div>
        </div>
      </div>
    );
  }

  if (!resultData) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <button
            style={backButtonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={onBack}
          >
            <ArrowLeft size={20} style={{ color: '#111827' }} />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
              {assessment.title}
            </h1>
          </div>
        </div>
        <div style={contentStyle}>
          <div style={placeholderStyle}>Failed to load results</div>
        </div>
      </div>
    );
  }

  const feedbackStatus = resultData.feedbackStatus || {};
  const isLocked = !feedbackStatus.unlocked;
  const score = resultData.score || 0;
  const passed = resultData.passed;

  return (
    <div style={containerStyle}>
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
            Results • {new Date(resultData.submittedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div style={contentStyle}>
        {/* Score Card */}
        <div style={sectionStyle}>
          <div style={scoreCardStyle}>
            <div style={scoreItemStyle}>
              <div style={scoreNumberStyle}>{score.toFixed(1)}%</div>
              <div style={scoreLabelStyle}>Your Score</div>
            </div>
            <div style={scoreItemStyle}>
              <div
                style={{
                  fontSize: '48px',
                  margin: '0 0 8px 0',
                }}
              >
                {passed ? '✓' : '✗'}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: passed ? '#15803d' : '#dc2626',
                }}
              >
                {passed ? 'PASSED' : 'FAILED'}
              </div>
              <div style={scoreLabelStyle}>
                {assessment.passingScore}% needed
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Status Banner */}
        {feedbackStatus && (
          <div style={feedbackBannerStyle(feedbackStatus.unlocked ? 'unlocked' : 'locked')}>
            <div>
              {feedbackStatus.unlocked ? (
                <CheckCircle size={20} style={{ color: '#15803d' }} />
              ) : (
                <Lock size={20} style={{ color: '#92400e' }} />
              )}
            </div>
            <div>
              <p style={feedbackMessageStyle(feedbackStatus.unlocked ? 'unlocked' : 'locked')}>
                {feedbackStatus.message}
              </p>
              {feedbackStatus.hoursRemaining > 0 && (
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  Available in {feedbackStatus.hoursRemaining} {feedbackStatus.hoursRemaining === 1 ? 'hour' : 'hours'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Question Review */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 20px 0' }}>
            Question Review {feedbackStatus.unlocked ? '& Feedback' : ''}
          </h2>

          <div style={questionListStyle}>
            {(resultData.responses || []).map((response, idx) => (
              <div
                key={response.id}
                style={questionCardStyle(response.isCorrect)}
              >
                <div style={questionHeaderStyle}>
                  <div>
                    {response.isCorrect ? (
                      <CheckCircle size={20} style={{ color: '#15803d' }} />
                    ) : (
                      <XCircle size={20} style={{ color: '#dc2626' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '14px', color: '#111827' }}>
                        Question {idx + 1}
                      </strong>
                      <span
                        style={{
                          fontSize: '12px',
                          backgroundColor: response.isCorrect ? '#dcfce7' : '#fee2e2',
                          color: response.isCorrect ? '#15803d' : '#dc2626',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontWeight: '600',
                        }}
                      >
                        {response.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                      {response.pointsEarned !== null && (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          {response.pointsEarned} / {response.question?.points || 0} points
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: '14px',
                        color: '#111827',
                        fontWeight: '500',
                      }}
                    >
                      {response.question?.content}
                    </p>
                  </div>
                </div>

                {/* Show answer details only if unlocked */}
                {feedbackStatus.unlocked && response.isCorrect !== null && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    {response.studentAnswer && (
                      <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b7280' }}>
                        <strong>Your Answer:</strong>
                        <div style={{ marginTop: '4px', padding: '8px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}>
                          {response.studentAnswer}
                        </div>
                      </div>
                    )}

                    {response.question?.options && response.question.options.length > 0 && (
                      <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b7280' }}>
                        <strong>Options Review:</strong>
                        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {response.question.options.map((option) => (
                            <div
                              key={option.id}
                              style={{
                                padding: '8px',
                                backgroundColor: option.isCorrect ? '#f0fdf4' : 'rgba(0,0,0,0.02)',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            >
                              {option.isCorrect && <strong>✓ </strong>}
                              {option.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Learning Hint (always shown) */}
                {response.hint && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#eff6ff',
                    borderLeft: '3px solid #3b82f6',
                    borderRadius: '4px',
                  }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#0369a1' }}>
                      💡 <strong>Learning Tip:</strong> {response.hint}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Study Resources */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
            📚 Suggested Study Resources
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {!passed ? (
              <>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#15803d',
                }}>
                  <strong>✓ Review the lesson content</strong> for topics you struggled with
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#15803d',
                }}>
                  <strong>✓ Take more practice</strong> to build confidence
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#15803d',
                }}>
                  <strong>✓ Ask your teacher</strong> for clarification on difficult topics
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#15803d',
                }}>
                  <strong>✓ You can retake</strong> this assessment to improve your score
                </div>
              </>
            ) : (
              <>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#15803d',
                }}>
                  <strong>🎉 Great job!</strong> You passed the assessment
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#15803d',
                }}>
                  <strong>✓ Review the feedback</strong> to deepen your understanding
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAssessmentResultsPage;
