"use client";

import { useState, useTransition } from "react";
import type { Memory } from "@/lib/platform";
import { deleteMemory, addGoal } from "./actions";

const TYPE_STYLES: Record<string, { color: string; label: string; icon: string }> = {
  goal: { color: "bg-emerald-600/20 text-emerald-400", label: "Goals", icon: "🎯" },
  preference: { color: "bg-blue-600/20 text-blue-400", label: "Preferences", icon: "💡" },
  fact: { color: "bg-slate-600/20 text-slate-400", label: "Facts", icon: "📌" },
  experience: { color: "bg-purple-600/20 text-purple-400", label: "Experiences", icon: "📝" },
};

interface Props {
  grouped: Record<string, Memory[]>;
  actorId: string;
}

export default function MemoryList({ grouped: initialGrouped, actorId }: Props) {
  const [grouped, setGrouped] = useState(initialGrouped);
  const [isPending, startTransition] = useTransition();

  function handleDelete(memoryId: string, type: string) {
    startTransition(async () => {
      const result = await deleteMemory(memoryId);
      if (result.ok) {
        setGrouped((prev) => ({
          ...prev,
          [type]: prev[type].filter((m) => m.memory_id !== memoryId),
        }));
      }
    });
  }

  const [goalInput, setGoalInput] = useState("");

  function handleAddGoal() {
    const text = goalInput.trim();
    if (!text) return;
    setGoalInput("");
    startTransition(async () => {
      const result = await addGoal(actorId, text);
      if (result.ok && result.memoryId) {
        setGrouped((prev) => ({
          ...prev,
          goal: [
            {
              memory_id: result.memoryId!,
              actor_id: actorId,
              memory_type: "goal",
              content: { text },
              confidence: 1.0,
              created_at: new Date().toISOString(),
            } as Memory,
            ...prev.goal,
          ],
        }));
      }
    });
  }

  const totalCount = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  if (totalCount === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-3xl mb-3">🧠</div>
        <p className="text-slate-400">No memories yet.</p>
        <p className="text-slate-500 text-sm mt-1">
          Your AI builds memories as you chat. Try having a conversation first.
        </p>
        <a href="/chat" className="inline-block mt-4 text-sm text-indigo-400 hover:text-indigo-300 font-medium">
          Go to Chat →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Add goal form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={goalInput}
          onChange={(e) => setGoalInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddGoal(); }}
          placeholder="Add a goal (e.g. Exercise 3x per week)..."
          className="flex-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          disabled={isPending}
        />
        <button
          onClick={handleAddGoal}
          disabled={isPending || !goalInput.trim()}
          className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          Add goal
        </button>
      </div>

      {Object.entries(TYPE_STYLES).map(([type, style]) => {
        const memories = grouped[type] ?? [];
        if (memories.length === 0) return null;

        return (
          <section key={type}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{style.icon}</span>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                {style.label}
              </h2>
              <span className="text-xs text-slate-600">({memories.length})</span>
            </div>
            <div className="space-y-2">
              {memories.map((m) => (
                <MemoryCard
                  key={m.memory_id}
                  memory={m}
                  typeColor={style.color}
                  onDelete={() => handleDelete(m.memory_id, type)}
                  disabled={isPending}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MemoryCard({
  memory,
  typeColor,
  onDelete,
  disabled,
}: {
  memory: Memory;
  typeColor: string;
  onDelete: () => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const content = memory.content as Record<string, unknown>;
  const text = typeof content.text === "string" ? content.text : JSON.stringify(content);
  const isLong = text.length > 120;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 group">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${typeColor}`}>
              {memory.memory_type}
            </span>
            {memory.confidence != null && memory.confidence < 1 && (
              <span className="text-[10px] text-slate-600">
                {Math.round((memory.confidence ?? 1) * 100)}% confidence
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {isLong && !expanded ? text.slice(0, 120) + "..." : text}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-indigo-400 hover:text-indigo-300 mt-1"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        {/* Delete button (visible on hover) */}
        <button
          onClick={onDelete}
          disabled={disabled}
          className="opacity-0 group-hover:opacity-100 shrink-0 p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-40"
          title="Delete this memory"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
