"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { ApprovalRequest, ActorIntent } from "@/lib/platform";
import { getActionMeta } from "@/lib/actions";
import { decide } from "../approvals/actions";

interface Props {
  approvals: ApprovalRequest[];
  approvalHistory: ApprovalRequest[];
  intents: ActorIntent[];
  hasRecentInteraction: boolean;
}

export default function InboxContent({ approvals: initialApprovals, approvalHistory, intents, hasRecentInteraction }: Props) {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [isPending, startTransition] = useTransition();

  function handleDecide(approvalId: string, decision: "approved" | "denied") {
    startTransition(async () => {
      const result = await decide(approvalId, decision);
      if (result.ok) {
        setApprovals((prev) => prev.filter((a) => a.approval_id !== approvalId));
      }
    });
  }

  const isEmpty = approvals.length === 0 && intents.length === 0 && hasRecentInteraction;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Inbox</h1>

      {isEmpty && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">✨</div>
          <p className="text-slate-400 text-lg">All clear!</p>
          <p className="text-slate-500 text-sm mt-1">
            Your AI will notify you here when it needs your input.
          </p>
        </div>
      )}

      {/* Pending approvals */}
      {approvals.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Needs your decision
          </h2>
          <div className="space-y-3">
            {approvals.map((a) => {
              const meta = getActionMeta(a.action);
              return (
                <div
                  key={a.approval_id}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{meta.icon}</span>
                        <h3 className="font-semibold text-slate-100">{meta.label}</h3>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          meta.sensitivityColor === "red"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {meta.sensitivityColor === "red" ? "High sensitivity" : "Medium sensitivity"}
                        </span>
                      </div>
                      {a.rationale && (
                        <p className="text-sm text-slate-400">{a.rationale}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {relativeTime(a.created_at)}
                    </span>
                  </div>

                  {a.parameters && Object.keys(a.parameters).length > 0 && (
                    <div className="rounded-lg bg-slate-800 p-3">
                      <div className="text-xs text-slate-400 space-y-1">
                        {Object.entries(a.parameters)
                          .filter(([k]) => !k.startsWith("_"))
                          .map(([k, v]) => (
                            <div key={k}>
                              <span className="text-slate-500">{k}:</span>{" "}
                              <span className="text-slate-300">{typeof v === "string" ? v : JSON.stringify(v)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDecide(a.approval_id, "approved")}
                      disabled={isPending}
                      className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium text-sm transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecide(a.approval_id, "denied")}
                      disabled={isPending}
                      className="flex-1 py-2 rounded-lg bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white font-medium text-sm transition-colors"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Queued intents */}
      {intents.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Queued actions
          </h2>
          <div className="space-y-2">
            {intents.map((intent) => {
              const meta = getActionMeta(intent.action);
              return (
                <div
                  key={intent.intentId}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-4 flex items-center gap-3"
                >
                  <span className="text-lg">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200">{meta.label}</div>
                    {intent.rationale && (
                      <p className="text-xs text-slate-500 truncate">{intent.rationale}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-600">{relativeTime(intent.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Suggestions for empty/quiet state */}
      {!hasRecentInteraction && approvals.length === 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Get started
          </h2>
          <Link
            href="/chat"
            className="block rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800/80 p-5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <h3 className="text-white font-medium">Start a conversation</h3>
                <p className="text-sm text-slate-400">
                  Your AI is ready to help. Try scheduling a meeting or adding to your wishlist.
                </p>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Approval history */}
      {approvalHistory.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Recent decisions
          </h2>
          <div className="space-y-1.5">
            {approvalHistory.map((a) => {
              const meta = getActionMeta(a.action);
              const isApproved = a.status === "approved";
              return (
                <div
                  key={a.approval_id}
                  className="rounded-lg border border-slate-800/50 bg-slate-900/50 p-3 flex items-center gap-3"
                >
                  <span className={`text-sm ${isApproved ? "text-emerald-500" : "text-red-500"}`}>
                    {isApproved ? "✓" : "✕"}
                  </span>
                  <span className="text-sm">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-300">{meta.label}</span>
                  </div>
                  <span className="text-xs text-slate-600">{relativeTime(a.decided_at ?? a.created_at)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function relativeTime(dateStr: string): string {
  if (!dateStr) return "just now";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "just now";
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
