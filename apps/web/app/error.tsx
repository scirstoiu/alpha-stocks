'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="text-5xl">⚠</div>
      <h2 className="text-xl font-semibold text-gray-800">Something went wrong</h2>
      <p className="text-gray-500 text-sm max-w-md text-center">
        {error.message || 'An unexpected error occurred. This may be due to a temporary service disruption.'}
      </p>
      <button
        onClick={reset}
        className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
      >
        Try again
      </button>
    </div>
  );
}
