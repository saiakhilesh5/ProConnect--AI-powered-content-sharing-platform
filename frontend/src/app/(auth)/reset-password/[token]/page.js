"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Camera, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:8000";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const router = useRouter();

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const validate = () => {
    if (!form.password || !form.confirmPassword) return "Please fill in both fields.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      await axios.post(`${BACKEND_URL}/api/users/reset-password/${token}`, {
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setStatus("success");
      // Redirect to login after 3 seconds
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Something went wrong. The link may have expired.";
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  return (
    <div className="flex-1 w-full flex items-center justify-center px-4 py-12 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-8"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary">
            <Camera className="h-7 w-7 text-white" />
          </div>
        </div>

        {status === "success" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Password reset!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your password has been updated successfully. Redirecting you to login...
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center py-2.5 px-6 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition"
            >
              Go to Login
            </Link>
          </motion.div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">
              Set a new password
            </h2>
            <p className="text-muted-foreground text-sm text-center mb-8">
              Choose a strong password you haven&apos;t used before.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {status === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {/* New Password */}
              <div className="space-y-1">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  New Password
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition">
                  <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => {
                      setForm({ ...form, password: e.target.value });
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="Min. 6 characters"
                    className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
                    style={{ outline: "none", border: "none", boxShadow: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                  Confirm Password
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition">
                  <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(e) => {
                      setForm({ ...form, confirmPassword: e.target.value });
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="Re-enter your new password"
                    className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
                    style={{ outline: "none", border: "none", boxShadow: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password strength hint */}
              {form.password.length > 0 && form.password.length < 6 && (
                <p className="text-xs text-amber-500">Password must be at least 6 characters.</p>
              )}
              {form.password.length >= 6 && form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match.</p>
              )}
              {form.password.length >= 6 && form.confirmPassword && form.password === form.confirmPassword && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Passwords match
                </p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={status === "loading"}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-60 transition-all duration-200"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </motion.button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
