import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../../store/authSlice";
import { useToast } from "../../context/ToastContext";
import fineService from "../../api/fineService";
import { fineButton, fineField, quietButton, fineDate } from "../common/FineModal";

export default function FineSettings() {
  const user = useSelector(selectUser);
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const data = await fineService.settings(); setSettings(data.settings); setAmount(data.settings?.overdueFinePerDay ?? ""); }
    catch (error) { setError(error.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const save = async event => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError("");
    try { const result = await fineService.saveSettings(amount); toast.success(result.message); await load(); }
    catch (error) { setError(error.message); }
    finally { setSaving(false); }
  };
  return <div className="max-w-5xl mx-auto space-y-6"><h1 className="text-2xl font-bold text-white">Settings</h1><section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5"><h2 className="text-lg font-semibold text-white">Fine Settings</h2>{loading ? <div role="status" className="h-24 bg-slate-800 animate-pulse rounded-lg" /> : <form onSubmit={save} className="space-y-4 max-w-lg">{error && <p role="alert" className="text-rose-300">{error}</p>}{!settings && <p className="text-amber-300 text-sm">Configure the daily fine before issuing new books.</p>}<label className="block text-sm text-slate-300">Overdue Fine Per Day (₹)<input aria-label="Overdue Fine Per Day" className={`${fineField} mt-2`} type="number" min="0" max="99999999.99" step="0.01" required value={amount} disabled={saving || user?.role !== "admin"} onChange={event => setAmount(event.target.value)} /></label><p className="text-xs text-slate-400">Changes apply to newly issued books. Existing borrowings keep their saved rate.</p>{settings && <p className="text-xs text-slate-400">Last updated by {settings.updater?.name || "staff"} on {fineDate(settings.updatedAt)}</p>}<div className="flex gap-3">{user?.role === "admin" && <button disabled={saving} className={fineButton}>{saving ? "Saving..." : "Save Changes"}</button>}<button type="button" onClick={load} disabled={saving} className={quietButton}>Refresh</button></div></form>}</section></div>;
}
