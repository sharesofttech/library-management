import React, { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Lock, ShieldCheck, Check, X as CloseIcon, ArrowLeft } from "lucide-react";
import authService from "../api/authService";
import { useToast } from "../context/ToastContext";
import Card from "./common/Card";
import Input from "./common/Input";
import Button from "./common/Button";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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

  const validate = () => {
    const newErrors = {};

    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.warning("Please ensure passwords match and meet minimum requirements.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.resetPassword(token, form);
      toast.success(res.message || "Password reset successful. Please login.");
      navigate("/login");
    } catch (err) {
      toast.error(err.message || "Reset link is invalid or expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3 shadow-lg shadow-indigo-500/10">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Reset Password
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Enter your new password below to secure your account.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <Input
                label="New Password"
                name="password"
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={handleChange}
                error={errors.password}
                icon={Lock}
                required
                autoComplete="new-password"
              />
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
                          passwordStrength.score >= step
                            ? passwordStrength.color
                            : "bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                placeholder="Repeat new password"
                value={form.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                icon={Lock}
                required
                autoComplete="new-password"
              />
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              className="mt-3"
            >
              Update Password
            </Button>

            <div className="pt-4 text-center border-t border-slate-800">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
