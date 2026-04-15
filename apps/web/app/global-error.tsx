'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontSize: 48 }}>⚠</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937' }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 400, textAlign: 'center' }}>
            {error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={reset}
            style={{ backgroundColor: '#2563eb', color: '#fff', padding: '8px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
