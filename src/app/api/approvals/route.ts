import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { ensureActor, listPendingApprovals } from "@/lib/platform";

export async function GET(_req: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const actor = await ensureActor(
      session.user.sub as string,
      (session.user.name ?? session.user.email ?? "User") as string,
    );
    const approvals = await listPendingApprovals(actor.actor_id);
    return NextResponse.json({ approvals, count: approvals.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
