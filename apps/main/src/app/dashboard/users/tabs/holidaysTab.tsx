"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader, MoreVertical, CircleCheck, XCircle, Search, SlidersHorizontal, RefreshCcw, X } from "lucide-react";
import { useApiMutation, useApiQuery, useStatusMutation } from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import { API_ENDPOINTS } from "@/api/endpoints";
import { EmptyState } from "@/components/not-found";
import { PermissionGuard, useModulePermissions } from "@/components/PermissionGuard";
import { Pagination } from "../../users/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  HOLIDAY_SCOPE,
  HOLIDAY_STATUS,
  HOLIDAY_SCOPE_LABELS,
  HOLIDAY_STATUS_LABELS,
} from "@/lib/enums/routes.enum";
import {
  HOLIDAY_DURATION,
  HOLIDAY_DURATION_LABEL,
  HOLIDAY_STATUS_COLOR,
} from "@/api/enums";
import { useEffect, useRef } from "react";
import { useDashboardMode } from "@/context/dashboard-mode-context";

const formatHolidayDate = (holiday: any): string => {
  const rawDate = holiday?.startDate || holiday?.date || "";
  if (!rawDate) return "-";
  return new Date(rawDate).toLocaleDateString();
};

export const HolidaysTab: React.FC<{
  createSignal?: number;
  refreshSignal?: number;
  searchTerm?: string;
  locationId?: string;
  calendarId?: string;
}> = ({ createSignal, refreshSignal = 0, calendarId = "" }) => {
  const { isAdmin } = useDashboardMode();

  // Create form state
  const [name, setName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [durationType, setDurationType] = useState(1);
  const [scope, setScope] = useState<HOLIDAY_SCOPE>(HOLIDAY_SCOPE.PUBLIC);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Multi-user selection state (for scope = MULTIUSERCOMPANY)
  const [userSearch, setUserSearch] = useState("");
  const [userSearchFocused, setUserSearchFocused] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<{ id: string; name: string }[]>([]);

  const { data: userSearchData } = useApiQuery(
    ["holidayUserSearch", userSearch, userSearchFocused],
    `${API_ENDPOINTS.DOER_SEARCH}?start=1&limit=100${userSearch ? `&search=${encodeURIComponent(userSearch)}` : ""}`,
    {
      enabled: userSearchFocused || !!userSearch.trim(),
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );
  const userSearchResults: any[] = userSearchData?.data?.users || [];

  // Status action state
  const [statusLoading, setStatusLoading] = useState(false);
  const [modalState, setModalState] = useState<{ action: "status" | null; holiday: any | null }>({ action: null, holiday: null });
  const [rejectionReason, setRejectionReason] = useState("");
  const [newStatus, setNewStatus] = useState<HOLIDAY_STATUS | null>(null);

  // Pagination
  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filters
  const [search, setSearch] = useState("");
  const [filterScope, setFilterScope] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDuration, setFilterDuration] = useState<string>("all");

  const previousCreateSignal = useRef(createSignal);
  const previousRefreshSignal = useRef(refreshSignal);

  useEffect(() => {
    if (createSignal === previousCreateSignal.current) return;
    previousCreateSignal.current = createSignal;
    if (createSignal && createSignal > 0) setIsDrawerOpen(true);
  }, [createSignal]);

  const { create: canCreate } = useModulePermissions(20);

  // Build query string with all filters + pagination
  const queryString = React.useMemo(() => {
    const params: Record<string, string> = { start: String(start), limit: String(limit) };
    if (calendarId) params.calendarId = calendarId;
    if (search.trim()) params.search = search.trim();
    if (filterScope !== "all") params.scope = filterScope;
    if (filterStatus !== "all") params.status = filterStatus;
    if (filterDuration !== "all") params.duration = filterDuration;
    return new URLSearchParams(params).toString();
  }, [calendarId, start, limit, search, filterScope, filterStatus, filterDuration]);

  const { data, isLoading, isFetching, refetch } = useApiQuery(
    ["Holiday", calendarId, queryString],
    `${API_ENDPOINTS.COMPANY_HOLIDAY}?${queryString}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!calendarId,
      staleTime: 0,
    } as const,
  );

  useEffect(() => {
    if (refreshSignal === previousRefreshSignal.current) return;
    previousRefreshSignal.current = refreshSignal;
    if (refreshSignal && refreshSignal > 0) {
      setStart(1);
      void refetch();
    }
  }, [refreshSignal, refetch]);

  const resetFilters = () => {
    setSearch("");
    setFilterScope("all");
    setFilterStatus("all");
    setFilterDuration("all");
    setStart(1);
  };

  const hasActiveFilters = search || filterScope !== "all" || filterStatus !== "all" || filterDuration !== "all";

  const createHoliday = useApiMutation(HTTP_METHODS.POST, API_ENDPOINTS.COMPANY_HOLIDAY);
  const updateStatus = useStatusMutation(
    HTTP_METHODS.PATCH,
    ({ id }: { id: string }) => API_ENDPOINTS.COMPANY_HOLIDAY_STATUS(id),
  );
  const cancelHoliday = useStatusMutation(
    HTTP_METHODS.PATCH,
    ({ id }: { id: string }) => API_ENDPOINTS.COMPANY_HOLIDAY_CANCEL(id),
  );

  const openModal = (action: "status", holiday: any, targetStatus?: HOLIDAY_STATUS) => {
    setModalState({ action, holiday });
    if (action === "status" && targetStatus) {
      setNewStatus(targetStatus);
      setRejectionReason("");
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || !holidayDate) return;
    if (scope === HOLIDAY_SCOPE.MULTIUSERCOMPANY && selectedUsers.length === 0) return;
    setLoading(true);
    const payload: any = { title: name.trim(), date: holidayDate, durationType, scope, calendarId };
    if (scope === HOLIDAY_SCOPE.MULTIUSERCOMPANY) {
      payload.userIds = selectedUsers.map((u) => u.id);
    }
    createHoliday.mutate(payload, {
      onSuccess: () => {
        setName("");
        setHolidayDate("");
        setDurationType(1);
        setScope(HOLIDAY_SCOPE.PUBLIC);
        setSelectedUsers([]);
        setUserSearch("");
        setStart(1);
        void refetch();
        setLoading(false);
        setIsDrawerOpen(false);
      },
      onError: () => setLoading(false),
    });
  };

  const handleConfirm = () => {
    if (!modalState.holiday || !newStatus) return;
    if (newStatus === HOLIDAY_STATUS.DECLINED && rejectionReason.trim().length < 5) return;

    setStatusLoading(true);
    const { holiday } = modalState;

    if (newStatus === HOLIDAY_STATUS.CANCELLED) {
      cancelHoliday.mutate(
        { id: holiday.id },
        {
          onSuccess: () => { void refetch(); closeModal(); setStatusLoading(false); },
          onError: () => setStatusLoading(false),
        },
      );
      return;
    }

    const payload: any = { id: holiday.id, status: newStatus };
    if (newStatus === HOLIDAY_STATUS.DECLINED) payload.rejectionReason = rejectionReason.trim();

    updateStatus.mutate(payload, {
      onSuccess: () => { void refetch(); closeModal(); setStatusLoading(false); },
      onError: () => setStatusLoading(false),
    });
  };

  const closeModal = () => {
    setModalState({ action: null, holiday: null });
    setRejectionReason("");
    setNewStatus(null);
  };

  const holidays: any[] = data?.data?.managedHolidays || [];
  const pagination = data?.data?.pagination;
  const skeletonRows = Array.from({ length: 5 });

  return (
    <div className="w-full space-y-4">
      {/* Add Holiday Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="w-[96vw] gap-0 p-0 sm:max-w-2xl">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle>Add Holiday</SheetTitle>
              <SheetDescription>Fill in the details below to add a new holiday.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="rounded-xl border bg-white p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter Holiday Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="holidayDate">Date</Label>
                  <Input
                    id="holidayDate"
                    type="date"
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationType">Duration Type</Label>
                  <Select
                    value={String(durationType)}
                    onValueChange={(v) => setDurationType(parseInt(v))}
                  >
                    <SelectTrigger id="durationType" className="w-full">
                      <SelectValue placeholder="Select duration type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(HOLIDAY_DURATION_LABEL).map(([val, label]) => {
                        const isHalfDay = parseInt(val) !== HOLIDAY_DURATION.FULL_DAY;
                        const disabled = scope === HOLIDAY_SCOPE.PUBLIC && isHalfDay;
                        return (
                          <SelectItem key={val} value={val} disabled={disabled}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {scope === HOLIDAY_SCOPE.PUBLIC && (
                    <p className="text-xs text-muted-foreground">Public holidays are always full day.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scope">Scope</Label>
                  <Select
                    value={String(scope)}
                    onValueChange={(v) => {
                      const newScope = parseInt(v) as HOLIDAY_SCOPE;
                      setScope(newScope);
                      if (newScope === HOLIDAY_SCOPE.PUBLIC) setDurationType(HOLIDAY_DURATION.FULL_DAY);
                      if (newScope !== HOLIDAY_SCOPE.MULTIUSERCOMPANY) setSelectedUsers([]);
                    }}
                  >
                    <SelectTrigger id="scope" className="w-full">
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(HOLIDAY_SCOPE_LABELS).map(([val, label]) => {
                        const isMultiUser = parseInt(val) === HOLIDAY_SCOPE.MULTIUSERCOMPANY;
                        if (isMultiUser && !isAdmin) return null;
                        return <SelectItem key={val} value={val}>{label}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {scope === HOLIDAY_SCOPE.MULTIUSERCOMPANY && (
                  <div className="space-y-2">
                    <Label>Select Users <span className="text-red-500">*</span></Label>
                    {/* Selected user pills */}
                    {selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedUsers.map((u) => {
                          const initials = u.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                          return (
                            <span key={u.id} className="inline-flex items-center gap-2 pl-1 pr-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-medium">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold shrink-0">
                                {initials}
                              </span>
                              {u.name}
                              <button
                                type="button"
                                onClick={() => setSelectedUsers((prev) => prev.filter((x) => x.id !== u.id))}
                                className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        onFocus={() => setUserSearchFocused(true)}
                        onBlur={() => setTimeout(() => setUserSearchFocused(false), 200)}
                        className="pl-9"
                      />
                      {(userSearchFocused || userSearch) && userSearchResults.length > 0 && (
                        <ul className="absolute left-0 right-0 top-[42px] z-50 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto text-sm">
                          {userSearchResults.map((user: any) => {
                            const userId = user.id || user._id;
                            const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || userId;
                            const initials = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "U";
                            const isSelected = selectedUsers.some((u) => u.id === userId);
                            return (
                              <li
                                key={userId}
                                className={`flex items-center gap-3 px-3 py-2.5 ${isSelected ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "hover:bg-primary/5 cursor-pointer"}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  if (isSelected) return;
                                  setSelectedUsers((prev) => [...prev, { id: userId, name: fullName }]);
                                  setUserSearch("");
                                  setUserSearchFocused(false);
                                }}
                              >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                  {initials}
                                </span>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium text-sm text-gray-800 truncate">{fullName}</span>
                                  {user.email && <span className="text-[11px] text-gray-400 truncate">{user.email}</span>}
                                </div>
                                {isSelected && <span className="ml-auto text-[10px] text-primary font-semibold shrink-0">Added</span>}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {(userSearchFocused || userSearch) && userSearch && userSearchResults.length === 0 && (
                        <div className="absolute left-0 right-0 top-[42px] z-50 bg-white border border-gray-200 rounded shadow-lg px-3 py-2 text-sm text-gray-500">
                          No users found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t px-6 py-4">
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setIsDrawerOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !name.trim() || !holidayDate || !calendarId || (scope === HOLIDAY_SCOPE.MULTIUSERCOMPANY && selectedUsers.length === 0)}
                >
                  {loading && <Loader className="animate-spin w-4 h-4 mr-2" />}
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Search + Filters + Add Holiday in one row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <Input
            placeholder="Search holidays..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setStart(1); }}
            className="pl-9"
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={filterScope} onValueChange={(v) => { setFilterScope(v); setStart(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scopes</SelectItem>
              {Object.entries(HOLIDAY_SCOPE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setStart(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(HOLIDAY_STATUS_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDuration} onValueChange={(v) => { setFilterDuration(v); setStart(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Durations</SelectItem>
              {Object.entries(HOLIDAY_DURATION_LABEL).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-slate-500 hover:text-slate-700">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
              Clear
            </Button>
          )}
          <PermissionGuard moduleId={20} action="create">
            <Button type="button" size="sm" onClick={() => setIsDrawerOpen(true)} disabled={!calendarId}>
              Add Holiday
            </Button>
          </PermissionGuard>
          <Button variant="outline" size="icon-sm" onClick={() => refetch()} aria-label="Refresh">
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="w-full">
        {!isLoading && holidays.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <EmptyState
              onClick={() => setIsDrawerOpen(true)}
              buttonTitle={canCreate ? "Add Holiday" : ""}
              title="No Holidays Found"
              description={hasActiveFilters ? "No holidays match the current filters." : "You haven't added any holidays yet."}
            />
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>

              {(isLoading || isFetching) ? (
                <TableBody>
                  {skeletonRows.map((_, idx) => (
                    <TableRow key={idx} className="animate-pulse">
                      {Array.from({ length: 7 }).map((__, i) => (
                        <TableCell key={i}><div className="h-4 bg-gray-200 rounded w-3/4" /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              ) : (
                <TableBody>
                  {holidays.map((holiday: any) => (
                    <TableRow key={holiday.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{holiday.name || holiday.title}</TableCell>
                      <TableCell>{formatHolidayDate(holiday)}</TableCell>
                      <TableCell>{HOLIDAY_SCOPE_LABELS[holiday.scope as HOLIDAY_SCOPE] || "-"}</TableCell>
                      <TableCell>{HOLIDAY_DURATION_LABEL[holiday.durationType as HOLIDAY_DURATION] || "-"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${HOLIDAY_STATUS_COLOR[holiday.status as HOLIDAY_STATUS] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {HOLIDAY_STATUS_LABELS[holiday.status as HOLIDAY_STATUS] || "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell>{holiday.createdAt ? new Date(holiday.createdAt).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="p-1">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <PermissionGuard moduleId={20} action="update">
                              <DropdownMenuItem
                                onClick={() => holiday.status === HOLIDAY_STATUS.PENDING && openModal("status", holiday, HOLIDAY_STATUS.APPROVED)}
                                disabled={holiday.status !== HOLIDAY_STATUS.PENDING}
                                className="flex items-center gap-2"
                              >
                                <CircleCheck className="w-4 h-4 text-primary" /> Approve
                              </DropdownMenuItem>
                            </PermissionGuard>
                            <PermissionGuard moduleId={20} action="update">
                              <DropdownMenuItem
                                onClick={() => holiday.status === HOLIDAY_STATUS.PENDING && openModal("status", holiday, HOLIDAY_STATUS.DECLINED)}
                                disabled={holiday.status !== HOLIDAY_STATUS.PENDING}
                                className="flex items-center gap-2"
                              >
                                <XCircle className="w-4 h-4 text-red-600" /> Decline
                              </DropdownMenuItem>
                            </PermissionGuard>
                            <PermissionGuard moduleId={20} action="update">
                              <DropdownMenuItem
                                onClick={() => [HOLIDAY_STATUS.PENDING, HOLIDAY_STATUS.APPROVED].includes(holiday.status) && openModal("status", holiday, HOLIDAY_STATUS.CANCELLED)}
                                disabled={![HOLIDAY_STATUS.PENDING, HOLIDAY_STATUS.APPROVED].includes(holiday.status)}
                                className="flex items-center gap-2"
                              >
                                <XCircle className="w-4 h-4 text-gray-500" /> Cancel
                              </DropdownMenuItem>
                            </PermissionGuard>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
            <div className="border-t px-4 pb-4">
              <Pagination
                start={start}
                limit={limit}
                total={Number(pagination?.total) || 0}
                pagination={pagination}
                onPageChange={(newStart) => setStart(newStart)}
                onLimitChange={(newLimit) => { setLimit(newLimit); setStart(1); }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status Confirm Dialog */}
      {modalState.holiday && modalState.action === "status" && (
        <Dialog open={!!modalState.holiday} onOpenChange={(open) => { if (!open) closeModal(); }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {newStatus === HOLIDAY_STATUS.APPROVED ? "Approve Holiday" : newStatus === HOLIDAY_STATUS.CANCELLED ? "Cancel Holiday" : "Decline Holiday"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {newStatus === HOLIDAY_STATUS.APPROVED
                  ? `Are you sure you want to approve "${modalState.holiday.name}"?`
                  : newStatus === HOLIDAY_STATUS.CANCELLED
                  ? `Are you sure you want to cancel "${modalState.holiday.name}"?`
                  : `Are you sure you want to decline "${modalState.holiday.name}"?`}
              </p>
              {newStatus === HOLIDAY_STATUS.DECLINED && (
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">
                    Rejection Reason <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Enter rejection reason..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-gray-500">Minimum 5 characters required</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button
                onClick={handleConfirm}
                disabled={statusLoading || (newStatus === HOLIDAY_STATUS.DECLINED && rejectionReason.trim().length < 5)}
              >
                {statusLoading && <Loader className="animate-spin w-4 h-4 mr-2" />}
                {newStatus === HOLIDAY_STATUS.APPROVED ? "Approve" : newStatus === HOLIDAY_STATUS.CANCELLED ? "Cancel Holiday" : "Decline"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
