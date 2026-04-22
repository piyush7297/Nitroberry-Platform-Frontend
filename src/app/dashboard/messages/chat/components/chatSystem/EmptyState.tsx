"use client";

import React from "react";
import { ShieldCheck, MessageSquarePlus } from "lucide-react";
import { Logo } from "../common/logo";

export default function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full w-full relative overflow-hidden bg-[rgb(var(--app-bg))] transition-colors duration-500">
      {/* 1. Ambient Background Decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[31rem] h-[31rem] bg-[rgb(var(--app-accent))]/10 rounded-full blur-[120px] dark:opacity-20 opacity-40" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm text-center px-6">
        {/* 2. Brand Identity Block */}
        <div className="relative mb-10 group">
          {/* Animated Glow Layer */}
          <div className="absolute inset-0 bg-[rgb(var(--app-accent))]/20 rounded-4xl blur-2xl animate-pulse group-hover:bg-[rgb(var(--app-accent))]/30 transition-all duration-700" />

          {/* Card Surface */}
          <div className="relative w-24 h-24 bg-[rgb(var(--app-surface))] border border-[rgb(var(--app-border))] shadow-2xl rounded-4xl flex items-center justify-center transform -rotate-6 group-hover:rotate-0 transition-transform duration-500 ease-out">
            <span className="text-white text-4xl font-black tracking-tighter select-none">
              <Logo />
            </span>
          </div>

          {/* Floating Accessory Icon */}
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[rgb(var(--app-surface))] border border-[rgb(var(--app-border))] rounded-xl flex items-center justify-center shadow-lg text-[rgb(var(--app-accent))] animate-bounce shadow-[rgb(var(--app-accent))]/10">
            <MessageSquarePlus size={20} />
          </div>
        </div>

        {/* 3. Text Content */}
        <h3 className="text-2xl font-bold text-[rgb(var(--app-text))] mb-3 tracking-tight">
          Your Workspace is Ready
        </h3>
        <p className="text-[rgb(var(--app-text))]/50 text-sm leading-relaxed font-medium mb-8">
          Select a contact from the sidebar to view your message history or
          start a new conversation.
        </p>

        {/* 4. Security Badge */}
        <div className="flex items-center gap-2.5 px-5 py-2 rounded-2xl bg-[rgb(var(--app-text))]/5 border border-[rgb(var(--app-border))]/50 backdrop-blur-sm">
          <ShieldCheck size={14} className="text-[rgb(var(--app-success))]" />
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[rgb(var(--app-text))]/60">
            End-to-End Encrypted
          </span>
        </div>
      </div>

      {/* Decorative Bottom Grid (Optional) */}
      <div className="absolute bottom-0 w-full h-32 bg-linear-to-t from-[rgb(var(--app-accent))]/5 to-transparent pointer-events-none" />
    </div>
  );
}
