"use client";
import { useRouter, usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

const API = "http://localhost:5006";

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [urgentCount, setUrgentCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        const urgent = data.filter(t => {
          const label = t.priorityLabel || (t.priorityScore >= 6 ? "High" : "Low");
          const daysLeft = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
          return label === "High" && t.status !== "completed" && daysLeft <= 3;
        });
        setUrgentCount(urgent.length);
      }).catch(() => {});
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const navLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Analytics", href: "/analytics" },
    { label: "Reports", href: "/reports" },
  ];

  return (
    <nav className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 p-4 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center font-bold text-white shadow-lg text-xs">TM</div>
          <span className="font-semibold text-lg text-white tracking-tight">Time Management</span>
        </div>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {navLinks.map(link => {
            const isActive = pathname === link.href;
            return (
              <button key={link.href} onClick={() => router.push(link.href)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}>
                {link.label}
              </button>
            );
          })}

          {/* Notifications Bell */}
          <button onClick={() => router.push("/notifications")}
            className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              pathname === "/notifications"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "text-slate-300 hover:text-white hover:bg-slate-700/50"
            }`}>
            <Bell size={18} />
            {urgentCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                {urgentCount}
              </span>
            )}
          </button>

          <button onClick={handleLogout}
            className="ml-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-red-400 hover:bg-red-400/10 transition-all">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
