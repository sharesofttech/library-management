import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Activity, AlertTriangle, ArrowDownRight, ArrowRight, BookCopy, BookOpen, CheckCircle2, Clock3, Layers3, LibraryBig, RefreshCw, Users, WalletCards } from "lucide-react";
import { selectUser } from "../../store/authSlice";
import apiClient from "../../api/client";

const number = (value) => Number(value || 0).toLocaleString();
const dateLabel = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "-";

function MetricCard({ title, value, caption, icon: Icon, tone, href, loading }) {
  const content = <><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-400">{title}</p>{loading ? <div className="mt-3 h-8 w-20 animate-pulse rounded bg-slate-800" /> : <p className="mt-2 text-2xl font-bold tracking-tight text-white tabular-nums">{number(value)}</p>}</div><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${tone}`}><Icon className="h-4.5 w-4.5" /></span></div><p className="mt-3 text-[11px] text-slate-500">{caption}</p></>;
  const classes = "block rounded-2xl border border-slate-800 bg-slate-900/75 p-4 transition hover:border-slate-700 sm:p-5";
  return href ? <Link to={href} className={`${classes} group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400`}>{content}</Link> : <div className={classes}>{content}</div>;
}

function ActivityChart({ rows = [] }) {
  const max = Math.max(1, ...rows.flatMap((row) => [row.issued, row.returned]));
  const x = (index) => 34 + (rows.length <= 1 ? 0 : index * (512 / (rows.length - 1)));
  const y = (value) => 156 - (Number(value || 0) / max) * 124;
  const line = (key) => rows.map((row, index) => `${index ? "L" : "M"} ${x(index)} ${y(row[key])}`).join(" ");
  return <div className="mt-5"><div className="mb-3 flex items-center gap-4 text-[11px] text-slate-400"><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-indigo-400" />Issued</span><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-cyan-400" />Returned</span></div><svg viewBox="0 0 580 206" role="img" aria-label="Books issued and returned during the last seven days" className="h-52 w-full overflow-visible"><g className="text-slate-800" stroke="currentColor"><path d="M34 32H548M34 74H548M34 116H548M34 158H548" /></g><path d={line("issued")} fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{rows.map((row, index) => <circle key={`i-${row.date}`} cx={x(index)} cy={y(row.issued)} r="3.5" fill="#818cf8" />)}<path d={line("returned")} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{rows.map((row, index) => <circle key={`r-${row.date}`} cx={x(index)} cy={y(row.returned)} r="3.5" fill="#22d3ee" />)}{rows.map((row, index) => <text key={row.date} x={x(index)} y="190" textAnchor="middle" fill="#64748b" fontSize="10">{new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</text>)}</svg></div>;
}

function InventoryBars({ stats }) {
  const items = [
    ["Available", stats.availableCopies, "bg-emerald-400"],
    ["On loan", stats.issuedCopies, "bg-indigo-400"],
    ["Damaged", stats.damagedCopies, "bg-amber-400"],
    ["Lost", stats.lostCopies, "bg-rose-400"],
  ];
  const total = Math.max(1, Number(stats.copies || 0));
  return <div className="space-y-4">{items.map(([label, value, color]) => <div key={label}><div className="mb-1.5 flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className="font-semibold text-slate-200">{number(value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, (Number(value || 0) / total) * 100)}%` }} /></div></div>)}</div>;
}

function StatusPill({ status }) {
  const tone = status === "returned" ? "bg-emerald-500/10 text-emerald-300" : status === "overdue" ? "bg-rose-500/10 text-rose-300" : status === "lost" ? "bg-slate-700 text-slate-300" : "bg-indigo-500/10 text-indigo-300";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${tone}`}>{status || "issued"}</span>;
}

export default function AdminDashboard() {
  const user = useSelector(selectUser) || {};
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/dashboard/stats");
      setDashboard(data);
    } catch (requestError) {
      setError(requestError.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, reload]);

  const stats = dashboard?.stats || {};
  const mainMetrics = [
    { title: "Active borrowings", value: stats.activeBorrowings, caption: "Books currently on loan", icon: BookOpen, tone: "border-indigo-400/15 bg-indigo-400/10 text-indigo-300", href: "/admin/borrowings?status=issued" },
    { title: "Returned books", value: stats.returnedBorrowings, caption: "Completed library loans", icon: CheckCircle2, tone: "border-emerald-400/15 bg-emerald-400/10 text-emerald-300", href: "/admin/borrowings?status=returned" },
    { title: "Overdue books", value: stats.overdueBorrowings, caption: "Need follow-up", icon: Clock3, tone: "border-amber-400/15 bg-amber-400/10 text-amber-300", href: "/admin/borrowings?status=overdue" },
    { title: "Lost books", value: stats.lostBorrowings, caption: "Marked lost in borrowings", icon: AlertTriangle, tone: "border-rose-400/15 bg-rose-400/10 text-rose-300", href: "/admin/borrowings?status=lost" },
    { title: "Book titles", value: stats.books, caption: "Titles in the library catalog", icon: LibraryBig, tone: "border-violet-400/15 bg-violet-400/10 text-violet-300", href: "/admin/books" },
    { title: "Physical copies", value: stats.copies, caption: `${number(stats.availableCopies)} available · ${number(stats.issuedCopies)} on loan`, icon: Layers3, tone: "border-cyan-400/15 bg-cyan-400/10 text-cyan-300", href: "/admin/books" },
    { title: "Readers", value: stats.users, caption: `+${number(stats.newMembers)} joined this month`, icon: Users, tone: "border-blue-400/15 bg-blue-400/10 text-blue-300", href: "/admin/management/users" },
    { title: "Open book requests", value: stats.pendingRequests, caption: "Waiting for staff action", icon: BookCopy, tone: "border-orange-400/15 bg-orange-400/10 text-orange-300", href: "/admin/borrowings" },
  ];

  return <div className="mx-auto max-w-[1500px] space-y-6 pb-8">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Library overview</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Good day, {user.name || "Admin"}</h1><p className="mt-1 text-sm text-slate-400">Here’s what’s happening across your library.</p></div><div className="flex items-center gap-3"><span className="hidden rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 sm:inline">{new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span><button type="button" onClick={() => setReload((value) => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:text-white disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Refresh</button></div></header>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200"><span>{error}</span><button type="button" onClick={() => setReload((value) => value + 1)} className="font-semibold text-rose-100 underline">Try again</button></div>}

    <section aria-label="Library metrics" aria-busy={loading} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{mainMetrics.map((metric) => <MetricCard key={metric.title} {...metric} loading={loading} />)}</section>

    <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/65 p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Checkout activity</h2><p className="mt-1 text-xs text-slate-500">Books issued and returned · last 7 days</p></div><span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500/10 text-indigo-300"><Activity className="h-4 w-4" /></span></div>{loading ? <div className="mt-6 h-52 animate-pulse rounded-xl bg-slate-800/60" /> : <ActivityChart rows={dashboard?.weeklyActivity} />}</article>
      <article className="rounded-2xl border border-slate-800 bg-slate-900/65 p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Overdue history</h2><p className="mt-1 text-xs text-slate-500">Borrowings that need attention</p></div><Link to="/admin/borrowings?status=overdue" className="text-xs font-medium text-indigo-300 hover:text-indigo-200">View all</Link></div>{loading ? <div className="h-52 animate-pulse rounded-xl bg-slate-800/60" /> : dashboard?.overdueHistory?.length ? <div className="space-y-1">{dashboard.overdueHistory.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-3 hover:bg-slate-800/50"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-200">{item.book?.title || "Untitled book"}</p><p className="mt-1 truncate text-[11px] text-slate-500">{item.member?.name || "Reader"} · due {dateLabel(item.dueDate)}</p></div><ArrowDownRight className="h-4 w-4 shrink-0 text-rose-300" /></div>)}</div> : <div className="grid h-52 place-items-center text-center"><div><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" /><p className="mt-2 text-xs text-slate-400">No overdue books right now</p></div></div>}</article>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/65"><div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4"><div><h2 className="text-sm font-semibold text-white">Recent checkouts</h2><p className="mt-1 text-xs text-slate-500">Latest borrowing activity</p></div><Link to="/admin/borrowings" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200">View all <ArrowRight className="h-3.5 w-3.5" /></Link></div>{loading ? <div className="h-56 animate-pulse bg-slate-800/30" /> : !dashboard?.recentBorrowings?.length ? <div className="grid h-48 place-items-center text-sm text-slate-500">No borrowing records yet.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left"><thead className="bg-slate-800/40 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Book / Member</th><th className="px-5 py-3 font-semibold">Issue date</th><th className="px-5 py-3 font-semibold">Due date</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead><tbody className="divide-y divide-slate-800/70">{dashboard.recentBorrowings.map((item) => <tr key={item.id} className="text-xs"><td className="px-5 py-3.5"><p className="font-semibold text-slate-200">{item.book?.title || "Untitled book"}</p><p className="mt-1 text-[11px] text-slate-500">{item.member?.name || "Reader"}</p></td><td className="px-5 py-3.5 text-slate-400">{dateLabel(item.issueDate)}</td><td className="px-5 py-3.5 text-slate-400">{dateLabel(item.dueDate)}</td><td className="px-5 py-3.5"><StatusPill status={item.status} /></td></tr>)}</tbody></table></div>}</article>
      <div className="space-y-5">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/65 p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Inventory overview</h2><p className="mt-1 text-xs text-slate-500">Status of physical copies</p></div><Link to="/admin/books" className="text-xs font-medium text-indigo-300 hover:text-indigo-200">Manage</Link></div>{loading ? <div className="h-36 animate-pulse rounded-xl bg-slate-800/60" /> : <InventoryBars stats={stats} />}</article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/65 p-5"><div className="mb-3 flex items-center gap-2"><WalletCards className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Needs your review</h2></div><div className="grid grid-cols-2 gap-2"><Link to="/admin/borrowings" className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:border-slate-700"><p className="text-lg font-bold text-white">{loading ? "—" : number(stats.pendingRequests)}</p><p className="mt-1 text-[11px] text-slate-500">Book requests</p></Link><Link to="/admin/fines" className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:border-slate-700"><p className="text-lg font-bold text-white">{loading ? "—" : number(stats.unsettledFines)}</p><p className="mt-1 text-[11px] text-slate-500">Unsettled fines</p></Link>{user.role === "admin" && <><Link to="/admin/applications" className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:border-slate-700"><p className="text-lg font-bold text-white">{loading ? "—" : number(stats.pendingApplications)}</p><p className="mt-1 text-[11px] text-slate-500">Access applications</p></Link><Link to="/admin/renter-listings" className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 hover:border-slate-700"><p className="text-lg font-bold text-white">{loading ? "—" : number(stats.pendingRenterListings)}</p><p className="mt-1 text-[11px] text-slate-500">Renter listings</p></Link></>}</div></article>
      </div>
    </section>
  </div>;
}
