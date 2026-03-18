"use client";

import { useState, type ReactNode } from "react";

interface TooltipProps {
  text: string;
  children: ReactNode;
}

export default function Tooltip({ text, children }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-xs whitespace-nowrap shadow-lg z-50 pointer-events-none animate-[fadeIn_0.1s_ease-out]">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-transparent border-t-slate-700" />
        </span>
      )}
    </span>
  );
}

export function HelpIcon({ text }: { text: string }) {
  return (
    <Tooltip text={text}>
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-800 text-slate-500 text-[10px] font-bold cursor-help hover:text-slate-300 transition-colors">
        ?
      </span>
    </Tooltip>
  );
}
