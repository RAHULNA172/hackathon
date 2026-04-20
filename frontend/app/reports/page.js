"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { FileText, Clock, CheckCircle2, TrendingUp, AlertTriangle, Calendar, RefreshCw, Download } from "lucide-react";

const API = "http://localhost:5006";

function getLabel(t) {
  if (t.priorityLabel) return t.priorityLabel;
  const s = t.priorityScore || 0;
  return s >= 6 ? "High" : s >= 3 ? "Medium" : "Low";
}

function daysLeft(deadline) {
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5">
      <p className={`text-3xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{value}</p>
      <p className="text-sm text-white font-medium mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("all");

  const fetchTasks = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    setLoading(true);
    fetch(`${API}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setTasks(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const filterByRange = (tasks) => {
    if (timeRange === "all") return tasks;
    const now = new Date();
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return tasks.filter(t => new Date(t.createdAt || t.deadline) >= cutoff);
  };

  const filtered = filterByRange(tasks);
  const total = filtered.length;
  const completed = filtered.filter(t => t.status === "completed").length;
  const inProgress = filtered.filter(t => t.status === "in-progress").length;
  const pending = filtered.filter(t => t.status === "pending").length;
  const high = filtered.filter(t => getLabel(t) === "High").length;
  const medium = filtered.filter(t => getLabel(t) === "Medium").length;
  const low = filtered.filter(t => getLabel(t) === "Low").length;
  const overdue = filtered.filter(t => daysLeft(t.deadline) < 0 && t.status !== "completed").length;
  const dueToday = filtered.filter(t => daysLeft(t.deadline) === 0 && t.status !== "completed").length;
  const dueSoon = filtered.filter(t => daysLeft(t.deadline) > 0 && daysLeft(t.deadline) <= 3 && t.status !== "completed").length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const avgScore = total > 0 ? (filtered.reduce((s, t) => s + (t.priorityScore || 0), 0) / total).toFixed(2) : "0.00";

  const downloadReport = () => {
    const lines = [
      "TIME MANAGEMENT — TASK REPORT",
      `Generated: ${new Date().toLocaleString()}`,
      `Period: ${timeRange === "all" ? "All Time" : timeRange === "7d" ? "Last 7 Days" : timeRange === "30d" ? "Last 30 Days" : "Last 90 Days"}`,
      "",
      "=== SUMMARY ===",
      `Total Tasks: ${total}`,
      `Completed: ${completed} (${completionRate}%)`,
      `In Progress: ${inProgress}`,
      `Pending: ${pending}`,
      `Overdue: ${overdue}`,
      "",
      "=== PRIORITY BREAKDOWN ===",
      `High: ${high}`, `Medium: ${medium}`, `Low: ${low}`,
      `Avg Priority Score: ${avgScore}`,
      "",
      "=== TASK DETAILS ===",
      ...filtered.map(t => `[${getLabel(t)}] ${t.title} | Status: ${t.status} | Deadline: ${new Date(t.deadline).toLocaleDateString()} | Score: ${(t.priorityScore || 0).toFixed(2)}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `time-management-report-${new Date().toISOString().split("T")[0]}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <NavBar />
      <main className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3"><FileText className="text-purple-400" /> Reports</h1>
            <p className="text-slate-400 mt-1 text-sm">Full task performance and timing report</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              {[["all", "All Time"], ["7d", "7 Days"], ["30d", "30 Days"], ["90d", "90 Days"]].map(([v, l]) => (
                <button key={v} onClick={() => setTimeRange(v)}
                  className={`px-3 py-2 text-xs font-medium transition-all ${timeRange === v ? "bg-purple-500 text-white" : "text-slate-400 hover:text-white"}`}>{l}</button>
              ))}
            </div>
            <button onClick={fetchTasks} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition-all">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={downloadReport} className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded-lg transition-all font-medium">
              <Download size={14} /> Download
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-32"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Tasks" value={total} color="from-blue-500 to-cyan-500" />
              <StatCard label="Completion Rate" value={`${completionRate}%`} sub={`${completed} of ${total} done`} color="from-emerald-500 to-teal-500" />
              <StatCard label="Avg Priority Score" value={avgScore} color="from-purple-500 to-pink-500" />
              <StatCard label="Overdue Tasks" value={overdue} sub={overdue > 0 ? "Needs attention!" : "All on track"} color={overdue > 0 ? "from-red-500 to-orange-500" : "from-slate-500 to-slate-400"} />
            </div>

            {/* Time Alerts */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Overdue", value: overdue, icon: "🚨", c: "border-red-500/30 bg-red-500/5 text-red-400" },
                { label: "Due Today", value: dueToday, icon: "⚠️", c: "border-orange-500/30 bg-orange-500/5 text-orange-400" },
                { label: "Due in 3 Days", value: dueSoon, icon: "⏰", c: "border-amber-500/30 bg-amber-500/5 text-amber-400" },
              ].map(s => (
                <div key={s.label} className={`border rounded-xl p-4 text-center ${s.c}`}>
                  <p className="text-3xl mb-1">{s.icon}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs opacity-70 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Priority */}
              <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2"><AlertTriangle size={16} className="text-red-400" /> Priority Breakdown</h2>
                <div className="space-y-3">
                  {[
                    { label: "🔴 High",   value: high,   bar: "from-red-500 to-orange-500",   text: "text-red-400"     },
                    { label: "🟠 Medium", value: medium, bar: "from-orange-500 to-amber-400", text: "text-orange-400"  },
                    { label: "🟢 Low",    value: low,    bar: "from-emerald-500 to-teal-400", text: "text-emerald-400" },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-300">{s.label}</span>
                        <span className={`font-bold ${s.text}`}>{s.value} <span className="text-slate-500">({total ? Math.round((s.value / total) * 100) : 0}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div className={`bg-gradient-to-r ${s.bar} h-2.5 rounded-full transition-all duration-1000`} style={{ width: `${total ? (s.value / total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-blue-400" /> Task Status</h2>
                <div className="space-y-3">
                  {[
                    { label: "✅ Completed",   value: completed,  bar: "from-emerald-500 to-teal-400",  text: "text-emerald-400" },
                    { label: "🔵 In Progress", value: inProgress, bar: "from-blue-500 to-cyan-400",     text: "text-blue-400"    },
                    { label: "🟠 Pending",     value: pending,    bar: "from-orange-500 to-amber-400",  text: "text-orange-400"  },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-300">{s.label}</span>
                        <span className={`font-bold ${s.text}`}>{s.value} <span className="text-slate-500">({total ? Math.round((s.value / total) * 100) : 0}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div className={`bg-gradient-to-r ${s.bar} h-2.5 rounded-full transition-all duration-1000`} style={{ width: `${total ? (s.value / total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Full Task Table */}
            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-base font-semibold text-white flex items-center gap-2"><Calendar size={16} className="text-purple-400" /> Full Task Report ({total})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="text-left px-5 py-3">Task</th>
                      <th className="text-left px-5 py-3">Priority</th>
                      <th className="text-left px-5 py-3">Score</th>
                      <th className="text-left px-5 py-3">Status</th>
                      <th className="text-left px-5 py-3">Deadline</th>
                      <th className="text-left px-5 py-3">Time Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-slate-500 py-10">No tasks in this period</td></tr>
                    )}
                    {filtered.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)).map(t => {
                      const lbl = getLabel(t);
                      const days = daysLeft(t.deadline);
                      return (
                        <tr key={t._id} className="hover:bg-slate-700/20 transition-colors">
                          <td className="px-5 py-3 font-medium text-white max-w-xs">
                            <p className="truncate">{t.title}</p>
                            {t.description && <p className="text-xs text-slate-500 truncate">{t.description}</p>}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${lbl === "High" ? "text-red-400 bg-red-400/10 border-red-400/20" : lbl === "Medium" ? "text-orange-400 bg-orange-400/10 border-orange-400/20" : "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"}`}>
                              {lbl === "High" ? "🔴" : lbl === "Medium" ? "🟠" : "🟢"} {lbl}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono text-slate-300 text-xs">{(t.priorityScore || 0).toFixed(2)}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs border ${t.status === "completed" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : t.status === "in-progress" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" : "text-amber-400 bg-amber-400/10 border-amber-400/20"}`}>{t.status}</span>
                          </td>
                          <td className="px-5 py-3 text-slate-400 text-xs">{new Date(t.deadline).toLocaleDateString()}</td>
                          <td className="px-5 py-3 text-xs font-semibold">
                            {t.status === "completed"
                              ? <span className="text-emerald-400">✅ Done</span>
                              : days < 0 ? <span className="text-red-400">{Math.abs(days)}d overdue</span>
                              : days === 0 ? <span className="text-orange-400 animate-pulse">Due Today</span>
                              : days === 1 ? <span className="text-amber-400">Tomorrow</span>
                              : <span className="text-slate-400">{days} days</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
