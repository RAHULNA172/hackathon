"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Users, Mail, ShieldCheck } from "lucide-react";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [teamName, setTeamName] = useState("");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:5006/api/auth/send-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send code");
      
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:5006/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: "user", teamName, email, verificationCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      router.push("/dashboard");
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
            Join the Team
          </h1>
          <p className="text-slate-400 text-center mb-8 text-sm">Create your account to start prioritizing</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">{error}</div>
          )}

          <form onSubmit={step === 1 ? handleSendCode : handleRegister} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Username</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="text" required
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                        value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Password</label>
                    <input type="password" required
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                      value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Team Name</label>
                  <div className="relative">
                    <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" required
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                      value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Alpha Team, Design, etc." />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="email" required
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                      value={email} onChange={(e) => setEmail(e.target.value)} placeholder="yourname@example.com" />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white rounded-lg px-4 py-3 font-semibold transition-all transform hover:scale-[1.02] active:scale-100 shadow-lg disabled:opacity-50">
                  {loading ? "Sending Code..." : "Send Verification Code"}
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <p className="text-sm text-slate-400">We've sent a verification code to <strong className="text-white">{email}</strong>.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Verification Code</label>
                  <div className="relative">
                    <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" required
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600 text-center tracking-widest text-lg"
                      value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="000000" maxLength={6} />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white rounded-lg px-4 py-3 font-semibold transition-all transform hover:scale-[1.02] active:scale-100 shadow-lg disabled:opacity-50 mt-4">
                  {loading ? "Verifying..." : "Verify & Create Account"}
                </button>
                <button type="button" onClick={() => setStep(1)} className="w-full text-slate-400 hover:text-white text-sm mt-3 transition-colors">
                  Back to form
                </button>
              </>
            )}
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => router.push("/")} className="text-slate-400 hover:text-white text-sm transition-colors">
              Already have an account? <span className="text-blue-400 font-semibold underline decoration-2 underline-offset-4">Sign in</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
