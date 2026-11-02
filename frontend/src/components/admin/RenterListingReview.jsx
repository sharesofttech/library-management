import React, { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, Store, X } from "lucide-react";
import userService from "../../api/userService";
import { bookImageUrl } from "../../api/bookService";
import { TablePagination, TableSearch } from "../common/TableControls";
import { renderBookHighlights } from "../common/BookHighlights";

const formatDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "-";

export default function RenterListingReview() {
  const [listings, setListings] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [notes, setNotes] = useState({});
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await userService.getPendingRenterListings({ page, limit, search });
      setListings(data.listings || []);
      setPagination(data.pagination || { total: (data.listings || []).length, totalPages: 1 });
    } catch (requestError) {
      setError(requestError.message || "Unable to load pending book listings.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => { loadListings(); }, [loadListings, reload]);

  const review = async (listing, decision) => {
    setProcessingId(listing.id);
    setActionError("");
    try {
      await userService.reviewRenterListing(listing.id, decision, notes[listing.id] || "");
      setListings((current) => current.filter((item) => item.id !== listing.id));
      setPagination((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
    } catch (requestError) {
      setActionError(requestError.message || "Unable to review this listing.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Store className="h-5 w-5" /></span><div><h1 className="text-xl font-bold tracking-tight text-white">Renter Book Listings</h1><p className="mt-1 text-xs text-slate-400">Review renter-supplied books before they can be published.</p></div></div>
        <button type="button" onClick={() => setReload((value) => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </header>

      {actionError && <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{actionError}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><div><strong className="block text-lg text-white">{pagination.total}</strong><small className="text-xs text-slate-400">Pending listing reviews</small></div><div className="w-full sm:w-80"><TableSearch value={searchInput} onChange={setSearchInput} placeholder="Search by book, author or Renter" /></div></div>

      {loading ? <div className="flex justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 py-16 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading pending listings...</div> : error ? <div role="alert" className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-rose-200">{error}<button onClick={() => setReload((value) => value + 1)} className="ml-2 underline">Try again</button></div> : listings.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 py-16 text-center"><Store className="mx-auto mb-3 h-7 w-7 text-slate-500" /><h2 className="text-sm font-semibold text-white">No pending book listings</h2><p className="mt-1 text-xs text-slate-400">New Renter submissions will appear here.</p></div> : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const busy = processingId === listing.id;
            return <article key={listing.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="grid gap-5 p-5 md:grid-cols-[112px_1fr]">
                <div className="flex h-36 w-28 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950">{listing.coverImage ? <img src={bookImageUrl(listing.coverImage)} alt={`${listing.title} cover`} className="h-full w-full object-cover" /> : <Store className="h-8 w-8 text-slate-600" />}</div>
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-base font-bold text-white">{listing.title}</h2><p className="mt-0.5 text-xs text-slate-400">by {listing.authorName}{listing.isbn ? ` · ISBN ${listing.isbn}` : ""}</p></div><span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-300">Pending review</span></div>
                  <p className="text-xs leading-5 text-slate-300">{listing.description}</p>
                  {listing.highlights && <details className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"><summary className="cursor-pointer text-xs font-semibold text-indigo-300">Highlights</summary><div className="mt-3 max-h-72 space-y-2 overflow-y-auto text-xs leading-6 text-slate-300">{renderBookHighlights(listing.highlights)}</div></details>}
                  <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4"><span>Renter: <b className="text-slate-200">{listing.owner?.name}</b></span><span>Email: <b className="text-slate-200">{listing.owner?.email}</b></span><span>Condition: <b className="capitalize text-slate-200">{listing.condition}</b></span><span>Copies: <b className="text-slate-200">{listing.copyCount}</b></span><span>Price: <b className="text-slate-200">₹{listing.rentalPrice} / {listing.rentalPeriodDays} days</b></span><span>Pickup: <b className="text-slate-200">{listing.pickupAvailable ? "Yes" : "No"}</b></span><span>Delivery: <b className="text-slate-200">{listing.deliveryAvailable ? "Yes" : "No"}</b></span><span>Submitted: <b className="text-slate-200">{formatDate(listing.createdAt)}</b></span></div>
                  <p className="text-xs text-slate-400">Book weight: <b className="text-slate-200">{listing.weightKg ? `${Number(listing.weightKg).toFixed(3)} kg` : "Not provided"}</b></p>
                  <label className="block text-[11px] font-medium text-slate-400">Admin note (optional)<textarea rows={2} maxLength={1000} value={notes[listing.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [listing.id]: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-white outline-none focus:border-indigo-400" placeholder="Add a reason or feedback" /></label>
                  <div className="flex justify-end gap-2"><button disabled={busy} onClick={() => review(listing, "rejected")} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/25 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Reject</button><button disabled={busy} onClick={() => review(listing, "approved")} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve listing</button></div>
                </div>
              </div>
            </article>;
          })}
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60"><TablePagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} onLimitChange={(value) => { setLimit(value); setPage(1); }} /></div>
        </div>
      )}
    </section>
  );
}
