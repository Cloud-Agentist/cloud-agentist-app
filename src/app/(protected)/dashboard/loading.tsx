export default function DashboardLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 animate-pulse">
      {/* Greeting skeleton */}
      <div className="mb-8">
        <div className="h-8 w-64 bg-slate-800 rounded" />
        <div className="h-4 w-48 bg-slate-800 rounded mt-2" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="h-8 w-10 bg-slate-800 rounded mx-auto" />
            <div className="h-3 w-20 bg-slate-800 rounded mx-auto mt-2" />
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-48" />
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-48" />
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-36 md:col-span-2" />
      </div>
    </div>
  );
}
