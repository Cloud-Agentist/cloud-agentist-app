export default function InboxLoading() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 animate-pulse">
      <div className="h-8 w-24 bg-slate-800 rounded mb-6" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-5 h-28" />
        ))}
      </div>
    </div>
  );
}
