import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../../store/authSlice";
import { useToast } from "../../context/ToastContext";
import fineService from "../../api/fineService";
import FineModal, { FineDetails, rupees, fineDate, fineField, fineButton, quietButton } from "../common/FineModal";
import Select from "../common/Select";

export default function BorrowingActionModal({ id, action, onClose, onDone }) {
  const user = useSelector(selectUser);
  const toast = useToast();
  const [borrowing, setBorrowing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [condition, setCondition] = useState("good");
  const [rate, setRate] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setBorrowing((await fineService.preview(id)).borrowing); }
    catch (error) { setError(error.message); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const reconcile = async () => {
    setBusy(true); setError("");
    try { const result = await fineService.legacyRate(id, rate); toast.success(result.message); await load(); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  const confirm = async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      const result = action === "return" ? await fineService.returnBook(id, condition) : await fineService.lostBook(id);
      toast.success(result.message); window.dispatchEvent(new Event("library:inventory-changed")); onDone();
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  const lost = action === "lost";
  return <FineModal title={lost ? "Mark Book Lost" : "Return Book"} busy={busy} onClose={onClose}>{loading ? <div role="status" className="h-48 bg-slate-800 animate-pulse rounded-lg" /> : <form onSubmit={confirm} className="space-y-5">{error && <p role="alert" className="text-rose-300 text-sm">{error}</p>}{borrowing && <><FineDetails rows={[
    ["Borrowing ID", borrowing.id], ["Member ID", borrowing.memberId], ["Book Copy ID", borrowing.bookCopyId], ["Book Title", borrowing.book?.title],
    ["Issue Date", fineDate(borrowing.issueDate)], ["Due Date", fineDate(borrowing.dueDate)],
    [lost ? "Lost Date" : "Return Date", fineDate(borrowing.libraryDate)],
    ["Daily Fine Rate", rupees(borrowing.overdueFineRate)], ["Overdue Days", borrowing.overdueDays],
    ["Overdue Fine", borrowing.rateNeedsReview ? "Historical rate requires review" : rupees(borrowing.overdueFine)],
    ...(lost ? [["Original Book Price", rupees(borrowing.lostCharge)], ["Lost Book Charge", rupees(borrowing.lostCharge)], ["Total Outstanding After Lost", rupees(borrowing.projectedLostOutstanding)]] : [["Outstanding Amount", rupees(borrowing.outstandingAmount)]]),
  ]} />{borrowing.rateNeedsReview && <div className="p-3 rounded-lg border border-amber-500/30 space-y-3"><p className="text-sm text-amber-300">This historical borrowing has no verified fine rate. An admin must record its original daily rate before return/lost. The rate is saved permanently.</p>{user?.role === "admin" && <><label className="block text-sm text-slate-300">Verified Historical Daily Rate (₹)<input aria-label="Verified historical daily rate" type="number" min="0" step="0.01" className={`${fineField} mt-1`} value={rate} onChange={event => setRate(event.target.value)} /></label><button type="button" onClick={reconcile} disabled={busy || rate === ""} className={quietButton}>Save Verified Rate</button></>}</div>}{!lost && <label className="block text-sm text-slate-300">Book Condition<Select containerClassName="mt-2" className="!rounded-lg" value={condition} disabled={busy} onChange={event => setCondition(event.target.value)} options={[{ value: "good", label: "Good" }, { value: "damaged", label: "Damaged" }]} /></label>}{lost && borrowing.lostCharge == null && <p className="text-sm text-amber-300">Edit this book in Books and set its original price first.</p>}</>}<div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className={quietButton}>Cancel</button>{!borrowing ? <button type="button" onClick={load} className={quietButton}>Try Again</button> : <button disabled={busy || borrowing.rateNeedsReview || !["issued", "overdue"].includes(borrowing.status) || (lost && borrowing.lostCharge == null)} className={fineButton}>{busy ? "Saving..." : lost ? "Confirm Lost" : "Confirm Return"}</button>}</div></form>}</FineModal>;
}
