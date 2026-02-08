import React, { useState, useEffect } from 'react';
import { ArrowLeft, Book, Bell, BarChart3, FileText } from 'lucide-react';
import lessonService from '@/services/lessonService';
import StudentLessonViewerPage from './StudentLessonViewerPage';
import { toast } from 'sonner';

const StudentClassDetailsPage = ({ classItem, onBack }) => {
  const [activeTab, setActiveTab] = useState('lessons');
  const [lessons, setLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [completions, setCompletions] = useState({});

  // Tab configuration
  const tabs = [
    { id: 'lessons', label: 'Lessons', icon: Book },
     {id: 'assessments', label: 'Assessments', icon: FileText },
    { id: 'announcements', label: 'Announcements', icon: Bell }, 
    { id: 'grades', label: 'Grades', icon: BarChart3 },
  ];

  // Fetch lessons on component mount
  useEffect(() => {
    if (classItem?.id) {
      fetchLessons();
    }
  }, [classItem?.id]);

  const fetchLessons = async () => {
    setLoadingLessons(true);
    try {
      const res = await lessonService.getLessonsByClass(classItem.id);
      if (res?.data) {
        setLessons(res.data);
      }
    } catch (err) {
      console.error('Failed to load lessons', err);
      toast.error('Failed to load lessons');
    } finally {
      setLoadingLessons(false);
    }
  };

  // Fetch lesson completions for this class
  useEffect(() => {
    if (!classItem?.id || lessons.length === 0) return;

    const fetchCompletions = async () => {
      try {
        const res = await lessonService.getCompletedLessonsForClass(classItem.id);
        if (res?.data && Array.isArray(res.data)) {
          const completionMap = {};
          res.data.forEach(completion => {
            completionMap[completion.lessonId] = {
              isCompleted: true,
              completedAt: completion.completedAt,
            };
          });
          setCompletions(completionMap);
        }
      } catch (err) {
        console.error('Failed to load lesson completions', err);
        // Don't show error toast for this, it's optional
      }
    };

    fetchCompletions();
  }, [classItem?.id, lessons.length]);

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

  // Lesson list styles
  const lessonListStyle = {
    display: 'grid',
    gap: '12px',
  };

  const lessonItemStyle = {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#ffffff',
  };

  const lessonItemHoverStyle = {
    backgroundColor: '#f9fafb',
    borderColor: '#dc2626',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  };

  const lessonTitleStyle = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    marginBottom: '6px',
  };

  const lessonDescStyle = {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    marginBottom: '8px',
  };

  const lessonStatusStyle = (isDraft) => ({
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: isDraft ? '#fef3c7' : '#d1fae5',
    color: isDraft ? '#d97706' : '#059669',
  });

  const completionBadgeStyle = {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: '#dbeafe',
    color: '#0369a1',
    marginLeft: '8px',
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'lessons':
        return (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                Course Lessons
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
              </p>
            </div>

            {loadingLessons ? (
              <div style={placeholderStyle}>
                <p>Loading lessons...</p>
              </div>
            ) : lessons.length === 0 ? (
              <div style={placeholderStyle}>
                <p style={placeholderTitleStyle}>No Lessons Yet</p>
                <p style={placeholderDescStyle}>Your instructor hasn't created any lessons for this course.</p>
              </div>
            ) : (
              <div style={lessonListStyle}>
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    style={lessonItemStyle}
                    onMouseEnter={(e) => {
                      Object.assign(e.currentTarget.style, lessonItemHoverStyle);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => setSelectedLesson(lesson)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={lessonTitleStyle}>{lesson.title}</h3>
                        {lesson.description && <p style={lessonDescStyle}>{lesson.description}</p>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                        {completions[lesson.id]?.isCompleted && (
                          <span style={completionBadgeStyle}>
                            ✓ Completed
                          </span>
                        )}
                        <span style={lessonStatusStyle(lesson.isDraft)}>
                          {lesson.isDraft ? 'Draft' : 'Published'}
                        </span>
                      </div>
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
            <p style={placeholderTitleStyle}>Announcements</p>
            <p style={placeholderDescStyle}>No announcements yet. Check back soon for updates from your instructor.</p>
          </div>
        );

      case 'grades':
        return (
          <div style={placeholderStyle}>
            <p style={placeholderTitleStyle}>Grades</p>
            <p style={placeholderDescStyle}>Your grades will appear here as assignments are graded.</p>
          </div>
        );

      default:
        return null;
    }
  };

  return selectedLesson ? (
    <StudentLessonViewerPage
      lesson={selectedLesson}
      classItem={classItem}
      allLessons={lessons}
      onBack={() => setSelectedLesson(null)}
    />
  ) : (
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
            {classItem?.grade || 'Grade —'} • {classItem?.schedule || '—'}
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
                  e.currentTarget.style.color = '#111827';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#6b7280';
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
    </div>
  );
};

export default StudentClassDetailsPage;
