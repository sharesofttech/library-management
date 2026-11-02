import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import bookService from "../../api/bookService";
import { TablePagination, TableSearch } from "../common/TableControls";
import Select from "../common/Select";

export default function BookCopies() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  useEffect(() => {
    const refresh = () => setReload(value => value + 1);
    window.addEventListener("library:inventory-changed", refresh);
    return () => window.removeEventListener("library:inventory-changed", refresh);
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    bookService.getBook(id, { page, limit, search, status: status === "all" ? undefined : status }).then(({ book, copiesPagination }) => { if (active) { setBook(book); setPagination(copiesPagination || { total: book.copies.length, totalPages: 1 }); } })
      .catch((err) => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, reload, page, limit, search, status]);
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
        <Link to="/admin/books" aria-label="Back to Books" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><ArrowLeft className="w-5 h-5" /></Link>
        <div><h1 className="text-xl font-bold text-white">Book Copies</h1><p className="text-xs text-slate-400">{book?.title}</p></div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-4"><TableSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search ID, copy code, status, dates..." /><Select aria-label="Filter copies by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="!rounded-lg !py-2.5 sm:w-48" options={[{ value: "all", label: "All statuses" }, ...["available", "issued", "damaged", "lost"].map((value) => ({ value, label: value }))]} /></div>
        {loading ? <div role="status" className="p-12 flex flex-col items-center gap-2 text-slate-400"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /><p className="text-sm">Loading copies...</p></div> : error ? <div role="alert" className="p-12 text-center text-sm text-slate-400">{error}<button onClick={() => setReload((value) => value + 1)} className="ml-3 underline">Try again</button></div> : !book?.copies.length ? <p className="p-12 text-center text-sm text-slate-400">{pagination.total ? "No copies match these filters." : "No copies found. Edit the book to add copies."}</p> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-800"><tr>{["ID", "Copy Code", "Status", "Created On", "Updated On"].map((label) => <th key={label} scope="col" className="py-3 px-4">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">{book.copies.map((copy) => <tr key={copy.id} className="hover:bg-slate-800/40 transition-colors">
              <td className="py-3.5 px-4">{copy.id}</td><td className="py-3.5 px-4 font-mono text-xs">{copy.copyCode}</td>
             <td className="py-3.5 px-4">
  <span
    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
      copy.status === "available"
        ? "bg-green-500/10 text-green-400"
        : copy.status === "issued"
        ? "bg-blue-500/10 text-blue-400"
        : copy.status === "damaged"
        ? "bg-amber-500/10 text-amber-400"
        : copy.status === "lost"
        ? "bg-red-500/10 text-red-400"
        : "bg-slate-800 text-slate-300"
    }`}
  >
    {copy.status || "-"}
  </span>
</td>
              <td className="py-3.5 px-4 text-slate-400">{new Date(copy.createdAt).toLocaleDateString("en-GB").replaceAll("/", "-")}</td><td className="py-3.5 px-4 text-slate-400">{new Date(copy.updatedAt).toLocaleDateString("en-GB").replaceAll("/", "-")}</td>
            </tr>)}</tbody>
          </table></div>
        )}
        {!loading && !error && <TablePagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} onLimitChange={(size) => { setLimit(size); setPage(1); }} />}
      </div>
    </div>
  );
}
