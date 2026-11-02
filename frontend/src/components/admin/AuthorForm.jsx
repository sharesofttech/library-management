import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import authorService from "../../api/authorService";
import { useToast } from "../../context/ToastContext";

const listPath = "/admin/management/authors";

export default function AuthorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoadError("");
    setError("");
    setForm({ name: "", description: "" });
    setLoading(Boolean(id));
    if (id) {
      authorService.getAuthorById(id).then(({ author }) => {
        if (active) setForm({ name: author.name, description: author.description || "" });
      }).catch((err) => {
        if (active) setLoadError(err.message || "Failed to load author");
      }).finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!form.name.trim()) { setError("Author name is required"); return; }
    if (form.name.trim().length > 150) { setError("Author name must be 150 characters or fewer"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() };
      const result = id ? await authorService.updateAuthor(id, payload) : await authorService.createAuthor(payload);
      toast.success(result.message);
      navigate(listPath);
    } catch (err) {
      setError(err.message || "Failed to save author");
    } finally { setSaving(false); }
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  if (loading) return (
    <div role="status" className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      <p className="text-sm">Loading author...</p>
    </div>
  );
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
        <button type="button" onClick={() => navigate(listPath)} aria-label="Back to Authors" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{id ? "Edit" : "Authors"}</h1>
          <p className="text-xs text-slate-400">{id ? `Editing: ${form.name}` : "Add new author"}</p>
        </div>
      </div>
      {loadError ? <p role="alert" className="text-rose-300">{loadError}</p> : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <fieldset disabled={saving} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-center"><label htmlFor="author-name" className="text-sm font-medium text-slate-300 md:col-span-1">Name <span className="text-rose-400">*</span></label>
              <div className="md:col-span-3">
              <input id="author-name" name="name" required maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} placeholder="Enter author name" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-start"><label htmlFor="author-description" className="text-sm font-medium text-slate-300 md:col-span-1 pt-2">Description</label>
              <div className="md:col-span-3">
              <textarea id="author-description" name="description" rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${inputClass} resize-y`} placeholder="Enter author description" />
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
