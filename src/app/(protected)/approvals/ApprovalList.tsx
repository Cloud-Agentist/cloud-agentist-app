"use client";

import { useState, useTransition } from "react";
import { decide } from "./actions";
import type { ApprovalRequest } from "@/lib/platform";

interface Props {
  approvals: ApprovalRequest[];
}

export default function ApprovalList({ approvals: initial }: Props) {
  const [approvals, setApprovals] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function handleDecide(approvalId: string, decision: "approved" | "denied") {
    startTransition(async () => {
      const result = await decide(approvalId, decision);
      if (result.ok) {
        setApprovals((prev) => prev.filter((a) => a.approval_id !== approvalId));
      } else {
        alert(`Failed to ${decision}: ${result.error}`);
      }
    });
  }

  if (approvals.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-500">
        All approvals handled.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {approvals.map((a) => (
        <ApprovalCard
          key={a.approval_id}
          approval={a}
          onDecide={handleDecide}
          disabled={isPending}
        />
      ))}
    </div>
  );
}

function ApprovalCard({
  approval,
  onDecide,
  disabled,
}: {
  approval: ApprovalRequest;
  onDecide: (id: string, decision: "approved" | "denied") => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-400">
              Pending approval
            </span>
          </div>
          <h3 className="font-semibold text-lg text-slate-100">{approval.action}</h3>
          {approval.rationale && (
            <p className="text-sm text-slate-400 italic">{approval.rationale}</p>
          )}
        </div>
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {new Date(approval.created_at).toLocaleString()}
        </span>
      </div>

      {approval.parameters && Object.keys(approval.parameters).length > 0 && (
        <div className="rounded-lg bg-slate-800 p-3">
          <p className="text-xs font-medium text-slate-400 mb-1">Parameters</p>
          <pre className="text-xs text-slate-300 overflow-x-auto">
            {JSON.stringify(approval.parameters, null, 2)}
          </pre>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={() => onDecide(approval.approval_id, "approved")}
          disabled={disabled}
          className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium text-sm transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => onDecide(approval.approval_id, "denied")}
          disabled={disabled}
          className="flex-1 py-2 rounded-lg bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white font-medium text-sm transition-colors"
        >
          Deny
        </button>
      </div>
    </div>
  );
}
