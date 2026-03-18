import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { ensureActor, listMemories } from "@/lib/platform";
import MemoryList from "./MemoryList";

export default async function MemoriesPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login?returnTo=" + encodeURIComponent("/dashboard"));

  const actor = await ensureActor(
    session.user.sub as string,
    (session.user.name ?? session.user.email ?? "User") as string,
  );

  const memories = await listMemories(actor.actor_id, 100);

  // Group by type
  const grouped = {
    goal: memories.filter((m) => m.memory_type === "goal"),
    preference: memories.filter((m) => m.memory_type === "preference"),
    fact: memories.filter((m) => m.memory_type === "fact"),
    experience: memories.filter((m) => m.memory_type === "experience"),
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Your Memory</h1>
        <p className="text-slate-400 text-sm mt-1">
          Everything your AI knows about you. Edit or remove anything that's wrong.
        </p>
      </div>

      <MemoryList grouped={grouped} actorId={actor.actor_id} />
    </div>
  );
}
