"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { Bell, CheckCircle2, Clock, AlertTriangle, RefreshCw } from "lucide-react";

const API = "http://localhost:5006";

function getLabel(t) {
  if (t.priorityLabel) return t.priorityLabel;
  const s = t.priorityScore || 0;
  return s >= 6 ? "High" : s >= 3 ? "Medium" : "Low";
}

function daysLeft(deadline) {
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
}

function urgencyLevel(task) {
  const days = daysLeft(task.deadline);
  const label = getLabel(task);
  if (label === "High" && days <= 1) return "critical";
  if (label === "High" && days <= 3) return "urgent";
  if (label === "High") return "high";
  if (label === "Medium" && days <= 2) return "warning";
  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dismissed_notifs") || "[]"); } catch { return []; }
  });

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

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem("dismissed_notifs", JSON.stringify(next));
  };

  const clearAll = () => {
    const ids = notifications.map(n => n._id);
    const next = [...dismissed, ...ids];
    setDismissed(next);
    localStorage.setItem("dismissed_notifs", JSON.stringify(next));
  };

  const notifications = tasks
    .filter(t => t.status !== "completed" && urgencyLevel(t) && !dismissed.includes(t._id))
    .sort((a, b) => {
      const order = { critical: 0, urgent: 1, high: 2, warning: 3 };
      return (order[urgencyLevel(a)] ?? 9) - (order[urgencyLevel(b)] ?? 9);
    });

  const levelConfig = {
    critical: { bg: "bg-red-500/10 border-red-500/40",   icon: "🚨", badge: "bg-red-500 text-white",     label: "CRITICAL",  text: "text-red-400"    },
    urgent:   { bg: "bg-orange-500/10 border-orange-500/40", icon: "⚠️", badge: "bg-orange-500 text-white", label: "URGENT",    text: "text-orange-400" },
    high:     { bg: "bg-amber-500/10 border-amber-500/30",  icon: "🔔", badge: "bg-amber-500 text-white",  label: "HIGH",      text: "text-amber-400"  },
    warning:  { bg: "bg-yellow-500/10 border-yellow-500/30",icon: "⏰", badge: "bg-yellow-600 text-white", label: "UPCOMING",  text: "text-yellow-400" },
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <NavBar />
      <main className="max-w-3xl mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Bell className="text-amber-400" /> Notifications
              {notifications.length > 0 && (
                <span className="text-sm bg-red-500 text-white px-2.5 py-0.5 rounded-full font-semibold animate-pulse">{notifications.length}</span>
              )}
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Urgent & high-priority task alerts</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchTasks} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-slate-800 border border-slate-700 transition-all">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            {notifications.length > 0 && (
              <button onClick={clearAll} className="text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 border border-slate-700 transition-all">
                Clear All
              </button>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-32">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-slate-700 rounded-2xl">
            <CheckCircle2 size={56} className="mx-auto mb-4 text-emerald-500 opacity-60" />
            <p className="text-xl font-semibold text-white mb-2">All Clear! 🎉</p>
            <p className="text-slate-400 text-sm">No urgent tasks right now. Great work!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(t => {
              const level = urgencyLevel(t);
              const cfg = levelConfig[level];
              const days = daysLeft(t.deadline);
              return (
                <div key={t._id} className={`border rounded-2xl p-5 ${cfg.bg} transition-all`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-2xl shrink-0">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                          <span className="text-xs text-slate-400">🔴 High Priority</span>
                        </div>
                        <p className="font-semibold text-white truncate">{t.title}</p>
                        {t.description && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{t.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Clock size={11} />
                            {days < 0 ? <span className="text-red-400 font-bold">Overdue by {Math.abs(days)} day{Math.abs(days) !== 1 ? "s" : ""}</span>
                              : days === 0 ? <span className="text-red-400 font-bold">Due TODAY</span>
                              : days === 1 ? <span className="text-orange-400 font-bold">Due TOMORROW</span>
                              : <span className={cfg.text + " font-semibold"}>Due in {days} days</span>}
                          </span>
                          <span>· {new Date(t.deadline).toLocaleDateString()}</span>
                          <span className="px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400 bg-amber-400/10">{t.status}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => dismiss(t._id)} className="shrink-0 text-slate-500 hover:text-white transition-colors text-lg leading-none">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* All High Priority Overview */}
        {!loading && (
          <div className="mt-8 bg-slate-800/40 border border-slate-700 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" /> All Active High Priority Tasks
            </h2>
            <div className="space-y-2">
              {tasks.filter(t => getLabel(t) === "High" && t.status !== "completed").length === 0
                ? <p className="text-slate-500 text-sm text-center py-4">No high priority tasks 🎉</p>
                : tasks.filter(t => getLabel(t) === "High" && t.status !== "completed").map(t => {
                  const days = daysLeft(t.deadline);
                  return (
                    <div key={t._id} className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-700/50 rounded-xl">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-medium text-white truncate">{t.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock size={11} /> {new Date(t.deadline).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-xs font-bold ${days <= 0 ? "text-red-400" : days <= 1 ? "text-orange-400" : days <= 3 ? "text-amber-400" : "text-slate-400"}`}>
                          {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d left`}
                        </p>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${t.status === "in-progress" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" : "text-amber-400 bg-amber-400/10 border-amber-400/20"}`}>{t.status}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
