import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleUserRound, Store, BriefcaseBusiness } from "lucide-react";
import { Link } from "react-router-dom";

export default function ProfileMenu({ user }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const close = (event) => { if (!menuRef.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  return <div ref={menuRef} className="relative"><button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-slate-200 hover:bg-slate-800"><span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-600 text-xs font-bold">{(user.name || "U")[0].toUpperCase()}</span><span className="hidden max-w-32 truncate text-xs font-medium sm:block">{user.name || "Profile"}</span><ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${open ? "rotate-180" : ""}`} /></button>{open && <div role="menu" className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl"><div className="border-b border-slate-800 px-3 py-2"><p className="truncate text-xs font-semibold text-white">{user.name}</p><p className="truncate text-[11px] text-slate-400">{user.email}</p></div><Link role="menuitem" onClick={() => setOpen(false)} to="/my/profile" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-slate-200 hover:bg-slate-800"><CircleUserRound className="h-4 w-4 text-indigo-300" />My Profile</Link>{user.isRenter && <Link role="menuitem" onClick={() => setOpen(false)} to="/renter/listings" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-slate-200 hover:bg-slate-800"><Store className="h-4 w-4 text-violet-300" />My Book Listings</Link>}<div className="my-1 border-t border-slate-800" /><p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Request access</p>{!user.isRenter && <Link role="menuitem" onClick={() => setOpen(false)} to="/apply/renter" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-slate-200 hover:bg-slate-800"><Store className="h-4 w-4 text-violet-300" />Become a Renter</Link>}{user.role === "user" && <Link role="menuitem" onClick={() => setOpen(false)} to="/apply/librarian" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-slate-200 hover:bg-slate-800"><BriefcaseBusiness className="h-4 w-4 text-blue-300" />Become a Librarian</Link>}</div>}</div>;
}
