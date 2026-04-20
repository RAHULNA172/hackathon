"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, LogOut, AlertTriangle, CheckCircle2, Clock, Users, ClipboardList, TrendingUp, Shield, FileText, Star, Zap, Pencil, Trash2, X } from "lucide-react";

const API = "http://localhost:5006";

function ScoreBar({ value, max = 100 }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct >= 70 ? "from-emerald-500 to-teal-400" : pct >= 40 ? "from-amber-500 to-orange-400" : "from-red-500 to-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full bg-gradient-to-r ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${pct >= 70 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-red-400"}`}>{value}</span>
    </div>
  );
}

const TABS = ["📊 Overview", "📈 Productivity", "⚠️ Inefficiencies", "📄 Report"];

export default function TeacherPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [viewCategory, setViewCategory] = useState(null); // 'total' | 'completed' | 'pending' | 'in-progress' | 'high' | 'overdue'
  const [editingTask, setEditingTask] = useState(null);

  const getToken = () => {
    if (typeof window === "undefined") return "";
    return JSON.parse(localStorage.getItem("user") || "{}").token || "";
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/teacher-stats`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.status === 403 || res.status === 401) { router.push("/teacher/login"); return; }
      const json = await res.json();
      setData(json);
    } catch { router.push("/teacher/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?.token || user?.role !== "teacher") { router.push("/teacher/login"); return; }
    load();
  }, [load, router]);

  const logout = () => { localStorage.clear(); router.push("/teacher/login"); };

  const deleteTask = async (id) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    await fetch(`${API}/api/admin/tasks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    load();
  };

  const saveTaskStatus = async (taskId, status) => {
    await fetch(`${API}/api/admin/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ status }),
    });
    setEditingTask(null);
    load();
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center"><div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-emerald-400 font-medium">Loading Teacher Module...</p></div>
    </div>
  );

  if (!data) return null;
  const { org, userStats, inefficiencies } = data;
  const allTasks = userStats.flatMap(u => u.tasks);

  const getFilteredTasks = () => {
    const now = new Date();
    if (viewCategory === 'total') return allTasks;
    if (viewCategory === 'completed') return allTasks.filter(t => t.status === 'completed');
    if (viewCategory === 'pending') return allTasks.filter(t => t.status === 'pending');
    if (viewCategory === 'in-progress') return allTasks.filter(t => t.status === 'in-progress');
    if (viewCategory === 'high') return allTasks.filter(t => t.priorityLabel === 'High');
    if (viewCategory === 'overdue') return allTasks.filter(t => new Date(t.deadline) < now && t.status !== 'completed');
    return [];
  };

  const severity = { critical: "text-red-400 bg-red-400/10 border-red-400/20", warning: "text-amber-400 bg-amber-400/10 border-amber-400/20", info: "text-blue-400 bg-blue-400/10 border-blue-400/20" };

  return (
    <div className="min-h-screen bg-slate-900 text-white" style={{ background: "radial-gradient(ellipse at 70% 10%, rgba(16,185,129,0.08) 0%, transparent 55%), #0f172a" }}>
      {/* Nav */}
      <nav className="bg-slate-800/60 backdrop-blur border-b border-slate-700 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg"><GraduationCap size={18} /></div>
          <div>
            <span className="font-bold text-white">Teacher Module</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/20">Org Analytics</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-all">🔄 Refresh</button>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-all"><LogOut size={14} /> Logout</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Tab Bar */}
        <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`flex-1 py-3 text-sm font-semibold transition-all ${tab === i ? "bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500" : "text-slate-400 hover:text-white hover:bg-slate-700/40"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Organization Dashboard</h2>
              <p className="text-slate-400 text-sm">System-wide task statistics across all users · Click cards to manage tasks</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { type: 'total',       label: "Total Tasks",    value: org.total,            icon: <ClipboardList size={22} className="text-white" />, border: "border-slate-700",      bg: "from-purple-500 to-pink-500"   },
                { type: 'completed',   label: "Completed",      value: org.completed,        icon: <CheckCircle2  size={22} className="text-white" />, border: "border-emerald-500/20", bg: "from-emerald-500 to-teal-500"  },
                { type: 'pending',     label: "Pending",        value: org.pending,          icon: <Clock         size={22} className="text-white" />, border: "border-amber-500/20",   bg: "from-amber-500 to-orange-500"  },
                { type: 'in-progress', label: "In Progress",    value: org.inProgress,       icon: <TrendingUp    size={22} className="text-white" />, border: "border-blue-500/20",    bg: "from-blue-500 to-cyan-500"     },
                { type: 'high',        label: "High Priority",  value: org.highPri,          icon: <Zap           size={22} className="text-white" />, border: "border-red-500/20",     bg: "from-red-500 to-orange-500"    },
                { type: 'overdue',     label: "Overdue",        value: org.overdue,          icon: <AlertTriangle size={22} className="text-white" />, border: "border-rose-500/20",    bg: "from-rose-600 to-red-700"      },
              ].map(s => (
                <button key={s.label} onClick={() => setViewCategory(viewCategory === s.type ? null : s.type)}
                  className={`bg-slate-800/40 border rounded-2xl p-4 text-left transition-all hover:scale-[1.03] hover:border-slate-500 ${viewCategory === s.type ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10" : s.border}`}>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.bg} flex items-center justify-center mb-3 shadow-lg`}>{s.icon}</div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </button>
              ))}
            </div>

            {/* Inline Task Manager for Selected Category */}
            {viewCategory && (
              <div className="bg-slate-800/40 border border-emerald-500/30 rounded-2xl p-5 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white capitalize flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full" /> {viewCategory.replace('-', ' ')} Tasks ({getFilteredTasks().length})
                  </h3>
                  <button onClick={() => setViewCategory(null)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-all"><X size={16} /></button>
                </div>
                {getFilteredTasks().length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No tasks in this category</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {getFilteredTasks().map(t => (
                      <div key={t._id} className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-700/50 rounded-xl group hover:border-emerald-500/30 transition-all">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{t.title}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">👤 {t.assignedTo?.username}</span>
                            <span>·</span>
                            <span className={t.priorityLabel === 'High' ? 'text-red-400' : 'text-slate-400'}>{t.priorityLabel}</span>
                            <span>·</span>
                            <span className={`${t.status === "completed" ? "text-emerald-400" : t.status === "in-progress" ? "text-blue-400" : "text-amber-400"}`}>{t.status}</span>
                            <span>·</span>
                            <span>📅 {new Date(t.deadline).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {editingTask === t._id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            {["pending", "in-progress", "completed"].map(s => (
                              <button key={s} onClick={() => saveTaskStatus(t._id, s)}
                                className={`px-2 py-1 rounded text-[10px] border transition-all ${t.status === s ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-700 text-slate-500 hover:text-white"}`}>{s}</button>
                            ))}
                            <button onClick={() => setEditingTask(null)} className="text-slate-500 hover:text-white ml-1">✕</button>
                          </div>
                        ) : (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => setEditingTask(t._id)} className="text-emerald-400 hover:bg-emerald-400/10 p-1.5 rounded-lg transition-all" title="Edit status"><Pencil size={14} /></button>
                            <button onClick={() => deleteTask(t._id)} className="text-red-400 hover:bg-red-400/10 p-1.5 rounded-lg transition-all" title="Delete task"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Overall completion rate */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-emerald-400 rounded-full" /> Completion Rate</h3>
                <div className="flex items-end gap-4 mb-3">
                  <p className={`text-5xl font-bold ${org.completionRate >= 70 ? "text-emerald-400" : org.completionRate >= 40 ? "text-amber-400" : "text-red-400"}`}>{org.completionRate}%</p>
                  <p className="text-slate-400 text-sm pb-2">{org.completed} of {org.total} tasks completed</p>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                  <div className={`h-4 rounded-full transition-all duration-1000 ${org.completionRate >= 70 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : org.completionRate >= 40 ? "bg-gradient-to-r from-amber-500 to-orange-400" : "bg-gradient-to-r from-red-500 to-rose-400"}`} style={{ width: `${org.completionRate}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  {[["Completed", org.completed, "text-emerald-400"], ["Pending", org.pending, "text-amber-400"], ["In Progress", org.inProgress, "text-blue-400"]].map(([l, v, c]) => (
                    <div key={l}><p className={`text-xl font-bold ${c}`}>{org.total > 0 ? Math.round((v / org.total) * 100) : 0}%</p><p className="text-xs text-slate-500">{l} ({v})</p></div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 space-y-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2"><span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" /> Risk Summary</h3>
                {[
                  { label: "Overdue tasks",       value: org.overdue,            c: org.overdue > 0 ? "text-red-400" : "text-emerald-400" },
                  { label: "High priority overdue",value: org.highPendingOverdue, c: org.highPendingOverdue > 0 ? "text-red-400" : "text-emerald-400" },
                  { label: "Users at risk",        value: inefficiencies.criticalUsers.length, c: inefficiencies.criticalUsers.length > 0 ? "text-amber-400" : "text-emerald-400" },
                  { label: "Top performers",       value: inefficiencies.topPerformers.length, c: "text-emerald-400" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="text-slate-400">{r.label}</span>
                    <span className={`font-bold ${r.c}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PRODUCTIVITY TAB ── */}
        {tab === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Productivity Analysis</h2>
                <p className="text-slate-400 text-sm">Task completion rate per user · Performance score = completion rate − penalties for overdue & unfinished high-priority tasks</p>
              </div>
            </div>

            {/* Daily Trend Chart (CSS-based) */}
            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400" /> Productivity Trend (Last 7 Days)
              </h3>
              <div className="flex items-end justify-between h-40 gap-2 px-2">
                {data.trend?.map((d, i) => {
                  const max = Math.max(...data.trend.map(x => x.completed), 1);
                  const h = (d.completed / max) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                      <div className="absolute -top-8 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.completed} done
                      </div>
                      <div className={`w-full rounded-t-lg bg-gradient-to-t from-emerald-500/20 to-emerald-500 transition-all duration-1000 ease-out`} style={{ height: `${h}%`, minHeight: d.completed > 0 ? '4px' : '0px' }} />
                      <span className="text-[10px] text-slate-500 mt-2 rotate-[-45deg] origin-top-left">{d.date.split('-').slice(1).join('/')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700 grid grid-cols-12 text-xs text-slate-400 uppercase font-semibold">
                <span className="col-span-3">User / Team</span>
                <span className="col-span-2 text-center">Tasks</span>
                <span className="col-span-2 text-center">Done</span>
                <span className="col-span-2 text-center">Overdue</span>
                <span className="col-span-3">Performance</span>
              </div>
              {userStats.length === 0 ? (
                <p className="text-center py-12 text-slate-500">No users found</p>
              ) : userStats.map((u, i) => (
                <div key={u._id} className={`px-6 py-4 grid grid-cols-12 items-center border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors ${i === 0 ? "bg-emerald-500/5" : ""}`}>
                  <div className="col-span-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${i === 0 ? "bg-yellow-400/20 text-yellow-400" : "bg-slate-700 text-slate-300"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : u.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{u.username}</p>
                      <p className="text-xs text-slate-500">🏷️ {u.teamName}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-center"><p className="text-white font-bold">{u.total}</p><p className="text-xs text-slate-500">total</p></div>
                  <div className="col-span-2 text-center">
                    <p className={`font-bold ${u.completionRate >= 70 ? "text-emerald-400" : u.completionRate >= 40 ? "text-amber-400" : "text-red-400"}`}>{u.completionRate}%</p>
                    <p className="text-xs text-slate-500">{u.completed} tasks</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className={`font-bold ${u.overdue > 0 ? "text-red-400" : "text-emerald-400"}`}>{u.overdue}</p>
                    <p className="text-xs text-slate-500">overdue</p>
                  </div>
                  <div className="col-span-3"><ScoreBar value={u.performanceScore} /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── INEFFICIENCIES TAB ── */}
        {tab === 2 && (
          <div className="space-y-6">
            <div><h2 className="text-xl font-bold text-white mb-1">Inefficiency Detection</h2>
              <p className="text-slate-400 text-sm">Identifies bottlenecks: overdue tasks, excessive pending, high-priority not completed</p></div>
            {inefficiencies.criticalUsers.length === 0 && inefficiencies.overdueUsers.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-emerald-500/30 rounded-2xl">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-emerald-400 font-semibold">No Inefficiencies Detected</p>
                <p className="text-slate-500 text-sm mt-1">All users are performing well</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userStats.filter(u => u.flags.length > 0).map(u => (
                  <div key={u._id} className={`bg-slate-800/40 border rounded-2xl p-5 ${u.flags.some(f => f.severity === "critical") ? "border-red-500/30" : "border-amber-500/30"}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center font-bold text-white">{u.username[0]?.toUpperCase()}</div>
                      <div>
                        <p className="font-semibold text-white">{u.username}</p>
                        <p className="text-xs text-slate-400">🏷️ {u.teamName} · Score: {u.performanceScore}/100</p>
                      </div>
                      <div className="ml-auto flex gap-2 flex-wrap">
                        {u.flags.map((f, fi) => (
                          <span key={fi} className={`px-2 py-0.5 rounded-full text-xs border font-medium ${severity[f.severity]}`}>{f.label}</span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-center text-xs">
                      {[["Total", u.total, "text-white"], ["Completed", u.completed, "text-emerald-400"], ["Pending", u.pending, "text-amber-400"], ["Overdue", u.overdue, u.overdue > 0 ? "text-red-400" : "text-slate-500"]].map(([l, v, c]) => (
                        <div key={l} className="bg-slate-900/50 rounded-xl p-2"><p className={`text-lg font-bold ${c}`}>{v}</p><p className="text-slate-500">{l}</p></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PERFORMANCE REPORT TAB ── */}
        {tab === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-bold text-white mb-1">Performance Report</h2>
                <p className="text-slate-400 text-sm">Auto-generated summary · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p></div>
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg">
                <FileText size={15} /> Export / Print
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Tasks",        value: org.total,              icon: "📋", color: "from-purple-500 to-pink-500" },
                { label: "Completion Rate",    value: `${org.completionRate}%`, icon: "✅", color: "from-emerald-500 to-teal-500" },
                { label: "Top Performers",     value: inefficiencies.topPerformers.length, icon: "⭐", color: "from-amber-400 to-yellow-500" },
                { label: "Need Attention",     value: inefficiencies.criticalUsers.length, icon: "⚠️", color: "from-red-500 to-rose-500" },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5 text-center">
                  <p className="text-3xl mb-1">{s.icon}</p>
                  <p className={`text-3xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Performance Summary Text */}
            <div className="bg-slate-800/40 border border-emerald-500/20 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Shield size={16} className="text-emerald-400" /> Executive Performance Summary
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed italic">
                "{data.summary}"
              </p>
            </div>

            {/* Top performers */}
            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2"><Star size={16} className="text-yellow-400" /> Top Performing Users</h3>
              {inefficiencies.topPerformers.length === 0 ? (
                <p className="text-slate-500 text-sm">No users have reached 70%+ performance yet</p>
              ) : (
                <div className="space-y-3">
                  {inefficiencies.topPerformers.slice(0, 5).map((u, i) => (
                    <div key={u._id} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-xl">
                      <span className="text-xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-white text-sm">{u.username} <span className="text-slate-500 text-xs">· {u.teamName}</span></p>
                        <p className="text-xs text-slate-400">{u.completed}/{u.total} tasks · {u.completionRate}% rate</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-bold">{u.performanceScore}</p>
                        <p className="text-xs text-slate-500">score</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Under-performers */}
            {inefficiencies.underPerformers.length > 0 && (
              <div className="bg-slate-800/40 border border-red-500/20 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2"><AlertTriangle size={16} className="text-red-400" /> Users Needing Support</h3>
                <div className="space-y-3">
                  {inefficiencies.underPerformers.map(u => (
                    <div key={u._id} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-xl border border-red-500/10">
                      <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center font-bold">{u.username[0]?.toUpperCase()}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-white text-sm">{u.username} <span className="text-slate-500 text-xs">· {u.teamName}</span></p>
                        <p className="text-xs text-slate-400">{u.completed}/{u.total} tasks · {u.overdue} overdue</p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-400 font-bold">{u.performanceScore}</p>
                        <p className="text-xs text-slate-500">score</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full user table */}
            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700">
                <h3 className="text-base font-semibold text-white">Complete User Performance Table</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="text-left px-5 py-3">User</th>
                      <th className="text-left px-5 py-3">Team</th>
                      <th className="text-center px-4 py-3">Total</th>
                      <th className="text-center px-4 py-3">Done</th>
                      <th className="text-center px-4 py-3">Pending</th>
                      <th className="text-center px-4 py-3">Overdue</th>
                      <th className="text-center px-4 py-3">Rate</th>
                      <th className="text-center px-4 py-3">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {userStats.map(u => (
                      <tr key={u._id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-5 py-3 font-medium text-white">{u.username}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{u.teamName}</td>
                        <td className="px-4 py-3 text-center text-white font-bold">{u.total}</td>
                        <td className="px-4 py-3 text-center text-emerald-400 font-bold">{u.completed}</td>
                        <td className="px-4 py-3 text-center text-amber-400 font-bold">{u.pending}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${u.overdue > 0 ? "text-red-400" : "text-slate-500"}`}>{u.overdue}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${u.completionRate >= 70 ? "text-emerald-400" : u.completionRate >= 40 ? "text-amber-400" : "text-red-400"}`}>{u.completionRate}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${u.performanceScore >= 70 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : u.performanceScore >= 40 ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : "text-red-400 bg-red-400/10 border-red-400/20"}`}>{u.performanceScore}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
