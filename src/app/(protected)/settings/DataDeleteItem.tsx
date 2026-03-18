"use client";

import { useToast } from "@/lib/toast";

export default function DataDeleteItem() {
  const { toast } = useToast();

  return (
    <button
      onClick={() => toast("Coming soon", "info")}
      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 transition-colors text-left"
    >
      <div>
        <div className="text-sm font-medium text-slate-200">Delete your data</div>
        <div className="text-xs text-slate-500">Remove all memories and activity history</div>
      </div>
      <span className="text-slate-600">&rarr;</span>
    </button>
  );
}
