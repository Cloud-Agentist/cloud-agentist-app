import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import {
  ensureActor,
  listPendingApprovals,
  listRecentApprovals,
  listPendingIntents,
  listEvents,
} from "@/lib/platform";
import InboxContent from "./InboxContent";

export default async function InboxPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login?returnTo=" + encodeURIComponent("/dashboard"));

  let actor: { actor_id: string };
  try {
    actor = await ensureActor(
      session.user.sub as string,
      (session.user.name ?? session.user.email ?? "User") as string,
    );
  } catch {
    actor = { actor_id: "00000000-0000-0000-0000-000000000001" };
  }

  const [approvals, approvalHistory, intents, recentEvents] = await Promise.all([
    listPendingApprovals(actor.actor_id).catch(() => []),
    listRecentApprovals(actor.actor_id, 10).catch(() => []),
    listPendingIntents(actor.actor_id).catch(() => []),
    listEvents(actor.actor_id, 10).catch(() => []),
  ]);

  const hasRecentInteraction = recentEvents.some((e) => e.event_type === "interaction");

  return (
    <InboxContent
      approvals={approvals}
      approvalHistory={approvalHistory}
      intents={intents}
      hasRecentInteraction={hasRecentInteraction}
    />
  );
}
