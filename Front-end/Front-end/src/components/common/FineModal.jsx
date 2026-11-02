import React, { useEffect, useRef } from "react";

export const fineField = "w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500";
export const fineButton = "px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50";
export const quietButton = "px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-200 disabled:opacity-50";
export function FineDetails({ rows }) {
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{rows.map(([label, value]) => <React.Fragment key={label}><dt className="text-slate-400">{label}</dt><dd className="text-slate-100 break-words">{value ?? "—"}</dd></React.Fragment>)}</dl>;
}
export const rupees = value => value == null ? "Not configured" : `₹${value}`;
export const fineDate = (value, timeZone = "Asia/Kolkata") => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? "UTC" : timeZone });
};
export default function FineModal({ title, onClose, busy = false, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus();
    const handle = event => {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key === "Tab") {
        const elements = dialog.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]');
        if (!elements?.length) { event.preventDefault(); return; }
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handle);
    return () => { document.removeEventListener("keydown", handle); previous?.focus(); };
  }, [busy, onClose]);
  return <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"><section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl space-y-5"><h2 className="text-lg font-semibold text-white">{title}</h2>{children}</section></div>;
}
