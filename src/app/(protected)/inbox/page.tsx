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

  const actor = await ensureActor(
    session.user.sub as string,
    (session.user.name ?? session.user.email ?? "User") as string,
  );

  const [approvals, approvalHistory, intents, recentEvents] = await Promise.all([
    listPendingApprovals(actor.actor_id),
    listRecentApprovals(actor.actor_id, 10),
    listPendingIntents(actor.actor_id),
    listEvents(actor.actor_id, 10),
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
