"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SOCIAL_ROUTES } from "@/app/dashboard/social/social-nav";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function SocialAmaNewPage() {
  const [visibility, setVisibility] = useState<"general" | "private">(
    "general",
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create AMA event
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask Me Anything — placeholder form until scheduling is connected.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        Events powered by external providers may require additional setup.
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-2">
          <Label htmlFor="ama-title">
            Event name <span className="text-destructive">*</span>
          </Label>
          <Input id="ama-title" placeholder="Add a title" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ama-start">Start date</Label>
            <Input id="ama-start" type="date" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ama-start-time">Start time</Label>
            <Input id="ama-start-time" type="time" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ama-end">End date</Label>
            <Input id="ama-end" type="date" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ama-end-time">End time</Label>
            <Input id="ama-end-time" type="time" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ama-about">About</Label>
          <Textarea
            id="ama-about"
            placeholder="Add context or details"
            rows={4}
            className="resize-none"
          />
        </div>
        <div className="grid gap-3">
          <Label>Visibility</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setVisibility("general")}
              className={cn(
                "rounded-lg border-2 p-4 text-left text-sm transition-colors",
                visibility === "general"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <span className="font-medium">General</span>
              <p className="mt-1 text-muted-foreground">
                Everyone in your organization
              </p>
            </button>
            <button
              type="button"
              onClick={() => setVisibility("private")}
              className={cn(
                "rounded-lg border-2 p-4 text-left text-sm transition-colors",
                visibility === "private"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <span className="font-medium">Private</span>
              <p className="mt-1 text-muted-foreground">
                Only invited attendees
              </p>
            </button>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
          <Button variant="outline" asChild>
            <Link href={SOCIAL_ROUTES.home}>Cancel</Link>
          </Button>
          <Button type="button" disabled>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
