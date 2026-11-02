import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, LogIn, Sparkles } from "lucide-react";
import { loginUser, selectAuthLoading, clearAuthError } from "../store/authSlice";
import { useToast } from "../context/ToastContext";
import Card from "./common/Card";
import Input from "./common/Input";
import Button from "./common/Button";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isLoading = useSelector(selectAuthLoading);

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!form.password) {
      newErrors.password = "Password is required";
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
    dispatch(clearAuthError());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.warning("Please complete all required fields correctly.");
      return;
    }

    try {
      const resultAction = await dispatch(loginUser(form));
      if (loginUser.fulfilled.match(resultAction)) {
        const loggedUser = resultAction.payload.user;
        const role = loggedUser?.role || "user";

        toast.success(`Welcome back, ${loggedUser?.name || "User"}! 🎉`);

        if ((role === "admin" || role === "librarian")) {
          navigate("/admin/dashboard", { replace: true });
        } else {
          const redirectPath =
            location.state?.from?.pathname &&
            !location.state.from.pathname.startsWith("/admin")
              ? location.state.from.pathname
              : "/home";
          navigate(redirectPath, { replace: true });
        }
      } else {
        const errorMsg = resultAction.payload || "Invalid email or password.";
        toast.error(errorMsg);
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3 shadow-lg shadow-indigo-500/10">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Enter your credentials to access your account
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

            <div>
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                error={errors.password}
                icon={Lock}
                required
                autoComplete="current-password"
              />
              <div className="flex justify-end mt-1.5">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              icon={LogIn}
              className="mt-2"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors ml-1 inline-flex items-center gap-1 group"
              >
                Create one now
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
