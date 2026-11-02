import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, ChevronDown } from "lucide-react";

export default function Select({
  label,
  id,
  name,
  value,
  onChange,
  onBlur,
  options = [],
  error,
  required = false,
  disabled = false,
  menuPlacement = "down",
  className = "",
  containerClassName = "",
  ...props
}) {
  const selectId = id || name || props["aria-label"]?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "custom-select";
  const listboxId = `${selectId}-options`;
  const errorId = `${selectId}-error`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const selectedIndex = Math.max(0, options.findIndex((option) => String(option.value) === String(value)));
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const selectOption = (option) => {
    onChange?.({ target: { name, value: option.value }, currentTarget: { name, value: option.value } });
    setOpen(false);
    triggerRef.current?.focus();
  };

  const openMenu = (index = selectedIndex) => {
    if (disabled || !options.length) return;
    setActiveIndex(index);
    setOpen(true);
  };

  const handleTriggerKeyDown = (event) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openMenu(event.key === "ArrowUp" ? options.length - 1 : selectedIndex);
    }
  };

  const handleOptionKeyDown = (event, index) => {
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % options.length;
    else if (event.key === "ArrowUp") nextIndex = (index - 1 + options.length) % options.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(options[index]);
      return;
    } else if (event.key === "Tab") {
      setOpen(false);
      return;
    } else return;

    event.preventDefault();
    setActiveIndex(nextIndex);
  };

  return (
    <div ref={rootRef} className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label id={`${selectId}-label`} htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label}{required && <span className="ml-1 font-bold text-rose-400">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-labelledby={label ? `${selectId}-label` : undefined}
          aria-label={!label ? props["aria-label"] : undefined}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={handleTriggerKeyDown}
          onBlur={onBlur}
          className={`group flex w-full items-center gap-3 rounded-xl border bg-gradient-to-br from-slate-900 to-slate-900/80 px-3.5 py-2.5 text-left text-sm text-slate-100 shadow-sm transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 ${error ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30" : "border-slate-700/80 hover:border-indigo-400/70 focus:border-indigo-500 focus:ring-indigo-500/30"} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className}`}
          {...props}
        >
          <span className="min-w-0 flex-1 truncate font-medium">{selectedOption?.label || "Choose an option"}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-indigo-300 ${open ? "rotate-180 text-indigo-300" : ""}`} />
        </button>

        {open && (
          <div className={`absolute left-0 right-0 z-50 overflow-hidden rounded-2xl border border-slate-700/90 bg-slate-950/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl ${menuPlacement === "up" ? "bottom-full mb-2" : "top-full mt-2"}`}>
            <div id={listboxId} role="listbox" aria-labelledby={label ? `${selectId}-label` : undefined} className="max-h-48 overflow-y-auto">
              {options.map((option, index) => {
                const selected = String(option.value) === String(value);
                const active = activeIndex === index;
                return (
                  <button
                    key={option.value}
                    ref={(element) => { optionRefs.current[index] = element; }}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    tabIndex={active ? 0 : -1}
                    onFocus={() => setActiveIndex(index)}
                    onKeyDown={(event) => handleOptionKeyDown(event, index)}
                    onClick={() => selectOption(option)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${selected ? "bg-indigo-500/15 text-indigo-100" : active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/80 hover:text-white"}`}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-indigo-300" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p id={errorId} className="mt-0.5 flex animate-fadeIn items-center gap-1.5 text-xs font-medium text-rose-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /><span>{error}</span>
        </p>
      )}
    </div>
  );
}
