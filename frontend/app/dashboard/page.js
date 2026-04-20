"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import TaskForm from "@/components/TaskForm";
import { AlertCircle, CheckCircle2, Clock, Zap } from "lucide-react";

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5006/api/tasks", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:5006/api/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:5006/api/tasks/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:5006/api/tasks/${editingTask._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(editingTask)
      });
      if (res.ok) {
        setEditingTask(null);
        fetchTasks();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'in-progress': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar />
      
      <main className="max-w-6xl mx-auto p-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">AI Prioritized Workspace</h1>
          <p className="text-slate-400 mt-1">Tasks automatically sorted by impact, effort, and deadline.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <TaskForm onTaskAdded={() => fetchTasks()} />
          </div>

          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="text-slate-400 text-center py-12 animate-pulse">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="text-slate-400 text-center py-12 border border-dashed border-slate-700 rounded-xl">
                No tasks yet. Create one to see the AI engine in action.
              </div>
            ) : (
              tasks.map((task, idx) => (
                <div 
                  key={task._id} 
                  className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 hover:bg-slate-800/60 transition-all flex gap-4 items-start group relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${idx === 0 ? 'bg-gradient-to-b from-red-500 to-orange-500' : 'bg-slate-700'}`} />
                  
                  <div className="flex-1 pl-2">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          task.priorityLabel === 'High' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                          task.priorityLabel === 'Medium' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                          'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                        }`}>
                          {task.priorityLabel === 'High' ? '🔴' : task.priorityLabel === 'Medium' ? '🟡' : '🟢'} {task.priorityLabel || 'Low'}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                          <Zap size={12} className={idx === 0 ? "text-yellow-400" : "text-slate-400"} />
                          {task.priorityScore?.toFixed(1) || "0.0"}
                        </span>
                      </div>
                    </div>

                    {/* Description — small, muted, max 2 lines */}
                    {task.description && (
                      <p className="text-xs text-slate-500 mb-2 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-4">
                      <span className="flex items-center gap-1">
                        <Clock size={14} /> 
                        {new Date(task.deadline).toLocaleDateString()}
                      </span>
                      <span>• Impact: {task.businessImpact >= 9 ? '🔴 High' : task.businessImpact >= 6 ? '🟡 Medium' : '🟢 Low'}</span>
                      <span>• Effort: {task.effortFactor >= 9 ? '🔴 High' : task.effortFactor >= 6 ? '🟡 Medium' : '🟢 Low'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <select 
                          value={task.status}
                          onChange={(e) => handleStatusChange(task._id, e.target.value)}
                          className={`text-xs px-3 py-1.5 rounded-lg border outline-none cursor-pointer appearance-none ${getStatusColor(task.status)}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      
                      <div className="flex gap-4 items-center">
                        <button onClick={() => setEditingTask(task)} className="text-xs text-slate-400 hover:text-blue-400 font-medium transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteTask(task._id)} className="text-xs text-slate-400 hover:text-red-400 font-medium transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Edit Task</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Title</label>
                <input type="text" required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingTask.title} onChange={(e) => setEditingTask({...editingTask, title: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Description</label>
                <textarea rows="3"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingTask.description} onChange={(e) => setEditingTask({...editingTask, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Impact (1-10)</label>
                  <input type="number" min="1" max="10" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                    value={editingTask.businessImpact} onChange={(e) => setEditingTask({...editingTask, businessImpact: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Effort (1-10)</label>
                  <input type="number" min="1" max="10" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                    value={editingTask.effortFactor} onChange={(e) => setEditingTask({...editingTask, effortFactor: parseInt(e.target.value)})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Deadline</label>
                <input type="date" required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  value={editingTask.deadline?.split('T')[0]} onChange={(e) => setEditingTask({...editingTask, deadline: e.target.value})} />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold transition-colors">
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditingTask(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg font-bold transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
