import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import categoryService from "../../api/categoryService";
import { useToast } from "../../context/ToastContext";
import { TablePagination, TableSearch } from "../common/TableControls";

export default function CategoryList() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    categoryService.getCategories({ page, limit, search }).then(({ categories, pagination: info }) => {
      if (active) { setCategories(categories); setPagination(info || { total: categories.length, totalPages: 1 }); }
    }).catch((err) => {
      if (active) setError(err.status === 404
        ? "Categories service is unavailable. Please restart the backend server and try again."
        : err.message || "Unable to load categories. Please try again.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload, page, limit, search]);

  const handleDelete = async (category) => {
    setDeleting(category.id);
    try {
      const result = await categoryService.deleteCategory(category.id);
      setCategories((previous) => previous.filter((item) => item.id !== category.id));
      toast.success(result.message);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete category");
    } finally {
      setDeleting(null);
    }
  };

  const date = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Categories</h1>
        <Link to="/admin/categories/add" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"><Plus size={16} />Add Category</Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-4"><TableSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search categories by title or description..." /></div>
      {loading ? <div role="status" className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /><p className="text-sm">Loading categories...</p></div> : error ? (
        <div role="alert" className="p-12 text-center space-y-3"><p className="text-sm text-slate-400">{error}</p><button onClick={() => setReload((value) => value + 1)} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-200">Try again</button></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-800"><tr>{["ID", "Title", "Description", "Created On", "Updated On", "Action"].map((title) => <th key={title} scope="col" className="py-3 px-4 whitespace-nowrap">{title}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">{category.id}</td><td className="py-3.5 px-4 font-semibold text-white">{category.title}</td>
                  <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">{category.description || "-"}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-center text-slate-400">{date(category.createdAt)}</td><td className="py-3.5 px-4 whitespace-nowrap text-center text-slate-400">{date(category.updatedAt)}</td>
                  <td className="py-3.5 px-4"><div className="flex items-center justify-center gap-1.5">
                    <Link to={`/admin/categories/edit/${category.id}`} aria-label={`Edit ${category.title}`} className="w-7 h-7 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-sm"><Pencil size={14} /></Link>
                    <button type="button" disabled={deleting !== null} onClick={() => setDeleteTarget(category)} aria-label={`Delete ${category.title}`} className="w-7 h-7 rounded bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"><Trash2 size={14} /></button>
                  </div></td>
                </tr>
              ))}
              {!categories.length && <tr><td colSpan={6} className="p-12 text-center text-sm text-slate-400">No matching categories found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      </div>
      {!loading && !error && <TablePagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} onLimitChange={(size) => { setLimit(size); setPage(1); }} />}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-category-title" className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <h3 id="delete-category-title" className="text-base font-bold text-white">Delete Category</h3>
            <p className="text-xs text-slate-300">Are you sure you want to delete <strong className="text-white">"{deleteTarget.title}"</strong>?</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" disabled={deleting !== null} onClick={() => setDeleteTarget(null)} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium">Cancel</button>
              <button type="button" disabled={deleting !== null} onClick={() => handleDelete(deleteTarget)} className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">{deleting !== null ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
