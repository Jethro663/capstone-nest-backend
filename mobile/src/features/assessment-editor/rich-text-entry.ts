import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(value: string): void };
    setAssessmentContent(html: string): void;
    assessmentCommand(name: string, value?: string): void;
  }
}
const editor = new Editor({
  element: document.getElementById("editor")!,
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
    Link.configure({
      openOnClick: false,
      protocols: ["http", "https", "mailto", "tel"],
    }),
  ],
  content: "",
  editorProps: {
    attributes: {
      role: "textbox",
      "aria-label": "Rich text editor",
      "aria-multiline": "true",
    },
  },
  onUpdate: ({ editor }) =>
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({ type: "change", html: editor.getHTML() }),
    ),
});
window.setAssessmentContent = (html) =>
  editor.commands.setContent(html, { emitUpdate: false });
window.assessmentCommand = (name, value) => {
  const chain = editor.chain().focus();
  if (name === "bold") chain.toggleBold().run();
  if (name === "italic") chain.toggleItalic().run();
  if (name === "underline") chain.toggleUnderline().run();
  if (name === "heading") chain.toggleHeading({ level: 2 }).run();
  if (name === "blockquote") chain.toggleBlockquote().run();
  if (name === "code") chain.toggleCode().run();
  if (name === "bulletList") chain.toggleBulletList().run();
  if (name === "orderedList") chain.toggleOrderedList().run();
  if (name === "undo") chain.undo().run();
  if (name === "redo") chain.redo().run();
  if (name === "link" && value && /^(https?:\/\/|mailto:|tel:)/i.test(value))
    chain.setLink({ href: value }).run();
};
window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "ready" }));
