import React, { useState, useEffect } from 'react';
import { ArrowLeft, Book, BarChart3, Bell, Users, FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import adminService from '@/services/adminService';

const ClassDetailsPage = ({ classItem, onBack }) => {
  const [activeTab, setActiveTab] = useState('lessons');
  const [loading, setLoading] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [addingStudents, setAddingStudents] = useState(false);

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
          <div style={placeholderStyle}>
            <div style={placeholderTitleStyle}>📚 Lessons</div>
            <div style={placeholderDescStyle}>No lessons added yet. Create your first lesson to get started.</div>
          </div>
        );
      case 'assessments':
        return (
          <div style={placeholderStyle}>
            <div style={placeholderTitleStyle}>📝 Assessments</div>
            <div style={placeholderDescStyle}>No assessments created yet. Add assessments to evaluate student progress.</div>
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
    </div>
  );
};

export default ClassDetailsPage;
