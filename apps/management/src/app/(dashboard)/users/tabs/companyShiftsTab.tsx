"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@nitroberry/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nitroberry/ui";
import { Input } from "@nitroberry/ui";
import { Label } from "@nitroberry/ui";
import { Separator } from "@nitroberry/ui";
import { Skeleton } from "@nitroberry/ui";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@nitroberry/ui";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@nitroberry/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@nitroberry/ui";
import { MoreVertical, Plus, Edit, Trash2, Loader, Clock, Eye, Search, RefreshCcw } from "lucide-react";
import { EmptyState } from "@/components/not-found";
import { PermissionGuard, useModulePermissions } from "@/components/PermissionGuard";
import { useApiMutation, useApiQuery, useStatusMutation } from "@/hooks/useApi";
import { apiCall } from "@nitroberry/api-client";
import { API_ENDPOINTS } from "@/api/endpoints";
import { HTTP_METHODS } from "@/api/methods";
import { ConfirmationModal } from "@/components/models/confirmationModal";
import { Pagination } from "../pagination";
import { Switch } from "@nitroberry/ui";

// dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
const DAYS_OF_WEEK = [
  { label: "Sunday",    dayOfWeek: 0 },
  { label: "Monday",    dayOfWeek: 1 },
  { label: "Tuesday",   dayOfWeek: 2 },
  { label: "Wednesday", dayOfWeek: 3 },
  { label: "Thursday",  dayOfWeek: 4 },
  { label: "Friday",    dayOfWeek: 5 },
  { label: "Saturday",  dayOfWeek: 6 },
] as const;

interface DayConfig {
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  isClosed: boolean;
  lunchStart?: string | null;
  lunchEnd?: string | null;
}

interface Shift {
  id: string;
  name: string;
  calendarId?: string;
  dayConfig?: DayConfig[];
  createdAt?: string;
  updatedAt?: string;
}

export function CompanyShiftsTab({
  createSignal,
  refreshSignal = 0,
  searchTerm = "",
  locationId = "",
  calendarId = "",
}: {
  createSignal?: number;
  refreshSignal?: number;
  searchTerm?: string;
  locationId?: string;
  calendarId?: string;
}) {
  const [activeModal, setActiveModal] = useState<{
    type: "create" | "edit" | "delete" | null;
    shift: Shift | null;
  }>({ type: null, shift: null });
  const [isLoadingShiftDetail, setIsLoadingShiftDetail] = useState(false);
  const [shiftDetail, setShiftDetail] = useState<any>(null);
  const [viewDetail, setViewDetail] = useState<any>(null);
  const [isLoadingViewDetail, setIsLoadingViewDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);
  const [localSearch, setLocalSearch] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    dayConfig: DAYS_OF_WEEK.map(({ dayOfWeek }) => ({
      dayOfWeek,
      startTime: "09:00",
      endTime: "20:00",
      isClosed: false,
    })) as DayConfig[],
  });

  const shiftsQuery = new URLSearchParams({
    start: String(start),
    ...(locationId ? { locationId } : {}),
  }).toString();

  // API queries and mutations
  const { data, isLoading, isFetching, refetch } = useApiQuery(
    ["shifts", start, limit, locationId],
    `${API_ENDPOINTS.COMPANY_SHIFT}?${shiftsQuery}`,
    { refetchOnWindowFocus: false, retry: 1 },
  );

  const { create: canCreate } = useModulePermissions(21);

  const createShift = useApiMutation(
    HTTP_METHODS.POST,
    API_ENDPOINTS.COMPANY_SHIFT,
  );
  const updateShift = useStatusMutation(
    HTTP_METHODS.PUT,
    ({ id }) => `${API_ENDPOINTS.COMPANY_SHIFT}/${id}`,
  );
  const deleteShift = useStatusMutation(
    HTTP_METHODS.DELETE,
    (id) => `${API_ENDPOINTS.COMPANY_SHIFT}/${id}`,
  );


  // Normalize shifts data - ensure dayConfig is always present
  const pagination = data?.data?.pagination || {};
  const shifts = data?.data?.shifts || [];
  const trimmedSearch = (localSearch || searchTerm).trim().toLowerCase();

  const filteredShifts = useMemo(() => {
    if (!trimmedSearch) return shifts;
    return shifts.filter((shift: Shift) => {
      const searchable = [shift.name, shift.createdAt, shift.updatedAt]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");
      return searchable.includes(trimmedSearch);
    });
  }, [shifts, trimmedSearch]);

  const normalizeDayConfig = (existingDayConfig: DayConfig[] = []): DayConfig[] => {
    return DAYS_OF_WEEK.map(({ dayOfWeek }) => {
      const existing = existingDayConfig.find((d) => d.dayOfWeek === dayOfWeek);
      if (existing) return {
        dayOfWeek: existing.dayOfWeek,
        isClosed: existing.isClosed ?? false,
        startTime: existing.isClosed ? null : (existing.startTime || "09:00"),
        endTime: existing.isClosed ? null : (existing.endTime || "18:00"),
        lunchStart: existing.lunchStart ?? null,
        lunchEnd: existing.lunchEnd ?? null,
      };
      return { dayOfWeek, startTime: "09:00", endTime: "18:00", isClosed: false, lunchStart: null, lunchEnd: null };
    });
  };

  const openModal = async (type: "create" | "edit" | "delete", shift?: Shift) => {
    if (type === "create") {
      setFormData({ name: "", dayConfig: normalizeDayConfig() });
      setActiveModal({ type, shift: null });
    } else if (type === "edit" && shift) {
      setActiveModal({ type, shift });
      setIsLoadingShiftDetail(true);
      try {
        const res: any = await apiCall("get", `${API_ENDPOINTS.COMPANY_SHIFT}/${shift.id}`);
        const s = res?.data ?? res;
        setShiftDetail(s);
        setFormData({ name: s.name || "", dayConfig: normalizeDayConfig(s.dayConfig) });
      } catch {
        setFormData({ name: shift.name, dayConfig: normalizeDayConfig(shift.dayConfig) });
      } finally {
        setIsLoadingShiftDetail(false);
      }
    } else if (type === "delete" && shift) {
      setActiveModal({ type, shift });
    }
  };

  const previousCreateSignal = useRef(createSignal);
  const previousRefreshSignal = useRef(refreshSignal);

  useEffect(() => {
    if (createSignal === previousCreateSignal.current) return;
    previousCreateSignal.current = createSignal;
    if (createSignal && createSignal > 0) {
      openModal("create");
    }
  }, [createSignal]);

  useEffect(() => {
    if (refreshSignal === previousRefreshSignal.current) return;
    previousRefreshSignal.current = refreshSignal;
    if (refreshSignal && refreshSignal > 0) {
      setStart(1);
      void refetch();
    }
  }, [refreshSignal, refetch]);

  const closeModal = () => {
    setActiveModal({ type: null, shift: null });
    setFormData({ name: "", dayConfig: normalizeDayConfig() });
    setShiftDetail(null);
  };

  const openViewDetail = async (shift: Shift) => {
    setIsLoadingViewDetail(true);
    setViewDetail({ name: shift.name, id: shift.id });
    try {
      const res: any = await apiCall("get", `${API_ENDPOINTS.COMPANY_SHIFT}/${shift.id}`);
      setViewDetail(res?.data ?? res);
    } catch {
      // keep basic data from listing
    } finally {
      setIsLoadingViewDetail(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    setLoading(true);
    const payload = {
      name: formData.name.trim(),
      dayConfig: normalizeDayConfig(formData.dayConfig),
      ...(calendarId ? { calendarId } : {}),
    };

    if (activeModal.type === "create") {
      createShift.mutate(payload, {
        onSuccess: () => {
          setLoading(false);
          refetch();
          closeModal();
        },
        onError: (error: any) => {
          console.error("Failed to create shift:", error);
          setLoading(false);
        },
      });
    } else if (activeModal.type === "edit" && activeModal.shift) {
      const shiftId = activeModal.shift.id;
      const { calendarId: _c, ...editPayload } = payload;
      apiCall("put", `${API_ENDPOINTS.COMPANY_SHIFT}/${shiftId}`, editPayload)
        .then(() => {
          setLoading(false);
          refetch();
          closeModal();
        })
        .catch((error: any) => {
          console.error("Failed to update shift:", error);
          setLoading(false);
        });
    }
  };

  const handleDelete = () => {
    if (!activeModal.shift) return;
    setLoading(true);
    deleteShift.mutate(activeModal.shift.id, {
      onSuccess: () => {
        setLoading(false);
        refetch();
        closeModal();
      },
      onError: (error: any) => {
        console.error("Failed to delete shift:", error);
        setLoading(false);
      },
    });
  };

  const updateDayConfig = (dayOfWeek: number, field: keyof DayConfig, value: any) => {
    setFormData((prev) => {
      const newDayConfig = prev.dayConfig.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        if (field === "isClosed" && value === true) {
          return { ...d, isClosed: true, startTime: null, endTime: null, lunchStart: null, lunchEnd: null };
        }
        return { ...d, [field]: value };
      });
      return { ...prev, dayConfig: newDayConfig };
    });
  };

  return (
    <div className="space-y-3">
      {/* Search + Create row */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <Input
            className="pl-9"
            placeholder="Search shifts..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <PermissionGuard moduleId={21} action="create">
            <Button
              type="button"
              size="sm"
              onClick={() => openModal("create")}
              disabled={!calendarId}
            >
              Create Shift
            </Button>
          </PermissionGuard>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => { setStart(1); void refetch(); }}
            aria-label="Refresh shifts"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Table */}
      {(isLoading || isFetching) ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Updated At</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Skeleton className="w-full h-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-full h-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-full h-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-full h-4" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : filteredShifts.length === 0 ? (
        <div className="flex justify-center items-center h-[60vh]">
          <EmptyState
            onClick={() => openModal("create")}
            buttonTitle={canCreate ? "Create Shift" : ""}
            title="No Shifts Yet"
            description="You haven't created any shifts yet. Create your first shift to get started."
          />
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Updated At</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShifts.map((shift: Shift) => (
                <TableRow key={shift.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      onClick={() => openViewDetail(shift)}
                      className="text-left hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      {shift.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    {shift.createdAt
                      ? new Date(shift.createdAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {shift.updatedAt
                      ? new Date(shift.updatedAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="p-1">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openViewDetail(shift)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                          View Details
                        </DropdownMenuItem>
                        <PermissionGuard moduleId={21} action="update">
                          <DropdownMenuItem
                            onClick={() => openModal("edit", shift)}
                            className="flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4 text-primary" />
                            Edit
                          </DropdownMenuItem>
                        </PermissionGuard>
                        <PermissionGuard moduleId={21} action="delete">
                          <DropdownMenuItem
                            onClick={() => openModal("delete", shift)}
                            className="text-destructive flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                            Delete
                          </DropdownMenuItem>
                        </PermissionGuard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pagination && Object.keys(pagination).length > 0 && (
            <div className="border-t px-4 pb-4">
              <Pagination
                start={start}
                limit={limit}
                total={trimmedSearch ? filteredShifts.length : Number(pagination.total) || shifts.length}
                pagination={pagination}
                onPageChange={(newStart) => setStart(newStart)}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setStart(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Sheet (Drawer) */}
      <Sheet
        open={activeModal.type === "create" || activeModal.type === "edit"}
        onOpenChange={(open) => !open && closeModal()}
      >
        <SheetContent className="w-[96vw] sm:max-w-2xl flex flex-col p-0">
          <SheetHeader className="px-6 py-6 border-b">
            <SheetTitle className="text-xl font-bold">
              {activeModal.type === "create" ? "Create New Shift" : "Update Shift"}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {activeModal.type === "create"
                ? "Configure your working hours and timezone for this shift."
                : "Modify the working hours and timezone for this shift."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {isLoadingShiftDetail && activeModal.type === "edit" ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-2/3" />
              </div>
            ) : (
            <>
            {/* Shift Details Box */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-5 space-y-5">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Shift Details</h3>
              <div className="space-y-2.5">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Shift Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., General Morning Shift"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="bg-white border-gray-200 focus:border-primary"
                />
              </div>
              {activeModal.type === "edit" && shiftDetail && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Created At</p>
                    <p className="text-xs text-gray-700 mt-0.5">{shiftDetail.createdAt ? new Date(shiftDetail.createdAt).toLocaleString() : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Last Updated</p>
                    <p className="text-xs text-gray-700 mt-0.5">{shiftDetail.updatedAt ? new Date(shiftDetail.updatedAt).toLocaleString() : "—"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Day Configuration Box */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-5 space-y-5">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-semibold text-gray-900">Day Configuration</h3>
                <span className="text-[10px] text-gray-500 italic">Adjust hours per day</span>
              </div>
              <div className="space-y-3">
                {DAYS_OF_WEEK.map(({ label, dayOfWeek }) => {
                  const dayConfig = formData.dayConfig.find((d) => d.dayOfWeek === dayOfWeek) || {
                    dayOfWeek, startTime: "09:00", endTime: "18:00", isClosed: false, lunchStart: null, lunchEnd: null,
                  };
                  return (
                    <div key={dayOfWeek} className="group flex flex-col gap-3 p-4 bg-white border border-gray-100 rounded-lg shadow-sm hover:border-primary/30 transition-all">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold text-sm text-gray-700">{label}</Label>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold uppercase ${dayConfig.isClosed ? "text-red-500" : "text-emerald-600"}`}>
                            {dayConfig.isClosed ? "Closed" : "Open"}
                          </span>
                          <Switch
                            checked={!dayConfig.isClosed}
                            onCheckedChange={(checked) => updateDayConfig(dayOfWeek, "isClosed", !checked)}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                        </div>
                      </div>

                      {!dayConfig.isClosed && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor={`start-${dayOfWeek}`} className="text-[10px] font-medium text-gray-500 uppercase">Start Time</Label>
                              <div className="relative">
                                <Input
                                  id={`start-${dayOfWeek}`}
                                  type="time"
                                  value={dayConfig.startTime || ""}
                                  onChange={(e) => updateDayConfig(dayOfWeek, "startTime", e.target.value)}
                                  className="w-full h-9 pl-8 pr-2 text-xs border-gray-200 focus:ring-1 focus:ring-primary/20"
                                />
                                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`end-${dayOfWeek}`} className="text-[10px] font-medium text-gray-500 uppercase">End Time</Label>
                              <div className="relative">
                                <Input
                                  id={`end-${dayOfWeek}`}
                                  type="time"
                                  value={dayConfig.endTime || ""}
                                  onChange={(e) => updateDayConfig(dayOfWeek, "endTime", e.target.value)}
                                  className="w-full h-9 pl-8 pr-2 text-xs border-gray-200 focus:ring-1 focus:ring-primary/20"
                                />
                                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 border-t border-dashed border-gray-100 pt-3">
                            <div className="space-y-1.5">
                              <Label htmlFor={`lunchStart-${dayOfWeek}`} className="text-[10px] font-medium text-gray-400 uppercase">Lunch Start</Label>
                              <div className="relative">
                                <Input
                                  id={`lunchStart-${dayOfWeek}`}
                                  type="time"
                                  value={dayConfig.lunchStart || ""}
                                  onChange={(e) => updateDayConfig(dayOfWeek, "lunchStart", e.target.value || null)}
                                  className="w-full h-9 pl-8 pr-2 text-xs border-gray-200 focus:ring-1 focus:ring-primary/20"
                                />
                                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`lunchEnd-${dayOfWeek}`} className="text-[10px] font-medium text-gray-400 uppercase">Lunch End</Label>
                              <div className="relative">
                                <Input
                                  id={`lunchEnd-${dayOfWeek}`}
                                  type="time"
                                  value={dayConfig.lunchEnd || ""}
                                  onChange={(e) => updateDayConfig(dayOfWeek, "lunchEnd", e.target.value || null)}
                                  className="w-full h-9 pl-8 pr-2 text-xs border-gray-200 focus:ring-1 focus:ring-primary/20"
                                />
                                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            </>
            )}
          </div>

          <SheetFooter className="px-6 py-4 border-t bg-gray-50 flex flex-row items-center gap-3 sm:justify-end">
            <Button variant="outline" onClick={closeModal} className="flex-1 sm:flex-none border-gray-300">
              Discard Changes
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || isLoadingShiftDetail || !formData.name.trim()}
              className="flex-1 sm:flex-none shadow-md shadow-primary/20"
            >
              {loading && <Loader className="animate-spin w-4 h-4 mr-2" />}
              {activeModal.type === "create" ? "Create Shift" : "Save Changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      {activeModal.type === "delete" && activeModal.shift && (
        <ConfirmationModal
          open={activeModal.type === "delete"}
          title="Delete Shift?"
          description={`Are you sure you want to delete "${activeModal.shift.name}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="destructive"
          onCancel={closeModal}
          onConfirm={handleDelete}
          loading={loading}
        />
      )}

      {/* View Detail Drawer */}
      <Sheet open={!!viewDetail} onOpenChange={(open) => !open && setViewDetail(null)}>
        <SheetContent className="w-[96vw] sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="px-6 py-5 border-b">
            <SheetTitle className="text-xl font-bold">Shift Details</SheetTitle>
            <SheetDescription className="text-sm">View shift configuration and schedule.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {isLoadingViewDetail ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : viewDetail ? (
              <>
                {/* Meta info */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Shift Info</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Name</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{viewDetail.name || "—"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Created At</p>
                        <p className="text-xs text-gray-700 mt-0.5">{viewDetail.createdAt ? new Date(viewDetail.createdAt).toLocaleString() : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Last Updated</p>
                        <p className="text-xs text-gray-700 mt-0.5">{viewDetail.updatedAt ? new Date(viewDetail.updatedAt).toLocaleString() : "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Day schedule */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Weekly Schedule</h3>
                  <div className="space-y-2">
                    {DAYS_OF_WEEK.map(({ label, dayOfWeek }) => {
                      const day = (viewDetail.dayConfig || []).find((d: any) => d.dayOfWeek === dayOfWeek);
                      const closed = !day || day.isClosed;
                      return (
                        <div key={dayOfWeek} className="flex items-start justify-between p-3 rounded-lg bg-white border border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${closed ? "bg-red-400" : "bg-emerald-500"}`} />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{label}</p>
                              {!closed && day.lunchStart && day.lunchEnd && (
                                <p className="text-[10px] text-gray-400 mt-0.5">Lunch: {day.lunchStart} – {day.lunchEnd}</p>
                              )}
                            </div>
                          </div>
                          {closed ? (
                            <span className="text-[10px] font-bold uppercase text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Closed</span>
                          ) : (
                            <div className="text-right">
                              <p className="text-xs font-semibold text-gray-700">{day.startTime} – {day.endTime}</p>
                              <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Open</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
            <Button variant="outline" onClick={() => setViewDetail(null)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
