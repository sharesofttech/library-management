import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, FileSpreadsheet, FileText, Download, RefreshCw, Search } from "lucide-react";
import fineService from "../../api/fineService";
import { useToast } from "../../context/ToastContext";
import FineModal, { FineDetails, rupees, fineDate, fineField, fineButton, quietButton } from "./FineModal";
import { TablePagination } from "./TableControls";
import Select from "./Select";
import CsvImportControl from "../admin/CsvImportControl";

function RecordPayment({ fine, onClose, onDone }) {
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try { const result = await fineService.pay(fine.id, amount, method); toast.success(result.message); onDone(); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  return <FineModal title="Record Payment" onClose={onClose} busy={busy}><form onSubmit={submit} className="space-y-5">{error && <p role="alert" className="text-sm text-rose-300">{error}</p>}<FineDetails rows={[["Fine ID", fine.id], ["Total Fine", rupees(fine.amount)], ["Already Paid", rupees(fine.totalPaid)], ["Remaining Balance", rupees(fine.balance)]]} /><p className="text-xs text-slate-400">Record money received at the library. The current balance is verified again when you confirm.</p><label className="block text-sm text-slate-300">Payment Amount (₹)<input autoFocus aria-label="Payment amount" type="number" min="0.01" max={fine.balance} step="0.01" required disabled={busy} value={amount} onChange={event => setAmount(event.target.value)} className={`${fineField} mt-2`} /></label><label className="block text-sm text-slate-300">Payment Method<Select value={method} disabled={busy} onChange={event => setMethod(event.target.value)} containerClassName="mt-2" className="!rounded-lg" options={[{ value: "cash", label: "Cash" }]} /></label><div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className={quietButton}>Cancel</button><button disabled={busy} className={fineButton}>{busy ? "Recording..." : "Confirm Payment"}</button></div></form></FineModal>;
}

export default function FineRecords({ own = false, payments = false }) {
  const [params] = useSearchParams();
  const fineId = !own && payments ? params.get("fineId") : null;
  const [records, setRecords] = useState([]);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selected, setSelected] = useState(null);
  const [exportingFormat, setExportingFormat] = useState("");
  const [exportError, setExportError] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const title = own ? payments ? "My Payment History" : "My Fines" : payments ? "Fine Payments" : "Fines List";
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const query = { page, limit, search, ...(payments ? { paymentMethod: method || undefined, from: from || undefined, to: to || undefined } : { type: type || undefined, status: status || undefined }) };
      const result = payments ? await fineService.payments(own, fineId, query) : await fineService.fines(own, query);
      setRecords(payments ? result.payments : result.fines); setPagination(result.pagination || { total: (payments ? result.payments : result.fines).length, totalPages: 1 }); setTimezone(result.libraryTimezone || "Asia/Kolkata");
    }
    catch (error) { setError(error.message); }
    finally { setLoading(false); }
  }, [own, payments, fineId, page, limit, search, type, status, method, from, to]);
  useEffect(() => { setRecords([]); setSelected(null); setSearch(""); setType(""); setStatus(""); setMethod(""); setFrom(""); setTo(""); setPage(1); }, [own, payments, fineId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!exportMenuOpen) return undefined;
    const closeOnOutsideClick = event => {
      if (!exportMenuRef.current?.contains(event.target)) setExportMenuOpen(false);
    };
    const closeOnEscape = event => { if (event.key === "Escape") setExportMenuOpen(false); };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [exportMenuOpen]);
  const exportPayments = async format => {
    if (exportingFormat) return;
    setExportingFormat(format); setExportError("");
    try {
      const response = await fineService.exportPayments({
        format,
        search: search.trim() || undefined,
        paymentMethod: method || undefined,
        from: from || undefined,
        to: to || undefined,
      }, fineId);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      const disposition = response.headers["content-disposition"] || "";
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      anchor.download = filename || `fine-payments-${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xls" : "pdf"}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error.message || "Unable to export fine payments.");
    } finally { setExportingFormat(""); }
  };
  const filtered = records;
  const columns = payments ? ["Payment ID", "Fine ID", "Borrowing ID", ...(!own ? ["Member"] : []), ...(own ? ["Book Title"] : []), "Amount Paid", "Payment Date", "Payment Method", "Received By", ...(!own ? ["Created At", "Updated At"] : [])] : ["Fine ID", "Borrowing ID", ...(!own ? ["Member"] : []), "Book Title", "Fine Type", "Fine Amount", "Paid Amount", "Balance", "Status", "Created At", ...(!own ? ["Updated At", "Action"] : [])];
  const cells = record => {
    const borrowing = payments ? record.fine?.borrowing : record.borrowing;
    const member = borrowing?.member ? `${borrowing.member.name} (#${borrowing.member.id})` : "—";
    if (payments) return [record.id, record.fineId, borrowing?.id, ...(!own ? [member] : []), ...(own ? [borrowing?.book?.title] : []), rupees(record.amount), fineDate(record.paymentDate, timezone), record.paymentMethod, `${record.receiver?.name || "Staff"}${record.receiver?.role?.name ? ` (${record.receiver.role.name})` : ""}`, ...(!own ? [fineDate(record.createdAt, timezone), fineDate(record.updatedAt, timezone)] : [])];
    return [record.id, record.borrowingId, ...(!own ? [member] : []), borrowing?.book?.title, record.type, rupees(record.amount), rupees(record.totalPaid), rupees(record.balance), <span className={`inline-flex px-2.5 py-1 rounded-md border text-xs font-semibold ${record.status === "Paid" ? "bg-green-500/10 text-green-400 border-green-500/20"  : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}>{record.status}</span>, fineDate(record.createdAt), ...(!own ? [fineDate(record.updatedAt), <div className="flex gap-3">{record.status !== "Paid" && <button className="text-indigo-300 hover:text-indigo-200 text-xs font-semibold" onClick={() => setSelected(record)}>Record Payment</button>}<Link className="text-blue-300 hover:text-blue-200 text-xs font-semibold" to={`/admin/fine-payments?fineId=${record.id}`}>View Payments</Link></div>] : [])];
  };
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">{title}</h1><p className="mt-1 text-sm text-slate-400">{own ? "View your library charges and receipts." : payments ? "Every receipt is kept as a separate payment record." : "Manage overdue fines and lost book charges."}</p></div>
        <div className="flex items-center gap-2">
          {payments && !own && <CsvImportControl kind="payments" onImported={load} />}
          {payments && !own && (
            <div ref={exportMenuRef} className="relative" onMouseEnter={() => setExportMenuOpen(true)}>
              <button type="button" onClick={() => setExportMenuOpen(true)} disabled={!!exportingFormat || pagination.total === 0} aria-haspopup="menu" aria-expanded={exportMenuOpen} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
                <Download size={16} />{exportingFormat ? `Preparing ${exportingFormat === "excel" ? "Excel..." : "PDF..."}` : "Export"}<ChevronDown size={15} />
              </button>
              {exportMenuOpen && !exportingFormat && pagination.total > 0 && (
                <div role="menu" aria-label="Choose export format" className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl">
                  <button role="menuitem" type="button" onClick={() => { setExportMenuOpen(false); exportPayments("pdf"); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800"><FileText size={17} className="text-rose-300" /><span><span className="block font-medium">PDF document</span><span className="block text-xs text-slate-500">Print-ready report</span></span></button>
                  <button role="menuitem" type="button" onClick={() => { setExportMenuOpen(false); exportPayments("excel"); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800"><FileSpreadsheet size={17} className="text-emerald-300" /><span><span className="block font-medium">Excel spreadsheet</span><span className="block text-xs text-slate-500">Sortable data sheet</span></span></button>
                </div>
              )}
            </div>
          )}
          <button onClick={load} disabled={loading} className={`${quietButton} flex items-center gap-2`}><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>
        </div>
      </div>
      {exportError && <p role="alert" className="text-sm text-rose-300">{exportError}</p>}
      {fineId && <p className="text-sm text-slate-400">Payments for fine #{fineId}. <Link to="/admin/fine-payments" className="underline text-indigo-300">View all payments</Link></p>}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-800 px-5 py-4">
          <div className="relative min-w-48 flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input aria-label={`Search ${title}`} placeholder="Search ID, member, book..." value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className={`${fineField} pl-10`} /></div>
          {payments ? <><label className="text-xs text-slate-400">Method<Select aria-label="Payment method filter" containerClassName="mt-1" className="!rounded-lg" value={method} onChange={event => { setMethod(event.target.value); setPage(1); }} options={[{ value: "", label: "All Methods" }, ...["cash", "upi", "card"].map(value => ({ value, label: value.toUpperCase() }))]} /></label><label className="text-xs text-slate-400">From<input aria-label="From date" type="date" value={from} onChange={event => { setFrom(event.target.value); setPage(1); }} className={`${fineField} mt-1`} /></label><label className="text-xs text-slate-400">To<input aria-label="To date" type="date" value={to} onChange={event => { setTo(event.target.value); setPage(1); }} className={`${fineField} mt-1`} /></label></> : <><Select aria-label="Fine type filter" value={type} onChange={event => { setType(event.target.value); setPage(1); }} className="!rounded-lg sm:!w-40" options={[{ value: "", label: "All Fine Types" }, { value: "overdue", label: "Overdue" }, { value: "lost", label: "Lost" }]} /><Select aria-label="Fine status filter" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="!rounded-lg sm:!w-40" options={[{ value: "", label: "All Statuses" }, ...["Pending", "Partially paid", "Paid"].map(value => ({ value, label: value }))]} /></>}
        </div>
        {loading ? <div role="status" aria-label="Loading records" className="space-y-3 p-5">{[1, 2, 3, 4, 5].map(key => <div key={key} className="h-12 animate-pulse rounded-lg bg-slate-800" />)}</div> : error ? <div role="alert" className="p-12 text-center text-rose-300">{error}<button onClick={load} className="ml-3 underline">Try Again</button></div> : <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead className="border-b border-slate-700 bg-slate-800/80"><tr>{columns.map(column => <th key={column} scope="col" className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{column}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{filtered.length ? filtered.map(record => <tr key={record.id} className="hover:bg-slate-800/40">{cells(record).map((cell, index) => <td key={columns[index]} className="whitespace-nowrap px-4 py-3.5 text-slate-300">{cell ?? "—"}</td>)}</tr>) : <tr><td colSpan={columns.length} className="py-14 text-center text-slate-400">No matching records found.</td></tr>}</tbody></table></div>}
        <TablePagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} onLimitChange={size => { setLimit(size); setPage(1); }} />
      </div>
      {selected && !own && !payments && <RecordPayment fine={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); load(); }} />}
    </div>
  );
}
