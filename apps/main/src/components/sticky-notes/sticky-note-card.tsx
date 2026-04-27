"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";
import type {
  StickyNote,
  StickyNoteColor,
} from "@/context/sticky-notes-context";
import { useStickyNotes } from "@/context/sticky-notes-context";

const NOTE_WIDTH = 260;
const NOTE_HEIGHT = 220;
const HEADER_HEIGHT = 36;

const COLOR_STYLES: Record<
  StickyNoteColor,
  { headerBg: string; border: string; text: string }
> = {
  yellow: {
    headerBg: "bg-primary/10",
    border: "border-primary/25",
    text: "text-slate-900 dark:text-slate-100",
  },
  green: {
    headerBg: "bg-primary/10",
    border: "border-primary/25",
    text: "text-slate-900 dark:text-slate-100",
  },
  pink: {
    headerBg: "bg-primary/10",
    border: "border-primary/25",
    text: "text-slate-900 dark:text-slate-100",
  },
  blue: {
    headerBg: "bg-primary/10",
    border: "border-primary/25",
    text: "text-slate-900 dark:text-slate-100",
  },
};

export function StickyNoteCard({ note }: { note: StickyNote }) {
  const {
    updateNoteDescription,
    updateNoteName,
    moveNote,
    bringToFront,
    toggleNoteCollapsed,
    deleteNote,
  } = useStickyNotes();

  const cardRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const didFocusEmptyTitle = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const colorStyle = useMemo(() => COLOR_STYLES[note.color], [note.color]);

  const isCollapsed = note.collapsed ?? false;
  const cardHeight = isCollapsed ? HEADER_HEIGHT : NOTE_HEIGHT;

  useEffect(() => {
    if (isCollapsed || note.name.trim() !== "" || didFocusEmptyTitle.current) {
      return;
    }
    titleInputRef.current?.focus();
    didFocusEmptyTitle.current = true;
  }, [isCollapsed, note.id, note.name]);

  const clampToViewport = (
    rawX: number,
    rawY: number,
    width: number,
    height: number,
  ) => {
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(0, window.innerHeight - height);
    return {
      x: Math.max(0, Math.min(rawX, maxX)),
      y: Math.max(0, Math.min(rawY, maxY)),
    };
  };

  const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    bringToFront(note.id);
    setIsDragging(true);

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;

    const offsetX = startPointerX - note.x;
    const offsetY = startPointerY - note.y;

    const rect = cardRef.current?.getBoundingClientRect();
    const width = rect?.width ?? NOTE_WIDTH;
    const height = rect?.height ?? cardHeight;

    const onMove = (ev: PointerEvent) => {
      const rawX = ev.clientX - offsetX;
      const rawY = ev.clientY - offsetY;
      const clamped = clampToViewport(rawX, rawY, width, height);
      moveNote(note.id, clamped.x, clamped.y);
    };

    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={cardRef}
      className={[
        "pointer-events-auto",
        "absolute flex flex-col rounded-lg border shadow-sm backdrop-blur-sm bg-white/90 dark:bg-slate-900/40",
        colorStyle.border,
        "transition-[height] duration-200 ease-out",
        isDragging ? "ring-2 ring-black/20" : "",
      ].join(" ")}
      style={{
        left: note.x,
        top: note.y,
        width: NOTE_WIDTH,
        height: cardHeight,
        willChange: "height",
        zIndex: note.zIndex,
      }}
    >
      <div
        className={[
          "flex h-9 shrink-0 items-center justify-between px-2",
          isCollapsed ? "rounded-md" : "rounded-t-md border-b",
          colorStyle.border,
          colorStyle.headerBg,
        ].join(" ")}
      >
        <div
          className="flex min-w-0 items-center gap-1"
        >
          <div
            onPointerDown={onDragStart}
            className="flex cursor-grab items-center justify-center rounded-sm p-0.5"
            role="button"
            aria-label="Drag sticky note"
            tabIndex={0}
          >
            <GripVertical className="h-4 w-4 shrink-0" />
          </div>

          {isCollapsed ? (
            <span
              className={[
                "min-w-0 flex-1 truncate text-[11px] font-semibold",
                note.name.trim()
                  ? "text-primary/80"
                  : "text-primary/40",
              ].join(" ")}
            >
              {note.name.trim() ? note.name : "Title"}
            </span>
          ) : (
            <input
              ref={titleInputRef}
              className="min-w-0 flex-1 bg-transparent px-0 text-[11px] font-semibold text-primary/80 outline-none placeholder:text-primary/40"
              value={note.name}
              onChange={(e) => updateNoteName(note.id, e.target.value)}
              placeholder="Title"
              aria-label="Sticky note title"
            />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => toggleNoteCollapsed(note.id)}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-primary hover:bg-primary/10"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand note" : "Collapse note"}
          >
            {isCollapsed ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => deleteNote(note.id)}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-primary hover:bg-primary/10"
            aria-label="Delete sticky note"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className={[
          "flex-1 overflow-hidden transition-all duration-200 ease-out",
          isCollapsed ? "opacity-0 pointer-events-none transform -translate-y-1" : "opacity-100",
        ].join(" ")}
      >
        <textarea
          className={[
            "h-full w-full resize-none bg-transparent px-3 py-2 outline-none",
            "text-[14px] leading-5",
            colorStyle.text,
            "placeholder:text-slate-500 dark:placeholder:text-slate-400",
          ].join(" ")}
          value={note.description}
          onChange={(e) => updateNoteDescription(note.id, e.target.value)}
          placeholder="Write your description..."
        />
      </div>
    </div>
  );
}
