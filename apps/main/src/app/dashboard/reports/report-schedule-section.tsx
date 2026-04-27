"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { API_ENDPOINTS } from "@/api/endpoints";
import { apiCall } from "@/api/apiFunction";
import { useApiQuery } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/not-found";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PermissionGuard,
  useModulePermissions,
} from "@/components/PermissionGuard";
import { cn } from "@/lib/utils";

const FREQUENCY_OPTIONS = [
  { value: 1, label: "Daily" },
  { value: 2, label: "Weekly" },
  { value: 3, label: "Monthly" },
] as const;

export type ReportScheduleRow = {
  id: string;
  userId?: string;
  frequency: number;
  scheduleTime: string;
  /** Legacy/alternate API shape */
  filter?: { delayStatus?: boolean };
  /** Current API shape (see GET /report/fms/schedule/:id) */
  filterCriteria?: { delayStatus?: boolean };
  reportFormat?: number;
  isActive?: boolean;
};

function frequencyLabel(v: number) {
  return FREQUENCY_OPTIONS.find((o) => o.value === v)?.label ?? `Frequency ${v}`;
}

/** Normalize API time strings for `<input type="time">` (expects `HH:mm`). */
function toTimeInputValue(v: string | undefined | null): string {
  if (v == null || v === "") return "09:00";
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!m) return "09:00";
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** API may send `filterCriteria` or legacy `filter` for delay flag */
function delayStatusFromApiRecord(raw: Record<string, unknown>): boolean {
  const fc = raw.filterCriteria as { delayStatus?: unknown } | undefined;
  if (typeof fc?.delayStatus === "boolean") return fc.delayStatus;
  const f = raw.filter as { delayStatus?: unknown } | undefined;
  if (typeof f?.delayStatus === "boolean") return f.delayStatus;
  return false;
}

function mapApiItemToRow(raw: unknown): ReportScheduleRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.id === undefined || o.id === null) return null;
  return {
    id: String(o.id),
    userId: o.userId !== undefined ? String(o.userId) : undefined,
    frequency: Number(o.frequency ?? 1),
    scheduleTime: toTimeInputValue(
      o.scheduleTime != null ? String(o.scheduleTime) : null,
    ),
    filter:
      typeof o.filter === "object" && o.filter !== null
        ? (o.filter as ReportScheduleRow["filter"])
        : undefined,
    filterCriteria:
      typeof o.filterCriteria === "object" && o.filterCriteria !== null
        ? (o.filterCriteria as ReportScheduleRow["filterCriteria"])
        : undefined,
    reportFormat:
      o.reportFormat !== undefined ? Number(o.reportFormat) : undefined,
    isActive: typeof o.isActive === "boolean" ? o.isActive : undefined,
  };
}

function normalizeListPayload(res: unknown): ReportScheduleRow[] {
  if (!res || typeof res !== "object") return [];
  const r = res as { data?: unknown };
  const d = r.data;
  let list: unknown[] = [];
  if (Array.isArray(d)) list = d;
  else if (d && typeof d === "object") {
    const o = d as Record<string, unknown>;
    if (Array.isArray(o.schedules)) list = o.schedules;
    else if (Array.isArray(o.data)) list = o.data;
    else if (Array.isArray(o.rows)) list = o.rows;
  }
  return list.map(mapApiItemToRow).filter((x): x is ReportScheduleRow => x !== null);
}

function pickSchedule(res: unknown): ReportScheduleRow | null {
  if (!res || typeof res !== "object") return null;
  const r = res as { data?: unknown };
  const d = r.data;
  if (d && typeof d === "object" && !Array.isArray(d) && "id" in (d as object)) {
    return mapApiItemToRow(d);
  }
  if (d && typeof d === "object" && "schedule" in (d as object)) {
    return mapApiItemToRow((d as { schedule: unknown }).schedule);
  }
  return null;
}

function delayStatusFromRow(row: ReportScheduleRow): boolean {
  return delayStatusFromApiRecord(row as unknown as Record<string, unknown>);
}

export function ReportScheduleSection() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { hasAccess: canRead, create: canCreate } = useModulePermissions(14);

  const userId = (session?.user as { id?: string } | undefined)?.id ?? "";

  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [frequency, setFrequency] = useState<number>(1);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [delayStatus, setDelayStatus] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: listRes, isLoading } = useApiQuery(
    ["FMS_REPORT_SCHEDULE_LIST"],
    API_ENDPOINTS.FMS_REPORT_SCHEDULE,
    {
      enabled: canRead !== false,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  );

  const {
    data: detailRes,
    isFetching: detailFetching,
  } = useApiQuery(
    ["FMS_REPORT_SCHEDULE_DETAIL", editingId],
    `${API_ENDPOINTS.FMS_REPORT_SCHEDULE}/${editingId}`,
    {
      enabled: !!editingId && sheetOpen && mode === "edit",
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 0,
    },
  );

  const rows = useMemo(() => normalizeListPayload(listRes), [listRes]);

  const resetForm = useCallback(() => {
    setFrequency(1);
    setScheduleTime("09:00");
    setDelayStatus(false);
    setEditingId(null);
  }, []);

  const openCreate = () => {
    setMode("create");
    resetForm();
    setSheetOpen(true);
  };

  const openEdit = (row: ReportScheduleRow) => {
    /** Drop cached detail so GET :id always refetches (avoids stale time overwriting form). */
    queryClient.removeQueries({
      queryKey: ["FMS_REPORT_SCHEDULE_DETAIL", row.id],
    });
    setMode("edit");
    setEditingId(row.id);
    setFrequency(row.frequency ?? 1);
    setScheduleTime(toTimeInputValue(row.scheduleTime));
    setDelayStatus(delayStatusFromRow(row));
    setSheetOpen(true);
  };

  /** Authoritative patch from GET /report/fms/schedule/:id (filterCriteria, time, etc.). */
  useEffect(() => {
    if (mode !== "edit" || !editingId || !detailRes) return;
    const s = pickSchedule(detailRes);
    if (!s) return;
    setFrequency(s.frequency ?? 1);
    setScheduleTime(toTimeInputValue(s.scheduleTime));
    setDelayStatus(delayStatusFromRow(s));
  }, [detailRes, mode, editingId]);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["FMS_REPORT_SCHEDULE_LIST"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["FMS_REPORT_SCHEDULE_DETAIL"],
    });
  };

  const createMutation = useMutation({
    mutationFn: (body: {
      userId: string;
      frequency: number;
      scheduleTime: string;
      filter: { delayStatus: boolean };
    }) => apiCall("post", API_ENDPOINTS.FMS_REPORT_SCHEDULE, body),
    onSuccess: async () => {
      await invalidate();
      setSheetOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: {
        userId: string;
        frequency: number;
        scheduleTime: string;
        filter: { delayStatus: boolean };
      };
    }) => apiCall("put", `${API_ENDPOINTS.FMS_REPORT_SCHEDULE}/${id}`, body),
    onSuccess: async () => {
      await invalidate();
      setSheetOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiCall("delete", `${API_ENDPOINTS.FMS_REPORT_SCHEDULE}/${id}`),
    onSuccess: async () => {
      await invalidate();
      setDeleteId(null);
    },
  });

  const handleSubmit = () => {
    if (!userId) {
      return;
    }
    const filter = { delayStatus };
    const payload = {
      userId,
      frequency,
      scheduleTime,
      filter,
    };
    if (mode === "create") {
      createMutation.mutate(payload);
    } else if (editingId) {
      updateMutation.mutate({ id: editingId, body: payload });
    }
  };

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  if (canRead === false) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Report schedule
          </h2>
          <p className="text-sm text-muted-foreground">
            Automate when operation summary reports are generated and emailed.
          </p>
        </div>
        <PermissionGuard moduleId={14} action="create">
          <Button
            type="button"
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={openCreate}
            disabled={!userId}
          >
            <Plus className="size-4" />
            New schedule
          </Button>
        </PermissionGuard>
      </div>

      {!userId && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Sign in to create a schedule (user id required).
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2 rounded-lg border">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-dashed bg-muted/20">
          <EmptyState
            title="No schedules yet"
            description="Create a schedule to receive reports automatically at the time you choose."
            buttonTitle={canCreate ? "Create schedule" : ""}
            onClick={openCreate}
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Frequency</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Delay filter</TableHead>
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {frequencyLabel(row.frequency)}
                  </TableCell>
                  <TableCell>{row.scheduleTime ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        delayStatusFromRow(row)
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {delayStatusFromRow(row) ? "Delayed only" : "All items"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <PermissionGuard moduleId={14} action="update">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Edit schedule"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard moduleId={14} action="delete">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          aria-label="Delete schedule"
                          onClick={() => setDeleteId(row.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </PermissionGuard>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) {
            resetForm();
            setMode("create");
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md"
        >
          <SheetHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarClock className="size-5" />
              </div>
              <div>
                <SheetTitle>
                  {mode === "create" ? "Create schedule" : "Edit schedule"}
                </SheetTitle>
                <SheetDescription>
                  Set how often reports run and whether to include only delayed
                  steps.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {mode === "edit" && detailFetching && (
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
              Loading schedule details…
            </div>
          )}

          <div className="flex flex-1 flex-col gap-6 px-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="schedule-frequency">Frequency</Label>
              <Select
                value={String(frequency)}
                onValueChange={(v) => setFrequency(Number(v))}
              >
                <SelectTrigger id="schedule-frequency" className="w-full">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-time">Schedule time</Label>
              <input
                id="schedule-time"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Uses your local time; server may store as configured in your
                company settings.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="space-y-0.5">
                <Label
                  htmlFor="delay-only"
                  className="text-base font-medium"
                >
                  Only delayed items
                </Label>
                <p className="text-xs text-muted-foreground">
                  When on, the scheduled report applies{" "}
                  <code className="rounded bg-muted px-1">delayStatus</code>{" "}
                  filter (same idea as report filters).
                </p>
              </div>
              <Switch
                id="delay-only"
                checked={delayStatus}
                onCheckedChange={setDelayStatus}
              />
            </div>
          </div>

          <SheetFooter className="border-t border-border bg-muted/20 px-4 py-4">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setSheetOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <PermissionGuard
              moduleId={14}
              action={mode === "create" ? "create" : "update"}
            >
              <Button
                type="button"
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                onClick={handleSubmit}
                disabled={
                  pending ||
                  !userId ||
                  (mode === "edit" && detailFetching)
                }
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                {mode === "create" ? "Create schedule" : "Save changes"}
              </Button>
            </PermissionGuard>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This stops automated reports for this schedule. You can create a
              new one anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <PermissionGuard moduleId={14} action="delete">
              <AlertDialogAction asChild>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    if (deleteId) deleteMutation.mutate(deleteId);
                  }}
                  className="text-white"
                >
                  {deleteMutation.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Delete
                </Button>
              </AlertDialogAction>
            </PermissionGuard>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
