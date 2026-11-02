import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, User, Mail, Phone, Lock, Eye, EyeOff, Check, X as CloseIcon, Users, BookOpen } from "lucide-react";
import userService from "../../api/userService";
import { useToast } from "../../context/ToastContext";
import Select from "../common/Select";

const COUNTRY_OPTIONS = [
  { value: "+91", label: "🇮🇳 India (+91)" },
  { value: "+1", label: "🇺🇸 USA (+1)" },
  { value: "+44", label: "🇬🇧 UK (+44)" },
  { value: "+971", label: "🇦🇪 UAE (+971)" },
  { value: "+65", label: "🇸🇬 Singapore (+65)" },
  { value: "+61", label: "🇦🇺 Australia (+61)" },
  { value: "+49", label: "🇩🇪 Germany (+49)" },
  { value: "+33", label: "🇫🇷 France (+33)" },
];

const ROLE_CONFIG = {
  user: {
    label: "User",
    listPath: "/admin/management/users",
    icon: Users,
    accentColor: "focus:ring-indigo-500",
  },
  librarian: {
    label: "Librarian",
    listPath: "/admin/management/librarians",
    icon: BookOpen,
    accentColor: "focus:ring-emerald-500",
  },
};

export default function UserForm({ role = "user" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditMode = Boolean(id);
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.user;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    countryCode: "+91",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // Password strength meter
  const passwordStrength = useMemo(() => {
    const pwd = form.password;
    if (!pwd) return { score: 0, label: "None", color: "bg-slate-700", text: "text-slate-500" };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    if (score <= 2) return { score: 1, label: "Weak", color: "bg-rose-500", text: "text-rose-400" };
    if (score <= 3) return { score: 2, label: "Fair", color: "bg-amber-500", text: "text-amber-400" };
    if (score <= 4) return { score: 3, label: "Good", color: "bg-indigo-500", text: "text-indigo-400" };
    return { score: 4, label: "Strong", color: "bg-emerald-500", text: "text-emerald-400" };
  }, [form.password]);

  // Load existing user for edit
  useEffect(() => {
    if (!isEditMode) return;
    async function loadUser() {
      try {
        setLoading(true);
        const data = await userService.getUserById(id);
        const u = data.user;
        if (u) {
          setForm({
            name: u.name || "",
            email: u.email || "",
            countryCode: u.countryCode || "+91",
            phone: u.phone || "",
            password: "",
            confirmPassword: "",
          });
        }
      } catch (err) {
        toast.error("Failed to load user details");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [id, isEditMode, toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === "phone") {
      nextValue = value.replace(/\D/g, "").slice(0, 10);
    }
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Full name is required";
    else if (form.name.trim().length < 2) newErrors.name = "Name must be at least 2 characters";

    if (!form.email.trim()) newErrors.email = "Email address is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) newErrors.email = "Please enter a valid email address";

    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    else if (form.phone.trim().length !== 10) newErrors.phone = "Phone number must be exactly 10 digits";

    if (!isEditMode) {
      if (!form.password) newErrors.password = "Password is required";
      else if (form.password.length < 6) newErrors.password = "Password must be at least 6 characters";
      if (!form.confirmPassword) newErrors.confirmPassword = "Confirm password is required";
      else if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    } else {
      // In edit mode, only validate password if user typed one
      if (form.password) {
        if (form.password.length < 6) newErrors.password = "Password must be at least 6 characters";
        if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.warning("Please fix all validation errors.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        countryCode: form.countryCode,
        phone: form.phone,
        roleName: role,
      };
      // Only include password fields if set
      if (form.password) {
        payload.password = form.password;
        payload.confirmPassword = form.confirmPassword;
      }

      if (isEditMode) {
        await userService.updateUser(id, payload);
        toast.success(`${config.label} updated successfully`);
      } else {
        await userService.createUser(payload);
        toast.success(`${config.label} created successfully`);
      }

      navigate(config.listPath);
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        <p className="text-sm">Loading details...</p>
      </div>
    );
  }

  const inputClass = `w-full pl-9 pr-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${config.accentColor} transition-colors`;
  const errorClass = "mt-1 text-xs text-rose-400";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {isEditMode ? `Edit ${config.label}` : `Add ${config.label}`}
          </h1>
          <p className="text-xs text-slate-400">
            {isEditMode ? `Editing: ${form.name}` : `Create a new ${config.label.toLowerCase()} account`}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* Row 1: Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  autoComplete="name"
                  className={inputClass}
                />
              </div>
              {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className={inputClass}
                />
              </div>
              {errors.email && <p className={errorClass}>{errors.email}</p>}
            </div>
          </div>

          {/* Row 2: Country Code + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Country <span className="text-rose-400">*</span>
              </label>
              <Select
                name="countryCode"
                value={form.countryCode}
                onChange={handleChange}
                className="!rounded-lg"
                options={COUNTRY_OPTIONS}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Phone Number <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="tel"
                  className={inputClass}
                />
              </div>
              {errors.phone && <p className={errorClass}>{errors.phone}</p>}
            </div>
          </div>

          {/* Row 3: Password + Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Password {!isEditMode && <span className="text-rose-400">*</span>}
                {isEditMode && <span className="text-slate-500 font-normal text-xs ml-1">(leave blank to keep)</span>}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && <p className={errorClass}>{errors.password}</p>}
              {form.password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span className="text-slate-400">Strength:</span>
                    <span className={passwordStrength.text}>{passwordStrength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          passwordStrength.score >= step ? passwordStrength.color : "bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Confirm Password {!isEditMode && <span className="text-rose-400">*</span>}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && <p className={errorClass}>{errors.confirmPassword}</p>}
              {form.confirmPassword && (
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  {form.password === form.confirmPassword ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Passwords match
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <CloseIcon className="w-3.5 h-3.5" /> Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? "SAVING..." : "SAVE"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
