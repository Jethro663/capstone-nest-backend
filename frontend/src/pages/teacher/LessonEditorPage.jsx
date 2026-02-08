import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, Save, Lock, Unlock, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import lessonService from '@/services/lessonService';

const LessonEditorPage = ({ lesson, classId, onBack }) => {
  const [lessonData, setLessonData] = useState(lesson);
  const [contentBlocks, setContentBlocks] = useState(lesson?.contentBlocks || []);
  const [saving, setSaving] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [showAddBlockMenu, setShowAddBlockMenu] = useState(false);
  const [blockTypeToAdd, setBlockTypeToAdd] = useState(null);

  // Refs & menu positioning for add-block menu (responsive UX)
  const addButtonRef = useRef(null);
  const addMenuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, position: 'bottom' });

  // Toggle add menu with computed position
  const toggleAddMenu = (open) => {
    if (!open) {
      setShowAddBlockMenu(false);
      return;
    }

    if (!addButtonRef.current) {
      setShowAddBlockMenu(true);
      return;
    }

    const rect = addButtonRef.current.getBoundingClientRect();
    const menuWidth = 220; // ideal width
    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
    const spaceBelow = window.innerHeight - rect.bottom;
    const position = spaceBelow < 260 ? 'top' : 'bottom';
    const top = position === 'bottom' ? rect.bottom + 8 : Math.max(8, rect.top - 8 - 260);

    setMenuStyle({ top, left, position });
    setShowAddBlockMenu(true);
  };

  // Close menu on outside click or ESC
  useEffect(() => {
    if (!showAddBlockMenu) return;

    const onClickOut = (e) => {
      if (
        addMenuRef.current && !addMenuRef.current.contains(e.target) &&
        addButtonRef.current && !addButtonRef.current.contains(e.target)
      ) {
        setShowAddBlockMenu(false);
      }
    };

    const onKey = (e) => {
      if (e.key === 'Escape') setShowAddBlockMenu(false);
    };

    window.addEventListener('mousedown', onClickOut);
    window.addEventListener('touchstart', onClickOut);
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('mousedown', onClickOut);
      window.removeEventListener('touchstart', onClickOut);
      window.removeEventListener('keydown', onKey);
    };
  }, [showAddBlockMenu]);

  const blockTypes = [
    { id: 'text', label: 'Text Block', icon: '📝' },
    { id: 'image', label: 'Image', icon: '🖼️' },
    { id: 'video', label: 'Video', icon: '🎥' },
    { id: 'question', label: 'Question', icon: '❓' },
    { id: 'file', label: 'File', icon: '📄' },
    { id: 'divider', label: 'Divider', icon: '─' },
  ];

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: 'Arial, sans-serif',
  };

  const headerStyle = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '20px 32px',
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
    color: '#111827',
  };

  const titleContainerStyle = {
    flex: 1,
  };

  const contentStyle = {
    padding: '32px',
    maxWidth: '1000px',
    margin: '0 auto',
  };

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const labelStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
    display: 'block',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const buttonStyle = {
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

  const blockItemStyle = (isEditing) => ({
    padding: '16px',
    border: isEditing ? '2px solid #3b82f6' : '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: isEditing ? '#eff6ff' : '#ffffff',
    marginBottom: '12px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  });

  const handleSaveLesson = async () => {
    if (!lessonData.title.trim()) {
      toast.error('Lesson title is required');
      return;
    }

    setSaving(true);
    try {
      await lessonService.updateLesson(lesson.id, {
        title: lessonData.title,
        description: lessonData.description,
      });
      toast.success('Lesson updated successfully');
    } catch (err) {
      console.error('Failed to save lesson', err);
      toast.error('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishLesson = async () => {
    setSaving(true);
    try {
      await lessonService.publishLesson(lesson.id);
      setLessonData(prev => ({ ...prev, isDraft: false }));
      toast.success('Lesson published successfully');
    } catch (err) {
      console.error('Failed to publish lesson', err);
      toast.error('Failed to publish lesson');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = async (blockType) => {
    
    try {
      const newBlock = await lessonService.addContentBlock({
        lessonId: lesson.id,
        type: blockType,
        order: contentBlocks.length,
        content: blockType === 'text' ? '' : {},
        metadata: {},
      });
      setContentBlocks([...contentBlocks, newBlock.data || newBlock]);
      toast.success(`${blockType} block added`);
      setShowAddBlockMenu(false);
      setBlockTypeToAdd(null);
    } catch (err) {
      console.error('Failed to add block', err);
      toast.error('Failed to add content block');
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (!window.confirm('Delete this content block?')) return;

    try {
      await lessonService.deleteContentBlock(blockId);
      setContentBlocks(contentBlocks.filter(b => b.id !== blockId));
      toast.success('Block deleted');
    } catch (err) {
      console.error('Failed to delete block', err);
      toast.error('Failed to delete block');
    }
  };

  const handleUpdateBlock = async (blockId, updatedContent) => {
    try {
      await lessonService.updateContentBlock(blockId, {
        content: updatedContent,
      });
      setContentBlocks(contentBlocks.map(b =>
        b.id === blockId ? { ...b, content: updatedContent } : b
      ));
      toast.success('Block updated');
      setEditingBlockId(null);
    } catch (err) {
      console.error('Failed to update block', err);
      toast.error('Failed to update block');
    }
  };

  const renderBlockContent = (block) => {
    switch (block.type) {
      case 'text':
        return (
          <div>
            {editingBlockId === block.id ? (
              <textarea
                defaultValue={block.content || ''}
                rows={6}
                style={{
                  ...inputStyle,
                  fontFamily: 'Arial, sans-serif',
                }}
                onBlur={(e) => handleUpdateBlock(block.id, e.target.value)}
              />
            ) : (
              <p style={{ margin: 0, color: '#6b7280', whiteSpace: 'pre-wrap', maxHeight: '100px', overflow: 'hidden' }}>
                {block.content || '(empty)'}
              </p>
            )}
          </div>
        );
      case 'image':
        return (
          <div>
            {editingBlockId === block.id ? (
              <input
                type="text"
                defaultValue={block.content?.url || ''}
                placeholder="Image URL"
                style={inputStyle}
                onBlur={(e) => handleUpdateBlock(block.id, { url: e.target.value })}
              />
            ) : (
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                {block.content?.url ? `Image: ${block.content.url}` : '(no image URL)'}
              </p>
            )}
          </div>
        );
      case 'video':
        return (
          <div>
            {editingBlockId === block.id ? (
              <input
                type="text"
                defaultValue={block.content?.url || ''}
                placeholder="YouTube video URL"
                style={inputStyle}
                onBlur={(e) => handleUpdateBlock(block.id, { url: e.target.value })}
              />
            ) : (
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                {block.content?.url ? `Video: ${block.content.url}` : '(no video URL)'}
              </p>
            )}
          </div>
        );
      case 'question':
        return (
          <div>
            {editingBlockId === block.id ? (
              <textarea
                defaultValue={block.content?.text || ''}
                placeholder="Question text"
                rows={3}
                style={inputStyle}
                onBlur={(e) => handleUpdateBlock(block.id, { text: e.target.value })}
              />
            ) : (
              <p style={{ margin: 0, color: '#6b7280', whiteSpace: 'pre-wrap', maxHeight: '60px', overflow: 'hidden' }}>
                {block.content?.text || '(empty)'}
              </p>
            )}
          </div>
        );
      case 'file':
        return (
          <div>
            {editingBlockId === block.id ? (
              <input
                type="text"
                defaultValue={block.content?.url || ''}
                placeholder="File URL"
                style={inputStyle}
                onBlur={(e) => handleUpdateBlock(block.id, { url: e.target.value })}
              />
            ) : (
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                {block.content?.url ? `File: ${block.content.url}` : '(no file URL)'}
              </p>
            )}
          </div>
        );
      case 'divider':
        return <hr style={{ margin: '8px 0', borderColor: '#e5e7eb' }} />;
      default:
        return <p style={{ margin: 0, color: '#9ca3af' }}>Unknown block type</p>;
    }
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
          <ArrowLeft size={20} />
        </button>
        <div style={titleContainerStyle}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
            Edit Lesson
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
            {lessonData?.title || 'Untitled Lesson'}
          </p>
        </div>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: lessonData?.isDraft ? '#dc2626' : '#16a34a',
          }}
          disabled={saving}
          onClick={lessonData?.isDraft ? handlePublishLesson : undefined}
        >
          {lessonData?.isDraft ? 'Publish' : 'Published'}
        </button>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* Lesson Info Section */}
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
            Lesson Details
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Lesson Title *</label>
            <input
              type="text"
              value={lessonData?.title || ''}
              onChange={(e) => setLessonData(prev => ({ ...prev, title: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={lessonData?.description || ''}
              onChange={(e) => setLessonData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              style={inputStyle}
            />
          </div>

          <button
            style={buttonStyle}
            disabled={saving}
            onClick={handleSaveLesson}
            onMouseEnter={(e) => {
              if (!saving) e.target.style.backgroundColor = '#b91c1c';
            }}
            onMouseLeave={(e) => {
              if (!saving) e.target.style.backgroundColor = '#dc2626';
            }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Content Blocks Section */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              Content Blocks ({contentBlocks.length})
            </h2>
            <button
              ref={addButtonRef}
              aria-haspopup="true"
              aria-expanded={showAddBlockMenu}
              style={{
                ...buttonStyle,
                backgroundColor: '#3b82f6',
                position: 'relative',
              }}
              onClick={() => toggleAddMenu(!showAddBlockMenu)}
              onMouseEnter={(e) => {
                if (!showAddBlockMenu) e.target.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                if (!showAddBlockMenu) e.target.style.backgroundColor = '#3b82f6';
              }}
            >
              <Plus size={16} />
              Add Block
            </button>

            {/* Block Type Menu */}
            <AnimatePresence>
              {showAddBlockMenu && (
                <motion.div
                  ref={addMenuRef}
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.16 } }}
                  exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
                  style={{
                    position: 'fixed',
                    top: menuStyle.top,
                    left: menuStyle.left,
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    zIndex: 2000,
                    minWidth: '200px',
                    maxWidth: '320px',
                    maxHeight: '60vh',
                    overflowY: 'auto',
                    padding: '6px 0',
                  }}
                >
                  {blockTypes.map(type => (
                    <button
                      key={type.id}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        fontSize: '14px',
                        color: '#111827',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      onClick={() => { setShowAddBlockMenu(false); handleAddBlock(type.id); }}
                    >
                      <span style={{ marginRight: '8px' }}>{type.icon}</span>
                      {type.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {contentBlocks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              color: '#9ca3af',
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                No content blocks yet
              </p>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Click "Add Block" above to start creating lesson content
              </p>
            </div>
          ) : (
            <div>
              {contentBlocks.map((block, idx) => (
                <div key={block.id} style={blockItemStyle(editingBlockId === block.id)}>
                  <div style={{ color: '#9ca3af', paddingTop: '4px' }}>
                    <GripVertical size={18} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#6b7280',
                        backgroundColor: '#f3f4f6',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}>
                        Block {idx + 1}
                      </span>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#111827',
                        textTransform: 'uppercase',
                      }}>
                        {block.type}
                      </span>
                    </div>

                    {renderBlockContent(block)}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                    <button
                      style={{
                        padding: '8px 10px',
                        backgroundColor: editingBlockId === block.id ? '#3b82f6' : '#f3f4f6',
                        color: editingBlockId === block.id ? '#ffffff' : '#6b7280',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = editingBlockId === block.id ? '#2563eb' : '#e5e7eb';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = editingBlockId === block.id ? '#3b82f6' : '#f3f4f6';
                      }}
                      onClick={() => setEditingBlockId(editingBlockId === block.id ? null : block.id)}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#fecaca';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#fee2e2';
                      }}
                      onClick={() => handleDeleteBlock(block.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonEditorPage;
