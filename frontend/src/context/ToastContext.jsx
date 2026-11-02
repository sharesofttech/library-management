import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (msg, duration) => addToast(msg, "success", duration),
    error: (msg, duration) => addToast(msg, "error", duration),
    warning: (msg, duration) => addToast(msg, "warning", duration),
    info: (msg, duration) => addToast(msg, "info", duration),
  };

  const getToastStyles = (type) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-emerald-950/80 border-emerald-500/40 text-emerald-200",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
        };
      case "error":
        return {
          bg: "bg-rose-950/80 border-rose-500/40 text-rose-200",
          icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
        };
      case "warning":
        return {
          bg: "bg-amber-950/80 border-amber-500/40 text-amber-200",
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
        };
      default:
        return {
          bg: "bg-indigo-950/80 border-indigo-500/40 text-indigo-200",
          icon: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
        };
    }
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((item) => {
          const style = getToastStyles(item.type);
          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-down ${style.bg}`}
            >
              {style.icon}
              <div className="flex-1 text-sm font-medium leading-snug">
                {item.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded text-current focus:outline-none"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export default ToastContext;
