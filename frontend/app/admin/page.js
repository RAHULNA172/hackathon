"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Users, ClipboardList, CheckCircle2, Clock, Trash2, LogOut, Shield, LayoutDashboard, X, Plus, Pencil, UserPlus } from "lucide-react";

const API = "http://localhost:5006";

function getLabel(t) {
  if (t.priorityLabel) return t.priorityLabel;
  const s = t.priorityScore || 0;
  return s >= 6 ? "High" : s >= 3 ? "Medium" : "Low";
}

function priorityStyle(label) {
  if (label === "High") return "text-red-400 bg-red-400/10 border-red-400/20";
  if (label === "Medium") return "text-orange-400 bg-orange-400/10 border-orange-400/20";
  return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
}

function DonutChart({ high, medium, low }) {
  const total = high + medium + low || 1;
  const r = 58; const cx = 70; const cy = 70;
  const circ = 2 * Math.PI * r;
  const highLen = (high / total) * circ;
  const medLen = (medium / total) * circ;
  const lowLen = (low / total) * circ;
  return (
    <div className="flex flex-col lg:flex-row items-center gap-8">
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="18" />
          {low > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth="18" strokeDasharray={`${lowLen} ${circ}`} strokeDashoffset={0} className="transition-all duration-1000" />}
          {medium > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f97316" strokeWidth="18" strokeDasharray={`${medLen} ${circ}`} strokeDashoffset={-lowLen} className="transition-all duration-1000" />}
          {high > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="18" strokeDasharray={`${highLen} ${circ}`} strokeDashoffset={-(lowLen + medLen)} className="transition-all duration-1000" />}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{high + medium + low}</span>
          <span className="text-xs text-slate-400">Tasks</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 flex-1 w-full">
        {[
          { label: "🔴 High", pct: (high / total * 100), count: high, bar: "from-red-500 to-orange-500", text: "text-red-400" },
          { label: "🟠 Medium", pct: (medium / total * 100), count: medium, bar: "from-orange-500 to-amber-400", text: "text-orange-400" },
          { label: "🟢 Low", pct: (low / total * 100), count: low, bar: "from-emerald-500 to-teal-400", text: "text-emerald-400" },
        ].map(s => (
          <div key={s.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">{s.label}</span>
              <span className={`font-bold ${s.text}`}>{s.pct.toFixed(1)}% <span className="text-slate-400 font-normal">({s.count})</span></span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div className={`bg-gradient-to-r ${s.bar} h-2.5 rounded-full transition-all duration-1000`} style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Drawer({ open, onClose, title, children }) {
  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} />
      <div className={`fixed top-0 right-0 h-full w-full max-w-lg bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/80 shrink-0">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-all"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">{children}</div>
      </div>
    </>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [drawerTab, setDrawerTab] = useState(null);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "user", teamName: "" });
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [assignForm, setAssignForm] = useState({ title: "", description: "", deadline: "", businessImpact: 6, effortFactor: 6, assignedTo: "" });
  const [assignMsg, setAssignMsg] = useState("");
  const [msg, setMsg] = useState("");
  const [teamData, setTeamData] = useState([]);
  const [showTeamMonitor, setShowTeamMonitor] = useState(false);
  const [subAdminTab, setSubAdminTab] = useState("dashboard");
  const [showHighPriority, setShowHighPriority] = useState(false);

  const getToken = () => JSON.parse(localStorage.getItem("user") || "{}").token;

  const loadAll = useCallback(async (token) => {
    setLoading(true);
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [sRes, uRes, tRes, tmRes] = await Promise.all([
        fetch(`${API}/api/admin/stats`, { headers: h }),
        fetch(`${API}/api/admin/users`, { headers: h }),
        fetch(`${API}/api/admin/tasks`, { headers: h }),
        fetch(`${API}/api/admin/team-monitor`, { headers: h }),
      ]);
      const s = await sRes.json(); const u = await uRes.json(); const t = await tRes.json(); const tm = await tmRes.json();
      setStats(s); setUsers(u); setTasks(t); setTeamData(Array.isArray(tm) ? tm : []);
      return { users: u, tasks: t };
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?.token || (user?.role !== "admin" && user?.role !== "subadmin")) { router.push("/admin/login"); return; }
    loadAll(user.token);
  }, [loadAll]);

  const currentUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
  const isSuperAdmin = currentUser?.role === "admin";

  const refreshDrawer = async (type) => {
    const token = getToken();
    const { users: u, tasks: t } = await loadAll(token);
    const allTasks = Array.isArray(t) ? t : [];
    const allUsers = Array.isArray(u) ? u : [];
    if (type === "users") setDrawer(d => d ? { ...d, title: `👥 All Users (${allUsers.length})`, items: allUsers, type: "users" } : null);
    else if (type === "tasks") setDrawer(d => d ? { ...d, title: `📋 All Tasks (${allTasks.length})`, items: allTasks, type: "tasks" } : null);
    else if (type === "pending") { const f = allTasks.filter(t => t.status === "pending"); setDrawer(d => d ? { ...d, title: `⏳ Pending Tasks (${f.length})`, items: f, type: "tasks" } : null); }
    else if (type === "completed") { const f = allTasks.filter(t => t.status === "completed"); setDrawer(d => d ? { ...d, title: `✅ Completed Tasks (${f.length})`, items: f, type: "tasks" } : null); }
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user and their tasks?")) return;
    await fetch(`${API}/api/admin/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
    refreshDrawer("users");
  };

  const deleteTask = async (id) => {
    if (!confirm("Delete this task?")) return;
    await fetch(`${API}/api/admin/tasks/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
    if (drawer) refreshDrawer(drawer.drawerType);
  };

  const saveTaskStatus = async (taskId, status) => {
    await fetch(`${API}/api/admin/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ status }),
    });
    setEditingTask(null);
    loadAll(getToken());
    if (drawer) refreshDrawer(drawer.drawerType);
  };

  const saveUserRole = async (userId, role) => {
    await fetch(`${API}/api/admin/users/${userId}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ role }),
    });
    setEditingUser(null);
    refreshDrawer("users");
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.password) return;
    const res = await fetch(`${API}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      setShowAddUser(false);
      setNewUser({ username: "", password: "", role: "user", teamName: "" });
      setMsg("✅ User added!");
      setTimeout(() => setMsg(""), 3000);
      refreshDrawer("users");
    }
  };

  const assignTask = async () => {
    if (!assignForm.title || !assignForm.deadline || !assignForm.assignedTo) {
      setAssignMsg("❌ Please fill all required fields."); return;
    }
    const res = await fetch(`${API}/api/admin/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(assignForm),
    });
    if (res.ok) {
      setAssignForm({ title: "", description: "", deadline: "", businessImpact: 6, effortFactor: 6, assignedTo: "" });
      setShowAssignTask(false);
      setAssignMsg("✅ Task assigned!");
      setTimeout(() => setAssignMsg(""), 3000);
      loadAll(getToken());
    } else {
      const d = await res.json();
      setAssignMsg("❌ " + (d.message || "Error"));
    }
  };

  const openDrawer = (type) => {
    const pending = tasks.filter(t => t.status === "pending");
    const completed = tasks.filter(t => t.status === "completed");
    if (type === "users") setDrawer({ title: `👥 All Users (${users.length})`, items: users, type: "users", drawerType: "users" });
    else if (type === "tasks") setDrawer({ title: `📋 All Tasks (${tasks.length})`, items: tasks, type: "tasks", drawerType: "tasks" });
    else if (type === "pending") setDrawer({ title: `⏳ Pending Tasks (${pending.length})`, items: pending, type: "tasks", drawerType: "pending" });
    else if (type === "completed") setDrawer({ title: `✅ Completed Tasks (${completed.length})`, items: completed, type: "tasks", drawerType: "completed" });
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-purple-400 text-lg font-medium">Loading Admin Panel...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="bg-slate-800/60 backdrop-blur-md border-b border-slate-700 px-6 py-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-lg"><Shield size={18} /></div>
          <div>
            <span className="font-bold text-lg text-white">Admin Panel</span>
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border ${isSuperAdmin ? "text-purple-400 bg-purple-400/10 border-purple-400/20" : "text-amber-400 bg-amber-400/10 border-amber-400/20"}`}>
              {isSuperAdmin ? "Super Admin" : "Sub Admin"}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-all"><LayoutDashboard size={14} /> User Dashboard</button>
          <button onClick={() => { localStorage.clear(); router.push("/admin/login"); }} className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-all"><LogOut size={14} /> Logout</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-5 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shrink-0"><Shield size={22} /></div>
            <div>
              <h1 className="text-xl font-bold text-white">Welcome to Admin Side 👋</h1>
              <p className="text-slate-400 text-sm">Click any card to view, add, edit or delete — changes reflect immediately.</p>
              {assignMsg && <p className="text-sm mt-1 text-emerald-400">{assignMsg}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button onClick={() => setShowAssignTask(true)}
              className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg">
              <UserPlus size={16} /> Assign Task
            </button>
          </div>
        </div>
        {/* Sub Admin Tab Navigation */}
        {!isSuperAdmin && (
          <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden mb-6">
            {[
              { id: "dashboard", label: "📊 Dashboard", icon: null },
              { id: "team",      label: "👥 Team Monitoring", icon: null },
              { id: "report",    label: "📄 Report", icon: null },
            ].map(tab => (
              <button key={tab.id} onClick={() => setSubAdminTab(tab.id)}
                className={`flex-1 py-3 text-sm font-semibold transition-all ${subAdminTab === tab.id ? "bg-purple-500/20 text-purple-400 border-b-2 border-purple-500" : "text-slate-400 hover:text-white hover:bg-slate-700/40"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Assign Task Modal */}
        {showAssignTask && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus size={18} className="text-purple-400" /> Assign Task to User</h2>
                <button onClick={() => { setShowAssignTask(false); setAssignMsg(""); }} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Assign To *</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white" value={assignForm.assignedTo} onChange={e => setAssignForm(p => ({ ...p, assignedTo: e.target.value }))}>
                    <option value="">Select a user...</option>
                    {users.filter(u => u.role !== "admin").map(u => <option key={u._id} value={u._id}>{u.username}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Task Title *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder="e.g. Fix critical bug" value={assignForm.title} onChange={e => setAssignForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                  <textarea className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white resize-none" rows={2} placeholder="Optional task details..." value={assignForm.description} onChange={e => setAssignForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Deadline *</label>
                    <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white" value={assignForm.deadline} onChange={e => setAssignForm(p => ({ ...p, deadline: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">🎯 Impact</label>
                    <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white" value={assignForm.businessImpact} onChange={e => setAssignForm(p => ({ ...p, businessImpact: Number(e.target.value) }))}>
                      <option value={3}>🟢 Low</option>
                      <option value={6}>🟡 Medium</option>
                      <option value={9}>🔴 High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">⚡ Effort</label>
                    <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white" value={assignForm.effortFactor} onChange={e => setAssignForm(p => ({ ...p, effortFactor: Number(e.target.value) }))}>
                      <option value={3}>🟢 Low</option>
                      <option value={6}>🟡 Medium</option>
                      <option value={9}>🔴 High</option>
                    </select>
                  </div>
                </div>
                {assignMsg && <p className="text-sm text-red-400">{assignMsg}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={assignTask} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl py-2.5 font-semibold text-sm transition-all">⚡ Assign Task</button>
                  <button onClick={() => { setShowAssignTask(false); setAssignMsg(""); }} className="px-5 py-2.5 text-slate-400 hover:text-white border border-slate-700 rounded-xl text-sm transition-all">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stat Cards */}
        {/* ── DASHBOARD TAB (always for superadmin, conditionally for subadmin) ── */}
        {(isSuperAdmin || subAdminTab === "dashboard") && (
          <>
            {/* Stat Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {isSuperAdmin ? (
                  <button onClick={() => openDrawer("users")}
                    className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 flex items-center gap-4 hover:bg-slate-800/70 hover:border-slate-500 hover:scale-[1.02] transition-all text-left group cursor-pointer">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg"><Users size={20} /></div>
                    <div><p className="text-2xl font-bold text-white">{stats.totalUsers}</p><p className="text-xs text-slate-400">Total Users</p></div>
                  </button>
                ) : (
                  <button onClick={() => setShowHighPriority(v => !v)}
                    className="w-full bg-slate-800/40 border border-red-500/20 rounded-xl p-5 flex items-center gap-4 hover:bg-red-500/5 hover:border-red-500/40 hover:scale-[1.02] transition-all text-left cursor-pointer">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shrink-0 shadow-lg"><ClipboardList size={20} /></div>
                    <div><p className="text-2xl font-bold text-white">{stats.highTasks}</p><p className="text-xs text-slate-400">🔴 High Priority</p></div>
                  </button>
                )}
                {[
                  { label: "Total Tasks",  value: stats.totalTasks,    icon: <ClipboardList size={20} />, color: "from-purple-500 to-pink-500",  type: "tasks"    },
                  { label: "Pending",      value: stats.pendingTasks,  icon: <Clock size={20} />,         color: "from-amber-500 to-orange-500", type: "pending"  },
                  { label: "Completed",    value: stats.completedTasks,icon: <CheckCircle2 size={20} />,  color: "from-emerald-500 to-teal-500", type: "completed"},
                ].map((s) => (
                  <button key={s.label} onClick={() => openDrawer(s.type)}
                    className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 flex items-center gap-4 hover:bg-slate-800/70 hover:border-slate-500 hover:scale-[1.02] transition-all text-left group cursor-pointer">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0 shadow-lg`}>{s.icon}</div>
                    <div><p className="text-2xl font-bold text-white">{s.value}</p><p className="text-xs text-slate-400">{s.label}</p></div>
                  </button>
                ))}
              </div>
            )}

            {/* High Priority inline list — sub admin, toggled by card click */}
            {!isSuperAdmin && showHighPriority && (
              <div className="bg-slate-800/40 border border-red-500/20 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" /> 🔴 High Priority Tasks
                  </h2>
                  <button onClick={() => setShowHighPriority(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-all"><X size={14} /></button>
                </div>
                {tasks.filter(t => getLabel(t) === "High").length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">No high priority tasks</p>
                ) : (
                  <div className="space-y-2">
                    {tasks
                      .filter(t => getLabel(t) === "High")
                      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
                      .map(t => (
                        <div key={t._id} className="flex items-center gap-3 p-3 bg-slate-900/60 border border-red-500/10 rounded-xl group hover:border-red-500/30 transition-all">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm truncate">{t.title}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <span>👤 {t.assignedTo?.username || "—"}</span>
                              <span>· Score: {(t.priorityScore || 0).toFixed(2)}</span>
                              <span className={`${t.status === "completed" ? "text-emerald-400" : t.status === "in-progress" ? "text-blue-400" : "text-amber-400"}`}>· {t.status}</span>
                              <span className="text-slate-600">· 🏷️ {t.assignedTo?.teamName || "No Team"}</span>
                            </div>
                          </div>
                          {editingTask === t._id ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {["pending", "in-progress", "completed"].map(s => (
                                <button key={s} onClick={() => saveTaskStatus(t._id, s)}
                                  className={`px-2 py-1 rounded text-xs border transition-all ${t.status === s ? "bg-blue-500 border-blue-500 text-white" : "border-slate-600 text-slate-400 hover:text-white"}`}>{s}</button>
                              ))}
                              <button onClick={() => setEditingTask(null)} className="text-xs text-slate-500 hover:text-white px-1">✕</button>
                            </div>
                          ) : (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button onClick={() => setEditingTask(t._id)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 p-1.5 rounded-lg transition-all" title="Change status"><Pencil size={13} /></button>
                              <button onClick={() => deleteTask(t._id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1.5 rounded-lg transition-all" title="Delete task"><Trash2 size={13} /></button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Charts */}
            {stats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* LEFT chart: Priority Distribution for superadmin | Team Performance for subadmin */}
                <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
                  {isSuperAdmin ? (
                    <>
                      <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><span className="w-2 h-2 bg-purple-400 rounded-full" /> Priority Distribution</h2>
                      <DonutChart high={stats.highTasks} medium={stats.mediumTasks} low={stats.lowTasks} />
                    </>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><span className="w-2 h-2 bg-emerald-400 rounded-full" /> Team Performance</h2>
                      {teamData.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-10">No team data yet — assign tasks to users with team names</p>
                      ) : teamData.map(team => (
                        <div key={team.name} className="mb-5">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-white font-medium flex items-center gap-1">
                              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">{team.name[0]?.toUpperCase()}</span>
                              {team.name}
                              <span className="text-xs text-slate-500 font-normal">({team.memberCount} members)</span>
                            </span>
                            <span className={`font-bold ${team.completionRate >= 70 ? "text-emerald-400" : team.completionRate >= 40 ? "text-amber-400" : "text-red-400"}`}>
                              {team.completionRate}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div className={`h-3 rounded-full transition-all duration-1000 ${team.completionRate >= 70 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : team.completionRate >= 40 ? "bg-gradient-to-r from-amber-500 to-orange-400" : "bg-gradient-to-r from-red-500 to-rose-400"}`}
                              style={{ width: `${team.completionRate}%` }} />
                          </div>
                          <div className="flex gap-3 mt-1.5 text-xs text-slate-500">
                            <span>{team.total} total</span>
                            <span className="text-red-400">{team.high} high</span>
                            <span className="text-amber-400">{team.medium} med</span>
                            <span className="text-emerald-400">{team.low} low</span>
                            {team.overdue > 0 && <span className="text-red-300 animate-pulse">⚠️ {team.overdue} overdue</span>}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* RIGHT chart: Task Status (same for both roles) */}
                <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><span className="w-2 h-2 bg-blue-400 rounded-full" /> Task Status</h2>
                  <div className="flex gap-3 mb-4">
                    {[
                      { label: "Completed",   value: stats.completedTasks,  c: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
                      { label: "In Progress", value: stats.inProgressTasks, c: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
                      { label: "Pending",     value: stats.pendingTasks,    c: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
                    ].map(s => (
                      <div key={s.label} className={`flex-1 text-center py-2 px-3 rounded-xl border ${s.c}`}>
                        <p className="text-xl font-bold">{s.value}</p><p className="text-xs opacity-70">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {[
                    { label: "✅ Completed",   value: stats.completedTasks,  bar: "from-emerald-500 to-teal-400",  text: "text-emerald-400" },
                    { label: "🔵 In Progress", value: stats.inProgressTasks, bar: "from-blue-500 to-cyan-400",     text: "text-blue-400"    },
                    { label: "🟠 Pending",     value: stats.pendingTasks,    bar: "from-amber-500 to-orange-400",  text: "text-amber-400"   },
                  ].map(s => {
                    const t = (stats.completedTasks + stats.inProgressTasks + stats.pendingTasks) || 1;
                    return (
                      <div key={s.label} className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-300">{s.label}</span>
                          <span className={`font-bold ${s.text}`}>{((s.value / t) * 100).toFixed(1)}% ({s.value})</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                          <div className={`bg-gradient-to-r ${s.bar} h-2.5 rounded-full transition-all duration-1000`} style={{ width: `${(s.value / t) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </>
        )}

        {/* ── TEAM MONITORING TAB (sub admin only) ── */}
        {!isSuperAdmin && subAdminTab === "team" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Users size={20} className="text-emerald-400" /> Team Performance Monitoring</h2>
                <p className="text-slate-400 text-xs mt-0.5">High-impact tasks prioritized first · Real-time review</p>
              </div>
            </div>
            {teamData.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-slate-700 rounded-2xl text-slate-500">
                <p className="text-4xl mb-3">👥</p>
                <p className="font-medium">No teams yet</p>
                <p className="text-xs mt-1">Users need to enter a Team Name when registering at the login page</p>
              </div>
            ) : teamData.map(team => (
              <div key={team.name} className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-white shrink-0">{team.name[0]?.toUpperCase() || "T"}</div>
                    <div>
                      <p className="font-bold text-white">{team.name}</p>
                      <p className="text-xs text-slate-400">{team.memberCount} member{team.memberCount !== 1 ? "s" : ""}: {team.members.join(", ")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Completion</p>
                      <p className={`text-xl font-bold ${team.completionRate >= 70 ? "text-emerald-400" : team.completionRate >= 40 ? "text-amber-400" : "text-red-400"}`}>{team.completionRate}%</p>
                    </div>
                    <div className="flex gap-2 text-xs flex-wrap">
                      {team.high > 0 && <span className="px-2 py-1 rounded-full bg-red-400/10 text-red-400 border border-red-400/20 font-semibold">🔴 {team.high} High</span>}
                      {team.medium > 0 && <span className="px-2 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 font-semibold">🟠 {team.medium} Med</span>}
                      {team.low > 0 && <span className="px-2 py-1 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-semibold">🟢 {team.low} Low</span>}
                      {team.overdue > 0 && <span className="px-2 py-1 rounded-full bg-red-600/20 text-red-300 border border-red-600/30 font-semibold animate-pulse">⚠️ {team.overdue} Overdue</span>}
                    </div>
                  </div>
                </div>
                {team.tasks.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-6">No tasks assigned to this team</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
                        <tr>
                          <th className="text-left px-5 py-3">Task (High Impact First)</th>
                          <th className="text-left px-5 py-3">Assigned To</th>
                          <th className="text-left px-5 py-3">Priority</th>
                          <th className="text-left px-5 py-3">Score</th>
                          <th className="text-left px-5 py-3">Status</th>
                          <th className="text-left px-5 py-3">Time Left</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {team.tasks.map(t => {
                          const label = t.priorityLabel || (t.priorityScore >= 6 ? "High" : t.priorityScore >= 3 ? "Medium" : "Low");
                          const days = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                          return (
                            <tr key={t._id} className="hover:bg-slate-700/20 transition-colors">
                              <td className="px-5 py-3"><p className="font-medium text-white max-w-xs truncate">{t.title}</p>{t.description && <p className="text-xs text-slate-500 truncate">{t.description}</p>}</td>
                              <td className="px-5 py-3 text-slate-400 text-xs">{t.assignedTo?.username || "—"}</td>
                              <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${label === "High" ? "text-red-400 bg-red-400/10 border-red-400/20" : label === "Medium" ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"}`}>{label === "High" ? "🔴" : label === "Medium" ? "🟠" : "🟢"} {label}</span></td>
                              <td className="px-5 py-3 font-mono text-xs text-slate-400">{(t.priorityScore || 0).toFixed(2)}</td>
                              <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs border ${t.status === "completed" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : t.status === "in-progress" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" : "text-amber-400 bg-amber-400/10 border-amber-400/20"}`}>{t.status}</span></td>
                              <td className="px-5 py-3 text-xs font-semibold">{t.status === "completed" ? <span className="text-emerald-400">✅ Done</span> : days < 0 ? <span className="text-red-400">{Math.abs(days)}d overdue</span> : days === 0 ? <span className="text-orange-400 animate-pulse">Today</span> : <span className="text-slate-400">{days}d left</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── REPORT TAB (sub admin only) ── */}
        {!isSuperAdmin && subAdminTab === "report" && stats && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><ClipboardList size={20} className="text-purple-400" /> Admin Report</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Tasks",   value: tasks.length,                                            color: "from-purple-500 to-pink-500"  },
                { label: "Completion %",  value: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === "completed").length / tasks.length) * 100) + "%" : "0%", color: "from-emerald-500 to-teal-500" },
                { label: "High Priority", value: tasks.filter(t => (t.priorityLabel || "") === "High").length, color: "from-red-500 to-orange-500"    },
                { label: "Overdue",       value: tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== "completed").length, color: "from-rose-500 to-red-700" },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/40 border border-slate-700 rounded-xl p-5">
                  <p className={`text-3xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</p>
                  <p className="text-sm text-white font-medium mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700">
                <h3 className="text-base font-semibold text-white">All Tasks — Sorted by Priority Score</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
                    <tr><th className="text-left px-5 py-3">Task</th><th className="text-left px-5 py-3">Team</th><th className="text-left px-5 py-3">Priority</th><th className="text-left px-5 py-3">Score</th><th className="text-left px-5 py-3">Status</th><th className="text-left px-5 py-3">Deadline</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {[...tasks].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)).map(t => {
                      const label = t.priorityLabel || (t.priorityScore >= 6 ? "High" : t.priorityScore >= 3 ? "Medium" : "Low");
                      const days = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                      const team = t.assignedTo?.teamName || "No Team";
                      return (
                        <tr key={t._id} className="hover:bg-slate-700/20 transition-colors">
                          <td className="px-5 py-3"><p className="font-medium text-white truncate max-w-xs">{t.title}</p></td>
                          <td className="px-5 py-3 text-slate-400 text-xs">{team}</td>
                          <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${label === "High" ? "text-red-400 bg-red-400/10 border-red-400/20" : label === "Medium" ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"}`}>{label === "High" ? "🔴" : label === "Medium" ? "🟠" : "🟢"} {label}</span></td>
                          <td className="px-5 py-3 font-mono text-xs text-slate-400">{(t.priorityScore || 0).toFixed(2)}</td>
                          <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs border ${t.status === "completed" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : t.status === "in-progress" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" : "text-amber-400 bg-amber-400/10 border-amber-400/20"}`}>{t.status}</span></td>
                          <td className="px-5 py-3 text-xs font-semibold">{t.status === "completed" ? <span className="text-emerald-400">✅</span> : days < 0 ? <span className="text-red-400">{Math.abs(days)}d overdue</span> : days === 0 ? <span className="text-orange-400">Today</span> : <span className="text-slate-400">{days}d</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Drawer */}
      <Drawer open={!!drawer} onClose={() => { setDrawer(null); setShowAddUser(false); setEditingTask(null); setEditingUser(null); }} title={drawer?.title || ""}>
        {msg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg text-sm">{msg}</div>}

        {/* Users Drawer */}
        {drawer?.type === "users" && (
          <>
            {/* Add User — superadmin only */}
            {isSuperAdmin && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
                <button onClick={() => setDrawerTab(drawerTab === 'addUser' ? null : 'addUser')}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all border-b border-slate-700 ${drawerTab === 'addUser' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'}`}>
                  <Plus size={14} /> {drawerTab === 'addUser' ? 'Cancel' : 'Add New User'}
                </button>
                {drawerTab === 'addUser' && (
                  <div className="p-4 space-y-3">
                    <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Username" value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} />
                    <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                    <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Team Name (e.g. Alpha Team)" value={newUser.teamName} onChange={e => setNewUser(p => ({ ...p, teamName: e.target.value }))} />
                    <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                      <option value="user">👤 User</option>
                      <option value="subadmin">🔰 Sub Admin</option>
                      <option value="admin">🛡️ Super Admin</option>
                    </select>
                    <button onClick={() => { addUser(); setDrawerTab(null); }} className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold transition-all">Add User</button>
                  </div>
                )}
              </div>
            )}

            {drawer.items.map(u => (
              <div key={u._id} className="flex items-center gap-3 p-3 bg-slate-800/60 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${u.role === "admin" ? "bg-purple-500/20 text-purple-400" : u.role === "subadmin" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>{u.username[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{u.username}</p>
                  {editingUser === u._id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" defaultValue={u.role} onChange={e => saveUserRole(u._id, e.target.value)}>
                        <option value="user">👤 User</option>
                        <option value="subadmin">🔰 Sub Admin</option>
                        <option value="admin">🛡️ Super Admin</option>
                      </select>
                      <button onClick={() => setEditingUser(null)} className="text-xs text-slate-400">Cancel</button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      {u.role === "admin" ? "🛡️ Super Admin" : u.role === "subadmin" ? "🔰 Sub Admin" : "👤 User"}
                      {u.teamName ? <span className="ml-1 text-emerald-400 font-medium">· 🏷️ {u.teamName}</span> : null}
                      <span className="ml-1">· {new Date(u.createdAt).toLocaleDateString()}</span>
                    </p>
                  )}
                </div>
                {u.role !== "admin" && isSuperAdmin && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingUser(editingUser === u._id ? null : u._id)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 p-1.5 rounded-lg transition-all"><Pencil size={14} /></button>
                    <button onClick={() => deleteUser(u._id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1.5 rounded-lg transition-all"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Tasks Drawer */}
        {drawer?.type === "tasks" && (
          <>
            {drawer.items.map(t => (
              <div key={t._id} className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors group">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-white text-sm leading-snug flex-1 min-w-0">{t.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${priorityStyle(getLabel(t))}`}>
                      {getLabel(t) === "High" ? "🔴" : getLabel(t) === "Medium" ? "🟠" : "🟢"} {getLabel(t)}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingTask(editingTask === t._id ? null : t._id)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 p-1 rounded-lg transition-all"><Pencil size={13} /></button>
                      <button onClick={() => deleteTask(t._id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1 rounded-lg transition-all"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>

                {editingTask === t._id ? (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400">Change status:</span>
                    {["pending", "in-progress", "completed"].map(s => (
                      <button key={s} onClick={() => saveTaskStatus(t._id, s)}
                        className={`px-2 py-1 rounded text-xs border transition-all ${t.status === s ? "bg-blue-500 border-blue-500 text-white" : "border-slate-600 text-slate-400 hover:text-white"}`}>
                        {s}
                      </button>
                    ))}
                    <button onClick={() => setEditingTask(null)} className="text-xs text-slate-500 hover:text-white ml-auto">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1"><Clock size={11} /> {new Date(t.deadline).toLocaleDateString()}</span>
                    <span>· {t.assignedTo?.username || "Unknown"}</span>
                    <span className={`px-1.5 py-0.5 rounded border ${t.status === "completed" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : t.status === "in-progress" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" : "text-amber-400 bg-amber-400/10 border-amber-400/20"}`}>{t.status}</span>
                  </div>
                )}
              </div>
            ))}

            {drawer.items.length === 0 && (
              <div className="text-center py-16 text-slate-500"><p className="text-4xl mb-3">📭</p><p>No tasks here</p></div>
            )}
          </>
        )}
      </Drawer>

      {/* Team Monitor Modal */}
      {showTeamMonitor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-5xl shadow-2xl mt-4 mb-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users size={20} className="text-emerald-400" /> Team Performance Monitoring
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">High-impact tasks prioritized first · Real-time team review</p>
              </div>
              <button onClick={() => setShowTeamMonitor(false)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {teamData.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <p className="text-4xl mb-3">👥</p>
                  <p className="font-medium">No teams found</p>
                  <p className="text-xs mt-1">Users need to enter a team name when registering</p>
                </div>
              ) : teamData.map(team => (
                <div key={team.name} className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
                  {/* Team Header */}
                  <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-white shrink-0">
                        {team.name[0]?.toUpperCase() || "T"}
                      </div>
                      <div>
                        <p className="font-bold text-white">{team.name}</p>
                        <p className="text-xs text-slate-400">{team.memberCount} member{team.memberCount !== 1 ? "s" : ""}: {team.members.join(", ")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Completion bar */}
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Completion</p>
                        <p className={`text-lg font-bold ${team.completionRate >= 70 ? "text-emerald-400" : team.completionRate >= 40 ? "text-amber-400" : "text-red-400"}`}>
                          {team.completionRate}%
                        </p>
                      </div>
                      <div className="flex gap-2 text-xs">
                        {team.high > 0 && <span className="px-2 py-1 rounded-full bg-red-400/10 text-red-400 border border-red-400/20 font-semibold">🔴 {team.high} High</span>}
                        {team.medium > 0 && <span className="px-2 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 font-semibold">🟠 {team.medium} Med</span>}
                        {team.low > 0 && <span className="px-2 py-1 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-semibold">🟢 {team.low} Low</span>}
                        {team.overdue > 0 && <span className="px-2 py-1 rounded-full bg-red-600/20 text-red-300 border border-red-600/30 font-semibold animate-pulse">⚠️ {team.overdue} Overdue</span>}
                      </div>
                    </div>
                  </div>

                  {/* Tasks — sorted High → Medium → Low (highest priority first) */}
                  {team.tasks.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-6">No tasks assigned to this team</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
                          <tr>
                            <th className="text-left px-5 py-3">Task (High Impact First)</th>
                            <th className="text-left px-5 py-3">Assigned To</th>
                            <th className="text-left px-5 py-3">Priority</th>
                            <th className="text-left px-5 py-3">Score</th>
                            <th className="text-left px-5 py-3">Status</th>
                            <th className="text-left px-5 py-3">Deadline</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {team.tasks.map(t => {
                            const label = t.priorityLabel || (t.priorityScore >= 6 ? "High" : t.priorityScore >= 3 ? "Medium" : "Low");
                            const days = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                            return (
                              <tr key={t._id} className="hover:bg-slate-700/20 transition-colors">
                                <td className="px-5 py-3">
                                  <p className="font-medium text-white max-w-xs truncate">{t.title}</p>
                                  {t.description && <p className="text-xs text-slate-500 truncate">{t.description}</p>}
                                </td>
                                <td className="px-5 py-3 text-slate-400 text-xs">{t.assignedTo?.username || "—"}</td>
                                <td className="px-5 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${label === "High" ? "text-red-400 bg-red-400/10 border-red-400/20" : label === "Medium" ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"}`}>
                                    {label === "High" ? "🔴" : label === "Medium" ? "🟠" : "🟢"} {label}
                                  </span>
                                </td>
                                <td className="px-5 py-3 font-mono text-xs text-slate-400">{(t.priorityScore || 0).toFixed(2)}</td>
                                <td className="px-5 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-xs border ${t.status === "completed" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : t.status === "in-progress" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" : "text-amber-400 bg-amber-400/10 border-amber-400/20"}`}>{t.status}</span>
                                </td>
                                <td className="px-5 py-3 text-xs font-semibold">
                                  {t.status === "completed" ? <span className="text-emerald-400">✅ Done</span>
                                    : days < 0 ? <span className="text-red-400">{Math.abs(days)}d overdue</span>
                                    : days === 0 ? <span className="text-orange-400 animate-pulse">Today</span>
                                    : <span className="text-slate-400">{days}d left</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
