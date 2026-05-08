"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.access_token, data.user);
      } else {
        setError(data.message || "Registration failed");
        setLoading(false);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-apple-canvas-parchment px-6 py-12 select-none">
      <div className="w-full max-w-[440px] border border-apple-hairline rounded-[18px] bg-apple-canvas p-8 md:p-10 shadow-[0_10px_30px_rgba(0,0,0,0.02)] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Brand Mark & Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-apple-primary/5 border border-apple-primary/20 text-apple-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-apple-ink tracking-apple-tight">Create your ID</h1>
            <p className="text-[14px] text-zinc-500 font-light">Join the CraftyNOS containerized orchestration cluster.</p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-[11px] animate-in shake duration-200">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Email field */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[13px] font-semibold text-apple-ink">Email Address</label>
            <input 
              id="email" 
              type="email" 
              placeholder="name@example.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              className="w-full h-11 px-4 border border-apple-hairline rounded-[11px] text-[15px] focus:outline-none focus:ring-2 focus:ring-apple-primary-focus focus:border-transparent transition-all placeholder-zinc-400 font-sans"
            />
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[13px] font-semibold text-apple-ink">Password</label>
            <input 
              id="password" 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="w-full h-11 px-4 border border-apple-hairline rounded-[11px] text-[15px] focus:outline-none focus:ring-2 focus:ring-apple-primary-focus focus:border-transparent transition-all font-mono"
            />
          </div>

          {/* Confirm Password field */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-[13px] font-semibold text-apple-ink">Confirm Password</label>
            <input 
              id="confirmPassword" 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              required 
              className="w-full h-11 px-4 border border-apple-hairline rounded-[11px] text-[15px] focus:outline-none focus:ring-2 focus:ring-apple-primary-focus focus:border-transparent transition-all font-mono"
            />
          </div>

          {/* Action submit button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-apple-primary hover:bg-apple-primary-focus text-white text-[15px] font-semibold h-11 rounded-full active-scale transition-all flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{loading ? "Creating account..." : "Create Account"}</span>
          </button>
        </form>

        {/* Footnote login navigation */}
        <div className="text-center pt-4 border-t border-zinc-100 text-[13px] text-zinc-500 font-light">
          Already have an account?{" "}
          <Link href="/login" className="text-apple-primary hover:underline font-semibold transition-all">
            Sign in here
          </Link>
        </div>

      </div>
    </div>
  );
}
