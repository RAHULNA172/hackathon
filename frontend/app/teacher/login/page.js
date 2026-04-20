"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Lock, User, Eye, EyeOff } from "lucide-react";

const API = "http://localhost:5006";

export default function TeacherLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const login = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Login failed"); return; }
      if (data.role !== "teacher") {
        setError("Access denied. Only Teacher accounts can login here."); return;
      }
      localStorage.setItem("user", JSON.stringify(data));
      router.push("/teacher");
    } catch {
      setError("Server unreachable. Make sure backend is running.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" style={{ background: "radial-gradient(ellipse at 60% 20%, rgba(139,92,246,0.12) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(16,185,129,0.10) 0%, transparent 55%), #0f172a" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/30">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Teacher Portal</h1>
          <p className="text-slate-400 text-sm mt-1">Organization-level analytics & monitoring</p>
        </div>

        <form onSubmit={login} className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                placeholder="teacher" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} autoFocus />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                placeholder="••••••••" type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50">
            {loading ? "Signing in..." : "Sign In as Teacher"}
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-4">
          Default: <span className="text-slate-400">teacher / teacher123</span>
        </p>
      </div>
    </div>
  );
}
