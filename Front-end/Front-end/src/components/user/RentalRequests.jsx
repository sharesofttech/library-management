import React, { useCallback, useEffect, useState } from "react";
import { Check, Clock3, Loader2, RefreshCw, Truck, MapPin, X } from "lucide-react";
import { Link } from "react-router-dom";
import userService from "../../api/userService";
import { bookImageUrl } from "../../api/bookService";
import { useToast } from "../../context/ToastContext";

const statusClass = {
  pending: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  approved: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  active: "border-blue-400/20 bg-blue-400/10 text-blue-300",
  returned: "border-slate-500/20 bg-slate-500/10 text-slate-300",
  rejected: "border-rose-400/20 bg-rose-400/10 text-rose-300",
};
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

const toForm = () => ({ payoutReference: "" });

export default function RentalRequests({ inbox = false }) {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [paymentBusyId, setPaymentBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = inbox ? await userService.getRentalRequestInbox() : await userService.getMyRentalRequests();
      const nextRequests = data.requests || [];
      setRequests(nextRequests);
      setForms(Object.fromEntries(nextRequests.map((request) => [request.id, toForm(request)])));
    } catch (requestError) {
      setError(requestError.message || "Unable to load rental requests.");
    } finally {
      setLoading(false);
    }
  }, [inbox]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const review = async (request, decision) => {
    setBusyId(request.id);
    try {
      const result = await userService.reviewRentalRequest(request.id, decision);
      toast.success(result.message || `Request ${decision}`);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || requestError.message || "Unable to update request");
    } finally {
      setBusyId(null);
    }
  };

  const confirmReceipt = async (request) => {
    setBusyId(request.id);
    try {
      const result = await userService.confirmRentalReceipt(request.id);
      toast.success(result.message || "Book receipt confirmed");
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || requestError.message || "Unable to confirm book receipt");
    } finally {
      setBusyId(null);
    }
  };

  const payRental = async (request, purpose) => {
    setPaymentBusyId(request.id);
    try {
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const existing = document.querySelector('script[data-razorpay-checkout="true"]');
          if (existing) { existing.addEventListener("load", resolve, { once: true }); existing.addEventListener("error", reject, { once: true }); return; }
          const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.dataset.razorpayCheckout = "true"; script.onload = resolve; script.onerror = () => reject(new Error("Unable to load Razorpay checkout")); document.body.appendChild(script);
        });
      }
      const { keyId, order, reader } = await userService.createRentalPaymentOrder(request.id, purpose);
      const checkout = new window.Razorpay({
        key: keyId, order_id: order.id, amount: order.amount, currency: order.currency,
        name: "Library Portal", description: purpose === "checkout" ? `Book rental checkout: ${request.listing?.title}` : `Rental fine: ${request.listing?.title}`,
        prefill: { name: reader?.name || "", email: reader?.email || "" },
        handler: async (response) => {
          try { const result = await userService.verifyRentalPayment(request.id, response); toast.success(result.message); setRefreshKey((v) => v + 1); }
          catch (e) { toast.error(e.response?.data?.message || e.message || "Payment verification is pending. Refresh shortly."); }
          finally { setPaymentBusyId(null); }
        },
        modal: { ondismiss: () => setPaymentBusyId(null) },
        theme: { color: "#4f46e5" },
      });
      checkout.on("payment.failed", () => { toast.error("Payment did not complete. You can retry safely."); setPaymentBusyId(null); });
      checkout.open();
    } catch (e) { toast.error(e.response?.data?.message || e.message || "Unable to start payment"); setPaymentBusyId(null); }
  };

  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const setField = (id, name, value) => setForms((current) => ({ ...current, [id]: { ...(current[id] || {}), [name]: value } }));

  return <section className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Community rentals</p><h1 className="mt-1 text-2xl font-bold text-white">{inbox ? "Rental Inbox" : "My Rental Requests"}</h1><p className="mt-1 text-sm text-slate-400">{inbox ? "Review Reader requests and arrange handover for approved requests." : "Track your requests and confirm when you receive a book."}</p></div>
      <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3.5 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
    </header>
    {inbox && <div className="flex items-center gap-3 rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-3"><Clock3 className="h-5 w-5 text-amber-300" /><div><p className="text-sm font-semibold text-white">{pendingCount} pending {pendingCount === 1 ? "request" : "requests"}</p><p className="text-xs text-slate-400">Approval accepts the request. Arrange handover details next; payment and the rental period do not start here.</p></div></div>}
    {error ? <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-200">{error} <button type="button" className="ml-2 underline" onClick={load}>Try again</button></div> : loading ? <div role="status" className="flex justify-center gap-2 py-14 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading requests...</div> : requests.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center"><p className="text-sm font-semibold text-white">{inbox ? "No rental requests yet" : "You have not requested a renter book yet"}</p><p className="mt-2 text-xs text-slate-400">{inbox ? "Reader requests for your listings will appear here." : "Browse approved renter books and send a request from a book details page."}</p>{!inbox && <Link to="/home" className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">Browse books</Link>}</div> : <div className="space-y-3">{requests.map((request) => {
      const form = forms[request.id] || toForm();
      return <article key={request.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 gap-4">{request.listing?.coverImage ? <img src={bookImageUrl(request.listing.coverImage)} alt="" className="h-24 w-16 shrink-0 rounded-lg bg-slate-800 object-cover" /> : <div className="grid h-24 w-16 shrink-0 place-items-center rounded-lg bg-slate-800 text-slate-500">Book</div>}
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold text-white">{request.listing?.title || "Book listing"}</h2><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize ${statusClass[request.status] || "border-slate-700 bg-slate-800 text-slate-300"}`}>{request.status}</span></div>
              <p className="mt-1 text-xs text-slate-400">{request.listing?.authorName || ""} · ₹{request.listing?.rentalPrice || "-"} / copy / {request.listing?.rentalPeriodDays || "-"} days</p>
              <p className="mt-1 text-xs text-slate-300">Copies requested: <strong>{request.quantity || 1}</strong> · Estimated rental total: <strong>₹{(Number(request.listing?.rentalPrice || 0) * Number(request.quantity || 1)).toFixed(2)}</strong></p>
              <p className="mt-3 text-xs text-slate-300">{inbox ? "Reader identity and contact are managed privately by Library Admin." : "Renter identity is private. Library Admin coordinates this rental."}</p>
              <p className="mt-1 text-xs text-slate-400">Handover preference: <span className="capitalize text-slate-300">{request.handoverMethod}</span></p>
              {!inbox && request.handoverMethod === "delivery" && Number(request.listing?.weightKg || 0) * Number(request.quantity || 1) > 10 && <p role="status" className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs leading-5 text-amber-200">This delivery weighs more than 10 kg, so the standard online rate does not apply. Please contact Library Admin or visit the library to confirm whether delivery can be arranged and what it will cost.</p>}
              {request.message && <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-400">“{request.message}”</p>}
              <p className="mt-2 text-[11px] text-slate-500">Requested {new Date(request.createdAt).toLocaleString()}</p>
            </div>
          </div>
          {inbox && request.status === "pending" && <div className="flex shrink-0 gap-2 sm:flex-col"><button type="button" disabled={busyId !== null} onClick={() => review(request, "approved")} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">{busyId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Approve {request.quantity || 1} {Number(request.quantity || 1) === 1 ? "copy" : "copies"}</button><button type="button" disabled={busyId !== null} onClick={() => review(request, "rejected")} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"><X className="h-3.5 w-3.5" />Reject</button></div>}
        </div>

        {request.status === "approved" && <div className="mt-5 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">{request.handoverMethod === "pickup" ? <MapPin className="h-4 w-4 text-indigo-300" /> : <Truck className="h-4 w-4 text-indigo-300" />}Handover arrangement</div>
          {inbox ? <p className="mt-2 text-xs text-slate-400">Library Admin coordinates book collection and Reader handover. Reader details stay private.</p> : request.handoverMethod === "pickup" ? <div className="mt-2 space-y-1 text-xs text-slate-300"><p>Pickup place: {request.handoverPlace || "Library Admin is arranging this"}</p>{request.handoverDate && <p>Date and time: {request.handoverDate} at {request.handoverTime}</p>}</div> : <div className="mt-2 space-y-1 text-xs text-slate-300">{request.deliveryMethod && <p>Delivery method: {request.deliveryMethod}</p>}{request.deliveryDate && <p>Scheduled: {request.deliveryDate} at {request.deliveryTime}</p>}{request.trackingReference && <p>Tracking reference: {request.trackingReference}</p>}{!request.deliveryMethod && <p>Library Admin is arranging delivery to the address you provided.</p>}</div>}
          {inbox && request.status === "approved" && !request.receiptConfirmedAt && <p className="mt-4 rounded-lg border border-indigo-400/15 bg-indigo-400/5 px-3 py-2 text-xs text-indigo-200">{request.libraryReceivedAt ? "Admin has recorded the book at the library and is arranging Reader handover." : "Library Admin is arranging collection of your book. No direct Reader contact details are shown here."}</p>}
          {!inbox && request.status === "approved" && !request.receiptConfirmedAt && <div className="mt-4">{!request.libraryReceivedAt ? <p className="text-xs text-slate-400">Waiting for Library Admin to receive the book and arrange the handover.</p> : request.handoverMethod === "pickup" ? request.handoverPlace && request.handoverDate && request.handoverTime ? <div><p className="text-xs text-slate-300">Library pickup: {request.handoverPlace} · {request.handoverDate} at {request.handoverTime}</p><button type="button" disabled={busyId !== null} onClick={() => confirmReceipt(request)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">{busyId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}I received the book</button></div> : <p className="text-xs text-slate-400">Waiting for Library Admin to arrange the library pickup.</p> : request.deliveryMethod && request.deliveryDate && request.deliveryTime ? <div><p className="text-xs text-slate-300">Delivery arranged by Library Admin · {request.deliveryMethod} · {request.deliveryDate} at {request.deliveryTime}{request.trackingReference ? ` · Tracking: ${request.trackingReference}` : ""}</p><button type="button" disabled={busyId !== null} onClick={() => confirmReceipt(request)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">{busyId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}I received the book</button></div> : <p className="text-xs text-slate-400">Waiting for Library Admin to arrange delivery.</p>}</div>}
          {request.receiptConfirmedAt && <p className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">Reader confirmed receipt on {new Date(request.receiptConfirmedAt).toLocaleString()}.</p>}
          {request.receiptConfirmedAt && !inbox && <div className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-400/5 p-4"><p className="text-xs text-slate-300">{request.paymentStatus === "quoted" ? <>Admin checkout total: <strong>{money(request.checkoutAmount)}</strong>. Rental period: {request.listing?.rentalPeriodDays} days, starting after successful payment.</> : "Receipt is confirmed. Waiting for Admin to prepare the checkout amount."}</p>{request.paymentStatus === "quoted" && <button type="button" disabled={paymentBusyId !== null} onClick={() => payRental(request, "checkout")} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{paymentBusyId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Pay securely with Razorpay</button>}</div>}
          {!request.receiptConfirmedAt && <p className="mt-3 text-[11px] text-slate-500">This confirms handover only. The request stays Approved; payment and the rental period have not started.</p>}
        </div>}
        {request.status === "active" && <div className="mt-5 rounded-xl border border-blue-400/20 bg-blue-400/5 p-4"><p className="text-sm font-semibold text-blue-200">Rental active</p><p className="mt-1 text-xs text-slate-300">Paid {money(request.checkoutAmount)} · Started {request.activeAt ? new Date(request.activeAt).toLocaleString() : "—"}</p><p className="mt-1 text-xs text-slate-300">Due {request.dueAt ? new Date(request.dueAt).toLocaleString() : "—"}</p>{request.dueAt && Date.now() > new Date(request.dueAt).getTime() && <p className="mt-2 text-xs font-semibold text-rose-300">Overdue · late charge is calculated when Admin records the return ({money(request.lateFeePerDay)} per day).</p>}<p className="mt-2 text-[11px] text-slate-500">The Admin records the return and checks the book condition. Any late or damage charge will appear here.</p></div>}
        {request.status === "returned" && <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/40 p-4"><p className="text-sm font-semibold text-white">Return recorded · {request.returnCondition}</p><p className="mt-1 text-xs text-slate-300">Late fee: {money(request.lateFeeAmount)} · Damage/loss charge: {money(request.damageCharge)}</p>{!inbox && !request.finePaidAt && Number(request.lateFeeAmount || 0) + Number(request.damageCharge || 0) > 0 ? <button type="button" disabled={paymentBusyId !== null} onClick={() => payRental(request, "fine")} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{paymentBusyId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Pay assessed charge {money(Number(request.lateFeeAmount || 0) + Number(request.damageCharge || 0))}</button> : Number(request.lateFeeAmount || 0) + Number(request.damageCharge || 0) === 0 ? <p className="mt-2 text-xs text-emerald-300">No fine due</p> : request.finePaidAt ? <p className="mt-2 text-xs text-emerald-300">Assessed charges paid.</p> : <p className="mt-2 text-xs text-amber-300">Waiting for Reader to settle the assessed charge.</p>}<div className="mt-3 border-t border-slate-700 pt-3 text-xs text-slate-300"><p>Commission: {request.commissionRate}% ({money(request.commissionAmount)}) · Renter payout: {money(request.renterPayoutAmount)}</p><p className="mt-1 capitalize">Payout status: {request.commissionStatus || "held"}</p>{request.payoutAt && <p className="mt-1 text-emerald-300">Paid {new Date(request.payoutAt).toLocaleString()} · Reference {request.payoutReference}</p>}</div></div>}
      </article>;
    })}</div>}
  </section>;
}
