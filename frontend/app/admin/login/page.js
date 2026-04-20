"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:5006/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      if (data.role !== "admin" && data.role !== "subadmin") throw new Error("This account is not an admin. Please use the user login.");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      router.push("/admin");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 bg-purple-500" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-purple-500/30">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
            <Shield size={26} />
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Welcome to Admin Side
          </h1>
          <p className="text-slate-400 text-center mb-8 text-sm">Admin Control Panel Access</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Admin Username</label>
              <input type="text" required className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input type="password" required className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg px-4 py-3 font-semibold transition-all transform hover:scale-[1.02] active:scale-100 shadow-lg">
              Sign In as Admin
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
