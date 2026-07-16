"use client";

import { useEffect, useState } from "react";

export default function GlobalError({ error, reset }) {
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  const handleSignOut = async () => {
    setSigningOut(true);

    try {
      const [{ signOut }, { auth }] = await Promise.all([
        import("firebase/auth"),
        import("@/firebase"),
      ]);
      await signOut(auth);
      window.location.assign("/login");
    } catch (signOutError) {
      console.error("Emergency sign out failed:", signOutError);
      setSigningOut(false);
    }
  };

  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <main className="flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-md text-center">
            <h1 className="text-2xl font-semibold">The site needs a refresh</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your account is safe. Reload to use the latest version of
              Galactic Omnivore.
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
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center px-4 text-sm font-medium text-muted-foreground"
                disabled={signingOut}
                onClick={handleSignOut}
              >
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
