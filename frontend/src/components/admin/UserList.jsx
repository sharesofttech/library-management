import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Loader2, Users, BookOpen } from "lucide-react";
import userService from "../../api/userService";
import { useToast } from "../../context/ToastContext";
import { TablePagination, TableSearch } from "../common/TableControls";

const ROLE_CONFIG = {
  user: {
    label: "Users",
    addPath: "/admin/management/users/add",
    editPath: (id) => `/admin/management/users/edit/${id}`,
    icon: Users,
    color: "bg-indigo-600",
  },
  librarian: {
    label: "Librarians",
    addPath: "/admin/management/librarians/add",
    editPath: (id) => `/admin/management/librarians/edit/${id}`,
    icon: BookOpen,
    color: "bg-emerald-600",
  },
};

export default function UserList({ role = "user" }) {
  const navigate = useNavigate();
  const toast = useToast();
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.user;
  const Icon = config.icon;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getUsersByRole(role, { page, limit, search });
      setUsers(data.users || []);
      setPagination(data.pagination || { total: (data.users || []).length, totalPages: 1 });
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || `Failed to load ${config.label}`);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, page, limit, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await userService.deleteUser(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted.`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${config.color} flex items-center justify-center text-white`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{config.label}</h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage all {config.label.toLowerCase()}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(config.addPath)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg ${config.color} hover:opacity-90 text-white text-xs sm:text-sm font-semibold shadow-sm transition-opacity`}
        >
          <Plus className="w-4 h-4" />
          <span>Add {role === "librarian" ? "Librarian" : "User"}</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-4"><TableSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={"Search " + config.label.toLowerCase() + " by name, email or phone..."} /></div>
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-sm">Loading {config.label.toLowerCase()}...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">Phone</th>
                  <th className="py-3 px-4 text-center">Created On</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {users.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-sm text-slate-400">No matching {config.label.toLowerCase()} found.</td></tr>}
                {users.map((u, index) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-center font-medium text-slate-400">{index + 1}</td>
                    <td className="py-3.5 px-4 font-semibold text-white">{u.name}</td>
                    <td className="py-3.5 px-4 text-slate-300">{u.email}</td>
                    <td className="py-3.5 px-4 text-center text-slate-400">
                      {u.countryCode} {u.phone}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400 text-xs">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(config.editPath(u.id))}
                          className="w-7 h-7 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-sm"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(u)}
                          className="w-7 h-7 rounded bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors shadow-sm"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && <TablePagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} onLimitChange={(size) => { setLimit(size); setPage(1); }} />}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              Delete {role === "librarian" ? "Librarian" : "User"}
            </h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete{" "}
              <strong className="text-white">"{deleteTarget.name}"</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
