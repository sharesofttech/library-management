import React, { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export default function Input({
  label,
  id,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required = false,
  icon: Icon,
  disabled = false,
  className = "",
  containerClassName = "",
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || name;
  const isPassword = type === "password";
  const actualType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-rose-400 ml-1 font-bold">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          name={name}
          type={actualType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full rounded-xl bg-slate-900/70 text-slate-100 placeholder-slate-500
            text-sm px-3.5 py-2.5 transition-all duration-200 border
            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900
            ${Icon ? "pl-10" : ""}
            ${isPassword ? "pr-10" : ""}
            ${
              error
                ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30 text-rose-100"
                : "border-slate-700/80 hover:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/30"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            ${className}
          `}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-slate-400 hover:text-slate-200 transition-colors p-1 focus:outline-none"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {error ? (
        <p className="flex items-center gap-1.5 text-xs text-rose-400 font-medium animate-fadeIn mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-400 mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
}
