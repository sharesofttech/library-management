import React from "react";

export default function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`glass-card rounded-2xl p-6 sm:p-8 relative overflow-hidden transition-all duration-300 ${className}`}
      {...props}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      {children}
    </div>
  );
}
