import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">LifeLift</h1>
          <p className="mt-4 text-xl text-slate-300">
            Your persistent AI life assistant — always on, always watching your back.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <FeatureCard
            icon="💬"
            title="Conversational"
            desc="Chat with your AI actor. Ask it to manage your schedule, wishlist, and more."
          />
          <FeatureCard
            icon="🔒"
            title="Governed"
            desc="Sensitive actions require your approval before they execute."
          />
          <FeatureCard
            icon="🧠"
            title="Persistent memory"
            desc="Your actor remembers your preferences, goals, and history across sessions."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/auth/login?returnTo=/chat"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-lg transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/auth/login?returnTo=/activity"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg border border-slate-500 hover:border-slate-300 font-semibold text-lg transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-2">
      <div className="text-3xl">{icon}</div>
      <h2 className="font-semibold text-lg">{title}</h2>
      <p className="text-sm text-slate-400">{desc}</p>
    </div>
  );
}
