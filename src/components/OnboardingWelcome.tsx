"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  firstName: string;
  agentName: string;
  agentAvatarUrl: string;
}

const STEPS = [
  {
    title: "Meet your agent",
    body: "is your personal AI agent. They're always on — monitoring, learning, and ready to help whenever you need them.",
    action: null,
  },
  {
    title: "Talk naturally",
    body: "Ask anything, give instructions, or just chat. Your agent understands context and remembers what matters to you.",
    action: { label: "Start a conversation", href: "/chat" },
  },
  {
    title: "Stay in control",
    body: "Before your agent takes any real-world action — like scheduling a meeting or sending a message — it asks for your approval first.",
    action: { label: "View capabilities", href: "/capabilities" },
  },
  {
    title: "Build your memory",
    body: "The more you interact, the more your agent learns your preferences, goals, and routines. You can always see and manage what it knows.",
    action: { label: "See what's remembered", href: "/memories" },
  },
];

export default function OnboardingWelcome({ firstName, agentName, agentAvatarUrl }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center">
      {/* Agent avatar — large and friendly */}
      <div className="flex justify-center mb-6">
        <img
          src={agentAvatarUrl}
          alt={agentName}
          className="h-28 w-auto animate-[fadeIn_0.6s_ease-out]"
        />
      </div>

      {/* Step indicator */}
      <div className="flex justify-center gap-2 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-indigo-500" : "w-2 bg-slate-700"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div key={step} className="animate-[fadeIn_0.3s_ease-out]">
        {step === 0 ? (
          <>
            <h1 className="text-2xl font-bold text-white mb-3">
              Welcome, {firstName}
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
              <span className="text-indigo-400 font-medium">{agentName}</span>{" "}
              {current.body}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-3">
              {current.title}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
              {current.body}
            </p>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-8">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Back
          </button>
        )}

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {step === 0 ? "Get started" : "Next"}
          </button>
        ) : (
          <Link
            href="/chat"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors inline-block"
          >
            Start chatting with {agentName}
          </Link>
        )}
      </div>

      {/* Skip */}
      {step < STEPS.length - 1 && (
        <button
          onClick={() => setStep(STEPS.length - 1)}
          className="mt-4 text-xs text-slate-600 hover:text-slate-400 transition-colors"
        >
          Skip intro
        </button>
      )}

      {/* Quick action cards (visible on last step) */}
      {step === STEPS.length - 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 text-left">
          <SuggestionCard
            href="/chat"
            prompt={`Hey ${agentName}, what can you help me with?`}
            label="Explore capabilities"
          />
          <SuggestionCard
            href="/chat"
            prompt={`${agentName}, remember that I prefer morning meetings`}
            label="Teach a preference"
          />
          <SuggestionCard
            href="/chat"
            prompt={`Schedule a coffee chat with a friend this week`}
            label="Try scheduling"
          />
          <SuggestionCard
            href="/chat"
            prompt={`What do you know about me so far?`}
            label="Check your memory"
          />
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ href, prompt, label }: { href: string; prompt: string; label: string }) {
  return (
    <Link
      href={`${href}?prompt=${encodeURIComponent(prompt)}`}
      className="rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 p-4 transition-colors block"
    >
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-slate-300 italic">&ldquo;{prompt}&rdquo;</p>
    </Link>
  );
}
