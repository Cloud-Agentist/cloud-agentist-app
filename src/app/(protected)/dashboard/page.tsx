import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import Link from "next/link";
import {
  ensureActor,
  listPendingApprovals,
  listMemories,
  listEvents,
} from "@/lib/platform";
import OnboardingWelcome from "@/components/OnboardingWelcome";

const PLATFORM_API = process.env.PLATFORM_API_URL || "http://localhost:3000";

interface AgentInfo {
  name: string;
  avatarUrl: string | null;
  personality: string | null;
  specialization: string | null;
  actorId: string | null;
}

interface AgentListItem {
  actor_id: string;
  display_name: string;
  avatar_url: string | null;
  specialization: string | null;
  is_primary: boolean;
  status: string;
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login?returnTo=/dashboard");

  let actor: { actor_id: string };
  try {
    actor = await ensureActor(
      session.user.sub as string,
      (session.user.name ?? session.user.email ?? "User") as string,
    );
  } catch {
    actor = { actor_id: "00000000-0000-0000-0000-000000000001" };
  }

  const userName = (session.user.name ?? session.user.nickname ?? session.user.email ?? "User") as string;
  const firstName = userName.split(" ")[0];

  // Fetch primary agent
  let primaryAgent: AgentInfo = { name: "Nimbus", avatarUrl: "/brand/mascot-512.png", personality: null, specialization: null, actorId: null };
  try {
    const data = await fetchJson(`${PLATFORM_API}/actors/${actor.actor_id}/primary`) as { primaryAgent?: { actor_id: string; display_name: string; avatar_url: string; personality: string; specialization: string } | null } | null;
    if (data?.primaryAgent) {
      primaryAgent = {
        name: data.primaryAgent.display_name,
        avatarUrl: data.primaryAgent.avatar_url,
        personality: data.primaryAgent.personality,
        specialization: data.primaryAgent.specialization,
        actorId: data.primaryAgent.actor_id,
      };
    }
  } catch { /* use defaults */ }

  // Fetch data in parallel
  const [approvals, agentMemories, events, allAgents] = await Promise.all([
    listPendingApprovals(actor.actor_id).catch(() => []),
    primaryAgent.actorId
      ? listMemories(primaryAgent.actorId, 10).catch(() => [])
      : Promise.resolve([]),
    listEvents(actor.actor_id, 10).catch(() => []),
    fetchJson(`${PLATFORM_API}/agents?isPrimary=true`) as Promise<{ agents?: AgentListItem[] } | null>,
  ]);

  // Agent's recent observations (from autonomous heartbeat)
  const agentFindings = (agentMemories ?? [])
    .filter((m) => m.memory_type === "experience")
    .slice(0, 5)
    .map((m) => {
      const text = typeof m.content === "object" && m.content !== null
        ? (m.content as Record<string, unknown>).text as string ?? JSON.stringify(m.content)
        : String(m.content);
      return { text, timestamp: m.created_at ?? "" };
    });

  const agents = (allAgents?.agents ?? []).filter((a) => a.status === "active");
  const timeGreeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  // First-run: no activity yet — show onboarding
  const isFirstRun = events.length === 0 && agentFindings.length === 0 && approvals.length === 0;
  if (isFirstRun) {
    return (
      <OnboardingWelcome
        firstName={firstName}
        agentName={primaryAgent.name}
        agentAvatarUrl={primaryAgent.avatarUrl ?? "/brand/mascot-512.png"}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Agent Greeting ── */}
      <div className="flex items-start gap-5 mb-8">
        <div className="shrink-0">
          <img
            src={primaryAgent.avatarUrl ?? "/brand/mascot-512.png"}
            alt={primaryAgent.name}
            className="h-20 w-auto"
          />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white mb-1">
            {timeGreeting}, {firstName}
          </h1>
          <p className="text-slate-400 text-sm">
            {primaryAgent.name} is here for you.
            {approvals.length > 0 && (
              <> You have <Link href="/inbox" className="text-indigo-400 hover:text-indigo-300">{approvals.length} pending approval{approvals.length > 1 ? "s" : ""}</Link>.</>
            )}
            {approvals.length === 0 && events.length === 0 && " Ask me anything, or I'll keep an eye on things."}
          </p>
        </div>
        <Link
          href="/agents"
          className="shrink-0 text-xs text-slate-500 hover:text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          Switch Agent
        </Link>
      </div>

      {/* ── Agent Findings ── */}
      {agentFindings.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            {primaryAgent.name}'s Recent Observations
          </h2>
          <div className="space-y-2">
            {agentFindings.map((f, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-start gap-3">
                <img src={primaryAgent.avatarUrl ?? "/brand/mascot-512.png"} alt="" className="h-6 w-auto shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-slate-300">{f.text.replace(/^\[Autonomous observation\]\s*/i, "")}</p>
                  <p className="text-xs text-slate-600 mt-1">{timeAgo(f.timestamp)}</p>
                </div>
                <Link href="/chat" className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0">
                  Tell me more →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Quick Actions ── */}
      <section className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickAction
            href="/chat"
            icon="💬"
            title="Talk to {agent}"
            agentName={primaryAgent.name}
            desc="Ask anything or give instructions"
          />
          {approvals.length > 0 ? (
            <QuickAction
              href="/inbox"
              icon="✅"
              title="Review approvals"
              desc={`${approvals.length} action${approvals.length > 1 ? "s" : ""} waiting for your decision`}
            />
          ) : (
            <QuickAction
              href="/capabilities"
              icon="⚡"
              title="See capabilities"
              desc="What your agents can do for you"
            />
          )}
          <QuickAction
            href="/memories"
            icon="🧠"
            title="What {agent} knows"
            agentName={primaryAgent.name}
            desc="Preferences, goals, and facts"
          />
        </div>
      </section>

      {/* ── My Team ── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            My Team
          </h2>
          <Link href="/agents" className="text-xs text-indigo-400 hover:text-indigo-300">
            Manage →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {agents.map((agent) => {
            const isActive = agent.actor_id === primaryAgent.actorId;
            return (
              <div
                key={agent.actor_id}
                className={`rounded-xl border p-4 transition-all ${
                  isActive
                    ? "border-indigo-500/50 bg-indigo-500/5"
                    : "border-slate-800 bg-slate-900/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={agent.avatar_url ?? "/icon.svg"}
                    alt={agent.display_name}
                    className="h-10 w-auto"
                  />
                  <div>
                    <p className={`text-sm font-medium ${isActive ? "text-indigo-300" : "text-slate-300"}`}>
                      {agent.display_name}
                    </p>
                    {isActive && (
                      <p className="text-[10px] text-indigo-400 uppercase font-bold">Active</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {agent.specialization ?? "General assistant"}
                </p>
              </div>
            );
          })}
          {agents.length === 0 && (
            <p className="text-sm text-slate-500 col-span-3">No agents available yet.</p>
          )}
        </div>
      </section>

      {/* ── Recent Activity ── */}
      {events.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Recent Activity
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="space-y-1.5">
              {events.slice(0, 5).map((e) => (
                <div key={e.event_id ?? e.eventId} className="flex items-center gap-3 text-sm py-1">
                  <span className="text-xs text-slate-600 w-20 shrink-0 text-right">
                    {timeAgo(e.created_at ?? e.occurredAt ?? "")}
                  </span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    {e.event_type ?? e.eventType}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function QuickAction({ href, icon, title, desc, agentName }: {
  href: string; icon: string; title: string; desc: string; agentName?: string;
}) {
  const displayTitle = agentName ? title.replace("{agent}", agentName) : title;
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 p-4 transition-colors block"
    >
      <div className="text-xl mb-2">{icon}</div>
      <h3 className="font-medium text-white text-sm">{displayTitle}</h3>
      <p className="text-xs text-slate-400 mt-1">{desc}</p>
    </Link>
  );
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "just now";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
