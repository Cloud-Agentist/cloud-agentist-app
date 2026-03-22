"use client";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <div className="text-4xl mb-4">&#x26A0;</div>
      <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-slate-400 text-sm mb-6">
        We hit a temporary issue loading this page. This usually resolves on its own.
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
