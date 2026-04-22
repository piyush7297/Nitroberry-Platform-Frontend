"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useStickyNotes } from "@/context/sticky-notes-context";

const ADD_BTN_STORAGE_KEY = "sticky-notes:addButtonPos:v1";
/** Outer hit area: white ring + inner primary circle */
const FAB_OUTER = 60;
const EDGE_X = 24;
/** Extra space from bottom so the FAB clears browser/dev corner badges */
const EDGE_Y_BOTTOM = 80;
const EDGE_Y_TOP = 24;
const DRAG_THRESHOLD_PX = 4;

/** White document + folded corner + two lines (matches common “note file” affordance) */
function NoteDocIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v6h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 14h7M8.5 17h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function defaultPosition() {
  if (typeof window === "undefined") {
    return { x: 80, y: 80 };
  }
  return {
    x: Math.round(window.innerWidth - FAB_OUTER - EDGE_X),
    y: Math.round(window.innerHeight - FAB_OUTER - EDGE_Y_BOTTOM),
  };
}

function clampPos(x: number, y: number) {
  if (typeof window === "undefined") return { x, y };
  const maxX = Math.max(EDGE_X, window.innerWidth - FAB_OUTER - EDGE_X);
  const maxY = Math.max(
    EDGE_Y_TOP,
    window.innerHeight - FAB_OUTER - EDGE_Y_BOTTOM,
  );
  return {
    x: Math.max(EDGE_X, Math.min(x, maxX)),
    y: Math.max(EDGE_Y_TOP, Math.min(y, maxY)),
  };
}

export function AddStickyNoteButton() {
  const { createNote, isEnabled } = useStickyNotes();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const createGuardRef = useRef(false);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADD_BTN_STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { x?: number; y?: number };
        if (typeof p.x === "number" && typeof p.y === "number") {
          setPos(clampPos(p.x, p.y));
          return;
        }
      }
      setPos(defaultPosition());
    } catch {
      setPos(defaultPosition());
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      setPos((prev) => (prev ? clampPos(prev.x, prev.y) : null));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!pos) return;
    try {
      localStorage.setItem(ADD_BTN_STORAGE_KEY, JSON.stringify(pos));
    } catch {
      // ignore
    }
  }, [pos]);

  const onFabPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!pos) return;
      setIsDragging(true);

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: pos.x,
        originY: pos.y,
        moved: false,
      };

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        if (!dragRef.current.moved) {
          const dist = Math.hypot(dx, dy);
          if (dist >= DRAG_THRESHOLD_PX) dragRef.current.moved = true;
        }
        setPos(clampPos(dragRef.current.originX + dx, dragRef.current.originY + dy));
      };

      const onUp = () => {
        setIsDragging(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (!dragRef.current.moved) {
          if (!createGuardRef.current) {
            createGuardRef.current = true;
            createNote();
            window.setTimeout(() => {
              createGuardRef.current = false;
            }, 250);
          }
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [pos, createNote],
  );

  if (!isEnabled) return null;

  if (!pos) return null;

  return (
    <div
      onPointerDown={onFabPointerDown}
      className={[
        "pointer-events-auto fixed cursor-grab select-none active:cursor-grabbing",
        isDragging ? "ring-2 ring-primary/40 ring-offset-2" : "",
      ].join(" ")}
      style={{
        left: pos.x,
        top: pos.y,
        width: FAB_OUTER,
        height: FAB_OUTER,
        zIndex: 2147483641,
      }}
      role="button"
      aria-label="Create sticky note — drag to move"
      title="Click to add a note, drag to move"
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-white p-[3px] shadow-lg">
        <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground">
          <NoteDocIcon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
