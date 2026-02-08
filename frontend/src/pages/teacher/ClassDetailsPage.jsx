import React, { useState, useEffect } from 'react';
import { ArrowLeft, Book, BarChart3, Bell, Users, FileText } from 'lucide-react';

const ClassDetailsPage = ({ classItem, onBack }) => {
  const [activeTab, setActiveTab] = useState('lessons');
  const [loading, setLoading] = useState(false);

  // Tab configuration with icons
  const tabs = [
    { id: 'lessons', label: 'Lessons', icon: Book },
    { id: 'assessments', label: 'Assessments', icon: FileText },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'gradebook', label: 'Gradebook', icon: BarChart3 },
    { id: 'students', label: 'Students', icon: Users },
  ];

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
          <div style={placeholderStyle}>
            <div style={placeholderTitleStyle}>👥 Students</div>
            <div style={placeholderDescStyle}>Student roster and details will be displayed here.</div>
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
          onMouseEnter={(e) => (e.target.parentElement.style.backgroundColor = '#f3f4f6')}
          onMouseLeave={(e) => (e.target.parentElement.style.backgroundColor = 'transparent')}
          onClick={onBack}
        >
          <ArrowLeft size={20} style={{ color: '#111827' }} />
        </button>
        <div style={titleContainerStyle}>
          <h1 style={titleStyle}>{classItem?.name || 'Class Details'}</h1>
          <p style={subtitleStyle}>{classItem?.grade || 'Grade —'} • {classItem?.students || 0} students</p>
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
    </div>
  );
};

export default ClassDetailsPage;
