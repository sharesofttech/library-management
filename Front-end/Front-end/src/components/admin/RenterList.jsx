import React, { useCallback, useEffect, useState } from "react";
import { Eye, Loader2, RefreshCw, Store, Users } from "lucide-react";
import { Link } from "react-router-dom";
import userService from "../../api/userService";
import { TablePagination, TableSearch } from "../common/TableControls";

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export default function RenterList() {
  const [renters, setRenters] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadRenters = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await userService.getApprovedRenters({ page, limit, search });
      setRenters(data.renters || []);
      setPagination(data.pagination || { total: (data.renters || []).length, totalPages: 1 });
    } catch (requestError) {
      setRenters([]);
      setError(requestError.message || "Unable to load approved Renters.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => { loadRenters(); }, [loadRenters, reload]);

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Store className="h-5 w-5" /></span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Approved Renters</h1>
            <p className="mt-1 text-xs text-slate-400">Renter accounts approved by Admin. Pending applications are listed separately.</p>
          </div>
        </div>
        <button type="button" onClick={() => setReload((value) => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-300"><Users className="h-5 w-5" /></span><span><strong className="block text-lg leading-5 text-white">{pagination.total}</strong><small className="text-xs text-slate-400">Approved Renter accounts</small></span></div>
        <div className="w-full sm:w-80"><TableSearch value={searchInput} onChange={setSearchInput} placeholder="Search Renters by name, email or phone" /></div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading approved Renters...</div>
        ) : error ? (
          <div role="alert" className="p-10 text-center"><p className="text-sm text-rose-200">{error}</p><button type="button" onClick={() => setReload((value) => value + 1)} className="mt-3 text-xs font-semibold text-indigo-300 hover:text-white">Try again</button></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-800/50 text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3 font-semibold">Renter</th><th className="px-5 py-3 font-semibold">Email</th><th className="px-5 py-3 font-semibold">Phone</th><th className="px-5 py-3 font-semibold">Registered</th><th className="px-5 py-3 font-semibold">Approved</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-800/80">
                {renters.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center"><span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-slate-400"><Store className="h-5 w-5" /></span><strong className="block text-sm text-white">No approved Renters found</strong><span className="mt-1 block text-xs text-slate-400">Approved Renter accounts will appear here.</span></td></tr>
                ) : renters.map((renter) => (
                  <tr key={renter.id} className="hover:bg-slate-800/20">
                    <td className="px-5 py-4 font-semibold text-white">{renter.name}</td>
                    <td className="px-5 py-4 text-xs text-slate-300">{renter.email}</td>
                    <td className="px-5 py-4 text-xs text-slate-300">{renter.countryCode} {renter.phone}</td>
                    <td className="px-5 py-4 text-xs text-slate-400">{formatDate(renter.createdAt)}</td>
                    <td className="px-5 py-4 text-xs text-slate-400">{formatDate(renter.approvalReviewedAt)}</td>
                    <td className="px-5 py-4"><span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">Approved</span></td>
                    <td className="px-5 py-4"><Link to={`/admin/management/renters/${renter.id}`} aria-label={`View ${renter.name} details`} title="View Renter details" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-indigo-300 hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:text-indigo-200"><Eye className="h-4 w-4" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && <TablePagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} onLimitChange={(size) => { setLimit(size); setPage(1); }} />}
      </div>
    </section>
  );
}


