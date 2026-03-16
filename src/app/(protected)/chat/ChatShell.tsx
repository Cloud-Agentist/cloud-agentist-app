"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { sendMessage } from "./actions";

interface Message {
  role: "user" | "assistant";
  content: string;
  proposedIntents?: unknown[];
  timestamp: string;
}

interface ChatShellProps {
  actorId: string;
  userName: string;
}

export default function ChatShell({ actorId, userName }: ChatShellProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your LifeLift assistant. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text || isPending) return;

    const userMsg: Message = { role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    startTransition(async () => {
      const result = await sendMessage({ actorId, input: text, sessionId });
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
      handleSend();
    }
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
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.proposedIntents && msg.proposedIntents.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-600 text-xs text-slate-400">
                  <span className="font-medium text-amber-400">Proposed actions:</span>{" "}
                  {(msg.proposedIntents as Array<{ action?: string }>)
                    .map((i) => i.action ?? "unknown")
                    .join(", ")}
                  {" — check Approvals for details"}
                </div>
              )}
            </div>
          </div>
        ))}
        {isPending && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-slate-400 text-sm">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 px-4 py-3 flex gap-3 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message your assistant… (Enter to send, Shift+Enter for newline)"
          rows={2}
          className="flex-1 resize-none rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          disabled={isPending}
        />
        <button
          onClick={handleSend}
          disabled={isPending || !input.trim()}
          className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-sm transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
