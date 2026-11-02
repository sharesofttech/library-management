import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Phone, Lock, UserPlus, Check, X as CloseIcon, Loader2 } from "lucide-react";
import { registerUser, selectAuthLoading, clearAuthError } from "../store/authSlice";
import authService from "../api/authService";
import { useToast } from "../context/ToastContext";
import Card from "./common/Card";
import Input from "./common/Input";
import Select from "./common/Select";
import Button from "./common/Button";

const COUNTRY_OPTIONS = [
  { value: "+91", label: "India (+91)" },
];

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const isLoading = useSelector(selectAuthLoading);

  const [form, setForm] = useState({
    name: "",
    email: "",
    countryCode: "+91",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [verificationId, setVerificationId] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setInterval(() => setResendSeconds((remaining) => Math.max(0, remaining - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

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

    if (!form.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (form.phone.trim().length !== 10) {
      newErrors.phone = "Phone number must be exactly 10 digits";
    }

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
    let nextValue = value;

    if (name === "phone") {
      nextValue = value.replace(/\D/g, "").slice(0, 10);
    }

    setForm((prev) => ({ ...prev, [name]: nextValue }));

    if (["email", "countryCode", "phone"].includes(name) && verificationId) {
      setVerificationId("");
      setEmailCode("");
      setEmailVerified(false);
      setResendSeconds(0);
      setVerificationMessage("Contact details changed. Request new verification codes.");
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    dispatch(clearAuthError());
  };

  const startVerification = async () => {
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || phone.length !== 10) {
      setErrors((current) => ({ ...current, email: /^\S+@\S+\.\S+$/.test(email) ? "" : "Enter a valid email first", phone: phone.length === 10 ? "" : "Enter a 10-digit mobile number first" }));
      return;
    }
    setVerificationBusy("send");
    setVerificationMessage("");
    try {
      const result = await authService.startRegistrationVerification({ name: form.name.trim(), email, countryCode: form.countryCode, phone });
      setVerificationId(result.verificationId);
      setEmailVerified(false);
      setEmailCode("");
      setResendSeconds(result.resendAfterSeconds || 60);
      setVerificationMessage(result.message || "Code sent. Check your email.");
    } catch (error) {
      if (error.data?.retryAfterSeconds) setResendSeconds(error.data.retryAfterSeconds);
      setVerificationMessage(error.message || "Unable to send verification codes.");
    } finally {
      setVerificationBusy("");
    }
  };

  const verifyContact = async (channel) => {
    const code = emailCode;
    setVerificationBusy(channel);
    setVerificationMessage("");
    try {
      const result = await authService.verifyRegistrationCode(verificationId, channel, code);
      setEmailVerified(true);
      setVerificationMessage(result.message);
    } catch (error) {
      setVerificationMessage(error.message || `Unable to verify ${channel}.`);
    } finally {
      setVerificationBusy("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!verificationId || !emailVerified) {
      setVerificationMessage("Verify your email before creating your account.");
      toast.warning("Verify your email first.");
      return;
    }

    if (!validate()) {
      toast.warning("Please resolve all validation errors before proceeding.");
      return;
    }

    try {
      const resultAction = await dispatch(registerUser({ ...form, verificationId }));
      if (registerUser.fulfilled.match(resultAction)) {
        toast.success(resultAction.payload?.message || "Account created successfully.");
        navigate("/login");
      } else {
        const errorMsg = resultAction.payload || "Registration failed.";
        toast.error(errorMsg);
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  const canRequestVerification = /^\S+@\S+\.\S+$/.test(form.email.trim());

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3 shadow-lg shadow-indigo-500/10">
            <UserPlus className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Create an Account
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Create your Reader / Member account
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                name="name"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                error={errors.name}
                icon={User}
                required
                autoComplete="name"
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={handleChange}
                error={errors.email}
                icon={Mail}
                required
                autoComplete="email"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <Select
                  label="Country"
                  name="countryCode"
                  value={form.countryCode}
                  onChange={handleChange}
                  options={COUNTRY_OPTIONS}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={handleChange}
                  error={errors.phone}
                  icon={Phone}
                  required
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </div>
            </div>

            {canRequestVerification && <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              {!verificationId ? <><Button type="button" variant="secondary" onClick={startVerification} disabled={Boolean(verificationBusy) || form.phone.trim().length !== 10} icon={verificationBusy === "send" ? Loader2 : Mail} className={verificationBusy === "send" ? "animate-pulse" : ""}>{verificationBusy === "send" ? "Sending code..." : "Send email verification code"}</Button>{form.phone.trim().length !== 10 && <p className="text-xs text-slate-500">Enter a valid 10-digit mobile number to request the code.</p>}</> : <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-200">Enter the code sent to {form.email.trim()}</span>{emailVerified && <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300"><Check className="h-3.5 w-3.5" />Verified</span>}</div>{!emailVerified && <div className="mt-2 flex gap-2"><input aria-label="Email verification code" value={emailCode} onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm tracking-widest text-white outline-none focus:border-indigo-400" /><button type="button" disabled={emailCode.length !== 6 || Boolean(verificationBusy)} onClick={() => verifyContact("email")} className="rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white disabled:opacity-40">{verificationBusy === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify email"}</button></div>}</div>}
              {verificationMessage && !(resendSeconds > 0 && /wait before requesting/i.test(verificationMessage)) && <p role={/sent|verified/i.test(verificationMessage) ? "status" : "alert"} className={`text-xs ${/sent|verified/i.test(verificationMessage) ? "text-emerald-300" : "text-amber-200"}`}>{verificationMessage}</p>}
              {verificationId && resendSeconds > 0 && !emailVerified && <p className="text-xs text-amber-200">Resend code in {`${Math.floor(resendSeconds / 60)}:${String(resendSeconds % 60).padStart(2, "0")}`}</p>}
              {verificationId && !emailVerified && resendSeconds === 0 && <button type="button" onClick={startVerification} disabled={Boolean(verificationBusy)} className="text-xs font-medium text-indigo-300 hover:text-indigo-200 disabled:opacity-50">{verificationBusy === "send" ? "Sending..." : "Resend code"}</button>}
            </div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Password"
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
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
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
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={!verificationId || !emailVerified || Boolean(verificationBusy)}
              icon={UserPlus}
              className="mt-4"
            >
            Create Account
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors ml-1 inline-flex items-center gap-1 group"
              >
                Sign In
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
