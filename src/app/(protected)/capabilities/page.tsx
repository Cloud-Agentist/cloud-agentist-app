import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { listCapabilities } from "@/lib/platform";
import { getActionMeta, sensitivityToColor } from "@/lib/actions";
import Link from "next/link";

export default async function CapabilitiesPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login?returnTo=" + encodeURIComponent("/capabilities"));

  const capabilities = await listCapabilities();

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">What can your AI do?</h1>
        <p className="text-slate-400 text-sm mt-1">
          These are the actions your AI can propose. Sensitive actions always need your approval.
        </p>
      </div>

      {capabilities.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-3xl mb-3">🔌</div>
          <p className="text-slate-400">No capabilities registered yet.</p>
          <p className="text-slate-500 text-sm mt-1">
            Capability providers register their actions when they connect to the platform.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {capabilities.map((cap) => {
            const meta = getActionMeta(cap.action);
            const color = sensitivityToColor(cap.sensitivityLevel);
            const prompt = meta.suggestedPrompt;

            return (
              <div
                key={cap.action}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{meta.icon}</span>
                    <h3 className="font-semibold text-white">{meta.label}</h3>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    color === "green" ? "bg-emerald-500/20 text-emerald-400" :
                    color === "amber" ? "bg-amber-500/20 text-amber-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>
                    {cap.sensitivityLevel}
                  </span>
                </div>

                <p className="text-sm text-slate-400">
                  {cap.description ?? meta.description}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-600 font-mono">{cap.action}</span>
                  {prompt && (
                    <Link
                      href={`/chat?prompt=${encodeURIComponent(prompt)}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                    >
                      Try it →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
