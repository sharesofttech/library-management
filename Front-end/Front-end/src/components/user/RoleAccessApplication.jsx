import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Loader2, Send, Store } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import userService from "../../api/userService";

export default function RoleAccessApplication() {
  const { requestedRole } = useParams();
  const validRole = ["renter", "librarian"].includes(requestedRole) ? requestedRole : "renter";
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await userService.getMyRoleApplications(); setApplications(data.applications || []); }
    catch (requestError) { setError(requestError.message || "Unable to load your requests."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const latest = applications.find((application) => application.requestedRole === validRole);
  const submit = async () => {
    setSubmitting(true); setError(""); setNotice("");
    try { const data = await userService.createRoleApplication(validRole); setNotice(data.message || "Your request was sent to the Admin."); await load(); }
    catch (requestError) { setError(requestError.message || "Unable to submit your request."); }
    finally { setSubmitting(false); }
  };
  const title = validRole === "renter" ? "Become a Renter" : "Become a Librarian";
  const Icon = validRole === "renter" ? Store : BriefcaseBusiness;
  return <section className="mx-auto max-w-2xl space-y-6"><Link to="/my/profile" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> My Profile</Link><div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8"><span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/10 text-indigo-300"><Icon className="h-5 w-5" /></span><h1 className="mt-4 text-2xl font-bold text-white">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-400">Your Reader account will stay active while the Admin reviews this request. We’ll email you when a decision is made.</p>{error && <p role="alert" className="mt-5 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}{notice && <p role="status" className="mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}{loading ? <p className="mt-6 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading request status...</p> : latest ? <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold capitalize text-white">{validRole} access request</p><p className="mt-1 text-xs text-slate-500">Submitted {new Date(latest.createdAt).toLocaleDateString()}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${latest.status === "approved" ? "bg-emerald-500/10 text-emerald-300" : latest.status === "rejected" ? "bg-rose-500/10 text-rose-300" : "bg-amber-500/10 text-amber-300"}`}>{latest.status}</span></div>{latest.note && <p className="mt-3 text-xs text-slate-400">Admin note: {latest.note}</p>}{latest.status !== "pending" && <button type="button" disabled={submitting} onClick={submit} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"><Send className="h-3.5 w-3.5" />Submit a new request</button>}</div> : <button type="button" disabled={submitting} onClick={submit} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send request to Admin</button>}</div></section>;
}
