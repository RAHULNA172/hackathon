"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Users } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5006/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid credentials");
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900" style={{ background: "radial-gradient(ellipse at 50% -20%, rgba(59,130,246,0.15), transparent), #0f172a" }}>
      <div className="w-full max-w-md relative">
        <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-slate-700">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-blue-500 to-emerald-500 shadow-lg">
            <User size={26} className="text-white" />
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-slate-400 text-center mb-8 text-sm">Sign in to manage your tasks</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" required
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                  value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
              <input type="password" required
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white rounded-lg px-4 py-3.5 font-bold transition-all transform hover:scale-[1.02] active:scale-100 shadow-lg shadow-blue-500/20 disabled:opacity-50">
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-700 text-center">
            <button onClick={() => router.push("/signup")} className="text-slate-400 hover:text-white text-sm transition-colors group">
              Don't have an account? <span className="text-emerald-400 font-bold group-hover:underline underline-offset-4">Create one now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-800 border border-emerald-500/30 rounded-2xl p-8 max-w-sm w-full shadow-2xl shadow-emerald-500/20 text-center scale-up-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Login Successful!</h2>
            <p className="text-slate-400 mb-6">Welcome back, {username}. Redirecting you to your dashboard...</p>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full animate-[progress_2s_linear_forwards]"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
