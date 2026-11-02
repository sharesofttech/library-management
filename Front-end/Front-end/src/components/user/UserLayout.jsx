import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { BookOpen, Library, LogOut, Menu, Store, ClipboardList, X } from "lucide-react";
import { logoutUser, selectUser } from "../../store/authSlice";
import { useToast } from "../../context/ToastContext";
import LogoutConfirm from "../common/LogoutConfirm";
import ProfileMenu from "./ProfileMenu";

export default function UserLayout({ children }) {
  const user = useSelector(selectUser) || {};
  const location = useLocation();
  const pageTitle = location.pathname === "/my/fines" ? "My Fines" : location.pathname === "/my/fine-payments" ? "My Payment History" : location.pathname.startsWith("/renter/listings") ? "My Book Listings" : location.pathname.startsWith("/renter/requests") ? "Rental Inbox" : location.pathname === "/my/rental-requests" ? "My Rental Requests" : location.pathname.startsWith("/renter-book/") ? "Book Details" : "Books";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const initial = (user.name || "User")[0].toUpperCase();
  const logout = () => { dispatch(logoutUser()); toast.info("Logged out successfully."); navigate("/login", { replace: true }); };

  return (
    <div className="admin-panel min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {mobileOpen && <div onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden" />}
      <aside className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center"><Library className="w-5 h-5" /></div><span className="font-bold text-white text-base">Library Portal</span></div>
          <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="md:hidden text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <nav aria-label="User navigation" className="flex-1 overflow-y-auto px-4 py-4">
          {[["/home", "Books", BookOpen], ...(user.isRenter ? [["/renter/listings", "My Book Listings", Store]] : []), ["/my/fines", "My Fines", BookOpen], ["/my/fine-payments", "My Payment History", BookOpen]].map(([path, label, Icon]) => <Link key={path} to={path} aria-current={location.pathname === path ? "page" : undefined} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3.5 py-2.5 mb-1 rounded-xl text-sm font-medium ${location.pathname === path ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><Icon className="w-4 h-4" /><span>{label}</span></Link>)}
          <Link to="/my/rental-requests" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3.5 py-2.5 mb-1 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"><ClipboardList className="w-4 h-4" /><span>My Rental Requests</span></Link>
          {user.isRenter && <Link to="/renter/requests" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3.5 py-2.5 mb-1 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"><ClipboardList className="w-4 h-4" /><span>Rental Inbox</span></Link>}
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 px-2"><div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold">{initial}</div><div className="flex-1 min-w-0"><p className="text-xs font-semibold text-white truncate">{user.name || "User"}</p><p className="text-[11px] text-slate-400 truncate">{user.email}</p></div></div>
          <button onClick={() => setLogoutOpen(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors"><LogOut className="w-3.5 h-3.5" />Sign Out</button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3"><button aria-label="Open menu" onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"><Menu className="w-5 h-5" /></button><h1 className="text-base font-semibold text-white">{pageTitle}</h1></div>
          <ProfileMenu user={user} />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <LogoutConfirm open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={logout} />
    </div>
  );
}


