import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import bookService, { bookImageUrl } from "../../api/bookService";
import { useToast } from "../../context/ToastContext";
import Select from "../common/Select";

const initial = { title: "", isbn: "", categoryId: "", authorId: "", noofcopies: "1", publisher: "", publishedYear: "", originalPrice: "" };
const fieldClass = "w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const listPath = "/admin/books";

export default function BookForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [options, setOptions] = useState({ categories: [], authors: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [existingImage, setExistingImage] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    setForm(initial);
    setFile(null);
    setExistingImage("");
    setRemoveImage(false);
    Promise.all([bookService.getOptions(), id ? bookService.getBook(id) : Promise.resolve(null)]).then(([options, data]) => {
      if (!active) return;
      setOptions(options);
      if (data) {
        setForm(Object.fromEntries(Object.keys(initial).map((key) => [key, data.book[key] ?? ""])));
        setExistingImage(data.book.bookImg || "");
      }
    }).catch((err) => { if (active) setLoadError(err.message || "Unable to load book details"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const change = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!form.title.trim() || !form.isbn.trim() || !form.categoryId || !form.authorId) { setError("Title, ISBN, category and author are required"); return; }
    if (!/^\d+$/.test(String(form.noofcopies)) || Number(form.noofcopies) > 1000) { setError("Number of copies must be between 0 and 1000"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      if (file) payload.append("bookImg", file);
      payload.append("removeImage", String(removeImage));
      const result = id ? await bookService.updateBook(id, payload) : await bookService.createBook(payload);
      toast.success(result.message);
      navigate(listPath);
    } catch (err) { setError(err.message || "Unable to save book"); }
    finally { setSaving(false); }
  };

  if (loading) return <div role="status" className="p-16 text-center text-slate-400 flex flex-col items-center gap-2"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /><p className="text-sm">Loading book...</p></div>;
  const image = preview || (!removeImage && bookImageUrl(existingImage));
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
        <button type="button" onClick={() => navigate(listPath)} aria-label="Back to Books" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div><h1 className="text-xl font-bold text-white tracking-tight">{id ? "Edit" : "Books"}</h1><p className="text-xs text-slate-400">{id ? `Editing: ${form.title}` : "Add new book"}</p></div>
      </div>
      {loadError ? <p role="alert" className="text-rose-300">{loadError}</p> : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={submit} className="space-y-6">
            {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
            <fieldset disabled={saving} className="space-y-6">
              {[["title", "Title", "text", true, 200], ["isbn", "ISBN", "text", true, 32], ["categoryId", "Category", "select", true], ["authorId", "Author", "select", true], ["noofcopies", "Number of Copies", "number", true], ["publisher", "Publisher", "text", false, 200], ["publishedYear", "Published Year", "number", false]].map(([name, label, type, required, maxLength]) => (
                <div key={name} className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-center">
                  <label htmlFor={`book-${name}`} className="text-sm font-medium text-slate-300 md:col-span-1">{label} {required && <span className="text-rose-400">*</span>}</label>
                  <div className="md:col-span-3">
                    {type === "select" ? <Select id={`book-${name}`} name={name} value={form[name]} onChange={change} required={required} className="!rounded-lg" options={[{ value: "", label: `-- Select ${label} --` }, ...(name === "categoryId" ? options.categories : options.authors).map((item) => ({ value: item.id, label: item.title || item.name }))]} /> : <input id={`book-${name}`} name={name} type={type} required={required} maxLength={maxLength} min={name === "noofcopies" ? 0 : 1} max={name === "noofcopies" ? 1000 : 9999} step={type === "number" ? 1 : undefined} value={form[name]} onChange={change} placeholder={`Enter ${label.toLowerCase()}`} className={fieldClass} />}
                    {name === "noofcopies" && <p className="text-xs text-slate-500 mt-2">Copies receive unique codes automatically. Reducing the count removes available copies only.</p>}
                    {type === "select" && !(name === "categoryId" ? options.categories : options.authors).length && <p className="text-xs text-amber-300 mt-2">Add a {label.toLowerCase()} first from the <Link className="underline" to={name === "categoryId" ? "/admin/categories/add" : "/admin/management/authors/add"}>{label} page</Link>.</p>}
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-center">
                <label htmlFor="book-price" className="text-sm font-medium text-slate-300">Original Book Price (₹)</label>
                <div className="md:col-span-3"><input id="book-price" name="originalPrice" type="number" min="0" max="99999999.99" step="0.01" value={form.originalPrice} onChange={change} className={fieldClass} placeholder="Original price for lost book charges" /><p className="text-xs text-slate-500 mt-2">Required before a book can be marked lost.</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-start">
                <label htmlFor="book-image" className="text-sm font-medium text-slate-300 md:col-span-1 pt-2">Book Image</label>
                <div className="md:col-span-3 space-y-2">
                  <input id="book-image" type="file" accept="image/jpeg,image/png,image/webp" className={fieldClass} onChange={(event) => {
                    const selected = event.target.files[0];
                    if (selected && (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 5 * 1024 * 1024)) { setError("Choose a JPG, PNG or WebP image up to 5 MB"); event.target.value = ""; return; }
                    setFile(selected || null); setError("");
                  }} />
                  <p className="text-xs text-slate-500">JPG, PNG or WebP. Maximum 5 MB.</p>
                  {image && <img src={image} alt="Book cover preview" className="h-36 w-28 rounded-lg object-contain bg-slate-800" />}
                  {existingImage && <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={removeImage} onChange={(event) => setRemoveImage(event.target.checked)} />Remove current image</label>}
                </div>
              </div>
              <div className="flex items-end justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-colors disabled:opacity-50">{saving ? "SAVING..." : "SAVE"}</button>
                <button type="button" onClick={() => navigate(listPath)} className="px-6 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors">CANCEL</button>
              </div>
            </fieldset>
          </form>
        </div>
      )}
    </div>
  );
}
