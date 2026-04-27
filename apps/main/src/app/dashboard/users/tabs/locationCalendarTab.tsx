"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import { API_ENDPOINTS } from "@/api/endpoints";
import {
  HOLIDAY_SCOPE,
  HOLIDAY_SCOPE_LABEL,
  HOLIDAY_STATUS_LABEL,
  HOLIDAY_DURATION_LABEL,
  HolidayListType,
} from "@/api/enums";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader,
  MoreVertical,
  RefreshCcw,
  Search,
  Eye,
  Calendar,
  Clock,
  User,
  MapPin,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/not-found";
import { HolidaysTab } from "./holidaysTab";
import { CompanyShiftsTab } from "./companyShiftsTab";

type CalendarViewType = "day" | "week" | "month" | "year";
type CalendarDetailMode = "overview" | "holidays" | "shifts";

type CalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  date: string;
  kind: "holiday" | "shift";
  type?: number; // HOLIDAY_SCOPE
  status?: number; // HOLIDAY_STATUS
  userName?: string;
};

type CalendarListItem = {
  id: string;         // calendar ID
  locationId: string; // location ID (needed for shift GET query)
  label: string;
  timezone: string;
  color: string;
};

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const CALENDAR_COLORS = [
  "#0f766e",
  "#0ea5e9",
  "#7c3aed",
  "#e11d48",
  "#16a34a",
  "#ea580c",
  "#2563eb",
  "#ca8a04",
];

const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
};

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (value: Date, months: number) => {
  const next = new Date(value);
  next.setMonth(next.getMonth() + months);
  return next;
};

const addYears = (value: Date, years: number) => {
  const next = new Date(value);
  next.setFullYear(next.getFullYear() + years);
  return next;
};

const startOfWeek = (value: Date) => {
  const day = value.getDay();
  return addDays(startOfDay(value), -day);
};

const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const getViewTitle = (selectedDate: Date, viewType: CalendarViewType) => {
  if (viewType === "day") {
    return (
      <span className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-slate-900">{selectedDate.getDate()}</span>
        <span className="text-sm font-medium text-slate-500">{MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}</span>
      </span>
    );
  }

  if (viewType === "week") {
    const weekStart = startOfWeek(selectedDate);
    const weekEnd = addDays(weekStart, 6);
    return (
      <span className="flex items-center gap-2 text-xl font-semibold text-slate-900 tracking-tight">
        {weekStart.getDate()} {MONTH_NAMES[weekStart.getMonth()].slice(0, 3)}
        <span className="text-slate-300 mx-1">—</span>
        {weekEnd.getDate()} {MONTH_NAMES[weekEnd.getMonth()].slice(0, 3)} {weekEnd.getFullYear()}
      </span>
    );
  }

  if (viewType === "month") {
    return (
      <span className="text-2xl font-bold text-slate-900 tracking-tight">
        {MONTH_NAMES[selectedDate.getMonth()]} <span className="text-slate-400 font-normal">{selectedDate.getFullYear()}</span>
      </span>
    );
  }

  return <span className="text-2xl font-bold text-slate-900">{selectedDate.getFullYear()}</span>;
};

const shiftDate = (selectedDate: Date, viewType: CalendarViewType, direction: "prev" | "next") => {
  const factor = direction === "next" ? 1 : -1;
  if (viewType === "day") return addDays(selectedDate, factor);
  if (viewType === "week") return addDays(selectedDate, 7 * factor);
  if (viewType === "month") return addMonths(selectedDate, factor);
  return addYears(selectedDate, factor);
};

export function LocationCalendarTab() {
  const [viewType, setViewType] = useState<CalendarViewType>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewMoreSheet, setViewMoreSheet] = useState<{ open: boolean; title: string; events: any[]; contextDate?: Date }>({ open: false, title: "", events: [] });
  const [detailMode, setDetailMode] = useState<CalendarDetailMode>("overview");
  const [calendarSearch, setCalendarSearch] = useState("");
  const [editNameSheet, setEditNameSheet] = useState<{ open: boolean; calendarId: string; name: string }>({ open: false, calendarId: "", name: "" });
  const [editNameLoading, setEditNameLoading] = useState(false);
  const [shiftCreateSignal, setShiftCreateSignal] = useState(0);
  const [shiftRefreshSignal, setShiftRefreshSignal] = useState(0);

  const { data, isLoading, isFetching: isCalendarListFetching, refetch: refetchCalendarList } = useApiQuery(
    ["CompanyCalendars"],
    API_ENDPOINTS.COMPANY_CALENDAR,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  const calendarLists = useMemo<CalendarListItem[]>(() => {
    const source = data?.data;
    const list: any[] = Array.isArray(source)
      ? source
      : Array.isArray(source?.calendars)
        ? source.calendars
        : Array.isArray(source?.data)
          ? source.data
          : [];

    return list.map((cal: any, index: number) => ({
      id: String(cal.id),
      locationId: String(cal.location?.id || cal.locationId || cal.id),
      label: cal.name || cal.title || cal.label || "Unnamed Calendar",
      timezone: cal.timeZone || cal.timezone || "UTC",
      color: CALENDAR_COLORS[index % CALENDAR_COLORS.length],
    }));
  }, [data]);

  useEffect(() => {
    if (calendarLists.length === 0) return;
    if (!selectedCalendarId) {
      setSelectedCalendarId(calendarLists[0].id);
      return;
    }

    const exists = calendarLists.some((calendar) => calendar.id === selectedCalendarId);
    if (!exists) {
      setSelectedCalendarId(calendarLists[0].id);
    }
  }, [calendarLists, selectedCalendarId]);

  const selectedCalendar =
    calendarLists.find((calendar) => calendar.id === selectedCalendarId) || null;

  // HOLIDAY_SCOPE → event type for color rendering
  // PUBLIC(1)→1(blue), PERSONALLEAVE(2)→3(amber+userName), MULTIUSERCOMPANY(3)→2(green)
  const scopeToType = (scope: any): number => {
    const n = Number(scope);
    if (n === HOLIDAY_SCOPE.PUBLIC) return 1;
    if (n === HOLIDAY_SCOPE.PERSONALLEAVE) return 3;
    if (n === HOLIDAY_SCOPE.MULTIUSERCOMPANY) return 2;
    return 1;
  };

  const { data: holidayDetailData } = useApiQuery(
    ["LocationCalendarHolidayDetail", selectedCalendarId],
    `${API_ENDPOINTS.COMPANY_HOLIDAY}?calendarId=${selectedCalendarId}`,
    {
      enabled: Boolean(selectedCalendarId) && isDetailsOpen && detailMode === "overview",
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  // Build query params based on current view mode using HolidayListType enum
  const calendarViewQueryParams = useMemo(() => {
    const params: Record<string, any> = {
      calendarId: selectedCalendarId,
      isKanban: true,
    };
    if (viewType === "day") {
      params.type = HolidayListType.DAY;
      params.startDate = startOfDay(selectedDate).toISOString();
      params.endDate = endOfDay(selectedDate).toISOString();
    } else if (viewType === "week") {
      params.type = HolidayListType.WEEK;
      params.startDate = startOfWeek(selectedDate).toISOString();
      params.endDate = addDays(startOfWeek(selectedDate), 6).toISOString();
    } else if (viewType === "month") {
      params.type = HolidayListType.MONTH;
      params.month = selectedDate.getMonth() + 1;
      params.year = selectedDate.getFullYear();
    } else {
      params.type = HolidayListType.YEAR;
      params.year = selectedDate.getFullYear();
    }
    return params;
  }, [viewType, selectedDate, selectedCalendarId]);

  const calendarViewQueryString = useMemo(
    () => new URLSearchParams(
      Object.entries(calendarViewQueryParams).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null && v !== "") acc[k] = String(v);
        return acc;
      }, {} as Record<string, string>)
    ).toString(),
    [calendarViewQueryParams],
  );

  const { data: calendarViewHolidayData, isLoading: isCalendarLoading, isFetching: isCalendarFetching, refetch: refetchCalendarHolidays } = useApiQuery(
    ["LocationCalendarViewHolidays", selectedCalendarId, viewType, calendarViewQueryString],
    `${API_ENDPOINTS.COMPANY_CALENDAR_HOLIDAYS}?${calendarViewQueryString}`,
    {
      enabled: Boolean(selectedCalendarId) && isDetailsOpen,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 0,
    } as const,
  );

  // View-more drawer: fetch holidays for the specific day when drawer is open
  const viewMoreDayQueryString = useMemo(() => {
    const date = viewMoreSheet.contextDate;
    if (!date || !selectedCalendarId) return "";
    return new URLSearchParams({
      calendarId: selectedCalendarId,
      type: String(HolidayListType.DAY),
      startDate: startOfDay(date).toISOString(),
      endDate: endOfDay(date).toISOString(),
      isKanban: "true",
    }).toString();
  }, [viewMoreSheet.contextDate, selectedCalendarId]);

  const { data: viewMoreHolidayData, isLoading: isViewMoreLoading } = useApiQuery(
    ["LocationCalendarViewMoreHolidays", selectedCalendarId, viewMoreDayQueryString],
    `${API_ENDPOINTS.COMPANY_CALENDAR_HOLIDAYS}?${viewMoreDayQueryString}`,
    {
      enabled: viewMoreSheet.open && !!viewMoreSheet.contextDate && !!selectedCalendarId,
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  const flattenKanbanHolidays = (data: any): any[] => {
    const holidaysMap = data?.holidays;
    if (holidaysMap && typeof holidaysMap === "object" && !Array.isArray(holidaysMap)) {
      return Object.values(holidaysMap).flatMap((bucket: any) => bucket?.list || []);
    }
    // Fallback: old array-based response
    return data?.holidays || data?.managedHolidays || (Array.isArray(data) ? data : []);
  };

  const viewMoreApiEvents = useMemo(() => {
    if (!viewMoreSheet.open || !viewMoreSheet.contextDate) return null;
    const source = flattenKanbanHolidays(viewMoreHolidayData?.data);
    if (!source.length) return null;
    return source.map(normalizeHolidayItem).filter(Boolean) as CalendarEvent[];
  }, [viewMoreHolidayData, viewMoreSheet.open, viewMoreSheet.contextDate, selectedCalendarId]);

  const selectedCalendarLocationId = calendarLists.find((c) => c.id === selectedCalendarId)?.locationId || "";

  const { data: shiftDetailData } = useApiQuery(
    ["LocationCalendarShiftDetail", selectedCalendarId],
    `${API_ENDPOINTS.COMPANY_SHIFT}?start=1${selectedCalendarLocationId ? `&locationId=${selectedCalendarLocationId}` : ""}`,
    {
      enabled: Boolean(selectedCalendarId) && isDetailsOpen,
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  const updateCalendarName = useApiMutation(
    HTTP_METHODS.PUT,
    API_ENDPOINTS.COMPANY_CALENDAR_DETAIL(editNameSheet.calendarId || "placeholder"),
  );

  const handleEditNameSave = () => {
    if (!editNameSheet.calendarId || !editNameSheet.name.trim()) return;
    setEditNameLoading(true);
    updateCalendarName.mutate(
      { name: editNameSheet.name.trim() },
      {
        onSuccess: () => {
          setEditNameSheet({ open: false, calendarId: "", name: "" });
          setEditNameLoading(false);
          void refetchCalendarList();
        },
        onError: () => setEditNameLoading(false),
      },
    );
  };

  const filteredCalendarLists = useMemo(() => {
    const query = calendarSearch.trim().toLowerCase();
    if (!query) return calendarLists;

    return calendarLists.filter((calendar) => {
      const searchable = `${calendar.label} ${calendar.timezone}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [calendarLists, calendarSearch]);

  const normalizeHolidayItem = (item: any): CalendarEvent | null => {
    const rawDate = item?.startDate || item?.date || "";
    if (!rawDate) return null;
    const userName = item?.user
      ? `${item.user.firstName || ""} ${item.user.lastName || ""}`.trim() || null
      : item?.userName || null;
    const title = item?.name || item?.title || "Holiday";
    return {
      id: String(item?.id || Math.random()),
      calendarId: selectedCalendarId,
      title,
      date: rawDate.includes("T") ? toDateKey(new Date(rawDate)) : rawDate,
      kind: "holiday",
      type: scopeToType(item?.scope ?? item?.type),
      userName,
    };
  };

  const detailShifts = useMemo(() => {
    const source = shiftDetailData?.data?.shifts || shiftDetailData?.data || [];
    const normalized = Array.isArray(source) ? source : [];
    return normalized.slice(0, 12).map((item: any, index: number) => ({
      id: String(item?.id || index),
      name: item?.name || "Shift",
      timezone: item?.timezone || "UTC",
    }));
  }, [shiftDetailData]);

  const apiCalendarEvents = useMemo(() => {
    const source = flattenKanbanHolidays(calendarViewHolidayData?.data);
    return source.map(normalizeHolidayItem).filter(Boolean) as CalendarEvent[];
  }, [calendarViewHolidayData, selectedCalendarId]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    apiCalendarEvents.forEach((event) => {
      const current = map.get(event.date) || [];
      if (!current.some((e) => e.id === event.id)) {
        map.set(event.date, [...current, event]);
      }
    });
    return map;
  }, [apiCalendarEvents]);

  const renderEventCard = (event: any) => {
    const isPublic = event.type === 1;
    const isCompany = event.type === 2;
    const isUser = event.type === 3;

    const eventDate = parseDateKey(event.date);
    const dayNum = eventDate.getDate();

    let baseClass = "rounded-lg border px-3 py-2 text-[11px] font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-default select-none min-h-[48px] flex flex-col justify-center";
    let colorClass = "border-slate-300 bg-slate-50 text-slate-800";

    if (isPublic) colorClass = "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100";
    else if (isCompany) colorClass = "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100";
    else if (isUser) colorClass = "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100";

    const typeLabel = isPublic
      ? HOLIDAY_SCOPE_LABEL[HOLIDAY_SCOPE.PUBLIC]
      : isCompany
        ? HOLIDAY_SCOPE_LABEL[HOLIDAY_SCOPE.MULTIUSERCOMPANY]
        : isUser
          ? HOLIDAY_SCOPE_LABEL[HOLIDAY_SCOPE.PERSONALLEAVE]
          : null;
    const typeDotClass = isPublic ? "bg-sky-500" : isCompany ? "bg-emerald-500" : isUser ? "bg-amber-500" : "bg-slate-400";

    const hasUser = !!event.userName;
    const showDayNum = viewType === "year";

    return (
      <div
        key={event.id}
        className={`${baseClass} ${colorClass}`}
        title={`${event.title}${hasUser ? ` (${event.userName})` : ""}`}
      >
        <div className="flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            {showDayNum && (
              <span className="flex-shrink-0 text-[10px] bg-white/60 px-1.5 py-0.5 rounded-md border border-current/10 shadow-sm leading-none tabular-nums">
                {dayNum}
              </span>
            )}
            {isUser && <User className="h-3.5 w-3.5 shrink-0 text-amber-600" strokeWidth={2.5} />}
            <span className="truncate leading-tight font-bold tracking-tight">{event.title}</span>
          </div>
          {typeLabel && (
            <span className="flex-shrink-0 flex items-center gap-1 text-[9px] font-semibold opacity-70 whitespace-nowrap">
              <span className={`h-1.5 w-1.5 rounded-full ${typeDotClass} opacity-80`} />
              {typeLabel}
            </span>
          )}
        </div>

        {hasUser && (
          <div className="mt-1 flex items-center gap-1.5 border-t border-current/5 pt-1.5 overflow-hidden">
            <div className="flex-1 flex items-center gap-1.5 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 opacity-60" />
              <span className="text-[10px] font-bold opacity-80 truncate italic tracking-tighter shrink-1 min-w-0">
                {event.userName}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDayOrWeekBoard = () => {
    const days =
      viewType === "day" ? [startOfDay(selectedDate)] : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selectedDate), i));

    const isDay = viewType === "day";
    const maxVisible = isDay ? 4 : 6;

    if (isDay) {
      const day = days[0];
      const key = toDateKey(day);
      const dayEvents = eventsByDate.get(key) || [];
      const isToday = toDateKey(new Date()) === key;

      return (
        <div className="border-t border-slate-200 rounded-b-xl bg-white px-6 py-4">
          {/* Compact day header */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${isToday ? "bg-primary text-white shadow-md shadow-primary/30" : "bg-slate-100 text-slate-700"}`}>
              {day.getDate()}
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${isToday ? "text-primary" : "text-slate-500"}`}>{WEEK_DAYS[day.getDay()]}</p>
              <p className="text-[10px] text-slate-400">{MONTH_NAMES[day.getMonth()]} {day.getFullYear()}</p>
            </div>
            {dayEvents.length > 0 && (
              <span className="ml-auto text-[10px] font-bold text-primary/60 uppercase tracking-tighter">
                {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
              </span>
            )}
          </div>

          {/* Events list */}
          <div className="flex flex-col gap-2.5 max-w-2xl">
            {dayEvents.length > 0 ? (
              <>
                {dayEvents.slice(0, maxVisible).map(renderEventCard)}
                {dayEvents.length > maxVisible && (
                  <button
                    type="button"
                    onClick={() => setViewMoreSheet({ open: true, title: `${WEEK_DAYS[day.getDay()]}, ${day.getDate()} ${MONTH_NAMES[day.getMonth()]} ${day.getFullYear()}`, events: dayEvents, contextDate: day })}
                    className="w-full rounded-md border border-dashed border-primary/30 bg-primary/5 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/10 transition-colors"
                  >
                    + {dayEvents.length - maxVisible} more
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-16 text-slate-300">
                <span className="text-[10px] font-semibold uppercase tracking-widest">No events for this day</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 border-l border-t border-slate-200 rounded-b-xl leading-none">
        {days.map((day) => {
          const key = toDateKey(day);
          const dayEvents = eventsByDate.get(key) || [];
          const isToday = toDateKey(new Date()) === key;

          return (
            <div
              key={key}
              className={`min-h-[520px] border-b border-r border-slate-200 flex flex-col transition-colors ${isToday ? "bg-primary/5" : "bg-white"}`}
            >
              {/* Week column header */}
              <div className="px-3 py-3 border-b border-slate-100 flex flex-col items-center">
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isToday ? "text-primary" : "text-slate-400"}`}>
                  {WEEK_DAYS[day.getDay()]}
                </p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all ${isToday ? "bg-primary text-white shadow-md shadow-primary/30" : "text-slate-800 hover:bg-slate-100"}`}>
                  {day.getDate()}
                </div>
              </div>

              {/* Events */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-3 px-2 py-3">
                {dayEvents.length > 0 ? (
                  <>
                    {dayEvents.slice(0, maxVisible).map(renderEventCard)}
                    {dayEvents.length > maxVisible && (
                      <button
                        type="button"
                        onClick={() => setViewMoreSheet({ open: true, title: `${WEEK_DAYS[day.getDay()]}, ${day.getDate()} ${MONTH_NAMES[day.getMonth()]} ${day.getFullYear()}`, events: dayEvents, contextDate: day })}
                        className="w-full rounded-md border border-dashed border-primary/30 bg-primary/5 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/10 transition-colors mt-1"
                      >
                        + {dayEvents.length - maxVisible} more
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[9px] text-slate-300 font-semibold uppercase tracking-tighter">No Events</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthBoard = () => {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const gridStart = startOfWeek(monthStart);
    const totalDays = Math.ceil((monthEnd.getTime() - gridStart.getTime()) / 86400000) + 1;
    const allDays = Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i));

    return (
      <div className="grid grid-cols-7 border-l border-t border-slate-200 overflow-hidden rounded-b-xl leading-none">
        {allDays.map((day) => {
          const key = toDateKey(day);
          const dayEvents = eventsByDate.get(key) || [];
          const inMonth = isSameMonth(day, selectedDate);
          const isToday = toDateKey(new Date()) === key;

          return (
            <div
              key={key}
              className={`min-h-[180px] border-b border-r border-slate-200 flex flex-col transition-colors ${inMonth ? (isToday ? "bg-primary/5" : "bg-white hover:bg-slate-50/30") : "bg-slate-50/30 opacity-60"
                }`}
            >
              <div className="px-2 py-2 flex items-center justify-between">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all ${isToday ? "bg-primary text-white" : inMonth ? "text-slate-800" : "text-slate-400 font-medium"}`}>
                  {day.getDate()}
                </div>
                {inMonth && dayEvents.length > 0 && (
                  <span className="text-[9px] font-bold text-primary/60 pr-1 uppercase tracking-tighter">
                    {dayEvents.length} {dayEvents.length === 1 ? 'Event' : 'Events'}
                  </span>
                )}
              </div>
              <div className="flex-1 px-1.5 pb-1.5 flex flex-col gap-1.5 overflow-y-auto">
                {inMonth && dayEvents.slice(0, 3).map(renderEventCard)}
                {inMonth && dayEvents.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setViewMoreSheet({
                      open: true,
                      title: `${WEEK_DAYS[day.getDay()]}, ${day.getDate()} ${MONTH_NAMES[day.getMonth()]} ${day.getFullYear()}`,
                      events: dayEvents,
                      contextDate: day,
                    })}
                    className="w-full rounded-md border border-dashed border-primary/30 bg-primary/5 py-0.5 text-[9px] font-bold text-primary hover:bg-primary/10 transition-colors"
                  >
                    + {dayEvents.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderYearBoard = () => {
    const year = selectedDate.getFullYear();

    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {MONTH_NAMES.map((monthName, monthIndex) => {
          const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
          const monthEvents: any[] = [];

          eventsByDate.forEach((events, dateKey) => {
            if (dateKey.startsWith(monthKey)) {
              monthEvents.push(...events.filter(e => e.kind === "holiday"));
            }
          });

          return (
            <div key={monthName} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <div className="absolute top-0 right-0 h-16 w-16 -mr-8 -mt-8 rounded-full bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="mb-3 flex items-center justify-between relative z-10">
                <p className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors">{monthName}</p>
                <div className="flex h-6 items-center rounded-full bg-primary/10 px-2.5 text-[10px] font-bold text-primary">
                  {monthEvents.length} {monthEvents.length === 1 ? "Holiday" : "Holidays"}
                </div>
              </div>
              <div className="relative z-10 space-y-1.5 min-h-[100px]">
                {monthEvents.length > 0 ? (
                  monthEvents.slice(0, 4).map(renderEventCard)
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-primary/40">
                    <CalendarDays className="h-6 w-6 mb-1 opacity-20" />
                    <span className="text-[10px] uppercase font-bold tracking-tighter">Plan Holidays</span>
                  </div>
                )}
                {monthEvents.length > 4 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(new Date(year, monthIndex, 1));
                      setViewType("month");
                    }}
                    className="w-full rounded-md border border-dashed border-primary/30 bg-primary/5 py-1 text-[10px] font-bold text-primary hover:bg-primary/10 transition-colors"
                  >
                    + {monthEvents.length - 4} more — View {monthName}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderBoard = () => {
    if (viewType === "day" || viewType === "week") return renderDayOrWeekBoard();
    if (viewType === "month") return renderMonthBoard();
    return renderYearBoard();
  };

  const openCalendarView = (
    calendarId: string,
    nextDetailMode: CalendarDetailMode = "overview",
  ) => {
    setSelectedCalendarId(calendarId);
    setDetailMode(nextDetailMode);
    setIsDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="h-9 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>{["Calendar Name", "Timezone", "Holidays", "Shifts", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-sm font-medium text-gray-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t animate-pulse">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-3/4" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (calendarLists.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <EmptyState
          onClick={() => { }}
          buttonTitle=""
          title="No Location Calendars Yet"
          description="Add company locations first. A calendar is auto-created for each location."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <Input
              value={calendarSearch}
              onChange={(e) => setCalendarSearch(e.target.value)}
              placeholder="Search calendar lists..."
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => void refetchCalendarList()}
            aria-label="Refresh calendars"
            disabled={isCalendarListFetching}
          >
            <RefreshCcw className={`h-4 w-4 ${isCalendarListFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {filteredCalendarLists.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-white px-4 py-8 text-center text-sm text-slate-500">
            No calendar lists found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead>Calendar Name</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Holidays</TableHead>
                  <TableHead>Shifts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalendarLists.map((calendar) => {
                  return (
                    <TableRow key={calendar.id} className="hover:bg-gray-50">
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => openCalendarView(calendar.id, "overview")}
                          className="text-left font-medium text-slate-900 transition-colors hover:text-primary hover:underline"
                        >
                          {calendar.label}
                        </button>
                      </TableCell>
                      <TableCell>{calendar.timezone}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="p-1">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openCalendarView(calendar.id, "overview")}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4 text-primary" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setEditNameSheet({ open: true, calendarId: calendar.id, name: calendar.label })}
                              className="flex items-center gap-2"
                            >
                              <Clock3 className="h-4 w-4 text-slate-500" /> Edit Name
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openCalendarView(calendar.id, "holidays")}
                              className="flex items-center gap-2"
                            >
                              <Calendar className="h-4 w-4 text-primary" /> Manage Holidays
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openCalendarView(calendar.id, "shifts")}
                              className="flex items-center gap-2"
                            >
                              <Clock className="h-4 w-4 text-primary" /> Manage Shifts
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Sheet
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) {
            setDetailMode("overview");
          }
        }}
      >
        <SheetContent side="right" className="w-[96vw] gap-0 p-0 sm:max-w-[calc(100%-220px)]">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle>
                {selectedCalendar ? `${selectedCalendar.label} Calendar` : "Calendar Details"}
              </SheetTitle>
              <SheetDescription>
                Manage calendar schedule, holidays, and shifts in a focused detail view.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border bg-white p-1">
                  <Button
                    type="button"
                    variant={detailMode === "overview" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setDetailMode("overview")}
                  >
                    Calendar
                  </Button>
                  <Button
                    type="button"
                    variant={detailMode === "holidays" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setDetailMode("holidays")}
                  >
                    Holidays
                  </Button>
                  <Button
                    type="button"
                    variant={detailMode === "shifts" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setDetailMode("shifts")}
                  >
                    Shifts
                  </Button>
                </div>

                {detailMode === "overview" && (
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(new Date())}
                      className="border-primary/20 text-primary font-bold hover:bg-primary/5"
                    >
                      Today
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setSelectedDate((prev) => shiftDate(prev, viewType, "prev"))}
                      aria-label="Previous period"
                      className="border-slate-200 text-slate-600 hover:text-primary hover:border-primary/20"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setSelectedDate((prev) => shiftDate(prev, viewType, "next"))}
                      aria-label="Next period"
                      className="border-slate-200 text-slate-600 hover:text-primary hover:border-primary/20"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Select
                      value={viewType}
                      onValueChange={(value) => setViewType(value as CalendarViewType)}
                    >
                      <SelectTrigger className="w-[120px] border-primary/20 bg-primary/5 text-primary font-bold hover:bg-primary/10 transition-colors">
                        <SelectValue placeholder="View type" />
                      </SelectTrigger>
                      <SelectContent className="border-primary/10">
                        <SelectItem value="day" className="focus:bg-primary/10 focus:text-primary">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 opacity-60" />
                            <span>Day</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="week" className="focus:bg-primary/10 focus:text-primary">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-3.5 w-3.5 opacity-60" />
                            <span>Week</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="month" className="focus:bg-primary/10 focus:text-primary">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 opacity-60" />
                            <span>Month</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="year" className="focus:bg-primary/10 focus:text-primary">
                          <div className="flex items-center gap-2">
                            <LayoutGrid className="h-3.5 w-3.5 opacity-60" />
                            <span>Year</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => void refetchCalendarHolidays()}
                      aria-label="Refresh calendar"
                      disabled={isCalendarFetching}
                    >
                      <RefreshCcw className={`h-4 w-4 ${isCalendarFetching ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                )}
              </div>

              {detailMode === "overview" && (
                <>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                    <div className="mb-0 flex flex-wrap items-center justify-between gap-3 px-6 py-6 border-b border-slate-100">
                      <div>
                        <h3 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">
                          {getViewTitle(selectedDate, viewType)}
                        </h3>
                        <div className="mt-3 flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
                            {selectedCalendar ? `${selectedCalendar.label}` : "Global View"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-[10px] font-bold text-slate-500 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full bg-sky-500 shadow-sm shadow-sky-200" /> Public
                        </div>
                        <div className="flex items-center gap-2 border-l pl-6">
                          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" /> Company
                        </div>
                        <div className="flex items-center gap-2 border-l pl-6">
                          <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-200" /> User
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50/10">
                      {selectedCalendar ? (
                        (isCalendarLoading || isCalendarFetching) ? (
                          viewType === "day" ? (
                            /* Day skeleton — mirrors day view: header row + full-height body */
                            <div className="border-t border-slate-200 rounded-b-xl bg-white px-6 py-4 animate-pulse">
                              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                                <div className="space-y-1.5">
                                  <Skeleton className="h-3 w-16" />
                                  <Skeleton className="h-2.5 w-24" />
                                </div>
                              </div>
                              <Skeleton className="h-48 w-full max-w-2xl rounded-xl" />
                            </div>
                          ) : viewType === "week" ? (
                            /* Week skeleton — 7 column cards, each with header + solid body block */
                            <div className="grid grid-cols-7 border-l border-t border-slate-200 rounded-b-xl animate-pulse">
                              {Array.from({ length: 7 }).map((_, i) => (
                                <div key={i} className="min-h-[520px] border-b border-r border-slate-200 flex flex-col bg-white">
                                  <div className="px-3 py-3 border-b border-slate-100 flex flex-col items-center gap-1.5">
                                    <Skeleton className="h-2.5 w-8" />
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                  </div>
                                  <div className="flex-1 px-2 py-3">
                                    <Skeleton className="h-full w-full rounded-lg min-h-[420px]" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : viewType === "month" ? (
                            /* Month skeleton — 7-col grid, each cell: date circle + solid body */
                            <div className="grid grid-cols-7 border-l border-t border-slate-200 rounded-b-xl overflow-hidden animate-pulse">
                              {Array.from({ length: 35 }).map((_, i) => (
                                <div key={i} className="min-h-[180px] border-b border-r border-slate-200 bg-white flex flex-col">
                                  <div className="px-2 py-2">
                                    <Skeleton className="h-6 w-6 rounded-full" />
                                  </div>
                                  <div className="flex-1 px-1.5 pb-1.5">
                                    <Skeleton className="h-full w-full rounded-md min-h-[120px]" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* Year skeleton — 12 month cards with header + solid body */
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 animate-pulse">
                              {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                                  <div className="mb-3 flex items-center justify-between">
                                    <Skeleton className="h-5 w-20" />
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                  </div>
                                  <Skeleton className="h-[100px] w-full rounded-lg" />
                                </div>
                              ))}
                            </div>
                          )
                        ) : renderBoard()
                      ) : (
                        <div className="flex flex-col items-center justify-center py-40 text-slate-400">
                          <CalendarDays className="h-16 w-16 mb-4 opacity-10 text-primary" />
                          <p className="text-lg font-bold text-slate-900 uppercase tracking-widest opacity-20 text-center">Select a Location<br /><span className="text-sm font-medium normal-case tracking-normal">to view the global holiday calendar</span></p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {detailMode !== "overview" && (
                <>

                  {detailMode === "holidays" ? (
                    <HolidaysTab
                      calendarId={selectedCalendarId}
                    />
                  ) : (
                    <CompanyShiftsTab
                      createSignal={shiftCreateSignal}
                      refreshSignal={shiftRefreshSignal}
                      calendarId={selectedCalendarId}
                      locationId={selectedCalendarLocationId}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Calendar Name Sheet */}
      <Sheet open={editNameSheet.open} onOpenChange={(open) => !open && setEditNameSheet({ open: false, calendarId: "", name: "" })}>
        <SheetContent side="right" className="w-[96vw] gap-0 p-0 sm:max-w-md">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle>Edit Calendar Name</SheetTitle>
              <SheetDescription>Update the display name for this calendar.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 px-6 py-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Calendar Name</label>
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={editNameSheet.name}
                  onChange={(e) => setEditNameSheet((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter calendar name"
                />
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditNameSheet({ open: false, calendarId: "", name: "" })} disabled={editNameLoading}>Cancel</Button>
              <Button onClick={handleEditNameSave} disabled={editNameLoading || !editNameSheet.name.trim()}>
                {editNameLoading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* View More Holidays Drawer */}
      <Sheet open={viewMoreSheet.open} onOpenChange={(open) => setViewMoreSheet((prev) => ({ ...prev, open }))}>
        <SheetContent side="right" className="w-[96vw] gap-0 p-0 sm:max-w-xl">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle className="text-base font-bold">{viewMoreSheet.title}</SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                {isViewMoreLoading
                  ? "Loading holidays..."
                  : `${(viewMoreApiEvents ?? viewMoreSheet.events).length} ${(viewMoreApiEvents ?? viewMoreSheet.events).length === 1 ? "holiday" : "holidays"}`}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {isViewMoreLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (viewMoreApiEvents ?? viewMoreSheet.events).map((event) => renderEventCard(event))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

const SHIFT_TIMINGS = {
  "Morning Shift": { start: "09:00", end: "17:00" },
  "Afternoon Shift": { start: "13:00", end: "21:00" },
  "Evening Shift": { start: "17:00", end: "01:00" },
  "Night Shift": { start: "21:00", end: "09:00" },
  "Early Morning Shift": { start: "06:00", end: "14:00" },
  "Extended Shift": { start: "08:00", end: "18:00" },
  "Rotating Shift": { start: "09:00", end: "17:00" },
  "Flexible Shift": { start: "10:00", end: "18:00" },
};

const getShiftTiming = (shiftName: string) => {
  return SHIFT_TIMINGS[shiftName as keyof typeof SHIFT_TIMINGS] || { start: "09:00", end: "17:00" };
};
