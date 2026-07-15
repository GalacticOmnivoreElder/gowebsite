"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }) {
  useEffect(() => {
    console.error("Application route error:", error);
  }, [error]);

  return (
    <main className="container flex min-h-[calc(100vh-64px)] items-center justify-center py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold">We could not load this page</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your account is safe. Reload the latest version of the site or try
          this page again.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center bg-primary px-4 text-sm font-medium text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Reload site
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center border border-input bg-background px-4 text-sm font-medium"
            onClick={reset}
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
