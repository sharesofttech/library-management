import React, { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import apiClient from "../../api/client";
import { useToast } from "../../context/ToastContext";

const templates = {
  borrowings: {
    filename: "borrowings-import-template.csv",
    headers: "requestId,memberId,bookCopyId,issueDate,dueDate,status,returnDate,lostDate,overdueFineRate",
    hint: "For a live request, provide its Approved requestId. For historical records without a request, leave requestId blank and provide memberId. bookCopyId must be available. Dates use YYYY-MM-DD. Status: issued, overdue, returned, or lost. Leave unused date/rate cells empty.",
    endpoint: "/borrowings/import",
    label: "Import borrowings",
  },
  payments: {
    filename: "fine-payments-import-template.csv",
    headers: "importReference,fineId,amount,paymentDate,paymentMethod",
    hint: "Use an existing Fine ID, a unique source receipt reference, and payment method cash, upi, or card. Amount cannot exceed the current fine balance. Dates use YYYY-MM-DD.",
    endpoint: "/fine-payments/import",
    label: "Import fine payments",
  },
};

export default function CsvImportControl({ kind, onImported }) {
  const config = templates[kind];
  const toast = useToast();
  const inputRef = useRef(null);
  const disclosureRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const downloadTemplate = () => {
    const csv = `\uFEFF${config.headers}\r\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = config.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await apiClient.post(config.endpoint, form, { headers: { "Content-Type": "multipart/form-data" } });
      const result = response.data ?? response;
      const success = `${result.importedCount} records imported.`;
      setMessage(success);
      toast.success(result.message || success);
      await onImported?.();
      if (disclosureRef.current) disclosureRef.current.open = false;
    } catch (error) {
      const reason = error.response?.data?.message || error.message || "Unable to import CSV file";
      setMessage(reason);
      toast.error(reason);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return <details ref={disclosureRef} className="relative">
    <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
      <Upload size={16} />Import CSV
    </summary>
    <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
      <p className="text-sm font-semibold text-white">{config.label}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{config.hint}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={upload} className="hidden" aria-label={`${config.label} CSV file`} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}{busy ? "Importing..." : "Choose CSV"}
        </button>
        <button type="button" onClick={downloadTemplate} disabled={busy} className="text-xs font-medium text-indigo-300 hover:text-indigo-200 disabled:opacity-50">Download template</button>
      </div>
      {message && <p role="status" className="mt-3 break-words text-xs text-slate-300">{message}</p>}
    </div>
  </details>;
}
