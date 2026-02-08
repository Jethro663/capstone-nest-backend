import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import lessonService from '@/services/lessonService';
import { toast } from 'sonner';

const StudentLessonViewerPage = ({ lesson, classItem, onBack, allLessons = [] }) => {
  const [contentBlocks, setContentBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Fetch lesson content blocks on mount
  useEffect(() => {
    if (lesson?.id) {
      fetchLessonContent();
      fetchCompletionStatus();
    }
  }, [lesson?.id]);

  // Track scroll position
  useEffect(() => {
    const handleScroll = (e) => {
      const scrollContainer = e.target;
      const scrollPercentage = (scrollContainer.scrollTop / (scrollContainer.scrollHeight - scrollContainer.clientHeight)) * 100;
      setScrollPosition(Math.min(scrollPercentage, 100));
    };

    const scrollableDiv = document.getElementById('lesson-content-container');
    if (scrollableDiv) {
      scrollableDiv.addEventListener('scroll', handleScroll);
      return () => scrollableDiv.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const fetchLessonContent = async () => {
    setLoading(true);
    try {
      // Fetch lesson with detail (assuming endpoint returns blocks)
      const res = await lessonService.getLessonById(lesson.id);
      if (res?.data && res.data.contentBlocks) {
        setContentBlocks(res.data.contentBlocks);
      }
    } catch (err) {
      console.error('Failed to load lesson content', err);
      toast.error('Failed to load lesson content');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to safely convert content to string
  const getContentString = (content) => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (typeof content === 'object') {
      // If it's an empty object, return empty string
      if (Object.keys(content).length === 0) return '';
      // Otherwise stringify it
      return typeof content === 'object' ? JSON.stringify(content) : String(content);
    }
    return String(content);
  };

  // Fetch completion status from backend
  const fetchCompletionStatus = async () => {
    try {
      const res = await lessonService.checkLessonCompletion(lesson.id);
      if (res?.data) {
        setIsCompleted(res.data.isCompleted);
      }
    } catch (err) {
      console.error('Failed to load completion status', err);
      // Don't show error toast for this, it's optional
    }
  };

  // Mark lesson as complete and save to backend
  const handleMarkComplete = async () => {
    try {
      await lessonService.markLessonComplete(lesson.id);
      setIsCompleted(true);
      toast.success('Great job! Lesson marked as complete.');
    } catch (err) {
      console.error('Failed to mark lesson complete', err);
      toast.error('Failed to save completion status');
    }
  };

  const currentLessonIndex = allLessons.findIndex(l => l.id === lesson.id);
  const previousLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  // ===== STYLES =====
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
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
    color: '#111827',
  };

  const headerTitleStyle = {
    flex: 1,
  };

  const headerLessonTitleStyle = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  };

  const headerClassNameStyle = {
    fontSize: '12px',
    color: '#6b7280',
    margin: '2px 0 0 0',
  };

  const progressBarStyle = {
    height: '3px',
    backgroundColor: '#e5e7eb',
    width: '100%',
  };

  const progressFillStyle = {
    height: '100%',
    backgroundColor: '#dc2626',
    width: `${scrollPosition}%`,
    transition: 'width 0.1s ease',
  };

  const contentContainerStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '32px 20px',
  };

  const contentWrapperStyle = {
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
  };

  const lessonHeaderStyle = {
    marginBottom: '40px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e5e7eb',
  };

  const lessonTitleStyle = {
    fontSize: '32px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 12px 0',
    lineHeight: '1.2',
  };

  const lessonDescStyle = {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.6',
  };

  const blocksContainerStyle = {
    display: 'grid',
    gap: '32px',
  };

  const blockStyle = {
    animation: 'fadeIn 0.3s ease-in',
  };

  const textBlockStyle = {
    fontSize: '16px',
    color: '#374151',
    lineHeight: '1.8',
    margin: 0,
  };

  const imageBlockStyle = {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  };

  const imageCaptionStyle = {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '8px',
    fontStyle: 'italic',
    textAlign: 'center',
  };

  const videoContainerStyle = {
    position: 'relative',
    width: '100%',
    paddingBottom: '56.25%', // 16:9 aspect ratio
    height: 0,
    overflow: 'hidden',
    borderRadius: '8px',
    backgroundColor: '#000',
  };

  const videoIframeStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  };

  const blockContainerStyle = {
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  };

  const blockTitleStyle = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 12px 0',
  };

  const dividerStyle = {
    height: '2px',
    backgroundColor: '#e5e7eb',
    margin: '24px 0',
    border: 'none',
  };

  const fileCardStyle = {
    padding: '16px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const bottomSectionStyle = {
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    padding: '24px 20px',
    marginTop: 'auto',
  };

  const bottomWrapperStyle = {
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
  };

  const completionAreaStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e5e7eb',
  };

  const completionTextStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const completionButtonStyle = {
    padding: '10px 16px',
    backgroundColor: isCompleted ? '#dcfce7' : '#dc2626',
    color: isCompleted ? '#166534' : '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: isCompleted ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  };

  const navigationAreaStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
  };

  const navButtonStyle = (disabled) => ({
    padding: '10px 16px',
    backgroundColor: disabled ? '#f3f4f6' : '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: disabled ? '#9ca3af' : '#111827',
    transition: 'all 0.2s',
    opacity: disabled ? 0.5 : 1,
  });

  // ===== CONTENT BLOCK RENDERERS =====
  const renderContentBlock = (block, index) => {
    switch (block.type) {
      case 'text':
       
        const textContent = getContentString(block.content);
        if (!textContent) {
          return (
            <div key={block.id || index} style={blockStyle}>
              <p style={{ color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>No text content</p>
            </div>
          );
        }
        return (
          <div key={block.id || index} style={blockStyle}>
            <p style={textBlockStyle}>{textContent}</p>
          </div>
        );

      case 'image':
        const imageSrc = getContentString(block.content);
        if (!imageSrc) {
          return (
            <div key={block.id || index} style={blockStyle}>
              <div style={{ ...blockContainerStyle, backgroundColor: '#f3f4f6', textAlign: 'center' }}>
                <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>🖼️ No image content</p>
              </div>
            </div>
          );
        }
        return (
          <div key={block.id || index} style={blockStyle}>
            <img
              src={imageSrc}
              alt={block.metadata?.caption || 'Lesson image'}
              style={imageBlockStyle}
              onError={(e) => {
                e.target.style.border = '2px solid #dc2626';
                e.target.style.backgroundColor = '#fee2e2';
              }}
            />
            {block.metadata?.caption && (
              <p style={imageCaptionStyle}>{block.metadata.caption}</p>
            )}
          </div>
        );

      case 'video':
        const videoUrl = getContentString(block.content);
        
        // Handle invalid video URLs
        if (!videoUrl) {
          return (
            <div key={block.id || index} style={blockStyle}>
              <div style={blockContainerStyle}>
                <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>
                  ⚠️ Invalid video content
                </p>
              </div>
            </div>
          );
        }

        const embedUrl = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')
          ? videoUrl.replace('watch?v=', 'embed/')
          : videoUrl;

        return (
          <div key={block.id || index} style={blockStyle}>
            <div style={videoContainerStyle}>
              <iframe
                style={videoIframeStyle}
                src={embedUrl}
                title={block.metadata?.title || 'Embedded video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            {block.metadata?.title && (
              <p style={{ ...imageCaptionStyle, marginTop: '12px' }}>
                {block.metadata.title}
              </p>
            )}
          </div>
        );

      case 'question':
        
        const questionContent = getContentString(block.content.text);
        if (!questionContent) {
          return (
            <div key={block.id || index} style={blockStyle}>
              <div style={blockContainerStyle}>
                <p style={{ color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>No question content</p>
              </div>
            </div>
          );
        }
        return (
          <div key={block.id || index} style={blockStyle}>
            <div style={blockContainerStyle}>
              <h3 style={blockTitleStyle}>{questionContent}</h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                {block.metadata?.type === 'quiz' ? '(Quiz Question)' : '(Discussion Question)'}
              </p>
              {block.metadata?.type === 'quiz' && (
                <div style={{ marginTop: '12px' }}>
                  {/* TODO: Implement quiz answering */}
                  <p style={{ fontSize: '12px', color: '#dc2626', fontStyle: 'italic' }}>
                    Quiz features coming soon
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 'file':
        const fileContent = getContentString(block.content);
        const filename = block.metadata?.filename || fileContent || 'Download File';
        if (!fileContent && !block.metadata?.filename) {
          return (
            <div key={block.id || index} style={blockStyle}>
              <div style={blockContainerStyle}>
                <p style={{ color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>No file content</p>
              </div>
            </div>
          );
        }
        return (
          <div key={block.id || index} style={blockStyle}>
            <div style={fileCardStyle}>
              <div style={{ fontSize: '24px' }}>📎</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
                  {filename}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  {block.metadata?.filesize || 'Click to download'}
                </p>
              </div>
              <div style={{ fontSize: '18px' }}>↓</div>
            </div>
          </div>
        );

      case 'divider':
        return <hr key={block.id || index} style={dividerStyle} />;

      default:
        return (
          <div key={block.id || index} style={blockStyle}>
            <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>
              Unknown block type: {block.type}
            </p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <button style={backButtonStyle} onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <div style={headerTitleStyle}>
            <p style={headerLessonTitleStyle}>Loading...</p>
          </div>
        </div>
        <div style={{ ...contentContainerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#6b7280' }}>Loading lesson content...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Sticky Header */}
      <div style={headerStyle}>
        <button
          style={backButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={onBack}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={headerTitleStyle}>
          <p style={headerLessonTitleStyle}>{lesson?.title || 'Lesson'}</p>
          <p style={headerClassNameStyle}>{classItem?.name || 'Course'}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={progressBarStyle}>
        <div style={progressFillStyle}></div>
      </div>

      {/* Main Content - Long Scroll */}
      <div id="lesson-content-container" style={contentContainerStyle}>
        <div style={contentWrapperStyle}>
          {/* Lesson Info */}
          <div style={lessonHeaderStyle}>
            <h1 style={lessonTitleStyle}>{lesson?.title}</h1>
            {lesson?.description && (
              <p style={lessonDescStyle}>{getContentString(lesson.description)}</p>
            )}
          </div>

          {/* Content Blocks */}
          {contentBlocks.length > 0 ? (
            <div style={blocksContainerStyle}>
              {contentBlocks.map((block, index) => renderContentBlock(block, index))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              <p>No content blocks in this lesson yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section - Completion & Navigation */}
      <div style={bottomSectionStyle}>
        <div style={bottomWrapperStyle}>
          {/* Completion Status */}
          <div style={completionAreaStyle}>
            <div style={completionTextStyle}>
              {isCompleted && <CheckCircle2 size={20} style={{ color: '#10b981' }} />}
              <span style={{ fontSize: '14px', color: isCompleted ? '#10b981' : '#6b7280' }}>
                {isCompleted ? 'Lesson completed!' : 'Mark this lesson as complete when finished'}
              </span>
            </div>
            <button
              style={completionButtonStyle}
              onClick={handleMarkComplete}
              disabled={isCompleted}
              onMouseEnter={(e) => {
                if (!isCompleted) {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                }
              }}
              onMouseLeave={(e) => {
                if (!isCompleted) {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }
              }}
            >
              {isCompleted ? '✓ Completed' : 'Mark Complete'}
            </button>
          </div>

          {/* Lesson Navigation */}
          {(previousLesson || nextLesson) && (
            <div style={navigationAreaStyle}>
              {previousLesson ? (
                <button
                  style={navButtonStyle(false)}
                  onClick={() => {
                    // TODO: Navigate to previous lesson
                    onBack();
                  }}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
              ) : (
                <button style={navButtonStyle(true)} disabled>
                  <ChevronLeft size={16} />
                  Previous
                </button>
              )}

              {nextLesson ? (
                <button
                  style={navButtonStyle(false)}
                  onClick={() => {
                    // TODO: Navigate to next lesson
                    onBack();
                  }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button style={navButtonStyle(true)} disabled>
                  Next
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fade-in animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default StudentLessonViewerPage;
