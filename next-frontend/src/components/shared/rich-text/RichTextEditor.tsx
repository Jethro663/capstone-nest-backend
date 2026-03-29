'use client';

import { useEffect, useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Eraser,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { sanitizeRichTextHtml } from '@/lib/rich-text';
import { cn } from '@/utils/cn';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

type ToolAction = {
  label: string;
  icon: typeof Bold;
  onClick: () => void;
  isActive?: boolean;
  isDisabled?: boolean;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something...',
  className,
  minHeight = 140,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
      }),
      Link.configure({
        autolink: true,
        openOnClick: false,
        defaultProtocol: 'https',
        protocols: ['http', 'https', 'mailto', 'tel'],
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'rich-text-editor__canvas',
      },
    },
    onUpdate: ({ editor: editorInstance }) => {
      onChange(sanitizeRichTextHtml(editorInstance.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = sanitizeRichTextHtml(editor.getHTML());
    const incoming = sanitizeRichTextHtml(value || '');
    if (current === incoming) return;
    editor.commands.setContent(incoming || '<p></p>', { emitUpdate: false });
  }, [editor, value]);

  const tools = useMemo<ToolAction[]>(() => {
    if (!editor) return [];

    return [
      {
        label: 'Undo',
        icon: Undo2,
        onClick: () => editor.chain().focus().undo().run(),
        isDisabled: !editor.can().chain().focus().undo().run(),
      },
      {
        label: 'Redo',
        icon: Redo2,
        onClick: () => editor.chain().focus().redo().run(),
        isDisabled: !editor.can().chain().focus().redo().run(),
      },
      {
        label: 'Bold',
        icon: Bold,
        onClick: () => editor.chain().focus().toggleBold().run(),
        isActive: editor.isActive('bold'),
      },
      {
        label: 'Italic',
        icon: Italic,
        onClick: () => editor.chain().focus().toggleItalic().run(),
        isActive: editor.isActive('italic'),
      },
      {
        label: 'Underline',
        icon: UnderlineIcon,
        onClick: () => editor.chain().focus().toggleUnderline().run(),
        isActive: editor.isActive('underline'),
      },
      {
        label: 'Heading',
        icon: Heading3,
        onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        isActive: editor.isActive('heading', { level: 3 }),
      },
      {
        label: 'Bullet List',
        icon: List,
        onClick: () => editor.chain().focus().toggleBulletList().run(),
        isActive: editor.isActive('bulletList'),
      },
      {
        label: 'Numbered List',
        icon: ListOrdered,
        onClick: () => editor.chain().focus().toggleOrderedList().run(),
        isActive: editor.isActive('orderedList'),
      },
      {
        label: 'Blockquote',
        icon: Quote,
        onClick: () => editor.chain().focus().toggleBlockquote().run(),
        isActive: editor.isActive('blockquote'),
      },
      {
        label: 'Link',
        icon: Link2,
        onClick: () => {
          const currentHref = editor.getAttributes('link').href as string | undefined;
          const href = window.prompt('Enter URL', currentHref || 'https://');
          if (href === null) return;
          const trimmed = href.trim();
          if (!trimmed) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
        },
        isActive: editor.isActive('link'),
      },
      {
        label: 'Clear Format',
        icon: Eraser,
        onClick: () => {
          editor.chain().focus().unsetAllMarks().clearNodes().run();
        },
      },
    ];
  }, [editor]);

  return (
    <div className={cn('rich-text-editor', className)}>
      <div className="rich-text-editor__toolbar" role="toolbar" aria-label="Formatting controls">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.label}
              type="button"
              className="rich-text-editor__tool"
              onClick={tool.onClick}
              disabled={tool.isDisabled}
              data-active={tool.isActive ? 'true' : 'false'}
              aria-label={tool.label}
              title={tool.label}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <div className="rich-text-editor__surface" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
