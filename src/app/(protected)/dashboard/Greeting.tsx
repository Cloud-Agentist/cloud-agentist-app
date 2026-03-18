"use client";

import { useMemo } from "react";

interface GreetingProps {
  userName: string;
  pendingApprovals: number;
  totalEvents: number;
  totalMemories: number;
}

export default function Greeting({ userName, pendingApprovals, totalEvents, totalMemories }: GreetingProps) {
  const firstName = userName.split(" ")[0];

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const isFirstRun = totalEvents === 0 && totalMemories === 0;

  if (isFirstRun) {
    return (
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome to LifeLift, {firstName}!
        </h1>
        <p className="text-slate-400 mt-1">
          Your AI is ready to help. Here are some things to try:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <FirstRunCard
            href="/chat"
            icon="💬"
            title="Start chatting"
            desc="Ask your AI to schedule a meeting or add something to your wishlist."
          />
          <FirstRunCard
            href="/capabilities"
            icon="🔌"
            title="See capabilities"
            desc="Discover everything your AI can do — scheduling, wishlists, purchases, and more."
          />
          <FirstRunCard
            href="/inbox"
            icon="📬"
            title="Check your inbox"
            desc="Pending approvals and proactive suggestions will appear here."
          />
        </div>
      </div>
    );
  }

  // Status summary
  const parts: string[] = [];
  if (pendingApprovals > 0) {
    parts.push(`${pendingApprovals} pending approval${pendingApprovals > 1 ? "s" : ""}`);
  }
  const statusLine = parts.length > 0
    ? parts.join(" and ")
    : "Nothing needs your attention right now.";

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-white">
        {timeGreeting}, {firstName}
      </h1>
      <p className="text-slate-400 mt-1 text-sm">{statusLine}</p>
    </div>
  );
}

function FirstRunCard({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <a
      href={href}
      className="rounded-xl border border-slate-700/50 bg-slate-800/50 hover:bg-slate-800 p-4 transition-colors block"
    >
      <div className="text-xl mb-2">{icon}</div>
      <h3 className="font-medium text-white text-sm">{title}</h3>
      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>
    </a>
  );
}
