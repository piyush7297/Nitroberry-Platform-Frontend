"use client";

import React from "react";
import { useStickyNotes } from "@/context/sticky-notes-context";
import { StickyNoteCard } from "@/components/sticky-notes/sticky-note-card";

export function StickyNotesLayer() {
  const { notes, isEnabled } = useStickyNotes();

  if (!isEnabled || notes.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 2147483640 }}
    >
      {notes.map((note) => (
        <StickyNoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}

