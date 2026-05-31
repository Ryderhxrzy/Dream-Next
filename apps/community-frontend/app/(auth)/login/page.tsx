"use client";

import { useEffect } from "react";

const COMMUNITY_FEED_PATH = "/community/feed";

export default function LoginPage() {
  useEffect(() => {
    window.location.replace(`/login?next=${encodeURIComponent(COMMUNITY_FEED_PATH)}`);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-500">Opening AF Home login...</p>
        <a
          href={`/login?next=${encodeURIComponent(COMMUNITY_FEED_PATH)}`}
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Continue to login
        </a>
      </div>
    </main>
  );
}
