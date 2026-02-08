import React, { useState, useEffect } from 'react';
import { ArrowLeft, Book, BarChart3, Bell, Users, FileText, Plus, Trash2, Edit2, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import adminService from '@/services/adminService';
import lessonService from '@/services/lessonService';
import assessmentService from '@/services/assessmentService';
import LessonEditorPage from './LessonEditorPage';
import AssessmentEditorPage from './AssessmentEditorPage';

const ClassDetailsPage = ({ classItem, onBack }) => {
  const [activeTab, setActiveTab] = useState('lessons');
  const [loading, setLoading] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [addingStudents, setAddingStudents] = useState(false);

  // Lesson states
  const [lessons, setLessons] = useState([]);
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDesc, setNewLessonDesc] = useState('');
  const [creatingLesson, setCreatingLesson] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null); // For navigation to LessonEditorPage

  // Assessment states
  const [assessments, setAssessments] = useState([]);
  const [showCreateAssessmentModal, setShowCreateAssessmentModal] = useState(false);
  const [newAssessmentTitle, setNewAssessmentTitle] = useState('');
  const [newAssessmentDesc, setNewAssessmentDesc] = useState('');
  const [newAssessmentType, setNewAssessmentType] = useState('quiz');
  const [newAssessmentPoints, setNewAssessmentPoints] = useState(100);
  const [newAssessmentPassingScore, setNewAssessmentPassingScore] = useState(60);
  const [creatingAssessment, setCreatingAssessment] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);

  // Tab configuration with icons
  const tabs = [
    { id: 'lessons', label: 'Lessons', icon: Book },
    { id: 'assessments', label: 'Assessments', icon: FileText },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'gradebook', label: 'Gradebook', icon: BarChart3 },
    { id: 'students', label: 'Students', icon: Users },
  ];

  // Fetch enrolled students when component mounts or classItem changes
  useEffect(() => {
    if (classItem?.id) {
      fetchEnrolledStudents();
      fetchLessons();
      fetchAssessments();
    }
  }, [classItem?.id]);

  // Fetch enrolled students when students tab is active
  useEffect(() => {
    if (activeTab === 'students' && classItem?.id && enrolledStudents.length === 0) {
      fetchEnrolledStudents();
    }
  }, [activeTab, classItem?.id]);

  // Fetch candidates when modal opens
  useEffect(() => {
    if (showAddModal && classItem?.id) {
      fetchCandidates();
    }
  }, [showAddModal, classItem?.id]);

  const fetchEnrolledStudents = async () => {
    setLoading(true);
    try {
      const res = await adminService.getClassEnrollments(classItem.id);
      if (res?.data) {
        setEnrolledStudents(res.data);
      }
    } catch (err) {
      console.error('Failed to load enrolled students', err);
      toast.error('Failed to load enrolled students');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await adminService.getClassCandidates(classItem.id);
      if (res?.data) {
        setCandidates(res.data);
        setSelectedStudents([]);
      }
    } catch (err) {
      console.error('Failed to load candidates', err);
      toast.error('Failed to load available students');
    }
  };

  const handleAddStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setAddingStudents(true);
    const addedCount = { success: 0, failed: 0 };

    for (const studentId of selectedStudents) {
      try {
        await adminService.enrollStudentInClass(classItem.id, studentId);
        addedCount.success += 1;
      } catch (err) {
        console.error(`Failed to add student ${studentId}`, err);
        addedCount.failed += 1;
      }
    }

    setAddingStudents(false);

    if (addedCount.failed === 0) {
      toast.success(`Successfully added ${addedCount.success} student(s)`);
      setShowAddModal(false);
      fetchEnrolledStudents();
    } else {
      toast.error(`Added ${addedCount.success}, failed ${addedCount.failed}`);
      fetchEnrolledStudents();
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm('Remove this student from the class?')) return;

    try {
      await adminService.removeStudentFromClass(classItem.id, studentId);
      toast.success('Student removed successfully');
      fetchEnrolledStudents();
    } catch (err) {
      console.error('Failed to remove student', err);
      toast.error('Failed to remove student');
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const fetchLessons = async () => {
    try {
      const res = await lessonService.getLessonsByClass(classItem.id);
      if (res?.data) {
        setLessons(res.data);
      }
    } catch (err) {
      console.error('Failed to load lessons', err);
    }
  };

  const handleCreateLesson = async () => {
    if (!newLessonTitle.trim()) {
      toast.error('Please enter a lesson title');
      return;
    }

    setCreatingLesson(true);
    try {
      const res = await lessonService.createLesson({
        title: newLessonTitle,
        description: newLessonDesc,
        classId: classItem.id,
      });
      if (res?.data) {
        toast.success('Lesson created successfully');
        setNewLessonTitle('');
        setNewLessonDesc('');
        setShowCreateLessonModal(false);
        fetchLessons();
      }
    } catch (err) {
      console.error('Failed to create lesson', err);
      toast.error('Failed to create lesson');
    } finally {
      setCreatingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Delete this lesson? This action cannot be undone.')) return;

    try {
      await lessonService.deleteLesson(lessonId);
      toast.success('Lesson deleted successfully');
      fetchLessons();
    } catch (err) {
      console.error('Failed to delete lesson', err);
      toast.error('Failed to delete lesson');
    }
  };

  const handleEditLesson = async (lesson) => {
    try {
      const res = await lessonService.getLessonById(lesson.id);
      if (res?.data) {
        setEditingLesson(res.data);
      }
    } catch (err) {
      console.error('Failed to load lesson', err);
      toast.error('Failed to load lesson details');
    }
  };

  const fetchAssessments = async () => {
    try {
      const res = await assessmentService.getAssessmentsByClass(classItem.id);
      if (res?.data) {
        setAssessments(res.data);
      }
    } catch (err) {
      console.error('Failed to load assessments', err);
    }
  };

  const handleCreateAssessment = async () => {
    if (!newAssessmentTitle.trim()) {
      toast.error('Please enter an assessment title');
      return;
    }

    setCreatingAssessment(true);
    try {
      const res = await assessmentService.createAssessment({
        title: newAssessmentTitle,
        description: newAssessmentDesc,
        classId: classItem.id,
        type: newAssessmentType,
        totalPoints: parseInt(newAssessmentPoints),
        passingScore: parseInt(newAssessmentPassingScore),
      });
      if (res?.data) {
        toast.success('Assessment created successfully');
        setNewAssessmentTitle('');
        setNewAssessmentDesc('');
        setNewAssessmentType('quiz');
        setNewAssessmentPoints(100);
        setNewAssessmentPassingScore(60);
        setShowCreateAssessmentModal(false);
        fetchAssessments();
      }
    } catch (err) {
      console.error('Failed to create assessment', err);
      toast.error('Failed to create assessment');
    } finally {
      setCreatingAssessment(false);
    }
  };

  const handleDeleteAssessment = async (assessmentId) => {
    if (!window.confirm('Delete this assessment? This action cannot be undone.')) return;

    try {
      await assessmentService.deleteAssessment(assessmentId);
      toast.success('Assessment deleted successfully');
      fetchAssessments();
    } catch (err) {
      console.error('Failed to delete assessment', err);
      toast.error('Failed to delete assessment');
    }
  };

  // Container styles
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

  const titleContainerStyle = {
    flex: 1,
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0,
  };

  const subtitleStyle = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0',
  };

  // Tab navigation styles
  const tabNavigationStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    padding: '0 32px',
    gap: '8px',
    overflowX: 'auto',
  };

  const tabButtonStyle = (isActive) => ({
    padding: '16px 20px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: isActive ? '#dc2626' : '#6b7280',
    borderBottom: isActive ? '3px solid #dc2626' : '3px solid transparent',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  });

  const tabIconStyle = {
    width: '16px',
    height: '16px',
  };

  // Content styles
  const contentStyle = {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const sectionStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const placeholderStyle = {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#9ca3af',
  };

  const placeholderTitleStyle = {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
  };

  const placeholderDescStyle = {
    fontSize: '14px',
  };

  // Students tab styles
  const studentsHeaderStyle = {
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
    transition: 'background-color 0.2s',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
  };

  const theadStyle = {
    backgroundColor: '#f3f4f6',
    borderBottom: '2px solid #e5e7eb',
  };

  const thStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
  };

  const tbodyTrStyle = {
    borderBottom: '1px solid #e5e7eb',
  };

  const tdStyle = {
    padding: '16px',
    fontSize: '14px',
    color: '#111827',
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
    transition: 'all 0.2s',
  };

  // Modal styles
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
    maxWidth: '600px',
    maxHeight: '80vh',
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

  const cancelButtonStyle = {
    padding: '10px 16px',
    backgroundColor: '#f3f4f6',
    color: '#111827',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  };

  const submitButtonStyle = {
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

  const candidateItemStyle = {
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const checkboxStyle = {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'lessons':
        return (
          <div>
            <div style={studentsHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                Lessons ({lessons.length})
              </h3>
              <button
                style={addButtonStyle}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#b91c1c')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc2626')}
                onClick={() => setShowCreateLessonModal(true)}
              >
                <Plus size={16} />
                Create Lesson
              </button>
            </div>

            {lessons.length === 0 ? (
              <div style={placeholderStyle}>
                <div style={placeholderTitleStyle}>No lessons yet</div>
                <div style={placeholderDescStyle}>Create your first lesson to get started teaching this class.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    style={{
                      padding: '16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: lesson.isDraft ? '#fafafa' : '#ffffff',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280' }}>
                          Lesson {idx + 1}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                          {lesson.title}
                        </h4>
                        {lesson.isDraft && (
                          <span style={{
                            fontSize: '11px',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontWeight: '600',
                          }}>
                            DRAFT
                          </span>
                        )}
                      </div>
                      {lesson.description && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                          {lesson.description}
                        </p>
                      )}
                      <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                        {lesson.contentBlocks?.length || 0} content block(s)
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      <button
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#3b82f6',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#2563eb')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#3b82f6')}
                        onClick={() => handleEditLesson(lesson)}
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        style={removeButtonStyle}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#fecaca')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#fee2e2')}
                        onClick={() => handleDeleteLesson(lesson.id)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'assessments':
        return (
          <div>
            <div style={studentsHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                Assessments ({assessments.length})
              </h3>
              <button
                style={addButtonStyle}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#b91c1c')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc2626')}
                onClick={() => setShowCreateAssessmentModal(true)}
              >
                <Plus size={16} />
                Create Assessment
              </button>
            </div>

            {assessments.length === 0 ? (
              <div style={placeholderStyle}>
                <div style={placeholderTitleStyle}>No assessments yet</div>
                <div style={placeholderDescStyle}>Create your first assessment to evaluate student progress.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {assessments.map((assessment, idx) => (
                  <div
                    key={assessment.id}
                    style={{
                      padding: '16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: !assessment.isPublished ? '#fafafa' : '#ffffff',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280' }}>
                          Assessment {idx + 1}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                          {assessment.title}
                        </h4>
                        <span style={{
                          fontSize: '11px',
                          backgroundColor: assessment.isPublished ? '#dcfce7' : '#fef3c7',
                          color: assessment.isPublished ? '#15803d' : '#92400e',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: '600',
                        }}>
                          {assessment.isPublished ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                      </div>
                      {assessment.description && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                          {assessment.description}
                        </p>
                      )}
                      <div style={{ margin: '8px 0 0 0', display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                        <span>Type: <strong>{assessment.type}</strong></span>
                        <span>Points: <strong>{assessment.totalPoints}</strong></span>
                        <span>Passing: <strong>{assessment.passingScore}%</strong></span>
                        <span>Questions: <strong>{assessment.questions?.length || 0}</strong></span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      <button
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#3b82f6',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#2563eb')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#3b82f6')}
                        onClick={() => setEditingAssessment(assessment)}
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        style={removeButtonStyle}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#fecaca')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#fee2e2')}
                        onClick={() => handleDeleteAssessment(assessment.id)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'announcements':
        return (
          <div style={placeholderStyle}>
            <div style={placeholderTitleStyle}>📢 Announcements</div>
            <div style={placeholderDescStyle}>No announcements posted yet. Share important updates with your class.</div>
          </div>
        );
      case 'gradebook':
        return (
          <div style={placeholderStyle}>
            <div style={placeholderTitleStyle}>📊 Gradebook</div>
            <div style={placeholderDescStyle}>Gradebook will display student grades and performance metrics here.</div>
          </div>
        );
      case 'students':
        return (
          <div>
            <div style={studentsHeaderStyle}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                Enrolled Students ({enrolledStudents.length})
              </h3>
              <button
                style={addButtonStyle}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#b91c1c')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc2626')}
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={16} />
                Add Student
              </button>
            </div>

            {loading ? (
              <div style={placeholderStyle}>Loading students...</div>
            ) : enrolledStudents.length === 0 ? (
              <div style={placeholderStyle}>
                <div style={placeholderTitleStyle}>No students enrolled yet</div>
                <div style={placeholderDescStyle}>Add students from your section to get started.</div>
              </div>
            ) : (
              <table style={tableStyle}>
                <thead style={theadStyle}>
                  <tr>
                    <th style={thStyle}>Student Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Grade</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledStudents.map((enrollment) => (
                    <tr key={enrollment.id} style={tbodyTrStyle}>
                      <td style={tdStyle}>
                        {enrollment.student.firstName} {enrollment.student.lastName}
                      </td>
                      <td style={tdStyle}>{enrollment.student.email}</td>
                      <td style={tdStyle}>{enrollment.student.profile?.gradeLevel || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          style={removeButtonStyle}
                          onMouseEnter={(e) => (e.target.style.backgroundColor = '#fecaca')}
                          onMouseLeave={(e) => (e.target.style.backgroundColor = '#fee2e2')}
                          onClick={() => handleRemoveStudent(enrollment.studentId)}
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // If editing a lesson, show the LessonEditorPage instead
  if (editingLesson) {
    return (
      <LessonEditorPage
        lesson={editingLesson}
        classId={classItem.id}
        onBack={() => {
          setEditingLesson(null);
          fetchLessons(); // Reload lessons in case edits were made
        }}
      />
    );
  }

  // If editing an assessment, show the AssessmentEditorPage instead
  if (editingAssessment) {
    return (
      <AssessmentEditorPage
        assessment={editingAssessment}
        classId={classItem.id}
        onBack={() => {
          setEditingAssessment(null);
          fetchAssessments(); // Reload assessments in case edits were made
        }}
      />
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header with Back Button and Class Title */}
      <div style={headerStyle}>
        <button
          style={backButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={onBack}
        >
          <ArrowLeft size={20} style={{ color: '#111827' }} />
        </button>
        <div style={titleContainerStyle}>
          <h1 style={titleStyle}>{classItem?.name || 'Class Details'}</h1>
          <p style={subtitleStyle}>
            {classItem?.grade || 'Grade —'} • {enrolledStudents.length > 0 ? enrolledStudents.length : (classItem?.students || 0)} students
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={tabNavigationStyle}>
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              style={tabButtonStyle(activeTab === tab.id)}
              onClick={() => setActiveTab(tab.id)}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.color = '#111827';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.color = '#6b7280';
                }
              }}
            >
              <IconComponent style={tabIconStyle} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={contentStyle}>
        <div style={sectionStyle}>
          {renderTabContent()}
        </div>
      </div>

      {/* Create Lesson Modal */}
      {showCreateLessonModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={modalTitleStyle}>Create New Lesson</h2>
              <button
                style={closeButtonStyle}
                onClick={() => setShowCreateLessonModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={modalContentStyle}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                  Lesson Title *
                </label>
                <input
                  type="text"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="e.g., Introduction to Algebra"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={newLessonDesc}
                  onChange={(e) => setNewLessonDesc(e.target.value)}
                  placeholder="Brief description of this lesson..."
                  rows="4"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Arial, sans-serif',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={modalFooterStyle}>
              <button
                style={cancelButtonStyle}
                onClick={() => setShowCreateLessonModal(false)}
              >
                Cancel
              </button>
              <button
                style={submitButtonStyle}
                disabled={creatingLesson}
                onMouseEnter={(e) => {
                  if (!creatingLesson) {
                    e.target.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!creatingLesson) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
                onClick={handleCreateLesson}
              >
                {creatingLesson ? 'Creating...' : 'Create Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Add Students Modal */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={modalTitleStyle}>Add Students to Class</h2>
              <button
                style={closeButtonStyle}
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={modalContentStyle}>
              {candidates.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>
                  <p>No available students to add</p>
                  <p style={{ fontSize: '12px', marginTop: '8px' }}>
                    All students in this section are already enrolled in this class.
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                    Select students from your section to enroll them in this class:
                  </p>
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      style={candidateItemStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      onClick={() => toggleStudentSelection(candidate.studentId)}
                    >
                      <input
                        type="checkbox"
                        style={checkboxStyle}
                        checked={selectedStudents.includes(candidate.studentId)}
                        onChange={() => toggleStudentSelection(candidate.studentId)}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                          {candidate.student.firstName} {candidate.student.lastName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {candidate.student.email}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {candidate.student.profile?.gradeLevel || 'Grade —'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={modalFooterStyle}>
              <button
                style={cancelButtonStyle}
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                style={submitButtonStyle}
                disabled={selectedStudents.length === 0 || addingStudents}
                onMouseEnter={(e) => {
                  if (selectedStudents.length > 0 && !addingStudents) {
                    e.target.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedStudents.length > 0 && !addingStudents) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
                onClick={handleAddStudents}
              >
                {addingStudents ? 'Adding...' : `Add ${selectedStudents.length} Student(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Assessment Modal */}
      {showCreateAssessmentModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={modalTitleStyle}>Create New Assessment</h2>
              <button
                style={closeButtonStyle}
                onClick={() => setShowCreateAssessmentModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={modalContentStyle}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                  Assessment Title *
                </label>
                <input
                  type="text"
                  value={newAssessmentTitle}
                  onChange={(e) => setNewAssessmentTitle(e.target.value)}
                  placeholder="e.g., Algebra Quiz 1"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={newAssessmentDesc}
                  onChange={(e) => setNewAssessmentDesc(e.target.value)}
                  placeholder="Brief description of this assessment..."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Arial, sans-serif',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                    Assessment Type *
                  </label>
                  <select
                    value={newAssessmentType}
                    onChange={(e) => setNewAssessmentType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="quiz">Quiz</option>
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                    Total Points *
                  </label>
                  <input
                    type="number"
                    value={newAssessmentPoints}
                    onChange={(e) => setNewAssessmentPoints(e.target.value)}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '6px', display: 'block' }}>
                  Passing Score (%) *
                </label>
                <input
                  type="number"
                  value={newAssessmentPassingScore}
                  onChange={(e) => setNewAssessmentPassingScore(e.target.value)}
                  min="0"
                  max="100"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={modalFooterStyle}>
              <button
                style={cancelButtonStyle}
                onClick={() => setShowCreateAssessmentModal(false)}
              >
                Cancel
              </button>
              <button
                style={submitButtonStyle}
                disabled={creatingAssessment}
                onMouseEnter={(e) => {
                  if (!creatingAssessment) {
                    e.target.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!creatingAssessment) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
                onClick={handleCreateAssessment}
              >
                {creatingAssessment ? 'Creating...' : 'Create Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetailsPage;
