"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  getStickyNotes,
  createStickyNote,
  updateStickyNote,
  deleteStickyNote,
} from "@/api/sticky-notes";
import Cookies from "js-cookie";
import { AUTH_TOKEN_KEY } from "@/api/token";

export type StickyNoteColor = "yellow" | "green" | "pink" | "blue";

export type StickyNote = {
  id: string;
  apiId?: string;
  name: string;
  description: string;
  expireAt: string;
  createdAt: string;
  updatedAt: string;
  // UI state (local only, not persisted to API)
  x: number;
  y: number;
  color: StickyNoteColor;
  zIndex: number;
  collapsed: boolean;
  isExpired?: boolean;
  /** Whether this note has been saved to the API (false = local only) */
  isSaved?: boolean;
};

type StickyNotesContextValue = {
  notes: ReadonlyArray<StickyNote>;
  isEnabled: boolean;
  isLoading: boolean;
  createNote: (opts?: { x?: number; y?: number; color?: StickyNoteColor }) => void;
  updateNoteName: (id: string, name: string) => void;
  updateNoteDescription: (id: string, description: string) => void;
  moveNote: (id: string, x: number, y: number) => void;
  bringToFront: (id: string) => void;
  toggleNoteCollapsed: (id: string) => void;
  deleteNote: (id: string) => void;
};

const StickyNotesContext = createContext<StickyNotesContextValue | undefined>(
  undefined,
);

const LOCAL_STORAGE_KEY_PREFIX = "sticky-notes-ui:";
const DEBOUNCE_DELAY = 1000; // 1 second debounce for auto-save
const NOTE_WIDTH = 260;
const NOTE_HEIGHT = 220;

const getDefaultNotePosition = () => {
  if (typeof window === "undefined") {
    return { x: 80, y: 80 };
  }

  return {
    x: Math.round(window.innerWidth - NOTE_WIDTH - 24),
    y: Math.round(window.innerHeight / 2 - NOTE_HEIGHT / 2 + 40),
  };
};

/**
 * Check if note has expired
 */
const isNoteExpired = (expireAt: string): boolean => {
  try {
    return new Date(expireAt) < new Date();
  } catch {
    return false;
  }
};

const asStickyNotePayload = (value: unknown): Record<string, unknown> | null => {
  const seen = new Set<unknown>();

  const walk = (node: unknown, depth: number): Record<string, unknown> | null => {
    if (!node || typeof node !== "object" || depth > 5 || seen.has(node)) return null;
    seen.add(node);

    const obj = node as Record<string, unknown>;
    if (typeof obj.id === "string") {
      return obj;
    }

    for (const key of Object.keys(obj)) {
      const child = obj[key];
      if (child && typeof child === "object") {
        const found = walk(child, depth + 1);
        if (found) return found;
      }
    }

    return null;
  };

  return walk(value, 0);
};

const extractStickyNotesFromListResponse = (value: unknown): Record<string, unknown>[] => {
  if (!value || typeof value !== "object") return [];
  const root = value as Record<string, unknown>;

  const candidates: unknown[] = [
    root?.data,
    root,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const obj = candidate as Record<string, unknown>;
    if (Array.isArray(obj.stickyNotes)) {
      return obj.stickyNotes.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
    }
  }

  return [];
};

/**
 * Get local UI state (x, y, zIndex, collapsed) from localStorage
 */
const getLocalUIState = (
  noteId: string,
  sessionUser: unknown,
): {
  x: number;
  y: number;
  zIndex: number;
  collapsed: boolean;
} => {
  const fallbackPosition = getDefaultNotePosition();

  try {
    if (typeof window === "undefined") {
      return { x: fallbackPosition.x, y: fallbackPosition.y, zIndex: 1, collapsed: false };
    }

    const userId =
      (sessionUser as any)?.id ??
      (sessionUser as any)?.userId ??
      (sessionUser as any)?.email ??
      "guest";

    const key = `${LOCAL_STORAGE_KEY_PREFIX}${userId}:${noteId}`;
    const stored = localStorage.getItem(key);

    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        x: Number.isFinite(parsed.x) ? Number(parsed.x) : fallbackPosition.x,
        y: Number.isFinite(parsed.y) ? Number(parsed.y) : fallbackPosition.y,
        zIndex: Number(parsed.zIndex ?? 1),
        collapsed: Boolean(parsed.collapsed ?? false),
      };
    }
  } catch {
    // ignore
  }
  return { x: fallbackPosition.x, y: fallbackPosition.y, zIndex: 1, collapsed: false };
};

/**
 * Save local UI state to localStorage
 */
const saveLocalUIState = (
  noteId: string,
  sessionUser: unknown,
  state: {
    x: number;
    y: number;
    zIndex: number;
    collapsed: boolean;
  },
) => {
  try {
    if (typeof window === "undefined") return;

    const userId =
      (sessionUser as any)?.id ??
      (sessionUser as any)?.userId ??
      (sessionUser as any)?.email ??
      "guest";

    const key = `${LOCAL_STORAGE_KEY_PREFIX}${userId}:${noteId}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore
  }
};

export function StickyNotesProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAuthToken, setHasAuthToken] = useState(false);
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email" ||
    pathname === "/invite";
  const isEnabled = !isAuthPage && (status === "authenticated" || hasAuthToken);

  // Debounce refs for auto-save
  const updateDebounceTimers = useRef<Partial<Record<string, NodeJS.Timeout>>>({});
  const notesRef = useRef<StickyNote[]>([]);
  const createInFlightRef = useRef<Partial<Record<string, Promise<string>>>>({});
  const createSucceededWithoutIdRef = useRef<Partial<Record<string, boolean>>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncAuthToken = () => {
      setHasAuthToken(Boolean(Cookies.get(AUTH_TOKEN_KEY)));
    };

    syncAuthToken();
    window.addEventListener("focus", syncAuthToken);

    return () => {
      window.removeEventListener("focus", syncAuthToken);
    };
  }, [pathname, status]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const ensureNoteCreated = useCallback(
    async (noteId: string): Promise<string> => {
      const note = notesRef.current.find((n) => n.id === noteId);
      if (!note) return noteId;
      if (note.apiId) return note.apiId;

      if (createInFlightRef.current[noteId]) {
        return createInFlightRef.current[noteId];
      }

      const resolveFromList = async () => {
        const listResponse = await getStickyNotes();
        const list = extractStickyNotesFromListResponse(listResponse);

        const targetName = note.name || "Untitled";
        const targetDescription = note.description || "";

        const matched = [...list]
          .reverse()
          .find((item) => {
            const name = String(item.name ?? "");
            const description = String(item.description ?? "");
            return name === targetName && description === targetDescription;
          });

        const resolvedId = typeof matched?.id === "string" ? matched.id : null;
        if (!resolvedId) return null;

        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? {
                ...n,
                apiId: resolvedId,
                isSaved: true,
              }
              : n,
          ),
        );

        return resolvedId;
      };

      if (createSucceededWithoutIdRef.current[noteId]) {
        const resolvedId = await resolveFromList();
        if (resolvedId) {
          delete createSucceededWithoutIdRef.current[noteId];
          return resolvedId;
        }
        throw new Error("Sticky note created but id not resolved from list yet");
      }

      createInFlightRef.current[noteId] = (async () => {
        const createResponse = await createStickyNote({
          name: note.name || "Untitled",
          description: note.description || "",
        });

        const payload = asStickyNotePayload(createResponse);
        let apiId = typeof payload?.id === "string" ? payload.id : undefined;

        if (!apiId) {
          createSucceededWithoutIdRef.current[noteId] = true;
          apiId = (await resolveFromList()) ?? undefined;
        }

        if (!apiId) {
          throw new Error("Sticky note create response missing id");
        }

        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? {
                ...n,
                apiId,
                name: String(payload?.name ?? n.name ?? ""),
                description: String(payload?.description ?? n.description ?? ""),
                expireAt: String(payload?.expireAt ?? n.expireAt),
                createdAt: String(payload?.createdAt ?? n.createdAt),
                updatedAt: String(payload?.updatedAt ?? n.updatedAt),
                isExpired: isNoteExpired(String(payload?.expireAt ?? n.expireAt)),
                isSaved: true,
              }
              : n,
          ),
        );

        delete createSucceededWithoutIdRef.current[noteId];
        return apiId;
      })();

      try {
        return await createInFlightRef.current[noteId];
      } finally {
        delete createInFlightRef.current[noteId];
      }
    },
    [],
  );

  const persistNote = useCallback(
    async (id: string) => {
      const latestNote = notesRef.current.find((n) => n.id === id);
      if (!latestNote) return;

      if (!latestNote.apiId) {
        await ensureNoteCreated(id);
        return;
      }

      const response = await updateStickyNote(latestNote.apiId, {
        name: latestNote.name || "Untitled",
        description: latestNote.description || "",
      });

      const payload = asStickyNotePayload(response);
      if (payload) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id
              ? {
                ...n,
                name: String(payload.name ?? latestNote.name),
                description: String(payload.description ?? latestNote.description),
                updatedAt: String(payload.updatedAt ?? n.updatedAt),
              }
              : n,
          ),
        );
      }
    },
    [ensureNoteCreated],
  );

  const schedulePersistNote = useCallback(
    (id: string) => {
      if (updateDebounceTimers.current[id]) {
        clearTimeout(updateDebounceTimers.current[id]);
      }

      updateDebounceTimers.current[id] = setTimeout(async () => {
        try {
          await persistNote(id);
        } catch (error) {
          console.error("❌ Error persisting sticky note:", error);
        }
      }, DEBOUNCE_DELAY);
    },
    [persistNote],
  );

  /**
   * Load notes from API
   */
  const loadNotesFromAPI = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getStickyNotes();
      console.log("✅ Loaded sticky notes from API:", response);

      if (response?.data?.stickyNotes && Array.isArray(response.data.stickyNotes)) {
        const loadedNotes: StickyNote[] = response.data.stickyNotes.map(
          (apiNote: any) => {
            const uiState = getLocalUIState(apiNote.id, session?.user);
            return {
              id: apiNote.id,
              apiId: apiNote.id,
              name: apiNote.name ?? "",
              description: apiNote.description ?? "",
              expireAt: apiNote.expireAt,
              createdAt: apiNote.createdAt,
              updatedAt: apiNote.updatedAt,
              x: uiState.x,
              y: uiState.y,
              color: "yellow" as StickyNoteColor,
              zIndex: uiState.zIndex,
              collapsed: uiState.collapsed,
              isExpired: isNoteExpired(apiNote.expireAt),
              isSaved: true,
            };
          }
        );

        setNotes(loadedNotes);
      }
    } catch (error) {
      console.error("❌ Error loading sticky notes:", error);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user]);

  /**
   * Initial load on mount
   */
  useEffect(() => {
    if (isEnabled) {
      loadNotesFromAPI();
      return;
    }

    setNotes([]);
    setIsLoading(false);
  }, [isEnabled, loadNotesFromAPI]);

  /**
   * Create a new sticky note (local only, not saved to API until user types)
   */
  const createNote = useCallback(
    (opts?: { x?: number; y?: number; color?: StickyNoteColor }) => {
      if (!isEnabled) return;

      const defaultX =
        getDefaultNotePosition().x;
      const defaultY =
        getDefaultNotePosition().y;

      const x = Math.max(0, Math.min(opts?.x ?? defaultX, window.innerWidth - NOTE_WIDTH));
      const y = Math.max(0, Math.min(opts?.y ?? defaultY, window.innerHeight - NOTE_HEIGHT));

      // Create a temporary ID for the note (will be replaced when saved to API)
      const tempId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `temp_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      // Add note locally WITHOUT creating on API yet
      const newNote: StickyNote = {
        id: tempId,
        apiId: undefined,
        name: "",
        description: "",
        expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 7 days
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        x,
        y,
        color: opts?.color ?? "yellow",
        zIndex:
          notesRef.current.length > 0
            ? Math.max(...notesRef.current.map((n) => n.zIndex)) + 1
            : 1,
        collapsed: false,
        isSaved: false, // Mark as unsaved
      };

      setNotes((prev) => [...prev, newNote]);
      saveLocalUIState(tempId, session?.user, {
        x: newNote.x,
        y: newNote.y,
        zIndex: newNote.zIndex,
        collapsed: newNote.collapsed,
      });

      console.log("📝 Created new local sticky note (unsaved):", tempId);
    },
    [isEnabled, notesRef, session?.user],
  );

  /**
   * Update note name with debounce
   * If note is unsaved, creates it on API first
   */
  const updateNoteName = useCallback(
    (id: string, name: string) => {
      // Update local state immediately
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
              ...n,
              name,
            }
            : n,
        ),
      );

      schedulePersistNote(id);
    },
    [schedulePersistNote],
  );

  /**
   * Update note description with debounce
   * If note is unsaved, creates it on API first
   */
  const updateNoteDescription = useCallback(
    (id: string, description: string) => {
      // Update local state immediately
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
              ...n,
              description,
            }
            : n,
        ),
      );

      schedulePersistNote(id);
    },
    [schedulePersistNote],
  );

  /**
   * Move note (local only, saved to localStorage)
   */
  const moveNote = useCallback(
    (id: string, x: number, y: number) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
              ...n,
              x,
              y,
            }
            : n,
        ),
      );

      // Save UI state to localStorage
      const note = notes.find((n) => n.id === id);
      if (note) {
        saveLocalUIState(id, session?.user, {
          x,
          y,
          zIndex: note.zIndex,
          collapsed: note.collapsed,
        });
      }
    },
    [notes, session?.user],
  );

  /**
   * Bring note to front (local only)
   */
  const bringToFront = useCallback((id: string) => {
    setNotes((prev) => {
      const maxZ = Math.max(...prev.map((n) => n.zIndex ?? 0), 0);
      return prev.map((n) =>
        n.id === id
          ? {
            ...n,
            zIndex: maxZ + 1,
          }
          : n,
      );
    });

    // Save UI state
    const note = notes.find((n) => n.id === id);
    if (note) {
      const maxZ = Math.max(...notes.map((n) => n.zIndex ?? 0), 0);
      saveLocalUIState(id, session?.user, {
        x: note.x,
        y: note.y,
        zIndex: maxZ + 1,
        collapsed: note.collapsed,
      });
    }
  }, [notes, session?.user]);

  /**
   * Toggle note collapsed state (local only)
   */
  const toggleNoteCollapsed = useCallback(
    (id: string) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
              ...n,
              collapsed: !n.collapsed,
            }
            : n,
        ),
      );

      // Save UI state
      const note = notes.find((n) => n.id === id);
      if (note) {
        saveLocalUIState(id, session?.user, {
          x: note.x,
          y: note.y,
          zIndex: note.zIndex,
          collapsed: !note.collapsed,
        });
      }
    },
    [notes, session?.user],
  );

  /**
   * Delete note
   */
  const deleteNote = useCallback(
    async (id: string) => {
      // Get the note before removing
      const note = notesRef.current.find((n) => n.id === id);

      if (updateDebounceTimers.current[id]) {
        clearTimeout(updateDebounceTimers.current[id]);
        delete updateDebounceTimers.current[id];
      }
      // Remove from local state immediately
      setNotes((prev) => prev.filter((n) => n.id !== id));

      // Only call API if note was saved
      if (note?.isSaved) {
        try {
          const apiId = note.apiId ?? note.id;
          console.log(`🗑️ Deleting sticky note (${apiId})...`);
          await deleteStickyNote(apiId);
          console.log(`✅ Sticky note deleted (${apiId})`);
        } catch (error) {
          console.error("❌ Error deleting sticky note:", error);
          // Optionally reload to restore the note
          loadNotesFromAPI();
        }
      } else {
        console.log(`🗑️ Deleted local sticky note (${id})`);
      }

      delete createInFlightRef.current[id];
      delete createSucceededWithoutIdRef.current[id];
    },
    [loadNotesFromAPI],
  );

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(updateDebounceTimers.current).forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, []);

  const value = useMemo<StickyNotesContextValue>(
    () => ({
      notes,
      isLoading,
      isEnabled,
      createNote,
      updateNoteName,
      updateNoteDescription,
      moveNote,
      bringToFront,
      toggleNoteCollapsed,
      deleteNote,
    }),
    [
      notes,
      isLoading,
      isEnabled,
      createNote,
      updateNoteName,
      updateNoteDescription,
      moveNote,
      bringToFront,
      toggleNoteCollapsed,
      deleteNote,
    ],
  );

  return (
    <StickyNotesContext.Provider value={value}>
      {children}
    </StickyNotesContext.Provider>
  );
}
export function useStickyNotes() {
  const ctx = useContext(StickyNotesContext);
  if (!ctx) {
    throw new Error("useStickyNotes must be used within StickyNotesProvider");
  }
  return ctx;
}

