"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Filter } from "lucide-react";
import { SocialPostComposer } from "@/components/social/social-post-composer";
import { SocialPostFeed } from "@/components/social/social-post-feed";
import { Button } from "@/components/ui/button";
import { socialStorylines } from "@/lib/social-dummy-data";
import { SOCIAL_ROUTES } from "@/app/dashboard/social/social-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  pageTabButtonClassName,
  pageTabsTrackClassName,
} from "@/components/ui/page-tabs";

type FeedTab = "feed" | "following";

export default function SocialStorylinesPage() {
  const [feedTab, setFeedTab] = useState<FeedTab>("feed");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Storylines
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Updates, thoughts, and experiences from people across your
          organization.
        </p>
      </header>

      <SocialPostComposer />

      <div className="flex items-center justify-between gap-3">
        <div
          className={pageTabsTrackClassName}
          role="tablist"
          aria-label="Storyline feed scope"
        >
          <button
            type="button"
            role="tab"
            aria-selected={feedTab === "feed"}
            onClick={() => setFeedTab("feed")}
            className={pageTabButtonClassName(feedTab === "feed")}
          >
            Feed
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={feedTab === "following"}
            onClick={() => setFeedTab("following")}
            className={pageTabButtonClassName(feedTab === "following")}
          >
            Following
          </button>
        </div>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted"
          aria-label="Filter"
        >
          <Filter className="size-4" />
        </button>
      </div>

      {feedTab === "feed" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-4 p-5 md:flex-row md:items-stretch md:gap-6">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-foreground">
                  What is storyline?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Your storyline is where you share updates, ask questions, and
                  connect with others. Follow leaders and colleagues to see their
                  posts in your feed.
                </p>
                <Button className="mt-4 rounded-full" size="sm" asChild>
                  <Link href={SOCIAL_ROUTES.home}>Go to home feed</Link>
                </Button>
              </div>
              <div
                className="flex shrink-0 items-center justify-center md:w-40"
                aria-hidden
              >
                <div className="flex gap-2 text-5xl">
                  <span className="rounded-2xl bg-amber-100 px-2 py-1">💬</span>
                  <span className="rounded-2xl bg-sky-100 px-2 py-1">💬</span>
                </div>
              </div>
            </div>
          </div>
          <SocialPostFeed mode="feed" />
        </div>
      )}

      {feedTab === "following" && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            People you follow
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {socialStorylines.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-4 px-4 py-4 first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback className="text-xs">
                      {s.ownerName.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{s.ownerName}</p>
                  </div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  Last activity {format(new Date(s.lastActivity), "MMM d, yyyy")}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
