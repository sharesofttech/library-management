import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Heading2, Heading3, Italic, List, ListOrdered, Quote, Redo, Strikethrough, Undo } from "lucide-react";
import "./RichTextEditor.css";

const MAX_CHARACTERS = 35000;

const countText = (node) => {
  if (!node) return 0;
  if (node.type === "text") return node.text?.length || 0;
  return (node.content || []).reduce((total, child) => total + countText(child), 0);
};

const getInitialContent = (value) => {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    if (parsed?.type === "doc") return parsed;
  } catch { /* Treat existing non-JSON highlights as plain text. */ }
  return {
    type: "doc",
    content: String(value).split(/\r?\n/).map((line) => ({
      type: "paragraph",
      ...(line ? { content: [{ type: "text", text: line }] } : {}),
    })),
  };
};

const controls = [
  { label: "Bold", icon: Bold, active: (editor) => editor.isActive("bold"), action: (editor) => editor.chain().focus().toggleBold().run() },
  { label: "Italic", icon: Italic, active: (editor) => editor.isActive("italic"), action: (editor) => editor.chain().focus().toggleItalic().run() },
  { label: "Strikethrough", icon: Strikethrough, active: (editor) => editor.isActive("strike"), action: (editor) => editor.chain().focus().toggleStrike().run() },
  { label: "Heading 2", icon: Heading2, active: (editor) => editor.isActive("heading", { level: 2 }), action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Heading 3", icon: Heading3, active: (editor) => editor.isActive("heading", { level: 3 }), action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Bullet list", icon: List, active: (editor) => editor.isActive("bulletList"), action: (editor) => editor.chain().focus().toggleBulletList().run() },
  { label: "Numbered list", icon: ListOrdered, active: (editor) => editor.isActive("orderedList"), action: (editor) => editor.chain().focus().toggleOrderedList().run() },
  { label: "Quote", icon: Quote, active: (editor) => editor.isActive("blockquote"), action: (editor) => editor.chain().focus().toggleBlockquote().run() },
];

export default function RichTextEditor({ value, onChange, disabled = false }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] } }), Placeholder.configure({ placeholder: "Write book highlights, key topics, or a longer summary..." })],
    content: getInitialContent(value),
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      const document = currentEditor.getJSON();
      if (countText(document) > MAX_CHARACTERS) {
        currentEditor.commands.undo();
        return;
      }
      onChange(JSON.stringify(document));
    },
  });

  if (!editor) return <div className="h-80 animate-pulse rounded-xl bg-slate-950/70" />;
  const characterCount = countText(editor.getJSON());

  return <div className="rich-highlights-editor overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70 focus-within:border-indigo-400">
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 bg-slate-900/80 p-2">
      {controls.map(({ label, icon: Icon, active, action }) => <button key={label} type="button" title={label} aria-label={label} aria-pressed={active(editor)} disabled={disabled} onClick={() => action(editor)} className={`rounded-md p-2 transition ${active(editor) ? "bg-indigo-500/20 text-indigo-200" : "text-slate-300 hover:bg-slate-800 hover:text-white"} disabled:opacity-50`}><Icon className="h-4 w-4" /></button>)}
      <span className="ml-auto flex items-center gap-1">
        <button type="button" title="Undo" aria-label="Undo" disabled={disabled || !editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40"><Undo className="h-4 w-4" /></button>
        <button type="button" title="Redo" aria-label="Redo" disabled={disabled || !editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40"><Redo className="h-4 w-4" /></button>
      </span>
    </div>
    <EditorContent editor={editor} />
    <div className="border-t border-slate-800 px-3 py-2 text-right text-[11px] text-slate-500">{characterCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()} characters · approximately 10 pages</div>
  </div>;
}
