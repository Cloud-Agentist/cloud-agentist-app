import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { ensureActor } from "@/lib/platform";
import { loadChatHistory } from "./actions";
import ChatShell from "./ChatShell";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ prompt?: string }> }) {
  const { prompt: initialPrompt } = await searchParams;
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login?returnTo=/chat");

  let actorId: string;
  try {
    const actor = await ensureActor(
      session.user.sub as string,
      (session.user.name ?? session.user.email ?? "User") as string,
    );
    actorId = actor.actor_id;
  } catch {
    actorId = "00000000-0000-0000-0000-000000000001";
  }

  const history = await loadChatHistory(actorId, 20);

  return (
    <div className="h-[calc(100dvh-53px)] flex flex-col">
      <ChatShell
        actorId={actorId}
        userName={(session.user.name ?? session.user.email ?? "You") as string}
        initialHistory={history}
        initialPrompt={initialPrompt}
      />
    </div>
  );
}
