import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { ensureActor, listPendingApprovals } from "@/lib/platform";
import ApprovalList from "./ApprovalList";

export default async function ApprovalsPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login?returnTo=/approvals");

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

  const pending = await listPendingApprovals(actorId);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pending approvals</h1>
        <p className="text-slate-400 text-sm mt-1">
          Your AI actor wants to take these actions. Review and approve or deny each one.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-500">
          No pending approvals — your actor has no queued actions waiting on you.
        </div>
      ) : (
        <ApprovalList approvals={pending} />
      )}
    </div>
  );
}
