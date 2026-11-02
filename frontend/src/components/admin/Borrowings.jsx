

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  RefreshCw,
  AlertCircle,
  Search,
  FileText,
  FileSpreadsheet,
  Download,
  ChevronDown,
} from "lucide-react";
import apiClient from "../../api/client";
import BorrowingActionModal from "./BorrowingActionModal";
import { TablePagination } from "../common/TableControls";
import Select from "../common/Select";
import CsvImportControl from "./CsvImportControl";

// Date format: DD/MM/YYYY
const formatDate = (value) => {
  if (!value || String(value).startsWith("1900-01-01")) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
};

const getStatusClass = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "issued":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";

    case "returned":
      return "bg-green-500/10 text-green-400 border-green-500/20";

    case "overdue":
      return "bg-red-500/10 text-red-400 border-red-500/20";

    case "lost":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";

    default:
      return "bg-slate-700/50 text-slate-300 border-slate-600";
  }
};

const columns = [
  { key: "id", label: "ID" },
  { key: "memberId", label: "Member ID" },
  { key: "bookCopyId", label: "Book Copy ID" },
  { key: "requestId", label: "Request ID" },
  { key: "issuedBy", label: "Issued By" },
  { key: "issueDate", label: "Issue Date" },
  { key: "dueDate", label: "Due Date" },
  { key: "returnDate", label: "Return Date" },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Created At" },
  { key: "updatedAt", label: "Updated At" },
  { key: "action", label: "Action" },
];

const dateFields = [
  "issueDate",
  "dueDate",
  "returnDate",
  "createdAt",
  "updatedAt",
];

const Borrowings = () => {
  const [searchParams] = useSearchParams();
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState(null);
  const [statusFilter, setStatusFilter] = useState(() => ["issued", "returned", "overdue", "lost"].includes(searchParams.get("status")) ? searchParams.get("status") : "all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [exportingFormat, setExportingFormat] = useState("");
  const [exportError, setExportError] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  // Fetch borrowings from existing BookIssue GET API
  const fetchBorrowings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await apiClient.get("/borrowings", { params: { page, limit, search, status: statusFilter === "all" ? undefined : statusFilter } });
      const data = response.data ?? response;

      const records = Array.isArray(data)
        ? data
        : data.borrowings ?? [];

      if (!Array.isArray(records)) {
        throw new Error("Invalid borrowings API response");
      }

      setBorrowings(records);
      setPagination(data.pagination || { total: records.length, totalPages: 1 });
    } catch (err) {
      console.error("Fetch borrowings error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch borrowing records"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    fetchBorrowings();
  }, [fetchBorrowings]);

  useEffect(() => {
    if (!exportMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!exportMenuRef.current?.contains(event.target)) {
        setExportMenuOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [exportMenuOpen]);

  const exportBorrowings = async (format) => {
    if (exportingFormat) return;
    setExportingFormat(format);
    setExportError("");
    try {
      const response = await apiClient.get("/borrowings/export", {
        responseType: "blob",
        params: {
          format,
          search: search.trim() || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        },
      });
      const blob = response.data;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const disposition = response.headers["content-disposition"] || "";
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      anchor.download = filename || `borrowings-${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xls" : "pdf"}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message || "Unable to export borrowing records.");
    } finally {
      setExportingFormat("");
    }
  };

  // Show role instead of issuedBy user ID
  const getIssuedBy = (borrowing) => {
    const issuer = borrowing.issuer;

    const roleName = issuer?.role?.name;

    if (roleName) {
      const normalized = roleName.toLowerCase();

      if (normalized === "admin") return "Admin";
      if (normalized === "librarian") return "Librarian";

      return roleName;
    }

    return "-";
  };

  const renderCell = (borrowing, key) => {
    if (key === "action") return ["issued", "overdue"].includes(borrowing.status) ? <div className="flex gap-3"><button onClick={() => setAction({ id: borrowing.id, type: "return" })} className="text-indigo-300 hover:text-indigo-200 text-xs font-semibold">Return Book</button><button onClick={() => setAction({ id: borrowing.id, type: "lost" })} className="text-orange-300 hover:text-orange-200 text-xs font-semibold">Lost</button></div> : <span className="text-xs text-slate-500">{borrowing.status === "lost" ? `Lost: ${formatDate(borrowing.lostDate)}` : "Completed"}</span>;
    if (key === "issuedBy") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
          {getIssuedBy(borrowing)}
        </span>
      );
    }

    if (key === "status") {
      const status = borrowing.status ?? "issued";

      return (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-semibold capitalize ${getStatusClass(
            status
          )}`}
        >
          {status}
        </span>
      );
    }

    if (dateFields.includes(key)) {
      return formatDate(borrowing[key]);
    }

    const value = borrowing[key];

    if (value === null || value === undefined || value === "") {
      return "-";
    }

    return String(value);
  };

const filteredBorrowings = borrowings;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Borrowings
          </h1>

          <p className="text-sm text-slate-400 mt-1">
            View and track all issued book records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CsvImportControl kind="borrowings" onImported={() => fetchBorrowings(true)} />
          <div ref={exportMenuRef} className="relative" onMouseEnter={() => setExportMenuOpen(true)}>
            <button type="button" onClick={() => setExportMenuOpen(true)} disabled={!!exportingFormat || pagination.total === 0} aria-haspopup="menu" aria-expanded={exportMenuOpen} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50">
              <Download size={16} />{exportingFormat ? `Preparing ${exportingFormat === "excel" ? "Excel..." : "PDF..."}` : "Export"}<ChevronDown size={15} className={exportMenuOpen ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
            {exportMenuOpen && !exportingFormat && pagination.total > 0 && (
              <div role="menu" aria-label="Choose export format" className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl">
                <button role="menuitem" type="button" onClick={() => { setExportMenuOpen(false); exportBorrowings("pdf"); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800">
                  <FileText size={17} className="text-rose-300" /><span><span className="block font-medium">PDF document</span><span className="block text-xs text-slate-500">Print-ready report</span></span>
                </button>
                <button role="menuitem" type="button" onClick={() => { setExportMenuOpen(false); exportBorrowings("excel"); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800">
                  <FileSpreadsheet size={17} className="text-emerald-300" /><span><span className="block font-medium">Excel spreadsheet</span><span className="block text-xs text-slate-500">Sortable data sheet</span></span>
                </button>
              </div>
            )}
          </div>
          <button type="button" onClick={() => fetchBorrowings(true)} disabled={loading || refreshing} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium transition-colors disabled:opacity-50">
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />{refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>
      {exportError && <p role="alert" className="text-sm text-red-300">{exportError}</p>}

      {/* Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <BookOpen size={18} className="text-blue-400" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-white">
                Borrowing List
              </h2>

              <p className="text-xs text-slate-400 mt-0.5">
                Total Records: {pagination.total}
              </p>
            </div>
          </div>

        {/* Search and Status Filter */}
<div className="flex flex-col sm:flex-row items-stretch gap-3 w-full sm:w-auto">
  {/* Status Filter */}
  <div className="w-full sm:w-44">
    <Select
      value={statusFilter}
      onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
      aria-label="Filter by status"
      className="!rounded-lg"
      options={[{ value: "all", label: "All Status" }, { value: "issued", label: "Issued" }, { value: "returned", label: "Returned" }, { value: "overdue", label: "Overdue" }, { value: "lost", label: "Lost" }]}
    />
  </div>

  {/* Search */}
  <div className="relative w-full sm:w-72">
    <Search
      size={16}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
    />

    <input
      type="text"
      value={search}
      onChange={(event) => { setSearch(event.target.value); setPage(1); }}
      placeholder="Search borrowings..."
      aria-label="Search borrowings"
      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
    />
  </div>
</div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="p-5 space-y-3" role="status">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-12 rounded-lg bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          /* Error */
          <div className="flex flex-col items-center justify-center gap-3 p-12">
            <AlertCircle size={30} className="text-red-400" />

            <p className="text-sm text-red-400 text-center">
              {error}
            </p>

            <button
              type="button"
              onClick={() => fetchBorrowings()}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm"
            >
              Try Again
            </button>
          </div>
        ) : (
          /* Borrowings Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-800/80 border-b border-slate-700">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className="py-3.5 px-4 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-400"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {filteredBorrowings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="py-14 px-4 text-center"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <BookOpen
                          size={32}
                          className="text-slate-600"
                        />

                        <p className="text-sm text-slate-400">
                          {search
                            ? "No matching borrowing records found."
                            : "No borrowing records found."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBorrowings.map((borrowing, index) => (
                    <tr
                      key={borrowing.id ?? index}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className="py-3.5 px-4 whitespace-nowrap text-sm text-slate-300"
                        >
                          {renderCell(borrowing, column.key)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      {/* Footer */}
        {!loading && !error && (
          <TablePagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} onLimitChange={(size) => { setLimit(size); setPage(1); }} />
        )}
      </div>
      {action && <BorrowingActionModal id={action.id} action={action.type} onClose={() => setAction(null)} onDone={() => { setAction(null); fetchBorrowings(true); }} />}
    </div>
  );
};

export default Borrowings;
