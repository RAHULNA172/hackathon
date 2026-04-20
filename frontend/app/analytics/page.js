"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { BarChart2, CheckCircle2, Clock, AlertTriangle, Zap, TrendingUp, RefreshCw } from "lucide-react";

const API = "http://localhost:5006";

function getLabel(task) {
  if (task.priorityLabel) return task.priorityLabel;
  const s = task.priorityScore || 0;
  return s >= 6 ? "High" : s >= 3 ? "Medium" : "Low";
}

function PriorityDonut({ high, medium, low }) {
  const total = high + medium + low || 1;
  const r = 52; const cx = 70; const cy = 70;
  const circ = 2 * Math.PI * r;
  const highLen = (high / total) * circ;
  const medLen = (medium / total) * circ;
  const lowLen = (low / total) * circ;
  const highPct = Math.round((high / total) * 100);
  const medPct = Math.round((medium / total) * 100);
  const lowPct = 100 - highPct - medPct;
  const segments = [
    { len: lowLen, color: "#22c55e", offset: 0 },
    { len: medLen, color: "#f97316", offset: lowLen },
    { len: highLen, color: "#ef4444", offset: lowLen + medLen },
  ];
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="16" />
          {segments.map((s, i) => s.len > 0 && (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="16"
              strokeDasharray={`${s.len} ${circ}`} strokeDashoffset={-s.offset}
              className="transition-all duration-1000" />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white">{high + medium + low}</span>
          <span className="text-xs text-slate-400">Total</span>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {[
          { label: "🔴 High", pct: highPct, count: high, bar: "from-red-500 to-red-600", text: "text-red-400" },
          { label: "🟠 Medium", pct: medPct, count: medium, bar: "from-orange-500 to-amber-500", text: "text-orange-400" },
          { label: "🟢 Low", pct: lowPct, count: low, bar: "from-green-500 to-emerald-500", text: "text-green-400" },
        ].map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300 font-medium">{s.label}</span>
              <span className={`font-bold ${s.text}`}>{s.pct}% <span className="text-slate-500 font-normal">({s.count})</span></span>
            </div>
            <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
              <div className={`bg-gradient-to-r ${s.bar} h-2 rounded-full transition-all duration-1000`} style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState("All");

  const fetchTasks = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    setLoading(true);
    fetch(`${API}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setTasks(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    fetchTasks();
    // Auto-refresh when tab becomes visible
    const onFocus = () => fetchTasks();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchTasks]);

  const total = tasks.length;
  const high = tasks.filter(t => getLabel(t) === "High").length;
  const medium = tasks.filter(t => getLabel(t) === "Medium").length;
  const low = tasks.filter(t => getLabel(t) === "Low").length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const inProgress = tasks.filter(t => t.status === "in-progress").length;
  const pending = tasks.filter(t => t.status === "pending").length;
  const avgScore = total ? (tasks.reduce((s, t) => s + (t.priorityScore || 0), 0) / total).toFixed(2) : "0.00";

  const filteredTasks = priorityFilter === "All" ? tasks : tasks.filter(t => getLabel(t) === priorityFilter);

  const priorityBadge = (label) => {
    if (label === "High") return "text-red-400 bg-red-400/10 border-red-400/20";
    if (label === "Medium") return "text-orange-400 bg-orange-400/10 border-orange-400/20";
    return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <NavBar />
      <main className="max-w-6xl mx-auto p-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3"><BarChart2 className="text-blue-400" /> My Analytics</h1>
            <p className="text-slate-400 mt-1 text-sm">Your personal task performance at a glance</p>
          </div>
          <button onClick={fetchTasks} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-slate-800 border border-slate-700 transition-all">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : total === 0 ? (
          <div className="text-center py-24 border border-dashed border-slate-700 rounded-2xl text-slate-500">
            <BarChart2 size={48} className="mx-auto mb-3 opacity-30" />
            No tasks yet. Create some tasks in your dashboard!
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Tasks",   value: total,     color: "from-blue-500 to-cyan-500"     },
                { label: "Avg Score",     value: avgScore,  color: "from-purple-500 to-pink-500"   },
                { label: "Completed",     value: completed, color: "from-emerald-500 to-teal-500"  },
                { label: "High Priority", value: high,      color: "from-red-500 to-orange-500"    },
              ].map((s) => (
                <div key={s.label} className="bg-slate-800/40 border border-slate-700 rounded-xl p-5">
                  <p className={`text-3xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-blue-400 rounded-full" /> Priority Distribution</h2>
                <PriorityDonut high={high} medium={medium} low={low} />
              </div>
              <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-blue-400" /> Task Status</h2>
                <div className="space-y-3">
                  {[
                    { label: "✅ Completed",   value: completed,  color: "from-emerald-500 to-teal-400",  text: "text-emerald-400" },
                    { label: "🔵 In Progress", value: inProgress, color: "from-blue-500 to-cyan-400",     text: "text-blue-400"    },
                    { label: "🟠 Pending",     value: pending,    color: "from-orange-500 to-amber-400",  text: "text-orange-400"  },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">{s.label}</span>
                        <span className={`font-bold ${s.text}`}>{s.value} <span className="text-slate-500">({total ? Math.round((s.value/total)*100) : 0}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-700/60 rounded-full h-2.5 overflow-hidden">
                        <div className={`bg-gradient-to-r ${s.color} h-2.5 rounded-full transition-all duration-1000`} style={{ width: `${total ? (s.value/total)*100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[
                    { label: "Done",    v: completed,  c: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
                    { label: "Active",  v: inProgress, c: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
                    { label: "Waiting", v: pending,    c: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
                  ].map(s => (
                    <div key={s.label} className={`text-center py-2 rounded-xl border ${s.c}`}>
                      <p className="text-lg font-bold">{s.v}</p>
                      <p className="text-xs opacity-70">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* All Tasks with Priority Filter */}
            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" /> Task List
                  <span className="text-slate-500 font-normal text-sm">({filteredTasks.length})</span>
                </h2>
                {/* Filter Pills */}
                <div className="flex gap-2">
                  {["All", "High", "Medium", "Low"].map(f => (
                    <button key={f} onClick={() => setPriorityFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        priorityFilter === f
                          ? f === "High" ? "bg-red-500 border-red-500 text-white"
                          : f === "Medium" ? "bg-orange-500 border-orange-500 text-white"
                          : f === "Low" ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-blue-500 border-blue-500 text-white"
                          : "bg-transparent border-slate-600 text-slate-400 hover:text-white"
                      }`}>{f}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredTasks.map(t => {
                  const lbl = getLabel(t);
                  return (
                    <div key={t._id} className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-700/50 rounded-xl hover:bg-slate-900/60 transition-colors">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-medium text-white truncate">{t.title}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <Clock size={11} /> {new Date(t.deadline).toLocaleDateString()}
                          <span className={`px-1.5 py-0.5 rounded border text-xs ${t.status==="completed"?"text-emerald-400 bg-emerald-400/10 border-emerald-400/20":t.status==="in-progress"?"text-blue-400 bg-blue-400/10 border-blue-400/20":"text-amber-400 bg-amber-400/10 border-amber-400/20"}`}>{t.status}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs border font-semibold ${priorityBadge(lbl)}`}>
                          {lbl === "High" ? "🔴" : lbl === "Medium" ? "🟠" : "🟢"} {lbl}
                        </span>
                        <span className="text-slate-500 font-mono text-xs">{(t.priorityScore||0).toFixed(1)}</span>
                      </div>
                    </div>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No {priorityFilter !== "All" ? priorityFilter : ""} tasks found</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
