"use client";

import React, { useMemo, useState } from "react";
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
import { Loader, MoreVertical, CircleCheck, XCircle } from "lucide-react";
import { useApiMutation, useApiQuery, useStatusMutation } from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import { API_ENDPOINTS } from "@/api/endpoints";
import { EmptyState } from "@/components/not-found";
import { PermissionGuard, useModulePermissions } from "@/components/PermissionGuard";
import { Badge } from "@/components/ui/badge";
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
import { getBadgeVariant } from "@/lib/utils";

const convertDateToISO = (dateValue: string): string => {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  return date.toISOString();
};

const getHolidayDateValue = (holiday: any): string => {
  return holiday?.date || holiday?.startDate || "";
};

const formatHolidayDate = (holiday: any): string => {
  const rawDate = getHolidayDateValue(holiday);
  if (!rawDate) return "-";
  return new Date(rawDate).toLocaleDateString();
};

import { useEffect, useRef } from "react";
export const HolidaysTab: React.FC<{
  createSignal?: number;
  refreshSignal?: number;
  searchTerm?: string;
  locationId?: string;
  calendarId?: string;
}> = ({ createSignal, refreshSignal = 0, searchTerm = "", locationId = "", calendarId = "" }) => {
  const [name, setName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [durationType, setDurationType] = useState(1);
  const [scope, setScope] = useState<HOLIDAY_SCOPE>(HOLIDAY_SCOPE.PUBLIC);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    action: "status" | null;
    holiday: any | null;
  }>({ action: null, holiday: null });
  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);
  const [rejectionReason, setRejectionReason] = useState("");
  const [newStatus, setNewStatus] = useState<HOLIDAY_STATUS | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const previousCreateSignal = useRef(createSignal);
  const previousRefreshSignal = useRef(refreshSignal);

  useEffect(() => {
    if (createSignal === previousCreateSignal.current) return;
    previousCreateSignal.current = createSignal;
    if (createSignal && createSignal > 0) {
      setIsDrawerOpen(true);
    }
  }, [createSignal]);

  const openModal = (
    action: "status",
    holiday: any,
    targetStatus?: HOLIDAY_STATUS,
  ) => {
    setModalState({ action, holiday });
    if (action === "status" && targetStatus) {
      setNewStatus(targetStatus);
      setRejectionReason("");
    }
  };

  const createHoliday = useApiMutation(
    HTTP_METHODS.POST,
    API_ENDPOINTS.COMPANY_HOLIDAY,
  );
  const updateStatus = useStatusMutation(
    HTTP_METHODS.PATCH,
    ({ id }: { id: string }) => API_ENDPOINTS.COMPANY_HOLIDAY_STATUS(id),
  );
  const cancelHoliday = useStatusMutation(
    HTTP_METHODS.PATCH,
    ({ id }: { id: string }) => API_ENDPOINTS.COMPANY_HOLIDAY_CANCEL(id),
  );

  const { create: canCreate } = useModulePermissions(20);

  // Fetch calendar list to populate selector and provide calendarId
  const { data: calendarData } = useApiQuery(
    ["Calendars"],
    API_ENDPOINTS.COMPANY_CALENDAR,
    { refetchOnWindowFocus: false, retry: 1 } as const,
  );
  const calendars: any[] = calendarData?.data?.calendars || calendarData?.data || [];

  const [selectedCalendarId, setSelectedCalendarId] = useState(calendarId);

  // Auto-select first calendar once list loads
  useEffect(() => {
    if (!selectedCalendarId && calendars.length > 0) {
      setSelectedCalendarId(calendars[0].id);
    }
  }, [calendars, selectedCalendarId]);

  const activeCalendarId = selectedCalendarId || calendarId;

  const holidayQuery = new URLSearchParams({
    ...(activeCalendarId ? { calendarId: activeCalendarId } : {}),
  }).toString();

  const { data, isLoading, refetch } = useApiQuery(
    ["Holiday", activeCalendarId],
    `${API_ENDPOINTS.COMPANY_HOLIDAY}?${holidayQuery}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!activeCalendarId,
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

  const handleSubmit = () => {
    if (!name.trim() || !holidayDate) return;
    setLoading(true);

    const payload = {
      title: name.trim(),
      date: holidayDate,
      durationType,
      scope,
      calendarId: activeCalendarId,
    };

    createHoliday.mutate(payload, {
      onSuccess: () => {
        setName("");
        setHolidayDate("");
        setDurationType(1);
        setScope(HOLIDAY_SCOPE.PUBLIC);
        refetch();
        setLoading(false);
        setIsDrawerOpen(false);
      },
      onError: (err) => {
        console.error("Failed to create holiday:", err);
        setLoading(false);
      },
    });
  };

  const handleConfirm = () => {
    if (!modalState.holiday || !modalState.action) return;
    const { action, holiday } = modalState;
    if (action === "status") {
      if (!newStatus) return;

      // Validate rejection reason if declining
      if (
        newStatus === HOLIDAY_STATUS.DECLINED &&
        rejectionReason.trim().length < 5
      ) {
        return;
      }

      setStatusLoading(true);

      const payload: any = {
        id: holiday.id, // id is used in the URL path by useStatusMutation
        status: newStatus,
      };

      // Add rejection reason if declining
      if (newStatus === HOLIDAY_STATUS.DECLINED) {
        payload.rejectionReason = rejectionReason.trim();
      }

      updateStatus.mutate(payload, {
        onSuccess: () => {
          refetch();
          setModalState({ action: null, holiday: null });
          setRejectionReason("");
          setNewStatus(null);
          setStatusLoading(false);
        },
        onError: (err: any) => {
          setStatusLoading(false);
          console.error(err);
        },
      });
    }
  };

  const holidays = data?.data?.managedHolidays || data?.data || [];
  const trimmedSearch = searchTerm.trim().toLowerCase();
  const filteredHolidays = useMemo(() => {
    if (!trimmedSearch) return holidays;

    return holidays.filter((holiday: any) => {
      const searchable = [
        holiday?.name || holiday?.title,
        holiday?.date,
        holiday?.startDate,
        HOLIDAY_SCOPE_LABELS[holiday?.type as HOLIDAY_SCOPE],
        HOLIDAY_STATUS_LABELS[holiday?.status as HOLIDAY_STATUS],
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");

      return searchable.includes(trimmedSearch);
    });
  }, [holidays, trimmedSearch]);

  let pagination = data?.data?.pagination;
  // Skeleton placeholder for table rows
  const skeletonRows = Array.from({ length: 5 });

  return (
    <div className="w-full space-y-4">
      {/* Header section removed */}

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="w-[96vw] gap-0 p-0 sm:max-w-2xl">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle>Add Holiday</SheetTitle>
              <SheetDescription>Fill in the details below to add a new holiday.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="rounded-xl border bg-white p-4 space-y-4">
                {calendars.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="calendarSelect">Calendar</Label>
                    <Select
                      value={selectedCalendarId}
                      onValueChange={setSelectedCalendarId}
                    >
                      <SelectTrigger id="calendarSelect" className="w-full">
                        <SelectValue placeholder="Select calendar" />
                      </SelectTrigger>
                      <SelectContent>
                        {calendars.map((cal: any) => (
                          <SelectItem key={cal.id} value={cal.id}>
                            {cal.name || cal.title || cal.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
                    onValueChange={(value) => setDurationType(parseInt(value))}
                  >
                    <SelectTrigger id="durationType" className="w-full">
                      <SelectValue placeholder="Select duration type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Full Day</SelectItem>
                      <SelectItem value="2">First Half</SelectItem>
                      <SelectItem value="3">Second Half</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scope">Scope</Label>
                  <Select
                    value={String(scope)}
                    onValueChange={(value) => setScope(parseInt(value) as HOLIDAY_SCOPE)}
                  >
                    <SelectTrigger id="scope" className="w-full">
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(HOLIDAY_SCOPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  disabled={loading || !name.trim() || !holidayDate || !durationType || !activeCalendarId}
                >
                  {loading && <Loader className="animate-spin w-4 h-4 mr-2" />}
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Full width Holidays Table */}
      <div className="w-full">
        {!isLoading && filteredHolidays.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <EmptyState
              onClick={() => setIsDrawerOpen(true)}
              buttonTitle={canCreate ? "Add Holiday" : ""}
              title="No Holidays Created Yet"
              description="You haven't added any holidays to your system. Add your first holiday."
            />
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>

              {isLoading ? (
                <TableBody>
                  {skeletonRows.map((_, idx) => (
                    <TableRow key={idx} className="animate-pulse">
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              ) : (
                <TableBody>
                  {filteredHolidays.map((holiday: any) => (
                    <TableRow key={holiday.id} className="hover:bg-gray-50">
                      <TableCell>{holiday.name || holiday.title}</TableCell>
                      <TableCell>{formatHolidayDate(holiday)}</TableCell>
                      <TableCell>
                        {holiday.scope
                          ? HOLIDAY_SCOPE_LABELS[holiday.scope as HOLIDAY_SCOPE] || "-"
                          : holiday.durationType === 1
                          ? "Full Day"
                          : holiday.durationType === 2
                          ? "First Half"
                          : holiday.durationType === 3
                          ? "Second Half"
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getBadgeVariant(
                            HOLIDAY_STATUS_LABELS[
                              holiday.status as HOLIDAY_STATUS
                            ].toLowerCase(),
                          )}
                        >
                          {HOLIDAY_STATUS_LABELS[
                            holiday.status as HOLIDAY_STATUS
                          ] || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(holiday.createdAt).toLocaleDateString()}
                      </TableCell>
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
                                onClick={() =>
                                  holiday.status === HOLIDAY_STATUS.PENDING &&
                                  openModal(
                                    "status",
                                    holiday,
                                    HOLIDAY_STATUS.APPROVED,
                                  )
                                }
                                disabled={
                                  holiday.status !== HOLIDAY_STATUS.PENDING
                                }
                                className="flex items-center gap-2"
                              >
                                <CircleCheck className="w-4 h-4 text-primary" />
                                Approve
                              </DropdownMenuItem>
                            </PermissionGuard>
                            <PermissionGuard moduleId={20} action="update">
                              <DropdownMenuItem
                                onClick={() =>
                                  holiday.status === HOLIDAY_STATUS.PENDING &&
                                  openModal(
                                    "status",
                                    holiday,
                                    HOLIDAY_STATUS.DECLINED,
                                  )
                                }
                                disabled={
                                  holiday.status !== HOLIDAY_STATUS.PENDING
                                }
                                className="flex items-center gap-2"
                              >
                                <XCircle className="w-4 h-4 text-red-600" />
                                Decline
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
            <div className="items-center border-t px-4 pb-4">
              <Pagination
                start={start}
                limit={limit}
                total={trimmedSearch ? filteredHolidays.length : holidays?.length || 0}
                pagination={pagination}
                onPageChange={(newStart) => setStart(newStart)}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setStart(1);
                }}
              />
            </div>
          </div>
        )}
      </div>
      {/* Status Change Dialog */}
      {modalState.holiday && modalState.action === "status" && (
        <Dialog
          open={!!modalState.holiday}
          onOpenChange={(open) => {
            if (!open) {
              setModalState({ action: null, holiday: null });
              setRejectionReason("");
              setNewStatus(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Change Holiday Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {newStatus === HOLIDAY_STATUS.APPROVED
                  ? `Are you sure you want to approve "${modalState.holiday.name}"?`
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
                  <p className="text-xs text-gray-500">
                    Minimum 5 characters required
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setModalState({ action: null, holiday: null });
                  setRejectionReason("");
                  setNewStatus(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={
                  statusLoading ||
                  (newStatus === HOLIDAY_STATUS.DECLINED &&
                    rejectionReason.trim().length < 5)
                }
              >
                {statusLoading && (
                  <Loader className="animate-spin w-5 h-5 mr-2" />
                )}
                {newStatus === HOLIDAY_STATUS.APPROVED ? "Approve" : "Decline"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
