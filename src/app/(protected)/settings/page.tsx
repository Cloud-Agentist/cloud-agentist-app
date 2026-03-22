import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { ensureActor } from "@/lib/platform";
import Link from "next/link";
import DataDeleteItem from "./DataDeleteItem";

export default async function SettingsPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login?returnTo=" + encodeURIComponent("/dashboard"));

  let actor: { actor_id: string; display_name?: string; created_at?: string };
  try {
    actor = await ensureActor(
      session.user.sub as string,
      (session.user.name ?? session.user.email ?? "User") as string,
    );
  } catch {
    actor = { actor_id: "00000000-0000-0000-0000-000000000001", display_name: (session.user.name ?? "User") as string };
  }

  const user = session.user;
  const initials = ((user.name ?? user.email ?? "?") as string)
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      {/* Profile */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Profile</h2>
        <div className="flex items-center gap-4">
          {user.picture ? (
            <img
              src={user.picture as string}
              alt=""
              className="w-14 h-14 rounded-full border-2 border-slate-700"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white text-lg font-bold">
              {initials}
            </div>
          )}
          <div>
            <div className="text-white font-medium">{user.name as string}</div>
            <div className="text-sm text-slate-400">{user.email as string}</div>
          </div>
        </div>
      </section>

      {/* Actor info */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Your AI</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Display name</span>
            <span className="text-slate-300">{actor.display_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Created</span>
            <span className="text-slate-300">{actor.created_at ? new Date(actor.created_at).toLocaleDateString() : "—"}</span>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Manage</h2>
        <div className="space-y-2">
          <SettingsLink href="/memories" label="Memory" desc="View and manage what your AI knows about you" />
          <SettingsLink href="/capabilities" label="Capabilities" desc="See what actions your AI can perform" />
          <SettingsLink href="/inbox" label="Inbox" desc="Pending approvals and queued actions" />
        </div>
      </section>

      {/* Data & Privacy */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Data &amp; Privacy</h2>
        <div className="space-y-2">
          <SettingsLink href="/api/export" label="Export your data" desc="Download everything your AI knows about you" />
          <DataDeleteItem />
        </div>
      </section>

      {/* Keyboard shortcuts hint */}
      <p className="text-center text-xs text-slate-600">
        Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">Cmd+/</kbd> for keyboard shortcuts
      </p>
    </div>
  );
}

function SettingsLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 transition-colors"
    >
      <div>
        <div className="text-sm font-medium text-slate-200">{label}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
      <span className="text-slate-600">→</span>
    </Link>
  );
}
