import React from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import Select from "./Select";

export function TableSearch({ value, onChange, placeholder = "Search records..." }) {
  return (
    <div className="relative min-w-52 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} className="w-full rounded-lg border border-slate-700 bg-slate-950/70 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20" />
    </div>
  );
}

export function TablePagination({ page, totalPages, total, limit, onPageChange, onLimitChange }) {
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  return (
    <div className="flex flex-col gap-3 border-t border-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-400">Showing <span className="font-medium text-slate-200">{first}–{last}</span> of {total}</p>
      <div className="flex items-center gap-2">
        <div className="flex items-center text-xs text-slate-400">Rows
          <Select aria-label="Rows per page" value={limit} onChange={(event) => onLimitChange(Number(event.target.value))} menuPlacement="up" className="ml-2 !w-20 !rounded-md !px-2 !py-1.5 !text-xs" containerClassName="!gap-0" options={[10, 25, 50].map((size) => ({ value: size, label: String(size) }))} />
        </div>
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-md border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button>
        <span className="min-w-16 text-center text-xs text-slate-400">Page {page} / {totalPages}</span>
        <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded-md border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}
