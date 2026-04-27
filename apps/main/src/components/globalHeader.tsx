"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface GlobalHeaderProps {
  title?: string;
  buttons?: {
    text: string;
    onClick?: () => void;
    variant?: "default" | "outline";
  }[];
}

export function GlobalHeader({ title, buttons }: GlobalHeaderProps) {
  return (
    <div className="flex items-center justify-between w-full px-4 py-2 bg-background">
      {/* Left: Sidebar toggle */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
      </div>

      {/* Center: Title */}
      {title && (
        <div className="flex-1 flex justify-center">
          <h1 className="text-2xl font-semibold">{title}</h1>
        </div>
      )}

      {/* Right: Buttons */}
      {buttons && buttons.length > 0 && (
        <div className="flex gap-2">
          {buttons.map((btn, idx) => (
            <Button
              key={idx}
              variant={btn.variant || "default"}
              onClick={btn.onClick}
            >
              {btn.text}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
