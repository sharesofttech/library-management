import React, { useCallback, useEffect, useState } from "react";
import { Check, Clock3, Loader2, RefreshCw, Truck } from "lucide-react";
import userService from "../../api/userService";
import { bookImageUrl } from "../../api/bookService";
import { useToast } from "../../context/ToastContext";
import Select from "../common/Select";
import { TablePagination, TableSearch } from "../common/TableControls";

const field = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none";
const defaultDeliveryRates = [{ id: "rate-default", condition: "weight", minWeight: 0, maxWeight: 10, rowCost: 10, itemCost: 0, kgCost: 0, percentCost: 0, label: "Standard delivery", abort: false }];
const deliveryRate = (request, rates) => {
  const weight = Number(request.listing?.weightKg || 0) * Number(request.quantity || 1);
  if (request.handoverMethod !== "delivery" || weight <= 0 || weight > 10) return "0.00";
  const rule = rates.find((rate) => weight >= Number(rate.minWeight) && weight <= Number(rate.maxWeight));
  if (!rule || rule.abort) return "0.00";
  const rental = Number(request.rentalAmount ?? Number(request.listing?.rentalPrice || 0) * Number(request.quantity || 1));
  return (Number(rule.rowCost) + Number(rule.itemCost) * Number(request.quantity || 1) + Number(rule.kgCost) * weight + Number(rule.percentCost) * rental / 100).toFixed(2);
};

function DeliveryRateTable({ rates, setRates, onSave, saving, error, notice }) {
  const [selected, setSelected] = useState([]);
  const setCell = (index, key, value) => setRates((rows) => rows.map((row, i) => i === index ? { ...row, [key]: value } : row));
  const addRow = (row = {}) => setRates((rows) => [...rows, { id: `rate-${Date.now()}-${rows.length}`, condition: "weight", minWeight: "", maxWeight: "", rowCost: "10", itemCost: "0", kgCost: "0", percentCost: "0", label: "", abort: false, ...row }]);
  const deleteSelected = () => { setRates((rows) => rows.filter((_, index) => !selected.includes(index))); setSelected([]); };
  const duplicateSelected = () => {
    const copies = selected.map((index) => rates[index]).filter(Boolean).map((row) => ({ ...row, id: `rate-${Date.now()}-${Math.random()}` }));
    if (copies.length) setRates((rows) => [...rows, ...copies]);
  };
  const fields = [["minWeight", "Minimum kg", 0, 0.001, 10], ["maxWeight", "Maximum kg", 0.001, 0.001, 10], ["rowCost", "Row cost ₹", 0, 0.01], ["itemCost", "Item cost ₹", 0, 0.01], ["kgCost", "Kg cost ₹", 0, 0.01], ["percentCost", "% cost", 0, 0.01]];
  return <section aria-labelledby="delivery-rate-table-title" className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3"><div><h2 id="delivery-rate-table-title" className="text-sm font-semibold text-white">Delivery rate table</h2><p className="mt-1 text-xs text-slate-400">Admin rates are saved and used by the server. Total weight = book weight × copies. Standard rate bands cover up to 10 kg.</p></div><button type="button" onClick={onSave} disabled={saving} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save rate table"}</button></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-xs"><thead className="bg-slate-800/70 text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="px-2 py-3"><input aria-label="Select all rate rows" type="checkbox" checked={rates.length > 0 && selected.length === rates.length} onChange={(event) => setSelected(event.target.checked ? rates.map((_, index) => index) : [])} /></th><th className="px-2 py-3">Condition</th>{fields.map(([, label]) => <th key={label} className="px-2 py-3">{label}</th>)}<th className="px-2 py-3">Abort</th><th className="px-2 py-3">Label</th></tr></thead><tbody className="divide-y divide-slate-800">
      {rates.map((row, index) => <tr key={row.id || index}><td className="px-2 py-2"><input aria-label={`Select rate row ${index + 1}`} type="checkbox" checked={selected.includes(index)} onChange={() => setSelected((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} /></td><td className="px-2 py-2"><span className="inline-flex rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-300">Weight</span></td>{fields.map(([key, label, min, step, max]) => <td key={key} className="px-2 py-2"><input aria-label={`${label} for row ${index + 1}`} type="number" min={min} max={max} step={step} value={row[key]} onChange={(event) => setCell(index, key, event.target.value)} className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-2 text-white" /></td>)}<td className="px-2 py-2"><input aria-label={`Abort row ${index + 1}`} type="checkbox" checked={Boolean(row.abort)} onChange={(event) => setCell(index, "abort", event.target.checked)} /></td><td className="px-2 py-2"><input aria-label={`Label for row ${index + 1}`} maxLength={80} value={row.label} onChange={(event) => setCell(index, "label", event.target.value)} className="w-36 rounded border border-slate-700 bg-slate-950 px-2 py-2 text-white" /></td></tr>)}
    </tbody></table></div>
    <div className="grid gap-1 border-t border-slate-800 px-4 py-3 text-[11px] text-slate-400 sm:grid-cols-2"><p><strong className="text-slate-300">Row cost:</strong> flat charge when the weight range matches.</p><p><strong className="text-slate-300">Item cost:</strong> extra charge per requested copy.</p><p><strong className="text-slate-300">Kg cost:</strong> extra charge per kg of total shipment weight.</p><p><strong className="text-slate-300">% cost:</strong> percentage of the rental amount.</p><p><strong className="text-slate-300">Abort:</strong> do not offer delivery for this matching weight range.</p></div>
    {error && <p role="alert" className="px-4 pt-3 text-xs text-rose-300">{error}</p>}{notice && <p role="status" className="px-4 pt-3 text-xs text-emerald-300">{notice}</p>}
    <div className="flex flex-wrap items-center gap-2 px-4 py-3"><button type="button" onClick={() => addRow()} className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Add Shipping Rate</button><span className="text-xs text-slate-400">Define rows in order of priority; ranges cannot overlap.</span><span className="ml-auto flex gap-2"><button type="button" onClick={deleteSelected} disabled={!selected.length || rates.length <= selected.length} className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300 disabled:opacity-40">Delete selected rows</button><button type="button" onClick={duplicateSelected} disabled={!selected.length} className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300 disabled:opacity-40">Duplicate selected rows</button></span></div>
  </section>;
}const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

export default function RentalCheckout() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ totalRequests: 0, paidRentals: 0, checkoutCollected: 0, awaitingQuote: 0, activeRentals: 0, returnedRentals: 0 });
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [renters, setRenters] = useState([]);
  const [search, setSearch] = useState("");
  const [renterFilter, setRenterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [deliveryRates, setDeliveryRates] = useState(defaultDeliveryRates);
  const [rateSaving, setRateSaving] = useState(false);
  const [rateError, setRateError] = useState("");
  const [rateNotice, setRateNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [data, rateData] = await Promise.all([
        userService.getAdminRentalCheckout({ page, limit, search, renterId: renterFilter || undefined, status: statusFilter }),
        userService.getDeliveryRates(),
      ]);
      const activeRates = rateData.rates || defaultDeliveryRates;
      setDeliveryRates(activeRates);
      const rows = data.requests || [];
      setRequests(rows);
      setRenters(data.renters || []);
      setPagination(data.pagination || { total: rows.length, totalPages: 1 });
      setStats(data.stats || { totalRequests: 0, paidRentals: 0, checkoutCollected: 0, awaitingQuote: 0, activeRentals: 0, returnedRentals: 0 });
      setForms(Object.fromEntries(rows.map((r) => [r.id, {
        rentalAmount: r.rentalAmount ?? (Number(r.listing?.rentalPrice || 0) * Number(r.quantity || 1)).toFixed(2),
        deliveryCharge: r.paymentStatus === "quoted" || r.paymentStatus === "paid" ? (r.deliveryCharge ?? "0.00") : deliveryRate(r, activeRates), lateFeePerDay: r.lateFeePerDay || "0.00", commissionRate: r.paymentStatus === "quoted" || r.paymentStatus === "paid" ? (r.commissionRate ?? "0.00") : "",
        condition: "good", damageCharge: "0.00", payoutReference: "",
        handoverPlace: r.handoverPlace || "", handoverDate: r.handoverDate || "", handoverTime: r.handoverTime || "",
        deliveryMethod: r.deliveryMethod || "", deliveryDate: r.deliveryDate || "", deliveryTime: r.deliveryTime || "",
        deliveryChargePayer: r.deliveryChargePayer || "reader", trackingReference: r.trackingReference || "",
      }])));
    } catch (e) { setError(e.message || "Unable to load checkout queue"); }
    finally { setLoading(false); }
  }, [page, limit, search, renterFilter, statusFilter]);
  useEffect(() => { load(); }, [load]);

  const setField = (id, name, value) => setForms((old) => ({ ...old, [id]: { ...(old[id] || {}), [name]: value } }));
  const saveRateTable = async () => {
    setRateSaving(true); setRateError(""); setRateNotice("");
    try {
      const result = await userService.saveDeliveryRates(deliveryRates);
      setDeliveryRates(result.rates || deliveryRates);
      setRateNotice(result.message || "Delivery rate table saved.");
      await load();
    } catch (e) { setRateError(e.response?.data?.message || e.message || "Unable to save delivery rates"); }
    finally { setRateSaving(false); }
  };
  const quote = async (request) => {
    if (forms[request.id]?.commissionRate === "" || forms[request.id]?.commissionRate == null) {
      toast.error("Enter the commission rate agreed with your supervisor before saving the quote.");
      return;
    }
    setBusyId(request.id);
    try {
      await userService.saveAdminRentalQuote(request.id, forms[request.id]);
      toast.success("Checkout quote saved. Reader can now pay."); await load();
    } catch (e) { toast.error(e.response?.data?.message || e.message || "Unable to save quote"); }
    finally { setBusyId(null); }
  };
  const recordReturn = async (request) => {
    const form = forms[request.id];
    if (form.condition !== "good" && !window.confirm(`Record this book as ${form.condition} and charge ${money(form.damageCharge)}?`)) return;
    setBusyId(request.id);
    try {
      const result = await userService.recordAdminRentalReturn(request.id, { condition: form.condition, damageCharge: Number(form.damageCharge) });
      toast.success(`Return recorded. Late days: ${result.lateDays}. Late fee: ${money(result.request.lateFeeAmount)}.`); await load();
    } catch (e) { toast.error(e.response?.data?.message || e.message || "Unable to record return"); }
    finally { setBusyId(null); }
  };
  const saveHandover = async (request) => {
    const form = forms[request.id] || {};
    const payload = request.handoverMethod === "pickup"
      ? { handoverPlace: form.handoverPlace, handoverDate: form.handoverDate, handoverTime: form.handoverTime }
      : { deliveryMethod: form.deliveryMethod, deliveryDate: form.deliveryDate, deliveryTime: form.deliveryTime, deliveryChargePayer: form.deliveryChargePayer, trackingReference: form.trackingReference };
    setBusyId(request.id);
    try { await userService.updateAdminRentalHandover(request.id, payload); toast.success("Library handover arrangements saved. Reader can now confirm receipt."); await load(); }
    catch (e) { toast.error(e.response?.data?.message || e.message || "Unable to save handover arrangement"); }
    finally { setBusyId(null); }
  };
  const markLibraryReceived = async (request) => {
    setBusyId(request.id);
    try { await userService.confirmAdminLibraryReceipt(request.id); toast.success("Book marked received at the library. You can now arrange the Reader handover."); await load(); }
    catch (e) { toast.error(e.response?.data?.message || e.message || "Unable to record library receipt"); }
    finally { setBusyId(null); }
  };
  const approveCommission = async (request) => {
    setBusyId(request.id);
    try { await userService.approveAdminRentalCommission(request.id); toast.success("Commission approved. Record the manual transfer when paid."); await load(); }
    catch (e) { toast.error(e.response?.data?.message || e.message || "Unable to approve commission"); }
    finally { setBusyId(null); }
  };
  const recordPayout = async (request) => {
    const reference = forms[request.id]?.payoutReference?.trim();
    if (!reference) { toast.error("Enter the bank/UPI transfer reference first."); return; }
    setBusyId(request.id);
    try { await userService.recordAdminRentalPayout(request.id, reference); toast.success("Renter payout recorded."); await load(); }
    catch (e) { toast.error(e.response?.data?.message || e.message || "Unable to record payout"); }
    finally { setBusyId(null); }
  };

  return <section className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Renter book lifecycle</p><h1 className="mt-1 text-2xl font-bold text-white">Rental Checkout</h1><p className="mt-1 text-sm text-slate-400">Create the Reader’s checkout quote after receipt confirmation, then record returns and any charges.</p></div><button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button></header>
    <DeliveryRateTable rates={deliveryRates} setRates={setDeliveryRates} onSave={saveRateTable} saving={rateSaving} error={rateError} notice={rateNotice} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Total rental requests</p><strong className="mt-1 block text-2xl text-white">{stats.totalRequests}</strong><p className="mt-1 text-[11px] text-slate-500">Includes pending and rejected requests</p></div><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Paid rentals</p><strong className="mt-1 block text-2xl text-white">{stats.paidRentals}</strong><p className="mt-1 text-[11px] text-slate-500">Checkout paid; rental started</p></div><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Checkout collected</p><strong className="mt-1 block text-2xl text-white">{money(stats.checkoutCollected)}</strong><p className="mt-1 text-[11px] text-slate-500">Successful rental checkout payments</p></div><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Awaiting quote</p><strong className="mt-1 block text-2xl text-white">{stats.awaitingQuote}</strong></div><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Active rentals</p><strong className="mt-1 block text-2xl text-white">{stats.activeRentals}</strong></div><div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-400">Returned / fine review</p><strong className="mt-1 block text-2xl text-white">{stats.returnedRentals}</strong></div></div>
    <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:grid-cols-[minmax(240px,1fr)_minmax(180px,0.7fr)_minmax(180px,0.7fr)]"><TableSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search by book, Reader, or Renter..." /><Select aria-label="Filter rentals by Renter" value={renterFilter} onChange={(event) => { setRenterFilter(event.target.value); setPage(1); }} options={[{ value: "", label: "All Renters" }, ...renters.map((renter) => ({ value: String(renter.id), label: renter.name }))]} /><Select aria-label="Filter rentals by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} options={[{ value: "all", label: "All rental statuses" }, { value: "approved", label: "Approved / handover" }, { value: "active", label: "Active / overdue" }, { value: "returned", label: "Returned / payout" }]} /></div>
    {error && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}
    {loading ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div> : requests.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">No rentals match these filters.</div> : <div className="space-y-4">{requests.map((r) => {
      const form = forms[r.id] || {};
      const totalWeight = Number(r.listing?.weightKg || 0) * Number(r.quantity || 1);
      const matchedDeliveryRate = deliveryRates.find((rate) => totalWeight >= Number(rate.minWeight) && totalWeight <= Number(rate.maxWeight));
      const standardDeliveryRate = r.handoverMethod === "delivery" && totalWeight > 0 && totalWeight <= 10 && Boolean(matchedDeliveryRate) && !matchedDeliveryRate.abort;
      const calculatedDeliveryRate = Number(deliveryRate(r, deliveryRates));
      const quotedDeliveryCharge = standardDeliveryRate ? calculatedDeliveryRate : Number(form.deliveryCharge || 0);
      const deliveryShare = r.handoverMethod !== "delivery" || r.deliveryChargePayer === "renter" ? 0 : r.deliveryChargePayer === "shared" ? Math.round(quotedDeliveryCharge * 50) / 100 : quotedDeliveryCharge;
      const total = Number(form.rentalAmount || 0) + deliveryShare;
      const isLate = r.status === "active" && r.dueAt && new Date(r.dueAt) < new Date();
      return <article key={r.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap gap-4"><div className="flex min-w-0 flex-1 gap-4">{r.listing?.coverImage && <img src={bookImageUrl(r.listing.coverImage)} alt="" className="h-24 w-16 rounded-lg object-cover" />}<div><h2 className="font-semibold text-white">{r.listing?.title} <span className="text-xs font-normal capitalize text-indigo-300">· {r.status}</span></h2><p className="mt-1 text-xs text-slate-400">Reader {r.reader?.name} · Renter {r.owner?.name} · {r.quantity} copies</p><p className="mt-1 text-xs text-slate-400">Rental amount: <strong className="text-slate-200">{money(r.rentalAmount ?? Number(r.listing?.rentalPrice || 0) * Number(r.quantity || 1))}</strong>{r.listing?.rentalPeriodDays ? <span> / {r.listing.rentalPeriodDays} days</span> : null}{r.rentalAmount == null && <span className="ml-1 text-slate-500">(listing estimate)</span>}</p><p className="mt-1 text-xs text-slate-400">Weight: {Number(r.listing?.weightKg || 0) * Number(r.quantity || 1)} kg total ({r.listing?.weightKg} kg each) · {r.handoverMethod === "delivery" ? <><Truck className="inline h-3 w-3" /> Delivery</> : "Pickup"}</p><p className="mt-1 text-xs text-slate-500">Reader confirmed receipt: {r.receiptConfirmedAt ? new Date(r.receiptConfirmedAt).toLocaleString() : "—"}</p></div></div>
        {r.status === "approved" && !r.receiptConfirmedAt && !r.libraryReceivedAt && <div className="w-full border-t border-slate-800 pt-4"><p className="text-sm font-semibold text-white">Step 1 · Receive the book at the library</p><p className="mt-1 text-xs text-slate-400">Coordinate privately with the Renter to collect or receive the book. Mark it received here before arranging Reader pickup or delivery.</p><button disabled={busyId !== null} onClick={() => markLibraryReceived(r)} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busyId === r.id ? "Saving..." : "Mark book received at library"}</button></div>}
        {r.status === "approved" && !r.receiptConfirmedAt && r.libraryReceivedAt && <div className="w-full border-t border-slate-800 pt-4"><p className="mb-3 text-xs text-slate-400">Book received at library {new Date(r.libraryReceivedAt).toLocaleString()}. Step 2 · Admin arranges pickup or delivery to the Reader. Reader and Renter contact details are visible only to Admin.</p>{r.handoverMethod === "pickup" ? <><p className="mb-2 text-xs text-slate-300">Arrange Reader pickup at the library</p><div className="grid gap-3 sm:grid-cols-3"><label className="text-xs text-slate-300">Library pickup place<input className={field} maxLength="500" value={form.handoverPlace} onChange={(e) => setField(r.id, "handoverPlace", e.target.value)} placeholder="Library / branch / desk" /></label><label className="text-xs text-slate-300">Pickup date<input className={field} type="date" value={form.handoverDate} onChange={(e) => setField(r.id, "handoverDate", e.target.value)} /></label><label className="text-xs text-slate-300">Pickup time<input className={field} type="time" value={form.handoverTime} onChange={(e) => setField(r.id, "handoverTime", e.target.value)} /></label></div></> : <><p className="mb-2 text-xs text-slate-300">Reader delivery address (Admin only): {r.deliveryAddress || "Not provided"}</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><label className="text-xs text-slate-300">Delivery method<input className={field} maxLength="100" value={form.deliveryMethod} onChange={(e) => setField(r.id, "deliveryMethod", e.target.value)} placeholder="Library courier / delivery service" /></label><label className="text-xs text-slate-300">Delivery date<input className={field} type="date" value={form.deliveryDate} onChange={(e) => setField(r.id, "deliveryDate", e.target.value)} /></label><label className="text-xs text-slate-300">Delivery time<input className={field} type="time" value={form.deliveryTime} onChange={(e) => setField(r.id, "deliveryTime", e.target.value)} /></label><label className="text-xs text-slate-300">Who pays delivery?<Select aria-label="Delivery charge payer" className="!rounded-lg" value={form.deliveryChargePayer} onChange={(e) => setField(r.id, "deliveryChargePayer", e.target.value)} options={[{ value: "reader", label: "Reader" }, { value: "renter", label: "Renter" }, { value: "shared", label: "Shared" }]} /></label><label className="text-xs text-slate-300">Tracking reference (optional)<input className={field} maxLength="120" value={form.trackingReference} onChange={(e) => setField(r.id, "trackingReference", e.target.value)} placeholder="Tracking / delivery reference" /></label></div></>}<button disabled={busyId !== null} onClick={() => saveHandover(r)} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busyId === r.id ? "Saving..." : "Save library handover"}</button></div>}
        {r.status === "approved" && r.receiptConfirmedAt && <div className="w-full border-t border-slate-800 pt-4"><p className="mb-3 text-xs text-slate-400">Set rental amount, delivery charge, and the commission rate agreed with your supervisor. Commission applies to rental charges only; renter payout is held until return and assessed charges are settled. Enter 0 only when no commission was agreed.</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="text-xs text-slate-300">Rental charge (₹)<input className={field} type="number" min="0" step="0.01" value={form.rentalAmount} onChange={(e) => setField(r.id, "rentalAmount", e.target.value)} /></label><label className="text-xs text-slate-300">Total delivery charge (₹)<input className={`${field} disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-500`} type="number" min="0" step="0.01" value={r.handoverMethod === "delivery" ? standardDeliveryRate ? calculatedDeliveryRate.toFixed(2) : form.deliveryCharge : "0.00"} disabled={r.handoverMethod !== "delivery" || standardDeliveryRate} onChange={(e) => setField(r.id, "deliveryCharge", e.target.value)} />{r.handoverMethod !== "delivery" ? <span className="mt-1 block text-[11px] text-slate-500">Pickup selected — no delivery charge applies.</span> : standardDeliveryRate ? <span className="mt-1 block text-[11px] text-emerald-300">{matchedDeliveryRate.label || "Weight rate"}: {money(matchedDeliveryRate.rowCost)} row + {money(matchedDeliveryRate.itemCost)} per copy + {money(matchedDeliveryRate.kgCost)}/kg{Number(matchedDeliveryRate.percentCost) ? ` + ${matchedDeliveryRate.percentCost}%` : ""} for {totalWeight.toFixed(3)} kg.</span> : totalWeight > 10 ? <span className="mt-1 block text-[11px] text-amber-300">Over 10 kg ({totalWeight.toFixed(3)} kg): quote manually after confirming the delivery arrangement with the Reader.</span> : <span className="mt-1 block text-[11px] text-amber-300">{matchedDeliveryRate?.abort ? "This weight band is marked unavailable." : totalWeight > 0 ? "No saved rate covers this weight. Update the delivery rate table." : "Book weight is missing. Confirm the delivery charge manually."}</span>}</label><label className="text-xs text-slate-300">Commission rate (%) *<input required className={field} type="number" min="0" max="100" step="0.01" value={form.commissionRate} onChange={(e) => setField(r.id, "commissionRate", e.target.value)} placeholder="Enter agreed %" /></label><label className="text-xs text-slate-300">Late fee per day (₹)<input className={field} type="number" min="0" step="0.01" value={form.lateFeePerDay} onChange={(e) => setField(r.id, "lateFeePerDay", e.target.value)} /></label></div><p className="mt-3 text-sm text-white">Reader checkout total: <strong>{money(total)}</strong> (rental {money(form.rentalAmount)} + delivery share {money(deliveryShare)}) · Estimated commission: {money(Number(form.rentalAmount || 0) * Number(form.commissionRate || 0) / 100)}; renter payout: {money(Number(form.rentalAmount || 0) * (1 - Number(form.commissionRate || 0) / 100))}. Rental period: {r.listing?.rentalPeriodDays} days, starts only after payment.</p><button disabled={busyId !== null || r.paymentStatus === "quoted"} onClick={() => quote(r)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busyId === r.id && <Loader2 className="h-4 w-4 animate-spin" />}{r.paymentStatus === "quoted" ? "Quote saved" : "Save quote"}</button>{r.paymentStatus === "quoted" && <span className="ml-3 text-xs text-emerald-300">Quoted: {money(r.checkoutAmount)} · waiting for Reader payment</span>}</div>}
        {r.status === "active" && <div className="w-full border-t border-slate-800 pt-4"><p className={`text-sm ${isLate ? "text-rose-300" : "text-emerald-300"}`}><Clock3 className="mr-1 inline h-4 w-4" />{isLate ? "Overdue" : "Rental active"} · Due {new Date(r.dueAt).toLocaleString()} · Daily late fee {money(r.lateFeePerDay)}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="space-y-1.5 text-xs text-slate-300"><span className="block">Return condition</span><Select aria-label="Return condition" className="!rounded-lg" value={form.condition} onChange={(e) => setField(r.id, "condition", e.target.value)} options={[{ value: "good", label: "Good" }, { value: "damaged", label: "Damaged" }, { value: "lost", label: "Lost / not returned" }]} /></div><label className="text-xs text-slate-300">Damage / loss charge (₹)<input className={`${field} disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-500`} type="number" min="0" step="0.01" value={form.damageCharge} onChange={(e) => setField(r.id, "damageCharge", e.target.value)} disabled={form.condition === "good"} /></label></div><button disabled={busyId !== null} onClick={() => recordReturn(r)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busyId === r.id && <Loader2 className="h-4 w-4 animate-spin" />}<Check className="h-4 w-4" />Record book return</button></div>}
        {r.status === "returned" && <div className="w-full border-t border-slate-800 pt-4 text-sm text-slate-300"><p>Returned {r.returnedAt ? new Date(r.returnedAt).toLocaleString() : ""} · Condition: {r.returnCondition}</p><p className="mt-1">Late fee: {money(r.lateFeeAmount)} · Damage/loss charge: {money(r.damageCharge)} · {Number(r.lateFeeAmount || 0) + Number(r.damageCharge || 0) === 0 ? "No fine due" : `Fine payment: ${r.finePaidAt ? "Paid" : "Pending"}`}</p><div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/40 p-4"><p className="font-semibold text-white">Renter commission and payout</p><p className="mt-1 text-xs text-slate-400">Rental {money(r.rentalAmount)} · Commission {r.commissionRate}% = {money(r.commissionAmount)} · Renter payout {money(r.renterPayoutAmount)} · Status: <span className="capitalize">{r.commissionStatus}</span></p>{r.commissionStatus === "pending" && <button disabled={busyId !== null} onClick={() => approveCommission(r)} className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Approve commission</button>}{r.commissionStatus === "approved" && <div className="mt-3 flex flex-wrap gap-2"><input aria-label="Manual payout reference" className={`${field} mt-0 max-w-sm`} placeholder="Bank / UPI transfer reference" value={form.payoutReference || ""} onChange={(e) => setField(r.id, "payoutReference", e.target.value)} /><button disabled={busyId !== null} onClick={() => recordPayout(r)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Record manual payout</button></div>}{r.payoutAt && <p className="mt-2 text-xs text-emerald-300">Paid {new Date(r.payoutAt).toLocaleString()} · Reference {r.payoutReference}</p>}</div></div>}
        </div>
      </article>;
    })}</div>}
    {!loading && pagination.total > 0 && <TablePagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} onLimitChange={(size) => { setLimit(size); setPage(1); }} />}
  </section>;
}
