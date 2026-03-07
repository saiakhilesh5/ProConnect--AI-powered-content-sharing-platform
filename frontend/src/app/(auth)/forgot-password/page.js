"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Camera, ArrowLeft, CheckCircle, AlertCircle, Loader2, Chrome } from "lucide-react";
import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:8000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error | google
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await axios.post(`${BACKEND_URL}/api/users/forgot-password`, { email: email.trim() });
      if (res?.data?.message === "GOOGLE_ACCOUNT") {
        setStatus("google");
      } else {
        setStatus("success");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Something went wrong. Please try again.";
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

        {status === "google" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <Chrome className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Google Account</h2>
            <p className="text-muted-foreground text-sm mb-6">
              The account linked to <span className="font-medium text-foreground">{email}</span> was
              created with <span className="font-medium text-blue-500">Google Sign-In</span>. You don&apos;t
              need a password — just log in with Google.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition mb-3"
            >
              Go to Login
            </Link>
            <button
              onClick={() => setStatus("idle")}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Try a different email
            </button>
          </motion.div>
        ) : status === "success" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm mb-6">
              If an account exists for <span className="font-medium text-foreground">{email}</span>,
              we&apos;ve sent a password reset link. It expires in 1 hour.
            </p>
            <p className="text-muted-foreground text-xs mb-6">
              Didn&apos;t receive the email? Check your spam folder, or{" "}
              <button
                onClick={() => setStatus("idle")}
                className="text-primary hover:underline font-medium"
              >
                try again
              </button>
              .
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </motion.div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">
              Forgot your password?
            </h2>
            <p className="text-muted-foreground text-sm text-center mb-8">
              Enter the email address linked to your account and we&apos;ll send you a reset link.
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

              <div className="space-y-1">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email address
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="your.email@example.com"
                    className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
                    style={{ outline: "none", border: "none", boxShadow: "none" }}
                  />
                </div>
              </div>

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
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </motion.button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
