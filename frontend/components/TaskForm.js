"use client";
import { useState, useRef } from "react";
import { Mic, MicOff, Plus } from "lucide-react";

const LEVELS = ["Low", "Medium", "High"];

function PillGroup({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {LEVELS.map((v) => {
        const active = value === v;
        const style = active
          ? v === "High"
            ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30"
            : v === "Medium"
            ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/30"
            : "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30"
          : "bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500";
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex-1 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${style}`}
          >
            {v === "Low" ? "🟢" : v === "Medium" ? "🟡" : "🔴"} {v}
          </button>
        );
      })}
    </div>
  );
}

export default function TaskForm({ onTaskAdded }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [businessImpact, setBusinessImpact] = useState("Medium");
  const [effortFactor, setEffortFactor] = useState("Medium");
  const [isListening, setIsListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const recognitionRef = useRef(null);

  const startVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SR();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onresult = (e) => setTitle(e.results[0][0].transcript);
    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.start();
  };

  const stopVoiceInput = () => recognitionRef.current?.stop();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const levelMap = { Low: 3, Medium: 6, High: 9 };
    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:5006/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          description,
          deadline,
          businessImpact: levelMap[businessImpact] || 6,
          effortFactor: levelMap[effortFactor] || 6,
        }),
      });
      if (res.ok) {
        onTaskAdded(await res.json());
        setTitle(""); setDescription(""); setDeadline("");
        setBusinessImpact("Medium"); setEffortFactor("Medium");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
      <h2 className="text-xl font-semibold mb-5 flex items-center gap-2 text-white">
        <Plus size={20} className="text-emerald-400" /> Create New Task
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title + Voice */}
        <div className="flex gap-2">
          <input
            type="text" required
            placeholder="Task title (e.g. Fix payment bug)"
            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            type="button"
            onClick={isListening ? stopVoiceInput : startVoiceInput}
            className={`p-3 rounded-xl border transition-all ${isListening ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse" : "bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white"}`}
            title="Voice Input"
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        </div>

        {/* Description — 3 lines */}
        <textarea
          rows={3}
          placeholder="Description (optional) — e.g. Fix the payment gateway null error on checkout"
          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-500 resize-none leading-relaxed"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Deadline */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">📅 Deadline</label>
          <input
            type="date" required
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        {/* Business Impact */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">🎯 Business Impact</label>
          <PillGroup value={businessImpact} onChange={setBusinessImpact} />
        </div>

        {/* Effort Required */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">⚡ Effort Required</label>
          <PillGroup value={effortFactor} onChange={setEffortFactor} />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white rounded-xl px-4 py-3 font-semibold transition-all transform hover:scale-[1.01] active:scale-100 disabled:opacity-60"
        >
          {submitting ? "Analyzing..." : "⚡ Analyze & Add Task"}
        </button>
      </form>
    </div>
  );
}
