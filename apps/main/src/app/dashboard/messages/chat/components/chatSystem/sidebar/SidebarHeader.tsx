import React from "react";
import { Users } from "lucide-react";

interface SidebarHeaderProps {
  onOpenContacts: () => void;
}

export default function SidebarHeader({
  onOpenContacts,
}: SidebarHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--app-text))] transition-colors">
        Messages
      </h1>

      <button
        type="button"
        onClick={onOpenContacts}
        className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--app-border))] bg-[rgb(var(--app-text))]/5 px-3 py-1.5 text-xs font-semibold text-[rgb(var(--app-text))]/75 transition-all hover:border-[rgb(var(--app-accent))]/30 hover:bg-[rgb(var(--app-accent))]/10 hover:text-[rgb(var(--app-text))]"
      >
        <Users size={14} className="text-[rgb(var(--app-accent))]" />
        Contacts
      </button>
    </header>
  );
}
