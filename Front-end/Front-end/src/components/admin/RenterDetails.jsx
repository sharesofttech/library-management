import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Loader2, Mail, Phone, Store } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import userService from "../../api/userService";
import { bookImageUrl } from "../../api/bookService";

const dateLabel = (value) => value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "-";
const listingStyles = {
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  rejected: "border-rose-500/20 bg-rose-500/10 text-rose-300",
};
const requestStyles = {
  pending: "text-amber-300",
  approved: "text-emerald-300",
  rejected: "text-rose-300",
};

export default function RenterDetails() {
  const { id } = useParams();
  const [renter, setRenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    userService.getApprovedRenterDetails(id)
      .then((data) => { if (active) setRenter(data.renter); })
      .catch((requestError) => { if (active) setError(requestError.message || "Unable to load Renter details."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const summary = useMemo(() => {
    const listings = renter?.renterListings || [];
    const requests = listings.flatMap((listing) => listing.rentalRequests || []);
    return {
      totalBooks: listings.length,
      approvedBooks: listings.filter((listing) => listing.status === "approved").length,
      pendingBooks: listings.filter((listing) => listing.status === "pending").length,
      rentalRequests: requests.length,
    };
  }, [renter]);

  if (loading) return <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-indigo-300" />Loading Renter details...</div>;
  if (error || !renter) return <section className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center"><p role="alert" className="text-sm text-rose-200">{error || "Approved Renter not found."}</p><Link to="/admin/management/renters" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300"><ArrowLeft className="h-4 w-4" />Back to Renters</Link></section>;

  return <main className="mx-auto max-w-7xl space-y-6 pb-8">
    <Link to="/admin/management/renters" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Back to Approved Renters</Link>
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/10 text-xl font-bold text-violet-200">{renter.name?.[0]?.toUpperCase() || "R"}</span><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Renter profile</p><h1 className="mt-1 text-2xl font-bold text-white">{renter.name}</h1><p className="mt-1 text-xs text-slate-400">Approved on {dateLabel(renter.approvalReviewedAt)}</p></div></div>
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">Approved Renter</span>
      </div>
      <div className="mt-6 grid gap-3 border-t border-slate-800 pt-5 sm:grid-cols-3">
        <div className="flex items-center gap-2 text-sm text-slate-300"><Mail className="h-4 w-4 text-slate-500" />{renter.email}</div>
        <div className="flex items-center gap-2 text-sm text-slate-300"><Phone className="h-4 w-4 text-slate-500" />{renter.countryCode} {renter.phone}</div>
        <div className="text-sm text-slate-400">Registered {dateLabel(renter.createdAt)}</div>
      </div>
      {renter.approvalNote && <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">Admin approval note: {renter.approvalNote}</p>}
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[["Book listings", summary.totalBooks], ["Approved books", summary.approvedBooks], ["Pending review", summary.pendingBooks], ["Rental requests", summary.rentalRequests]].map(([label, value]) => <article key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></article>)}
    </section>

    <section className="space-y-4">
      <header className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Books history</p><h2 className="mt-1 text-xl font-bold text-white">Books submitted by {renter.name}</h2><p className="mt-1 text-xs text-slate-400">All submitted listings, Admin review status, and Reader rental request history.</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300"><Store className="h-3.5 w-3.5" />{summary.totalBooks} books</span></header>
      {!renter.renterListings?.length ? <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center"><BookOpen className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-3 text-sm font-semibold text-white">No books submitted yet</p><p className="mt-1 text-xs text-slate-400">This Renter’s submitted book history will appear here.</p></div> : <div className="space-y-4">{renter.renterListings.map((listing) => <article key={listing.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5"><div className="flex min-w-0 items-start gap-4"><div className="grid h-24 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70">{listing.coverImage ? <img src={bookImageUrl(listing.coverImage)} alt={`${listing.title} cover`} className="h-full w-full object-cover" /> : <BookOpen className="h-8 w-8 text-slate-600" />}</div><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold text-white">{listing.title}</h3><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize ${listingStyles[listing.status] || "border-slate-700 bg-slate-800 text-slate-300"}`}>{listing.status}</span></div><p className="mt-1 text-sm text-slate-400">{listing.authorName} · {listing.categoryName || "Uncategorized"}</p></div></div><div className="text-right"><p className="text-sm font-semibold text-white">₹{listing.rentalPrice} / {listing.rentalPeriodDays} days</p><p className="mt-1 text-xs text-slate-500">{listing.copyCount} copies · ISBN {listing.isbn || "-"}</p></div></div>
        <div className="grid gap-2 border-t border-slate-800 px-5 py-3 text-xs text-slate-400 sm:grid-cols-3"><span>Submitted {dateLabel(listing.createdAt)}</span><span>Reviewed {dateLabel(listing.reviewedAt)}</span><span>Condition: <span className="capitalize text-slate-300">{listing.condition}</span></span></div>
        {listing.adminNote && <p className="border-t border-slate-800 px-5 py-3 text-xs text-slate-400">Admin note: {listing.adminNote}</p>}
        <div className="border-t border-slate-800 p-5"><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rental request history ({listing.rentalRequests?.length || 0})</h4>{listing.rentalRequests?.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="text-[10px] uppercase text-slate-500"><tr><th className="py-2 pr-4">Reader</th><th className="py-2 pr-4">Requested</th><th className="py-2 pr-4">Handover</th><th className="py-2">Status</th></tr></thead><tbody className="divide-y divide-slate-800/70">{listing.rentalRequests.map((request) => <tr key={request.id}><td className="py-3 pr-4"><span className="block font-medium text-slate-200">{request.reader?.name || "Reader"}</span><span className="text-slate-500">{request.reader?.email || ""}</span></td><td className="py-3 pr-4 text-slate-400">{dateLabel(request.createdAt)}</td><td className="py-3 pr-4 capitalize text-slate-400">{request.handoverMethod}</td><td className={`py-3 font-semibold capitalize ${requestStyles[request.status] || "text-slate-400"}`}>{request.status}</td></tr>)}</tbody></table></div> : <p className="mt-2 text-xs text-slate-500">No Reader rental requests for this listing yet.</p>}</div>
      </article>)}</div>}
    </section>
  </main>;
}
