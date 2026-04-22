"use client";

import React from "react";
import { StickyNotesProvider } from "@/context/sticky-notes-context";
import { StickyNotesLayer } from "@/components/sticky-notes/sticky-notes-layer";
import { AddStickyNoteButton } from "@/components/sticky-notes/add-sticky-note-button";

export function StickyNotesRoot() {
  return (
    <StickyNotesProvider>
      <StickyNotesLayer />
      <AddStickyNoteButton />
    </StickyNotesProvider>
  );
}

