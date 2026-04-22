"use client";

import { SocialPostComposer } from "@/components/social/social-post-composer";
import { SocialPostFeed } from "@/components/social/social-post-feed";

export default function SocialHomePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Home</h1>
      </div>

      <SocialPostComposer />

      <SocialPostFeed
        mode="feed"
        emptyState={
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/80 px-6 py-16 text-center">
            <div className="mb-6 text-6xl" aria-hidden>
              ✨
            </div>
            <p className="text-lg font-semibold text-foreground">
              You&apos;re all caught up here!
            </p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              When your communities and storylines have new posts, they will
              appear in this feed.
            </p>
          </div>
        }
      />
    </div>
  );
}
