import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { ensureActor, listEvents, listMemories } from "@/lib/platform";
import type { ActorEvent, Memory } from "@/lib/platform";

export default async function ActivityPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login?returnTo=/activity");

  let actorId = "00000000-0000-0000-0000-000000000001";
  try {
    const actor = await ensureActor(
      session.user.sub as string,
      (session.user.name ?? session.user.email ?? "User") as string,
    );
    actorId = actor.actor_id;
  } catch {
    // Platform may not be running
  }

  const [events, memories] = await Promise.all([
    listEvents(actorId, 30).catch(() => [] as ActorEvent[]),
    listMemories(actorId, 10).catch(() => [] as Memory[]),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Activity & memory</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event feed */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Recent events
          </h2>
          {events.length === 0 ? (
            <EmptyState message="No events recorded yet." />
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <EventCard key={e.event_id} event={e} />
              ))}
            </div>
          )}
        </div>

        {/* Memory panel */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Memories
          </h2>
          {memories.length === 0 ? (
            <EmptyState message="No memories stored yet." />
          ) : (
            <div className="space-y-2">
              {memories.map((m) => (
                <MemoryCard key={m.memory_id} memory={m} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-500 text-sm">
      {message}
    </div>
  );
}

function EventCard({ event }: { event: ActorEvent }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono text-indigo-400">{event.event_type}</span>
        <span className="text-xs text-slate-500">
          {safeDate(event.created_at)}
        </span>
      </div>
      {event.payload && Object.keys(event.payload).length > 0 && (
        <p className="text-sm text-slate-400 truncate">
          {summaryFromPayload(event.payload)}
        </p>
      )}
    </div>
  );
}

function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-emerald-400">{memory.memory_type}</span>
        {memory.confidence != null && (
          <span className="text-xs text-slate-500">{Math.round(memory.confidence * 100)}%</span>
        )}
      </div>
      <p className="text-sm text-slate-300">
        {typeof memory.content?.text === "string"
          ? memory.content.text
          : JSON.stringify(memory.content).slice(0, 120)}
      </p>
    </div>
  );
}

function safeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "just now";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "just now";
  return d.toLocaleString();
}

function summaryFromPayload(payload: Record<string, unknown>): string {
  for (const key of ["text", "input", "content", "message", "summary"]) {
    if (typeof payload[key] === "string") return (payload[key] as string).slice(0, 100);
  }
  return JSON.stringify(payload).slice(0, 100);
}
