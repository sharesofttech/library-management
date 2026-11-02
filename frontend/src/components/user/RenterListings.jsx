import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, ImagePlus, Loader2, Plus, Store } from "lucide-react";
import userService from "../../api/userService";
import { bookImageUrl } from "../../api/bookService";
import { TablePagination } from "../common/TableControls";
import Select from "../common/Select";
import RichTextEditor from "./RichTextEditor";

const initialForm = {
  title: "", authorName: "", categoryId: "", isbn: "", description: "", highlights: "", condition: "good", copyCount: "1",
  rentalPrice: "", rentalPeriodDays: "14", weightKg: "", pickupAvailable: true, deliveryAvailable: false,
};

const statusStyles = {
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  rejected: "border-rose-500/20 bg-rose-500/10 text-rose-300",
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "-";

export default function RenterListings() {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [cover, setCover] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [weightDrafts, setWeightDrafts] = useState({});
  const [weightSavingId, setWeightSavingId] = useState(null);
  const [weightErrors, setWeightErrors] = useState({});

  const localPreview = useMemo(() => cover ? URL.createObjectURL(cover) : "", [cover]);
  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await userService.getMyRenterListings({ page, limit });
      setListings(data.listings || []);
      setPagination(data.pagination || { total: (data.listings || []).length, totalPages: 1 });
    } catch (error) {
      setLoadError(error.message || "Unable to load your listings.");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { loadListings(); }, [loadListings, reload]);

  useEffect(() => {
    let active = true;
    userService.getRenterCategories()
      .then((data) => { if (active) setCategories(data.categories || []); })
      .catch((error) => { if (active) setCategoriesError(error.message || "Unable to load Admin categories."); })
      .finally(() => { if (active) setCategoriesLoading(false); });
    return () => { active = false; };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!form.pickupAvailable && !form.deliveryAvailable) {
      setFormError("Choose pickup, delivery or both.");
      return;
    }
    if (!form.categoryId) {
      setFormError("Choose a category.");
      return;
    }
    if (!cover) {
      setFormError("Upload a book cover image.");
      return;
    }
    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, String(value)));
      payload.append("bookImg", cover);
      const result = await userService.createRenterListing(payload);
      setForm(initialForm);
      setCover(null);
      setShowForm(false);
      setNotice(result.message || "Book listing submitted for Admin review.");
      setPage(1);
      setReload((value) => value + 1);
    } catch (error) {
      setFormError(error.message || "Unable to submit the book listing.");
    } finally {
      setSaving(false);
    }
  };

  const saveExistingWeight = async (listing) => {
    setWeightSavingId(listing.id);
    setWeightErrors((current) => ({ ...current, [listing.id]: "" }));
    try {
      const result = await userService.updateRenterListingWeight(listing.id, weightDrafts[listing.id]);
      setListings((current) => current.map((item) => item.id === listing.id ? { ...item, weightKg: result.listing.weightKg } : item));
      setNotice(result.message || "Book weight saved.");
    } catch (error) {
      setWeightErrors((current) => ({ ...current, [listing.id]: error.message || "Unable to save the book weight." }));
    } finally {
      setWeightSavingId(null);
    }
  };

  const fieldClass = "w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Store className="h-5 w-5" /></span><div><h1 className="text-xl font-bold tracking-tight text-white">My Book Listings</h1><p className="mt-1 text-xs text-slate-400">Submit renter-owned books for Admin review.</p></div></div>
        <button type="button" onClick={() => { setFormError(""); setShowForm((value) => !value); }} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500">{showForm ? "Close form" : <><Plus className="h-4 w-4" /> Add a book</>}</button>
      </header>

      {showForm && (
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-7">
          <div><h2 className="text-base font-bold text-white">Book listing details</h2><p className="mt-1 text-xs text-slate-400">Your listing stays pending until an Admin reviews it. It will not be shown to Readers before approval.</p></div>
          {formError && <p role="alert" className={`rounded-lg border px-3 py-2 text-xs ${formError.startsWith("Book listing submitted") ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-rose-500/20 bg-rose-500/10 text-rose-200"}`}>{formError}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-medium text-slate-300">Book title *<input required maxLength={200} className={fieldClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter book title" /></label>
            <label className="space-y-1.5 text-xs font-medium text-slate-300">Author *<input required maxLength={150} className={fieldClass} value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} placeholder="Enter author name" /></label>
            <div className="space-y-1.5 text-xs font-medium text-slate-300"><span className="block">Category *</span><Select aria-label="Book category" required disabled={categoriesLoading || categories.length === 0} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="!rounded-lg !py-2.5" options={[{ value: "", label: categoriesLoading ? "Loading Admin categories..." : "Select a category" }, ...categories.map((category) => ({ value: String(category.id), label: category.title }))]} />{categoriesError && <span className="block text-rose-300">{categoriesError}</span>}{!categoriesLoading && !categoriesError && categories.length === 0 && <span className="block text-amber-300">No active categories found. Ask Admin to create one first.</span>}</div>
            <label className="space-y-1.5 text-xs font-medium text-slate-300">ISBN *<input required maxLength={32} className={fieldClass} value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} placeholder="Enter ISBN" /></label>
            <div className="space-y-1.5 text-xs font-medium text-slate-300"><span className="block">Book condition *</span><Select aria-label="Book condition" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="!rounded-lg !py-2.5" options={[{ value: "new", label: "New" }, { value: "like new", label: "Like new" }, { value: "good", label: "Good" }, { value: "acceptable", label: "Acceptable" }, { value: "worn", label: "Worn" }]} /></div>
            <label className="space-y-1.5 text-xs font-medium text-slate-300">Number of copies *<input required type="number" min="1" max="1000" step="1" className={fieldClass} value={form.copyCount} onChange={(e) => setForm({ ...form, copyCount: e.target.value })} /></label>
            <label className="space-y-1.5 text-xs font-medium text-slate-300">Book weight (kg) *<input required type="number" min="0.001" max="50" step="0.001" className={fieldClass} value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} placeholder="e.g. 0.450" /><span className="block text-[11px] text-slate-500">Enter the book weight in kilograms.</span></label>
            <label className="space-y-1.5 text-xs font-medium text-slate-300">Rental price (₹) *<input required type="number" min="0.01" max="99999999.99" step="0.01" className={fieldClass} value={form.rentalPrice} onChange={(e) => setForm({ ...form, rentalPrice: e.target.value })} placeholder="e.g. 50" /></label>
            <label className="space-y-1.5 text-xs font-medium text-slate-300">Rental period (days) *<input required type="number" min="1" max="365" step="1" className={fieldClass} value={form.rentalPeriodDays} onChange={(e) => setForm({ ...form, rentalPeriodDays: e.target.value })} /></label>
            <div className="space-y-2 text-xs font-medium text-slate-300"><span>Handover options *</span><label className="flex items-center gap-2"><input type="checkbox" checked={form.pickupAvailable} onChange={(e) => setForm({ ...form, pickupAvailable: e.target.checked })} /> Pickup available</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.deliveryAvailable} onChange={(e) => setForm({ ...form, deliveryAvailable: e.target.checked })} /> Delivery available</label></div>
          </div>
          <label className="block space-y-1.5 text-xs font-medium text-slate-300">Description *<textarea required maxLength={5000} rows={4} className={fieldClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the book and its condition" /></label>
          <div className="space-y-1.5 text-xs font-medium text-slate-300"><label>Book highlights (optional)</label><RichTextEditor value={form.highlights} onChange={(highlights) => setForm((current) => ({ ...current, highlights }))} /></div>
          <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-700 p-4 text-xs text-slate-300"><span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-800 text-indigo-300"><ImagePlus className="h-5 w-5" /></span><span><strong className="block text-white">Book cover image *</strong><small className="text-slate-500">Required · JPG, PNG or WebP, maximum 5 MB</small></span><input required className="max-w-52 text-[11px]" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) { setFormError("Choose a JPG, PNG or WebP image up to 5 MB."); e.target.value = ""; setCover(null); return; } setFormError(""); setCover(file || null); }} />{localPreview && <img className="h-24 w-16 rounded-md object-cover" src={localPreview} alt="Cover preview" />}</label>
          <div className="flex justify-end border-t border-slate-800 pt-4"><button disabled={saving || categoriesLoading || categories.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Submitting..." : "Submit for Admin review"}</button></div>
        </form>
      )}

      {notice && <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">{notice}</p>}

      {!loading && listings.some((listing) => !listing.weightKg && listing.status !== "rejected") && <div className="space-y-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4"><div><h2 className="text-sm font-semibold text-white">Book weight is missing</h2><p className="mt-1 text-xs text-slate-400">Add the weight to older listings so Admin can review the correct value.</p></div>{listings.filter((listing) => !listing.weightKg && listing.status !== "rejected").map((listing) => <div key={listing.id} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3"><div className="min-w-48 flex-1"><label htmlFor={`weight-${listing.id}`} className="text-xs font-medium text-slate-300">{listing.title} — weight (kg)</label><input id={`weight-${listing.id}`} type="number" required min="0.001" max="50" step="0.001" value={weightDrafts[listing.id] || ""} onChange={(event) => setWeightDrafts((current) => ({ ...current, [listing.id]: event.target.value }))} placeholder="e.g. 0.450" className={`${fieldClass} mt-1`} /></div><button type="button" disabled={weightSavingId !== null} onClick={() => saveExistingWeight(listing)} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{weightSavingId === listing.id ? "Saving..." : "Save weight"}</button>{weightErrors[listing.id] && <p role="alert" className="w-full text-xs text-rose-300">{weightErrors[listing.id]}</p>}</div>)}</div>}

      {loadError ? <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-200">{loadError} <button className="ml-2 underline" onClick={loadListings}>Try again</button></div> : loading ? <div className="flex justify-center gap-2 py-12 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading your listings...</div> : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-sm"><thead className="border-b border-slate-800 bg-slate-800/50 text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Book</th><th className="px-5 py-3">Copies</th><th className="px-5 py-3">Price / period</th><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Admin note</th></tr></thead><tbody className="divide-y divide-slate-800/80">{listings.length === 0 ? <tr><td colSpan={6} className="py-14 text-center text-sm text-slate-400">You have not submitted any book listings yet.</td></tr> : listings.map((listing) => <tr key={listing.id}><td className="px-5 py-4"><div className="flex items-center gap-3">{listing.coverImage ? <img src={bookImageUrl(listing.coverImage)} alt="" className="h-12 w-9 rounded object-cover" /> : <span className="grid h-12 w-9 place-items-center rounded bg-slate-800"><Store className="h-4 w-4 text-slate-500" /></span>}<span><strong className="block text-white">{listing.title}</strong><small className="text-xs text-slate-400">{listing.authorName}</small><small className="block text-[11px] text-slate-500">{listing.categoryName || "Uncategorized"} | ISBN {listing.isbn || "-"}</small></span></div></td><td className="px-5 py-4 text-slate-300">{listing.copyCount}</td><td className="px-5 py-4 text-slate-300">₹{listing.rentalPrice} / {listing.rentalPeriodDays} days</td><td className="px-5 py-4 text-xs text-slate-400">{formatDate(listing.createdAt)}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize ${statusStyles[listing.status] || "border-slate-700 bg-slate-800 text-slate-300"}`}>{listing.status}</span></td><td className="max-w-56 px-5 py-4 text-xs text-slate-400">{listing.adminNote || "-"}</td></tr>)}</tbody></table></div>
          <TablePagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} onLimitChange={(value) => { setLimit(value); setPage(1); }} />
        </div>
      )}
      {!loading && !loadError && listings.length > 0 && <div className="flex items-center gap-2 text-[11px] text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Only Admin-approved listings can be published to the marketplace.</div>}
    </section>
  );
}
