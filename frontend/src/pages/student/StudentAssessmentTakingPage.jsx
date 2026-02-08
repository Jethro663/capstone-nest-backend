import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, ChevronLeft, Flag } from 'lucide-react';
import { toast } from 'sonner';
import assessmentService from '@/services/assessmentService';

const StudentAssessmentTakingPage = ({ assessment, attempt, classItem, onBack }) => {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [responses, setResponses] = useState(attempt.responses || {});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const questions = assessment.questions || [];
  const currentQuestion = questions[currentQuestionIdx];

  // Track time spent
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAnswerChange = (questionId, answer) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmitAssessment = async () => {
    // Validate all questions are answered
    const allAnswered = questions.every(q => responses[q.id] !== undefined);
    if (!allAnswered) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const responseArray = questions.map(q => {
        const answer = responses[q.id];
        return {
          questionId: q.id,
          studentAnswer: q.type === 'short_answer' || q.type === 'fill_blank' ? answer : undefined,
          selectedOptionId: ['multiple_choice', 'true_false', 'dropdown'].includes(q.type) ? answer : undefined,
          selectedOptionIds: q.type === 'multiple_select' ? (Array.isArray(answer) ? answer : []) : undefined,
        };
      });

      const res = await assessmentService.submitAssessment({
        assessmentId: assessment.id,
        responses: responseArray,
        timeSpentSeconds: timeElapsed,
      });

      if (res?.data) {
        toast.success('Assessment submitted successfully!');
        setTimeout(() => onBack(), 1500);
      }
    } catch (err) {
      console.error('Failed to submit assessment', err);
      toast.error('Failed to submit assessment');
    } finally {
      setSubmitting(false);
      setShowConfirmSubmit(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;

    const value = responses[currentQuestion.id] || '';

    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentQuestion.options.map(option => (
              <label
                key={option.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  border: `2px solid ${value === option.id ? '#dc2626' : '#e5e7eb'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: value === option.id ? '#fef2f2' : '#ffffff',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option.id}
                  checked={value === option.id}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', color: '#111827' }}>{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'multiple_select':
        const selectedIds = value || [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentQuestion.options.map(option => (
              <label
                key={option.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  border: `2px solid ${selectedIds.includes(option.id) ? '#dc2626' : '#e5e7eb'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: selectedIds.includes(option.id) ? '#fef2f2' : '#ffffff',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(option.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleAnswerChange(currentQuestion.id, [...selectedIds, option.id]);
                    } else {
                      handleAnswerChange(currentQuestion.id, selectedIds.filter(id => id !== option.id));
                    }
                  }}
                  style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', color: '#111827' }}>{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'true_false':
        return (
          <div style={{ display: 'flex', gap: '12px' }}>
            {['true', 'false'].map(option => (
              <button
                key={option}
                onClick={() => handleAnswerChange(currentQuestion.id, currentQuestion.options.find(o => o.text.toLowerCase() === option)?.id)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: responses[currentQuestion.id] === currentQuestion.options.find(o => o.text.toLowerCase() === option)?.id ? '#dc2626' : '#f3f4f6',
                  color: responses[currentQuestion.id] === currentQuestion.options.find(o => o.text.toLowerCase() === option)?.id ? '#ffffff' : '#111827',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (responses[currentQuestion.id] !== currentQuestion.options.find(o => o.text.toLowerCase() === option)?.id) {
                    e.target.style.backgroundColor = '#e5e7eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (responses[currentQuestion.id] !== currentQuestion.options.find(o => o.text.toLowerCase() === option)?.id) {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        );

      case 'short_answer':
      case 'fill_blank':
        return (
          <textarea
            value={value}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            placeholder="Enter your answer..."
            rows="4"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif',
              boxSizing: 'border-box',
            }}
          />
        );

      case 'dropdown':
        return (
          <select
            value={value}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="">Select an answer...</option>
            {currentQuestion.options.map(option => (
              <option key={option.id} value={option.id}>
                {option.text}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Arial, sans-serif',
  };

  const headerStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const mainContentStyle = {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 300px',
    gap: '24px',
    padding: '24px 32px',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
  };

  const questionPaneStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const sidebarStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '20px',
    height: 'fit-content',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            {assessment.title}
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
            Question {currentQuestionIdx + 1} of {questions.length}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Time Elapsed</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', fontFamily: 'monospace' }}>
            {formatTime(timeElapsed)}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={mainContentStyle}>
        {/* Question Pane */}
        <div style={questionPaneStyle}>
          {currentQuestion && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: '#dbeafe',
                      color: '#0369a1',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {currentQuestion.type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: '#f3f4f6',
                      color: '#6b7280',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {currentQuestion.points} points
                  </span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  {currentQuestion.content}
                </h2>
              </div>

              <div style={{ marginBottom: '32px' }}>
                {renderQuestionInput()}
              </div>

              {currentQuestion.explanation && responses[currentQuestion.id] && (
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #dcfce7',
                    borderRadius: '6px',
                    marginBottom: '24px',
                  }}
                >
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#15803d', margin: '0 0 8px 0' }}>
                    Explanation
                  </p>
                  <p style={{ fontSize: '14px', color: '#166534', margin: 0 }}>
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}

              {/* Navigation */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  paddingTop: '24px',
                  borderTop: '1px solid #e5e7eb',
                }}
              >
                <button
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: currentQuestionIdx === 0 ? '#f3f4f6' : '#ffffff',
                    color: currentQuestionIdx === 0 ? '#9ca3af' : '#111827',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: currentQuestionIdx === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                {currentQuestionIdx === questions.length - 1 ? (
                  <button
                    onClick={() => setShowConfirmSubmit(true)}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#b91c1c')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc2626')}
                  >
                    <Flag size={16} />
                    Submit Assessment
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#ffffff',
                      color: '#111827',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#ffffff')}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar - Question Navigator */}
        <div style={sidebarStyle}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
            Questions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIdx(idx)}
                style={{
                  padding: '8px',
                  backgroundColor:
                    idx === currentQuestionIdx
                      ? '#dc2626'
                      : responses[q.id] !== undefined
                      ? '#dcfce7'
                      : '#f3f4f6',
                  color:
                    idx === currentQuestionIdx ? '#ffffff' : idx === currentQuestionIdx ? '#ffffff' : '#6b7280',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                title={
                  responses[q.id] !== undefined ? 'Answered' : 'Not answered'
                }
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb',
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#dcfce7', borderRadius: '2px', marginRight: '6px' }}></span>
              Answered
            </div>
            <div>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#f3f4f6', borderRadius: '2px', marginRight: '6px' }}></span>
              Not answered
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showConfirmSubmit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              width: '90%',
              maxWidth: '500px',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 12px 0' }}>
              Submit Assessment?
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px 0' }}>
              Are you sure you want to submit your assessment? You won't be able to change your answers after submission.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowConfirmSubmit(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f3f4f6',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Keep Working
              </button>
              <button
                disabled={submitting}
                onClick={handleSubmitAssessment}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssessmentTakingPage;
