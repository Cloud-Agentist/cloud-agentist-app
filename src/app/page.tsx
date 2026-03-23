import Link from "next/link";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-10">
        <div>
          <img src="/icon.svg" alt="" className="h-20 w-auto mx-auto mb-6" />
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="text-white">Cloud </span><span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Agentist</span>
          </h1>
          <p className="mt-4 text-xl text-slate-300 max-w-lg mx-auto">
            Your AI that acts — but only with your approval.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Manage your schedule, wishlists, and finances through conversation.
            Sensitive actions always require your explicit permission.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <FeatureCard
            icon="💬"
            title="Just talk"
            desc="Schedule meetings, manage wishlists, track spending — all through natural conversation."
          />
          <FeatureCard
            icon="✅"
            title="You're in control"
            desc="Your AI proposes actions, but purchases and cancellations always need your OK first."
          />
          <FeatureCard
            icon="🧠"
            title="It remembers you"
            desc="Your preferences, goals, and history carry across every session. No repeating yourself."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          <Link
            href="/auth/login?returnTo=/dashboard"
            className="inline-flex items-center justify-center px-8 py-3 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-lg transition-colors shadow-lg shadow-indigo-600/20"
          >
            Get started
          </Link>
          <Link
            href="/auth/login?returnTo=/dashboard"
            className="inline-flex items-center justify-center px-8 py-3 min-h-[44px] rounded-lg border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-medium text-lg transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
      </div>
      <Footer />
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur p-5 space-y-2">
      <div className="text-2xl">{icon}</div>
      <h2 className="font-semibold text-base text-white">{title}</h2>
      <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
