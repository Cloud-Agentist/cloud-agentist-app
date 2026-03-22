"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Markdown from "react-markdown";
import { sendMessage, decideIntent } from "./actions";
import type { ProposedIntent, SendMessageResult } from "./actions";
import { getActionMeta, getSuggestedActions } from "@/lib/actions";

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  proposedIntents?: ProposedIntent[];
  timestamp: string;
}

interface ChatShellProps {
  actorId: string;
  userName: string;
  initialHistory?: Array<{ role: "user" | "assistant"; content: string; timestamp: string }>;
  initialPrompt?: string;
}

// ── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = getSuggestedActions().slice(0, 6);

function SuggestionChips({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s.action}
          onClick={() => onSelect(s.suggestedPrompt!)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                     bg-slate-800 border border-slate-700 text-slate-300
                     hover:bg-slate-700 hover:border-slate-600 hover:text-white
                     transition-all duration-150"
        >
          <span>{s.icon}</span>
          <span>{s.suggestedPrompt}</span>
        </button>
      ))}
    </div>
  );
}

// ── Inline intent card ───────────────────────────────────────────────────────

function IntentCard({
  intent,
  onDecide,
  disabled,
}: {
  intent: ProposedIntent;
  onDecide: (intentId: string, decision: "approved" | "denied") => void;
  disabled: boolean;
}) {
  const [decided, setDecided] = useState<"approved" | "denied" | null>(null);
  const [confirming, setConfirming] = useState<"approved" | "denied" | null>(null);
  const meta = getActionMeta(intent.action);

  const sensitivityBadge = intent.sensitiveAction ? (
    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
      meta.sensitivityColor === "red"
        ? "bg-red-500/20 text-red-400"
        : "bg-amber-500/20 text-amber-400"
    }`}>
      Requires approval
    </span>
  ) : null;

  function handleConfirm(decision: "approved" | "denied") {
    setDecided(decision);
    setConfirming(null);
    onDecide(intent.approvalId!, decision);
  }

  // Decided state — show outcome
  if (decided) {
    return (
      <div className={`rounded-lg p-3 mt-2 border ${
        decided === "approved"
          ? "border-emerald-800 bg-emerald-950/50"
          : "border-red-800 bg-red-950/50"
      }`}>
        <div className="flex items-center gap-2">
          <span>{decided === "approved" ? "✅" : "❌"}</span>
          <span className="text-sm font-medium text-slate-200">{meta.label}</span>
          <span className="text-xs text-slate-500">
            {decided === "approved" ? "Approved — action is being executed" : "Denied"}
          </span>
        </div>
      </div>
    );
  }

  // Confirmation state — double-check before executing
  if (confirming) {
    return (
      <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 mt-2 space-y-2">
        <p className="text-sm text-amber-200">
          {confirming === "approved"
            ? `Are you sure you want to approve "${meta.label}"? This action will be executed immediately.`
            : `Deny "${meta.label}"? The action will not be executed.`}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleConfirm(confirming)}
            disabled={disabled}
            className={`flex-1 py-1.5 rounded-md text-white text-xs font-medium transition-colors disabled:opacity-40 ${
              confirming === "approved"
                ? "bg-emerald-700 hover:bg-emerald-600"
                : "bg-red-800 hover:bg-red-700"
            }`}
          >
            {confirming === "approved" ? "Yes, approve" : "Yes, deny"}
          </button>
          <button
            onClick={() => setConfirming(null)}
            className="flex-1 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800/80 p-3 mt-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-base">{meta.icon}</span>
        <span className="text-sm font-medium text-slate-100">{meta.label}</span>
        {sensitivityBadge}
      </div>

      {intent.rationale && (
        <p className="text-xs text-slate-400">{intent.rationale}</p>
      )}

      {intent.parameters && Object.keys(intent.parameters).length > 0 && (
        <div className="text-xs text-slate-500 bg-slate-900/60 rounded p-2 font-mono">
          {Object.entries(intent.parameters).map(([k, v]) => (
            <div key={k}>
              <span className="text-slate-400">{k}:</span>{" "}
              <span className="text-slate-300">{typeof v === "string" ? v : JSON.stringify(v)}</span>
            </div>
          ))}
        </div>
      )}

      {intent.sensitiveAction && intent.approvalId ? (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setConfirming("approved")}
            disabled={disabled}
            className="flex-1 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-medium transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => setConfirming("denied")}
            disabled={disabled}
            className="flex-1 py-1.5 rounded-md bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-medium transition-colors"
          >
            Deny
          </button>
        </div>
      ) : !intent.sensitiveAction ? (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 pt-1">
          <span>✓</span>
          <span>Auto-approved (low sensitivity)</span>
        </div>
      ) : null}
    </div>
  );
}

// ── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ChatShell({ actorId, userName, initialHistory = [], initialPrompt }: ChatShellProps) {
  const greeting: Message = {
    role: "assistant",
    content: initialHistory.length > 0
      ? `Welcome back, ${userName.split(" ")[0]}! Here's your recent conversation. How can I help?`
      : `Hi ${userName.split(" ")[0]}! I'm your Cloud Agentist assistant. I can help you manage your calendar, wishlists, and more. Try one of the suggestions below, or just ask me anything.`,
    timestamp: new Date().toISOString(),
  };

  const [messages, setMessages] = useState<Message[]>([
    greeting,
    ...initialHistory.map((h) => ({
      role: h.role,
      content: h.content,
      timestamp: h.timestamp,
    })),
  ]);
  const [input, setInput] = useState(initialPrompt ?? "");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function doSend(text: string) {
    if (!text.trim() || isPending) return;

    setShowSuggestions(false);

    const userMsg: Message = { role: "user", content: text.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    startTransition(async () => {
      const result: SendMessageResult = await sendMessage({ actorId, input: text.trim(), sessionId });
      if (result.sessionId) setSessionId(result.sessionId);
      const assistantMsg: Message = {
        role: "assistant",
        content: result.text,
        proposedIntents: result.proposedIntents,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend(input);
    }
  }

  function handleDecideIntent(approvalId: string, decision: "approved" | "denied") {
    startTransition(async () => {
      await decideIntent(approvalId, decision);
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-xl rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-100 border border-slate-700"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-slate-100">
                  <Markdown>{msg.content}</Markdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}

              {/* Inline intent cards */}
              {msg.proposedIntents && msg.proposedIntents.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700 space-y-2">
                  {msg.proposedIntents.map((intent, j) => (
                    <IntentCard
                      key={intent.intentId ?? j}
                      intent={intent}
                      onDecide={handleDecideIntent}
                      disabled={isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isPending && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips (visible only before first user message) */}
      {showSuggestions && !isPending && <SuggestionChips onSelect={doSend} />}

      {/* Input */}
      <div className="border-t border-slate-800 px-4 py-3 flex gap-3 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          rows={1}
          className="flex-1 resize-none rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          disabled={isPending}
        />
        <button
          onClick={() => doSend(input)}
          disabled={isPending || !input.trim()}
          className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-sm transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
