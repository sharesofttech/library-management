import React from "react";

const renderText = (node, key) => {
  let content = node.text || "";
  (node.marks || []).forEach((mark, index) => {
    if (mark.type === "bold") content = <strong key={`${key}-bold-${index}`}>{content}</strong>;
    if (mark.type === "italic") content = <em key={`${key}-italic-${index}`}>{content}</em>;
    if (mark.type === "strike") content = <s key={`${key}-strike-${index}`}>{content}</s>;
    if (mark.type === "code") content = <code key={`${key}-code-${index}`} className="rounded bg-slate-800 px-1 py-0.5 text-indigo-200">{content}</code>;
  });
  return <React.Fragment key={key}>{content}</React.Fragment>;
};

const renderNode = (node, key) => {
  if (!node) return null;
  if (node.type === "text") return renderText(node, key);
  const children = (node.content || []).map((child, index) => renderNode(child, `${key}-${index}`));
  switch (node.type) {
    case "doc": return <React.Fragment key={key}>{children}</React.Fragment>;
    case "paragraph": return <p key={key} className="whitespace-pre-wrap">{children}</p>;
    case "heading": return node.attrs?.level === 2
      ? <h2 key={key} className="mt-5 text-lg font-bold text-white first:mt-0">{children}</h2>
      : <h3 key={key} className="mt-4 text-base font-bold text-white first:mt-0">{children}</h3>;
    case "bulletList": return <ul key={key} className="list-inside list-disc space-y-1">{children}</ul>;
    case "orderedList": return <ol key={key} className="list-inside list-decimal space-y-1">{children}</ol>;
    case "listItem": return <li key={key}>{children}</li>;
    case "blockquote": return <blockquote key={key} className="border-l-2 border-indigo-400 pl-4 italic text-slate-300">{children}</blockquote>;
    case "hardBreak": return <br key={key} />;
    case "horizontalRule": return <hr key={key} className="border-slate-700" />;
    default: return <React.Fragment key={key}>{children}</React.Fragment>;
  }
};

const renderLegacyInline = (text) => String(text).split(/(\*\*.+?\*\*|\*.+?\*)/g).map((part, partIndex) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={partIndex}>{part.slice(1, -1)}</em>;
    return <React.Fragment key={partIndex}>{part}</React.Fragment>;
  });

const renderLegacyText = (text) => String(text).split(/\r?\n/).map((line, index) => {
  return line.startsWith("### ")
    ? <h3 key={index} className="mt-4 text-base font-bold text-white">{renderLegacyInline(line.slice(4))}</h3>
    : line.startsWith("- ") || line.startsWith("* ")
      ? <p key={index} className="ml-5 list-item list-disc">{renderLegacyInline(line.slice(2))}</p>
      : <p key={index} className="whitespace-pre-wrap">{renderLegacyInline(line)}</p>;
});

export const renderBookHighlights = (content) => {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "doc") return renderNode(parsed, "highlights");
  } catch { /* Existing records may contain plain text or the earlier lightweight markup. */ }
  return renderLegacyText(content);
};
