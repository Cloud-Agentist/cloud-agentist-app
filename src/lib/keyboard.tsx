"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (meta && e.key === "k") {
        e.preventDefault();
        router.push("/chat");
        // Focus the textarea after navigation
        setTimeout(() => {
          const textarea = document.querySelector("textarea");
          textarea?.focus();
        }, 200);
        return;
      }

      if (meta && e.key === "/") {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      // Number shortcuts only when not in an input
      if (meta && !isInput) {
        if (e.key === "1") { e.preventDefault(); router.push("/dashboard"); return; }
        if (e.key === "2") { e.preventDefault(); router.push("/chat"); return; }
        if (e.key === "3") { e.preventDefault(); router.push("/inbox"); return; }
      }

      // Escape closes help
      if (e.key === "Escape" && showHelp) {
        setShowHelp(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, showHelp]);

  if (!showHelp) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setShowHelp(false)}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-80 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h2>
        <div className="space-y-2.5">
          <ShortcutRow keys={["Cmd", "K"]} label="Go to Chat" />
          <ShortcutRow keys={["Cmd", "1"]} label="Dashboard" />
          <ShortcutRow keys={["Cmd", "2"]} label="Chat" />
          <ShortcutRow keys={["Cmd", "3"]} label="Inbox" />
          <ShortcutRow keys={["Cmd", "/"]} label="Toggle this help" />
          <ShortcutRow keys={["Esc"]} label="Close" />
        </div>
        <p className="text-[10px] text-slate-600 mt-4">Use Ctrl instead of Cmd on Windows/Linux</p>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="flex gap-1">
        {keys.map((k) => (
          <kbd
            key={k}
            className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}

export function KeyboardHint({ children }: { children: ReactNode }) {
  return children;
}
