import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import Link from "next/link";
import {
  ensureActor,
  listPendingApprovals,
  listMemories,
  listEvents,
  listFinancialAccounts,
  getSpendingSummary,
} from "@/lib/platform";
import Greeting from "./Greeting";

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login?returnTo=" + encodeURIComponent("/dashboard"));

  const actor = await ensureActor(
    session.user.sub as string,
    (session.user.name ?? session.user.email ?? "User") as string,
  );

  const [approvals, memories, events, accounts] = await Promise.all([
    listPendingApprovals(actor.actor_id),
    listMemories(actor.actor_id, 50),
    listEvents(actor.actor_id, 50),
    listFinancialAccounts(actor.actor_id),
  ]);

  const spending = accounts.length > 0
    ? await getSpendingSummary(accounts[0].account_id)
    : null;

  const goalCount = memories.filter((m) => m.memory_type === "goal").length;
  const factCount = memories.filter((m) => m.memory_type === "fact").length;
  const interactionCount = events.filter((e) => e.event_type === "interaction").length;

  const userName = (session.user.name ?? session.user.nickname ?? session.user.email ?? "User") as string;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Greeting
        userName={userName}
        pendingApprovals={approvals.length}
        totalEvents={events.length}
        totalMemories={memories.length}
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending Approvals" value={approvals.length} href="/inbox" highlight={approvals.length > 0} />
        <StatCard label="Interactions" value={interactionCount} href="/chat" />
        <StatCard label="Active Goals" value={goalCount} />
        <StatCard label="Known Facts" value={factCount} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Memory overview */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Your Memory</h2>
          {memories.length === 0 ? (
            <EmptyState
              icon="🧠"
              message="Your AI learns as you chat."
              cta="Start a conversation"
              href="/chat"
            />
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {memories.slice(0, 10).map((m) => (
                <div key={m.memory_id} className="flex items-start gap-2 text-sm">
                  <span className={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 ${
                    m.memory_type === "goal" ? "bg-emerald-600/20 text-emerald-400" :
                    m.memory_type === "preference" ? "bg-blue-600/20 text-blue-400" :
                    m.memory_type === "experience" ? "bg-purple-600/20 text-purple-400" :
                    "bg-slate-700 text-slate-400"
                  }`}>
                    {m.memory_type}
                  </span>
                  <span className="text-slate-300 leading-snug">
                    {(m.content as Record<string, unknown>).text as string ??
                     JSON.stringify(m.content).slice(0, 80)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Financial overview */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Financial Overview</h2>
          {!spending ? (
            <EmptyState
              icon="💰"
              message="Track your spending and budgets."
              subtext="Financial accounts can be linked through conversation with your AI."
            />
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <FinanceStat label="Income" value={spending.totalIncome} color="emerald" currency={accounts[0]?.currency} />
                <FinanceStat label="Expenses" value={spending.totalExpenses} color="red" currency={accounts[0]?.currency} />
                <FinanceStat label="Net" value={spending.netCashFlow} color={spending.netCashFlow >= 0 ? "emerald" : "red"} currency={accounts[0]?.currency} />
              </div>
              {spending.breakdown.length > 0 && (
                <div className="space-y-1.5">
                  {spending.breakdown.slice(0, 5).map((b, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-400">{b.category ?? "uncategorized"}</span>
                      <span className={b.entry_type === "income" ? "text-emerald-400" : "text-red-400"}>
                        {formatCurrency(Number(b.total), accounts[0]?.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Recent Activity</h2>
          {events.length === 0 ? (
            <EmptyState
              icon="📊"
              message="Activity will appear here as you interact with your AI."
              cta="Go to Chat"
              href="/chat"
            />
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {events.slice(0, 8).map((e) => (
                <div key={e.event_id} className="flex items-center gap-3 text-sm py-1">
                  <span className="text-xs text-slate-600 w-24 shrink-0 text-right">
                    {relativeTime(e.created_at)}
                  </span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    {e.event_type}
                  </span>
                  {typeof e.payload?.input === "string" && (
                    <span className="text-xs text-slate-500 truncate">
                      {e.payload.input.slice(0, 60)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, href, highlight }: { label: string; value: number; href?: string; highlight?: boolean }) {
  const content = (
    <div className={`bg-slate-900 border rounded-xl p-4 text-center transition-all ${
      highlight ? "border-indigo-500/50 ring-1 ring-indigo-500/20" : "border-slate-800"
    }`}>
      <div className={`text-2xl font-bold ${highlight ? "text-indigo-400" : "text-white"}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );

  if (href) {
    return <Link href={href} className="hover:ring-2 ring-indigo-500/50 rounded-xl transition-all">{content}</Link>;
  }
  return content;
}

function EmptyState({ icon, message, subtext, cta, href }: {
  icon: string;
  message: string;
  subtext?: string;
  cta?: string;
  href?: string;
}) {
  return (
    <div className="text-center py-6">
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-slate-400 text-sm">{message}</p>
      {subtext && <p className="text-slate-500 text-xs mt-1">{subtext}</p>}
      {cta && href && (
        <Link href={href} className="inline-block mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          {cta} →
        </Link>
      )}
    </div>
  );
}

function FinanceStat({ label, value, color, currency }: {
  label: string;
  value: number;
  color: "emerald" | "red";
  currency?: string;
}) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 uppercase font-semibold">{label}</div>
      <div className={`text-lg font-semibold ${color === "emerald" ? "text-emerald-400" : "text-red-400"}`}>
        {formatCurrency(value, currency)}
      </div>
    </div>
  );
}

function formatCurrency(value: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function relativeTime(dateStr: string): string {
  if (!dateStr) return "just now";
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "just now";
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
