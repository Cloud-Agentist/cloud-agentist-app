"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Props {
  actorId: string;
  agendamergeUrl: string;
}

interface GCalStatus {
  connected: boolean;
  available: boolean;
  email?: string | null;
  connectedAt?: string | null;
}

export default function GoogleCalendarConnect({ actorId, agendamergeUrl }: Props) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<GCalStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    // Show toast from OAuth redirect
    const gcal = searchParams.get("gcal");
    if (gcal === "connected") setToast("Google Calendar connected successfully!");
    if (gcal === "error") setToast("Failed to connect Google Calendar. Please try again.");
  }, [searchParams]);

  useEffect(() => {
    fetch(`${agendamergeUrl}/google/status?actorId=${actorId}`)
      .then((r) => r.json())
      .then((data) => setStatus(data as GCalStatus))
      .catch(() => setStatus({ connected: false, available: false }));
  }, [actorId, agendamergeUrl]);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch(`${agendamergeUrl}/google/disconnect`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId }),
      });
      setStatus({ connected: false, available: true });
    } catch {
      setToast("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  if (!status) {
    return (
      <div className="p-3 rounded-lg">
        <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
      </div>
    );
  }

  if (!status.available) {
    return (
      <div className="p-3 rounded-lg">
        <div className="text-sm font-medium text-slate-200">Google Calendar</div>
        <div className="text-xs text-slate-500 mt-1">Integration not yet configured</div>
      </div>
    );
  }

  const connectUrl = `${agendamergeUrl}/auth/google/start?actorId=${actorId}&returnTo=/settings`;

  return (
    <>
      {toast && (
        <div
          className={`mb-3 px-4 py-2 rounded-lg text-sm ${
            toast.includes("success") ? "bg-emerald-900/50 text-emerald-300 border border-emerald-800" : "bg-red-900/50 text-red-300 border border-red-800"
          }`}
        >
          {toast}
          <button onClick={() => setToast(null)} className="ml-3 text-xs opacity-60 hover:opacity-100">dismiss</button>
        </div>
      )}
      <div className="flex items-center justify-between p-3 rounded-lg">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />
            <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />
            <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400" />
            <rect x="7" y="13" width="3" height="3" rx="0.5" className="text-blue-400" fill="currentColor" />
          </svg>
          <div>
            <div className="text-sm font-medium text-slate-200">Google Calendar</div>
            {status.connected ? (
              <div className="text-xs text-emerald-400 mt-0.5">
                Connected{status.email ? ` · ${status.email}` : ""}
              </div>
            ) : (
              <div className="text-xs text-slate-500 mt-0.5">Sync events with your Google Calendar</div>
            )}
          </div>
        </div>
        {status.connected ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-xs text-red-400 hover:text-red-300 border border-red-900 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {disconnecting ? "..." : "Disconnect"}
          </button>
        ) : (
          <a
            href={connectUrl}
            className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-900 px-3 py-1.5 rounded-lg transition-colors"
          >
            Connect
          </a>
        )}
      </div>
    </>
  );
}
