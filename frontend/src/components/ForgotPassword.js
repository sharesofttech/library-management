import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";
import authService from "../api/authService";
import { useToast } from "../context/ToastContext";
import Card from "./common/Card";
import Input from "./common/Input";
import Button from "./common/Button";

export default function ForgotPassword() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setError("Email address is required");
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.warning("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      setIsSubmitted(true);
      toast.success(res.message || "Password reset link sent to your email!");
    } catch (err) {
      toast.error(err.message || "Failed to process request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3 shadow-lg shadow-indigo-500/10">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Forgot Password?
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            No worries, we will send you instructions to reset your password.
          </p>
        </div>

        <Card>
          {isSubmitted ? (
            <div className="text-center space-y-5 animate-fade-in py-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Reset Link Dispatched</h3>
                <p className="text-sm text-slate-300">
                  If <span className="font-semibold text-indigo-300">{email}</span> is registered, a password reset link has been sent. Please check your inbox and spam folder.
                </p>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => setIsSubmitted(false)}
                >
                  Send Another Link
                </Button>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Input
                label="Registered Email Address"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                error={error}
                icon={Mail}
                required
                autoComplete="email"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                className="mt-2"
              >
                Send Reset Link
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
          )}
        </Card>
      </div>
    </div>
  );
}
