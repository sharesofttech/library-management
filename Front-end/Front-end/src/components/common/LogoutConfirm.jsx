import React, { useEffect, useRef } from "react";
import { LogOut } from "lucide-react";

export default function LogoutConfirm({ open, onCancel, onConfirm }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} aria-labelledby="logout-title" aria-describedby="logout-description"
      onCancel={onCancel}
      className="m-auto w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl backdrop:bg-slate-950/80 backdrop:backdrop-blur-sm"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400"><LogOut className="h-5 w-5" /></div>
          <h2 id="logout-title" className="text-base font-bold text-white">Confirm Logout</h2>
        </div>
        <p id="logout-description" className="text-sm text-slate-300">Are you sure you want to log out?</p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" autoFocus onClick={onCancel} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">Cancel</button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400">Log Out</button>
        </div>
      </div>
    </dialog>
  );
}
