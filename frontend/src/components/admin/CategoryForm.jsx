import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import categoryService from "../../api/categoryService";
import { useToast } from "../../context/ToastContext";

const listPath = "/admin/categories";

export default function CategoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoadError("");
    setError("");
    setForm({ title: "", description: "" });
    setLoading(Boolean(id));
    if (id) {
      categoryService.getCategoryById(id).then(({ category }) => {
        if (active) setForm({ title: category.title, description: category.description || "" });
      }).catch((err) => {
        if (active) setLoadError(err.message || "Failed to load category");
      }).finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!form.title.trim()) { setError("Category title is required"); return; }
    if (form.title.trim().length > 150) { setError("Category title must be 150 characters or fewer"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = { title: form.title.trim(), description: form.description.trim() };
      const result = id ? await categoryService.updateCategory(id, payload) : await categoryService.createCategory(payload);
      toast.success(result.message);
      navigate(listPath);
    } catch (err) {
      setError(err.message || "Failed to save category");
    } finally { setSaving(false); }
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  if (loading) return (
    <div role="status" className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      <p className="text-sm">Loading category...</p>
    </div>
  );
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
        <button type="button" onClick={() => navigate(listPath)} aria-label="Back to Categories" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{id ? "Edit" : "Categories"}</h1>
          <p className="text-xs text-slate-400">{id ? `Editing: ${form.title}` : "Add new category"}</p>
        </div>
      </div>
      {loadError ? <p role="alert" className="text-rose-300">{loadError}</p> : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <fieldset disabled={saving} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-center"><label htmlFor="category-title" className="text-sm font-medium text-slate-300 md:col-span-1">Title <span className="text-rose-400">*</span></label>
              <div className="md:col-span-3">
              <input id="category-title" name="title" required maxLength={150} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} placeholder="Enter category title" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-start"><label htmlFor="category-description" className="text-sm font-medium text-slate-300 md:col-span-1 pt-2">Description</label>
              <div className="md:col-span-3">
              <textarea id="category-description" name="description" rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${inputClass} resize-y`} placeholder="Enter category description" />
              </div>
            </div>
            <div className="flex items-end justify-end gap-3 pt-4 border-t border-slate-800">
              <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-colors disabled:opacity-50">{saving ? "SAVING..." : "SAVE"}</button>
              <button type="button" onClick={() => navigate(listPath)} disabled={saving} className="px-6 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors">CANCEL</button>
            </div>
          </fieldset>
        </form>
        </div>
      )}
    </div>
  );
}
