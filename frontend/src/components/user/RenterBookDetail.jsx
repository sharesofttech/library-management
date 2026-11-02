import React, { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Loader2, MapPin, Package, Truck, Send, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import userService from "../../api/userService";
import { bookImageUrl } from "../../api/bookService";
import { selectUser } from "../../store/authSlice";
import { useToast } from "../../context/ToastContext";
import { renderBookHighlights } from "../common/BookHighlights";
import RichTextEditor from "./RichTextEditor";

const estimateDeliveryCharge = (listing, quantity, rates) => {
  const weight = Number(listing?.weightKg || 0) * Number(quantity || 1);
  if (weight <= 0 || weight > 10) return null;
  const rate = rates.find((row) => weight >= Number(row.minWeight) && weight <= Number(row.maxWeight));
  if (!rate || rate.abort) return null;
  const rentalTotal = Number(listing.rentalPrice || 0) * Number(quantity || 1);
  return Number(rate.rowCost) + Number(rate.itemCost) * Number(quantity || 1) + Number(rate.kgCost) * weight + Number(rate.percentCost) * rentalTotal / 100;
};

export default function RenterBookDetail() {
  const { id } = useParams();
  const user = useSelector(selectUser) || {};
  const toast = useToast();
  const [listing, setListing] = useState(null);
  const [deliveryRates, setDeliveryRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [handoverMethod, setHandoverMethod] = useState("pickup");
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [editingHighlights, setEditingHighlights] = useState(false);
  const [highlightsDraft, setHighlightsDraft] = useState("");
  const [savingHighlights, setSavingHighlights] = useState(false);

  const isOwner = Number(listing?.owner?.id) === Number(user.id);
  const totalDeliveryWeight = Number(listing?.weightKg || 0) * Number(quantity || 1);
  const deliveryEstimate = estimateDeliveryCharge(listing, quantity, deliveryRates);

  const openHighlights = () => {
    setHighlightsDraft(listing.highlights || "");
    setEditingHighlights(isOwner && !listing.highlights);
    setShowHighlights(true);
  };

  const saveHighlights = async () => {
    setSavingHighlights(true);
    try {
      const result = await userService.updateRenterListingHighlights(listing.id, highlightsDraft);
      setListing((current) => ({ ...current, highlights: result.listing.highlights || "" }));
      setEditingHighlights(false);
      toast.success(result.message || "Book highlights saved");
    } catch (saveError) {
      toast.error(saveError.response?.data?.message || saveError.message || "Unable to save highlights");
    } finally {
      setSavingHighlights(false);
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      const result = await userService.createRentalRequest(id, { handoverMethod, message, quantity: Number(quantity), deliveryAddress });
      setSent(true);
      toast.success(result.message || "Rental request sent to the Renter");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || requestError.message || "Unable to send rental request");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([userService.getApprovedRenterListing(id), userService.getDeliveryRates().catch(() => ({ rates: [] }))])
      .then(([data, rateData]) => { if (active) { setListing(data.listing); setDeliveryRates(rateData.rates || []); setQuantity(1); setHandoverMethod(data.listing.deliveryAvailable ? "delivery" : "pickup"); } })
      .catch((requestError) => { if (active) setError(requestError.message || "Unable to load this book."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-indigo-300" /> Loading book details...</div>;
  if (error || !listing) return <section className="mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center"><p role="alert" className="text-sm text-rose-200">{error || "This book is unavailable."}</p><Link to="/home" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 hover:text-indigo-200"><ArrowLeft className="h-4 w-4" /> Back to books</Link></section>;

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-8">
      <Link to="/home" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to books</Link>
      <article className="grid overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl md:grid-cols-[minmax(240px,0.8fr)_1.2fr]">
        <div className="flex min-h-80 items-center justify-center bg-slate-950/70 p-8 md:min-h-[520px]">
          {listing.coverImage ? <img src={bookImageUrl(listing.coverImage)} alt={`${listing.title} cover`} className="max-h-[460px] w-full rounded-xl object-contain" /> : <BookOpen className="h-24 w-24 text-slate-700" />}
        </div>
        <div className="space-y-6 p-6 sm:p-9">
          <div><span className="inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold text-violet-200">Renter listed</span><h1 className="mt-4 text-3xl font-bold tracking-tight text-white">{listing.title}</h1><p className="mt-2 text-base text-slate-400">by {listing.authorName}</p></div>
          <p className="whitespace-pre-line text-sm leading-7 text-slate-300">{listing.description}</p>
          <button type="button" onClick={openHighlights} className="text-sm font-semibold text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 hover:text-indigo-200">Highlights</button>
          <dl className="grid gap-4 border-y border-slate-800 py-5 sm:grid-cols-2">
            <div><dt className="text-xs text-slate-500">Rental price</dt><dd className="mt-1 text-xl font-bold text-white">₹{listing.rentalPrice}<span className="ml-1 text-xs font-normal text-slate-400">/ {listing.rentalPeriodDays} days</span></dd></div>
            <div><dt className="text-xs text-slate-500">Available copies</dt><dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-white"><Package className="h-4 w-4 text-indigo-300" />{listing.availableCopies ?? listing.copyCount}</dd></div>
            <div><dt className="text-xs text-slate-500">Book condition</dt><dd className="mt-1 text-sm font-medium capitalize text-white">{listing.condition}</dd></div>
            <div><dt className="text-xs text-slate-500">Book weight</dt><dd className="mt-1 text-sm font-medium text-white">{listing.weightKg ? `${Number(listing.weightKg).toFixed(3)} kg` : "Not provided"}</dd></div>
            <div><dt className="text-xs text-slate-500">Category</dt><dd className="mt-1 text-sm font-medium text-white">{listing.categoryName || "Uncategorized"}</dd></div>
            <div><dt className="text-xs text-slate-500">Provider</dt><dd className="mt-1 text-sm font-medium text-white">Community listing · coordinated by Library Admin</dd></div>
          </dl>
          <div><h2 className="text-sm font-semibold text-white">Handover options</h2><div className="mt-3 flex flex-wrap gap-2">{listing.pickupAvailable && <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs text-slate-300"><MapPin className="h-4 w-4 text-indigo-300" />Pickup</span>}{listing.deliveryAvailable && <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs text-slate-300"><Truck className="h-4 w-4 text-indigo-300" />Delivery</span>}</div></div>
          {listing.isbn && <p className="text-xs text-slate-500">ISBN: <span className="text-slate-300">{listing.isbn}</span></p>}
          {listing.owner?.id === user.id ? <div className="rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">This is your listing. Reader requests will appear in your Rental Inbox.</div> : sent ? <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">Request sent. You can follow its status under <Link className="underline" to="/my/rental-requests">My Rental Requests</Link>.</div> : Number(listing.availableCopies ?? listing.copyCount) < 1 ? <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">No copies are currently available to request.</div> : <form onSubmit={submitRequest} className="space-y-4 rounded-2xl border border-violet-400/15 bg-violet-400/5 p-5">
            <div><h2 className="text-base font-semibold text-white">Request to rent this book</h2><p className="mt-1 text-xs leading-5 text-slate-400">The Renter reviews the request. Library Admin coordinates handover; Reader and Renter contact details are kept private. Listed price is {listing.rentalPrice} for {listing.rentalPeriodDays} days. No payment is collected yet.</p></div>
            <fieldset><legend className="text-xs font-medium text-slate-300">How would you like to receive it?</legend><div className="mt-2 flex flex-wrap gap-3">{listing.pickupAvailable && <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs text-slate-200"><input type="radio" name="handoverMethod" value="pickup" checked={handoverMethod === "pickup" || (!listing.deliveryAvailable && handoverMethod === "delivery")} onChange={() => setHandoverMethod("pickup")} /> Pickup</label>}{listing.deliveryAvailable && <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs text-slate-200"><input type="radio" name="handoverMethod" value="delivery" checked={handoverMethod === "delivery"} onChange={() => setHandoverMethod("delivery")} /> Delivery</label>}</div></fieldset>
            {handoverMethod === "delivery" && <label className="block text-xs font-medium text-slate-300">Delivery address for Library Admin<textarea required rows={3} maxLength={1000} value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Your full delivery address" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400" /><span className="mt-1 block text-[11px] text-slate-500">Only Library Admin can see this address.</span></label>}{handoverMethod === "delivery" && (totalDeliveryWeight > 10 ? <p role="status" className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">This delivery is over 10 kg, so the online delivery rate does not apply. Please contact Library Admin or visit the library to confirm whether delivery can be arranged and what it will cost.</p> : deliveryEstimate !== null ? <p className="rounded-lg border border-indigo-400/20 bg-indigo-400/5 px-3 py-2 text-xs text-indigo-200">Estimated delivery charge: ₹{deliveryEstimate.toFixed(2)} from the saved weight rate. Admin confirms the final quote.</p> : <p role="status" className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">No saved rate covers this weight yet. Library Admin will confirm the delivery charge.</p>)}
            <label className="block text-xs font-medium text-slate-300">Number of copies<input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none" type="number" min="1" max={listing.availableCopies ?? listing.copyCount} step="1" value={quantity} onChange={(event) => setQuantity(Math.min(Number(event.target.value) || 1, Number(listing.availableCopies ?? listing.copyCount)))} /><span className="mt-1 block text-[11px] text-slate-500">Estimated rental total: ₹{(Number(listing.rentalPrice) * Number(quantity || 1)).toFixed(2)} for {listing.rentalPeriodDays} days. Final checkout is handled later.</span>{handoverMethod === "delivery" && <span className="mt-1 block text-[11px] text-indigo-200">Total delivery weight: {totalDeliveryWeight.toFixed(3)} kg ({Number(listing.weightKg || 0).toFixed(3)} kg × {quantity} {Number(quantity) === 1 ? "copy" : "copies"}).</span>}</label>
            <label className="block text-xs font-medium text-slate-300">Message to the Renter (optional)<textarea rows={3} maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add a note about your request" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400" /></label>
            <button type="submit" disabled={sending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{sending ? "Sending..." : "Send rental request"}</button>
          </form>}
        </div>
      </article>
      {showHighlights && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowHighlights(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="book-highlights-title" className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-300">Book details</p><h2 id="book-highlights-title" className="mt-1 text-lg font-bold text-white">Highlights — {listing.title}</h2></div><div className="flex items-center gap-2">{isOwner && !editingHighlights && <button type="button" onClick={() => { setHighlightsDraft(listing.highlights || ""); setEditingHighlights(true); }} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">{listing.highlights ? "Edit" : "Add highlights"}</button>}<button type="button" aria-label="Close highlights" onClick={() => setShowHighlights(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button></div></header>
          {editingHighlights ? <div className="space-y-3 overflow-y-auto p-5"><p className="text-xs text-slate-400">Add or update the book highlights. You can format headings, lists, and text.</p><RichTextEditor value={highlightsDraft} onChange={setHighlightsDraft} /><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingHighlights(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">Cancel</button><button type="button" disabled={savingHighlights} onClick={saveHighlights} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{savingHighlights ? "Saving..." : "Save highlights"}</button></div></div> : listing.highlights ? <div className="overflow-y-auto px-5 py-5 text-sm leading-7 text-slate-200">{renderBookHighlights(listing.highlights)}</div> : <div className="p-8 text-center text-sm text-slate-400">{isOwner ? "You have not added highlights yet. Select Add highlights to write them now." : "The Renter has not added book highlights yet."}</div>}
        </section>
      </div>}
    </main>
  );
}
