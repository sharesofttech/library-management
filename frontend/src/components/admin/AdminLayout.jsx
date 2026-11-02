import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutDashboard,
  FolderTree,
  ChevronDown,
  ChevronRight,
  LogOut,
  Shield,
  Menu,
  X,
  Users,
  BookOpen,
  Settings2,
  UserCheck,
  Store,
  CreditCard,
  CircleUserRound,
} from "lucide-react";
import { logoutUser, selectUser } from "../../store/authSlice";
import { useToast } from "../../context/ToastContext";
import LogoutConfirm from "../common/LogoutConfirm";

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const user = useSelector(selectUser) || {};
  const isAdmin = user.role === "admin";
  const panelTitle = user.role === "librarian" ? "Librarian Panel" : "Admin Panel";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(true);
  const [finesOpen, setFinesOpen] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const closeOnOutsideClick = event => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false);
    };
    const closeOnEscape = event => { if (event.key === "Escape") setProfileMenuOpen(false); };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const handleLogout = () => {
    dispatch(logoutUser());
    toast.info("Logged out successfully.");
    navigate("/login");
  };

  const isDashboardActive = location.pathname === "/admin/dashboard" || location.pathname === "/admin";
  const isApplicationsActive = location.pathname.startsWith("/admin/applications");
  const isRenterListingsActive = location.pathname.startsWith("/admin/renter-listings");
  const isRentalCheckoutActive = location.pathname.startsWith("/admin/rental-checkout");
  const isCategoryActive = location.pathname.startsWith("/admin/categories");
  const isUsersActive = location.pathname.startsWith("/admin/management/users");
  const isLibrariansActive = location.pathname.startsWith("/admin/management/librarians");
  const isRentersActive = location.pathname.startsWith("/admin/management/renters");
  const isAuthorsActive = location.pathname.startsWith("/admin/management/authors");
  const isBooksActive = location.pathname.startsWith("/admin/books");
  const isManagementActive = isUsersActive || isLibrariansActive || isRentersActive;
  const isBorrowingsActive =location.pathname.startsWith("/admin/borrowings");
  const getPageTitle = () => {
    if (location.pathname.startsWith("/admin/profile")) return "My Profile";
    if (location.pathname.startsWith("/admin/fine-payments")) return "Fine Payments";
    if (location.pathname.startsWith("/admin/fines")) return "Fines List";
    if (location.pathname.startsWith("/admin/settings")) return "Settings";
    if (isRenterListingsActive) return "Renter Book Listings";
    if (isRentalCheckoutActive) return "Rental Checkout";
    if (isBooksActive) return "Books";
    if (isAuthorsActive) return "Authors";
    if (location.pathname.includes("/admin/categories")) return "Category";
    if (location.pathname.includes("/admin/management/users")) return "Users";
    if (location.pathname.includes("/admin/management/librarians")) return "Librarians";
    if (isRentersActive) return "Approved Renters";
    if (location.pathname.includes("/admin/borrowings")) return "Borrowings";
    return "Dashboard";
  };

  return (
    <div className="admin-panel min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-900 border-r border-slate-800 
          flex flex-col transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-bold text-white text-base">{panelTitle}</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">

          {/* Dashboard */}
          <Link
            to="/admin/dashboard"
            onClick={() => setMobileOpen(false)}
            className={`
              flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors
              ${
                isDashboardActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }
            `}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          {isAdmin && (
            <Link
              to="/admin/applications"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isApplicationsActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Applications</span>
            </Link>
          )}

          {isAdmin && <Link to="/admin/rental-checkout" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isRentalCheckoutActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><CreditCard className="w-4 h-4" /><span>Rental Checkout</span></Link>}

          {isAdmin && (
            <Link
              to="/admin/renter-listings"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isRenterListingsActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
            >
              <Store className="w-4 h-4" />
              <span>Book Listings</span>
            </Link>
          )}

          {/* Category Direct Link */}
          <Link
            to="/admin/categories"
            onClick={() => setMobileOpen(false)}
            className={`
              flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors
              ${
                isCategoryActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }
            `}
          >
            <FolderTree className="w-4 h-4" />
            <span>Category</span>
          </Link>

          <Link
            to="/admin/management/authors"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isAuthorsActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Authors</span>
          </Link>
          {/* Management Menu (collapsible) */}
          <Link
            to="/admin/books"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isBooksActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Books</span>
          </Link>
   
                     <Link
            to="/admin/borrowings"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isBorrowingsActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Borrowings</span>
          </Link>
          <div className="pt-1">
            <button type="button" onClick={() => setFinesOpen(value => !value)} aria-expanded={finesOpen} className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800"><span className="flex items-center gap-3"><BookOpen className="w-4 h-4" />Fines</span>{finesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
            {finesOpen && <div className="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-1 py-1">{[["/admin/fines", "Fines List"], ["/admin/fine-payments", "Fine Payments"]].map(([path, label]) => <Link key={path} to={path} onClick={() => setMobileOpen(false)} className={`block px-3 py-2 rounded-lg text-xs font-medium ${location.pathname === path ? "bg-indigo-600/20 text-indigo-300" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>{label}</Link>)}</div>}
          </div>
          
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setManagementOpen((prev) => !prev)}
              className={`
                w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors
                ${
                  isManagementActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Settings2 className="w-4 h-4" />
                <span>Management</span>
              </div>
              {managementOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Sub-menu */}
            {managementOpen && (
              <div className="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-1 py-1">
                {/* Users */}
<Link
                  to="/admin/management/users"
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors
                    ${
                      isUsersActive
                        ? "bg-indigo-600/20 text-indigo-300 font-semibold"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }
                  `}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Users</span>
                </Link>

                {/* Librarians */}
                {isAdmin && (
                <Link
                  to="/admin/management/librarians"
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors
                    ${
                      isLibrariansActive
                        ? "bg-indigo-600/20 text-indigo-300 font-semibold"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }
                  `}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Librarians</span>
                </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin/management/renters"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isRentersActive ? "bg-indigo-600/20 text-indigo-300 font-semibold" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Renters</span>
                  </Link>
                )}
              </div>
            )}
          </div>
          <Link to="/admin/settings" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${location.pathname.startsWith("/admin/settings") ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><Settings2 className="w-4 h-4" />Settings</Link>

        </div>

        {/* Sidebar Footer with Sign Out */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {(user.name || "A")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name || "Admin"}</p>
              <p className="text-[11px] text-slate-400 truncate">{user.email || ""}</p>
            </div>
          </div>

          <button
            onClick={() => setLogoutOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold text-white tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          <div ref={profileMenuRef} className="relative">
            <button type="button" aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen(value => !value)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-slate-200 hover:bg-slate-800">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-600 text-xs font-bold">{(user.name || "A")[0].toUpperCase()}</span>
              <span className="hidden max-w-36 truncate text-xs font-medium sm:block">{user.name || "Admin"}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${profileMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {profileMenuOpen && <div role="menu" className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl">
              <div className="border-b border-slate-800 px-3 py-2"><p className="truncate text-xs font-semibold text-white">{user.name || "Staff"}</p><p className="truncate text-[11px] text-slate-400">{user.email || ""}</p><p className="mt-1 text-[10px] capitalize text-slate-500">{user.role || "Staff"}</p></div>
              <Link role="menuitem" onClick={() => setProfileMenuOpen(false)} to="/admin/profile" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-slate-200 hover:bg-slate-800"><CircleUserRound className="h-4 w-4 text-indigo-300" />My Profile</Link>
              <Link role="menuitem" onClick={() => setProfileMenuOpen(false)} to="/admin/settings" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-slate-200 hover:bg-slate-800"><Settings2 className="h-4 w-4 text-indigo-300" />Settings</Link>
              <button role="menuitem" type="button" onClick={() => { setProfileMenuOpen(false); setLogoutOpen(true); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs text-rose-300 hover:bg-slate-800"><LogOut className="h-4 w-4" />Sign Out</button>
            </div>}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
      <LogoutConfirm open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={handleLogout} />
    </div>
  );
}


