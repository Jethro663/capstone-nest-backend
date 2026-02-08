import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import assessmentService from '@/services/assessmentService';

const AssessmentEditorPage = ({ assessment, classId, onBack }) => {
  const [questions, setQuestions] = useState(assessment.questions || []);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [isPublished, setIsPublished] = useState(assessment.isPublished || false);
  const [publishingState, setPublishingState] = useState(false);
  
  // Question form state
  const [questionType, setQuestionType] = useState('multiple_choice');
  const [questionContent, setQuestionContent] = useState('');
  const [questionPoints, setQuestionPoints] = useState(1);
  const [questionOrder, setQuestionOrder] = useState(questions.length);
  const [options, setOptions] = useState([{ text: '', isCorrect: false, order: 0 }]);
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [explanation, setExplanation] = useState('');

  const questionTypes = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'multiple_select', label: 'Multiple Select' },
    { value: 'true_false', label: 'True/False' },
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'fill_blank', label: 'Fill in Blank' },
    { value: 'dropdown', label: 'Dropdown' },
  ];

  // Reset form
  const resetForm = () => {
    setQuestionContent('');
    setQuestionType('multiple_choice');
    setQuestionPoints(1);
    setQuestionOrder(questions.length);
    setOptions([{ text: '', isCorrect: false, order: 0 }]);
    setExplanation('');
    setEditingQuestionId(null);
  };

  // Toggle publish status
  const handleTogglePublish = async () => {
    setPublishingState(true);
    try {
      const res = await assessmentService.updateAssessment(assessment.id, {
        isPublished: !isPublished,
      });
      if (res?.data) {
        setIsPublished(!isPublished);
        toast.success(isPublished ? 'Assessment unpublished' : 'Assessment published for students');
      }
    } catch (err) {
      console.error('Failed to update assessment publish status', err);
      toast.error('Failed to update assessment status');
    } finally {
      setPublishingState(false);
    }
  };

  // Open modal to edit question
  const handleEditQuestion = (question) => {
    setEditingQuestionId(question.id);
    setQuestionContent(question.content);
    setQuestionType(question.type);
    setQuestionPoints(question.points);
    setQuestionOrder(question.order);
    setExplanation(question.explanation || '');
    setOptions(question.options || [{ text: '', isCorrect: false, order: 0 }]);
    setShowQuestionModal(true);
  };

  // Save question (create or update)
  const handleSaveQuestion = async () => {
    if (!questionContent.trim()) {
      toast.error('Please enter a question');
      return;
    }

    // Validate options for question types that require them
    const requiresOptions = ['multiple_choice', 'multiple_select', 'true_false', 'dropdown'];
    if (requiresOptions.includes(questionType)) {
      if (options.length === 0 || options.some(o => !o.text.trim())) {
        toast.error('Please fill in all option text');
        return;
      }

      const hasCorrectOption = options.some(o => o.isCorrect);
      if (!hasCorrectOption) {
        toast.error('Please mark at least one option as correct');
        return;
      }
    }

    setCreatingQuestion(true);
    try {
      if (editingQuestionId) {
        // Update question
        const res = await assessmentService.updateQuestion(editingQuestionId, {
          content: questionContent,
          type: questionType,
          points: parseInt(questionPoints),
          order: parseInt(questionOrder),
          explanation,
          options: requiresOptions.includes(questionType) ? options : undefined,
        });
        if (res?.data) {
          toast.success('Question updated successfully');
          setQuestions(questions.map(q => q.id === editingQuestionId ? res.data : q));
        }
      } else {
        // Create question
        const res = await assessmentService.createQuestion({
          assessmentId: assessment.id,
          content: questionContent,
          type: questionType,
          points: parseInt(questionPoints),
          order: parseInt(questionOrder),
          explanation,
          options: requiresOptions.includes(questionType) ? options : undefined,
        });
        if (res?.data) {
          toast.success('Question created successfully');
          setQuestions([...questions, res.data]);
        }
      }
      setShowQuestionModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save question', err);
      toast.error(editingQuestionId ? 'Failed to update question' : 'Failed to create question');
    } finally {
      setCreatingQuestion(false);
    }
  };

  // Delete question
  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Delete this question? This cannot be undone.')) return;

    try {
      await assessmentService.deleteQuestion(questionId);
      toast.success('Question deleted successfully');
      setQuestions(questions.filter(q => q.id !== questionId));
    } catch (err) {
      console.error('Failed to delete question', err);
      toast.error('Failed to delete question');
    }
  };

  // Update option
  const handleOptionChange = (idx, field, value) => {
    const newOptions = [...options];
    newOptions[idx] = { ...newOptions[idx], [field]: value };
    setOptions(newOptions);
  };

  // Add option
  const handleAddOption = () => {
    setOptions([
      ...options,
      { text: '', isCorrect: false, order: options.length },
    ]);
  };

  // Remove option
  const handleRemoveOption = (idx) => {
    if (options.length <= 1) {
      toast.error('At least one option is required');
      return;
    }
    setOptions(options.filter((_, i) => i !== idx));
  };

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

  const headerRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  };

  const addButtonStyle = {
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
    gap: '8px',
  };

  const questionCardStyle = {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '12px',
    backgroundColor: '#ffffff',
  };

  const questionHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  };

  const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  };

  const modalHeaderStyle = {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const modalTitleStyle = {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
  };

  const modalContentStyle = {
    padding: '20px 24px',
    overflowY: 'auto',
    flex: 1,
  };

  const modalFooterStyle = {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '6px',
    display: 'block',
  };

  const removeButtonStyle = {
    padding: '6px 12px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
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
            Edit questions and answers
          </p>
        </div>
        <button
          style={{
            padding: '10px 16px',
            backgroundColor: isPublished ? '#dc2626' : '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
          disabled={publishingState}
          onMouseEnter={(e) => {
            if (!publishingState) {
              e.target.style.backgroundColor = isPublished ? '#b91c1c' : '#059669';
            }
          }}
          onMouseLeave={(e) => {
            if (!publishingState) {
              e.target.style.backgroundColor = isPublished ? '#dc2626' : '#10b981';
            }
          }}
          onClick={handleTogglePublish}
        >
          {isPublished ? (
            <>
              <Unlock size={16} />
              Unpublish
            </>
          ) : (
            <>
              <Lock size={16} />
              Publish
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* Assessment Info */}
        <div style={sectionStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
            <div>
              <span style={{ color: '#6b7280' }}>Type:</span>
              <strong style={{ color: '#111827', marginLeft: '8px' }}>{assessment.type}</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Total Points:</span>
              <strong style={{ color: '#111827', marginLeft: '8px' }}>{assessment.totalPoints}</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Passing Score:</span>
              <strong style={{ color: '#111827', marginLeft: '8px' }}>{assessment.passingScore}%</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Status:</span>
              <strong
                style={{
                  marginLeft: '8px',
                  color: isPublished ? '#15803d' : '#92400e',
                }}
              >
                {isPublished ? 'Published' : 'Draft'}
              </strong>
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div style={sectionStyle}>
          <div style={headerRowStyle}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              Questions ({questions.length})
            </h2>
            <button
              style={addButtonStyle}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#b91c1c')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc2626')}
              onClick={() => {
                resetForm();
                setShowQuestionModal(true);
              }}
            >
              <Plus size={16} />
              Add Question
            </button>
          </div>

          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
              <p>No questions yet. Add your first question to get started.</p>
            </div>
          ) : (
            <div>
              {questions.map((question, idx) => (
                <div key={question.id} style={questionCardStyle}>
                  <div style={questionHeaderStyle}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#6b7280',
                            backgroundColor: '#f3f4f6',
                            padding: '4px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          Q{idx + 1}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            backgroundColor: '#dbeafe',
                            color: '#0369a1',
                            padding: '4px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          {question.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          {question.points} pts
                        </span>
                      </div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#111827',
                        }}
                      >
                        {question.content}
                      </p>
                      {question.options && question.options.length > 0 && (
                        <div style={{ marginTop: '8px', paddingLeft: '12px', borderLeft: '2px solid #e5e7eb' }}>
                          {question.options.map((option, optIdx) => (
                            <div
                              key={optIdx}
                              style={{
                                fontSize: '13px',
                                color: option.isCorrect ? '#15803d' : '#6b7280',
                                marginBottom: '4px',
                              }}
                            >
                              {option.isCorrect && <strong>✓ </strong>}
                              {option.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      <button
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dbeafe',
                          color: '#0369a1',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#bfdbfe')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#dbeafe')}
                        onClick={() => handleEditQuestion(question)}
                      >
                        <Edit2 size={12} />
                        Edit
                      </button>
                      <button
                        style={removeButtonStyle}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#fecaca')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#fee2e2')}
                        onClick={() => handleDeleteQuestion(question.id)}
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Question Modal */}
      {showQuestionModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={modalTitleStyle}>
                {editingQuestionId ? 'Edit Question' : 'Add Question'}
              </h2>
              <button
                style={closeButtonStyle}
                onClick={() => {
                  setShowQuestionModal(false);
                  resetForm();
                }}
              >
                ✕
              </button>
            </div>

            <div style={modalContentStyle}>
              {/* Question Content */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Question *</label>
                <textarea
                  value={questionContent}
                  onChange={(e) => setQuestionContent(e.target.value)}
                  placeholder="Enter your question here..."
                  rows="3"
                  style={{ ...inputStyle, fontFamily: 'Arial, sans-serif' }}
                />
              </div>

              {/* Question Type and Points */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Question Type *</label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    style={inputStyle}
                  >
                    {questionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Points *</label>
                  <input
                    type="number"
                    value={questionPoints}
                    onChange={(e) => setQuestionPoints(e.target.value)}
                    min="1"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Explanation */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Explanation (Optional)</label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain the correct answer..."
                  rows="2"
                  style={{ ...inputStyle, fontFamily: 'Arial, sans-serif' }}
                />
              </div>

              {/* Options (for applicable question types) */}
              {['multiple_choice', 'multiple_select', 'true_false', 'dropdown'].includes(questionType) && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Options *</label>
                    <button
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f3f4f6',
                        color: '#111827',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                      onClick={handleAddOption}
                    >
                      + Add Option
                    </button>
                  </div>

                  {options.map((option, idx) => (
                    <div key={idx} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <input
                          type="checkbox"
                          checked={option.isCorrect}
                          onChange={(e) => handleOptionChange(idx, 'isCorrect', e.target.checked)}
                          style={{ marginTop: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                          title="Mark as correct answer"
                        />
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          style={{ flex: 1, ...inputStyle }}
                        />
                        {options.length > 1 && (
                          <button
                            style={{
                              ...removeButtonStyle,
                              marginTop: '0',
                              padding: '8px 12px',
                            }}
                            onClick={() => handleRemoveOption(idx)}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={modalFooterStyle}>
              <button
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setShowQuestionModal(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
                disabled={creatingQuestion}
                onMouseEnter={(e) => {
                  if (!creatingQuestion) e.target.style.backgroundColor = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  if (!creatingQuestion) e.target.style.backgroundColor = '#dc2626';
                }}
                onClick={handleSaveQuestion}
              >
                {creatingQuestion ? 'Saving...' : editingQuestionId ? 'Update Question' : 'Add Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentEditorPage;
