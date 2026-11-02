import React, { useCallback, useEffect, useState } from "react";
import { Check, Clock3, Loader2, RefreshCw, UserCheck, X } from "lucide-react";
import apiClient from "../../api/client";

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export default function AccountApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await apiClient.get("/admin/applications");
      setApplications(data.applications || []);
    } catch (error) {
      setLoadError(error.message || "Unable to load account applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  const review = async (application, decision) => {
    setProcessingId(application.key || application.id);
    setActionError("");
    try {
      const endpoint = application.kind === "role" ? `/admin/role-applications/${application.id}` : `/admin/applications/${application.id}`;
      await apiClient.patch(endpoint, { decision });
      setApplications((current) => current.filter((item) => item.key !== application.key));
    } catch (error) {
      setActionError(error.message || "Unable to review this application.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold text-indigo-300">
            <UserCheck className="h-3.5 w-3.5" /> Admin review
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Account Applications</h1>
          <p className="mt-1 text-xs text-slate-400">Review Librarian and Renter requests before enabling access.</p>
        </div>
        <button type="button" onClick={loadApplications} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      {actionError && <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{actionError}</div>}

      <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-300"><Clock3 className="h-5 w-5" /></span>
        <span><strong className="block text-lg leading-5 text-white">{applications.length}</strong><small className="text-xs text-slate-400">Pending review</small></span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 py-16 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading applications...</div>
      ) : loadError ? (
        <div role="alert" className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center"><p className="text-sm text-slate-300">{loadError}</p><button type="button" onClick={loadApplications} className="mt-3 text-xs font-semibold text-indigo-300 hover:text-white">Try again</button></div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 px-5 py-14 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-800 text-slate-400"><Check className="h-5 w-5" /></span>
          <h2 className="text-sm font-semibold text-white">You are all caught up</h2>
          <p className="mt-1 text-xs text-slate-400">New Librarian and Renter applications will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-800/50 text-[11px] uppercase tracking-wide text-slate-400">
                <tr><th className="px-5 py-3 font-semibold">Applicant</th><th className="px-5 py-3 font-semibold">Requested access</th><th className="px-5 py-3 font-semibold">Contact</th><th className="px-5 py-3 font-semibold">Applied</th><th className="px-5 py-3 text-right font-semibold">Decision</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {applications.map((application) => {
                  const busy = processingId === application.key;
                  return (
                    <tr key={application.key || `${application.kind}-${application.id}`} className="align-top hover:bg-slate-800/20">
                      <td className="px-5 py-4"><strong className="block text-sm text-white">{application.name}</strong><span className="mt-1 block text-xs text-slate-400">{application.email}</span></td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize ${application.requestedRole === "renter" ? "border-violet-500/20 bg-violet-500/10 text-violet-300" : "border-blue-500/20 bg-blue-500/10 text-blue-300"}`}>{application.requestedRole}</span></td>
                      <td className="px-5 py-4 text-xs text-slate-300">{application.countryCode} {application.phone}</td>
                      <td className="px-5 py-4 text-xs text-slate-400">{formatDate(application.createdAt)}</td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-2">
                        <button type="button" disabled={busy} onClick={() => review(application, "rejected")} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/25 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Reject</button>
                        <button type="button" disabled={busy} onClick={() => review(application, "approved")} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve</button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
