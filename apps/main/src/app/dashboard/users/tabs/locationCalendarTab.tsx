"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
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

type LocationItem = {
  id?: string | number;
  title?: string;
  name?: string;
  timeZone?: string;
  type?: number;
};

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
  id: string;
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
  const [viewMoreSheet, setViewMoreSheet] = useState<{ open: boolean; title: string; events: any[] }>({ open: false, title: "", events: [] });
  const [detailMode, setDetailMode] = useState<CalendarDetailMode>("overview");
  const [calendarSearch, setCalendarSearch] = useState("");
  const [holidayCreateSignal, setHolidayCreateSignal] = useState(0);
  const [holidayRefreshSignal, setHolidayRefreshSignal] = useState(0);
  const [shiftCreateSignal, setShiftCreateSignal] = useState(0);
  const [shiftRefreshSignal, setShiftRefreshSignal] = useState(0);

  const { data, isLoading } = useApiQuery(
    ["LocationCalendarLocations", 1, 1000],
    `${API_ENDPOINTS.COMPANY_LOCATION}?start=1&limit=1000`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  const locations: LocationItem[] = useMemo(() => {
    const source = data?.data;
    if (Array.isArray(source)) return source;
    if (Array.isArray(source?.locations)) return source.locations;
    return [];
  }, [data]);

  const calendarLists = useMemo<CalendarListItem[]>(
    () =>
      locations.map((location, index) => ({
        id: String(location.id),
        label: location.title || location.name || "Unnamed Location",
        timezone: location.timeZone || "UTC",
        color: CALENDAR_COLORS[index % CALENDAR_COLORS.length],
      })),
    [locations],
  );

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

  const { data: holidayDetailData } = useApiQuery(
    ["LocationCalendarHolidayDetail", selectedCalendarId],
    `${API_ENDPOINTS.COMPANY_HOLIDAY}?start=1&limit=20&locationId=${selectedCalendarId}`,
    {
      enabled: Boolean(selectedCalendarId) && isDetailsOpen,
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  const { data: shiftDetailData } = useApiQuery(
    ["LocationCalendarShiftDetail", selectedCalendarId],
    `${API_ENDPOINTS.COMPANY_SHIFT}?start=1&limit=20&locationId=${selectedCalendarId}`,
    {
      enabled: Boolean(selectedCalendarId) && isDetailsOpen,
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  const filteredCalendarLists = useMemo(() => {
    const query = calendarSearch.trim().toLowerCase();
    if (!query) return calendarLists;

    return calendarLists.filter((calendar) => {
      const searchable = `${calendar.label} ${calendar.timezone}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [calendarLists, calendarSearch]);

  const staticEvents = useMemo<CalendarEvent[]>(() => {
    const publicHolidays = [
      "Republic Day", "Holi Festival", "Eid al-Fitr", 
      "Independence Day", "Gandhi Jayanti", "Diwali", "Christmas"
    ];
    const companyHolidays = [
      "NitroBerry Founders Day", "Annual Team Retreat", 
      "Quarterly Off", "Strategic Planning Day", "Culture Day"
    ];
    const userHolidays = [
      { title: "Personal Time Off", userName: "Piyush Sharma" },
      { title: "Sick Leave", userName: "Dushyant Jangid" },
      { title: "Maternity Leave", userName: "Anjali Gupta" },
      { title: "Vacation", userName: "Rahul Verma" },
      { title: "Emergency Leave", userName: "Sonia Mehra" },
      { title: "Casual Leave", userName: "Vikram Singh" },
      { title: "Extended PTO", userName: "Rohan Das" },
    ];

    return calendarLists.flatMap((calendar, index) => {
      const today = new Date();
      const events: CalendarEvent[] = [];

      // Cluster multiple events on the same days so "view more" triggers in all views
      // Day 0 (today): 5 events
      const day0 = toDateKey(today);
      events.push({ id: `${calendar.id}-pub-0`, calendarId: calendar.id, title: publicHolidays[index % publicHolidays.length], date: day0, kind: "holiday", type: 1 });
      events.push({ id: `${calendar.id}-comp-0`, calendarId: calendar.id, title: companyHolidays[index % companyHolidays.length], date: day0, kind: "holiday", type: 2 });
      events.push({ id: `${calendar.id}-user-0`, calendarId: calendar.id, title: userHolidays[index % userHolidays.length].title, date: day0, kind: "holiday", type: 3, userName: userHolidays[index % userHolidays.length].userName });
      events.push({ id: `${calendar.id}-user-1`, calendarId: calendar.id, title: userHolidays[(index + 1) % userHolidays.length].title, date: day0, kind: "holiday", type: 3, userName: userHolidays[(index + 1) % userHolidays.length].userName });
      events.push({ id: `${calendar.id}-pub-1`, calendarId: calendar.id, title: publicHolidays[(index + 1) % publicHolidays.length], date: day0, kind: "holiday", type: 1 });

      // Day +1: 4 events
      const day1 = toDateKey(addDays(today, 1));
      events.push({ id: `${calendar.id}-pub-2`, calendarId: calendar.id, title: publicHolidays[(index + 2) % publicHolidays.length], date: day1, kind: "holiday", type: 1 });
      events.push({ id: `${calendar.id}-comp-1`, calendarId: calendar.id, title: companyHolidays[(index + 1) % companyHolidays.length], date: day1, kind: "holiday", type: 2 });
      events.push({ id: `${calendar.id}-user-2`, calendarId: calendar.id, title: userHolidays[(index + 2) % userHolidays.length].title, date: day1, kind: "holiday", type: 3, userName: userHolidays[(index + 2) % userHolidays.length].userName });
      events.push({ id: `${calendar.id}-user-3`, calendarId: calendar.id, title: userHolidays[(index + 3) % userHolidays.length].title, date: day1, kind: "holiday", type: 3, userName: userHolidays[(index + 3) % userHolidays.length].userName });

      // Day +2: 3 events
      const day2 = toDateKey(addDays(today, 2));
      events.push({ id: `${calendar.id}-pub-3`, calendarId: calendar.id, title: publicHolidays[(index + 3) % publicHolidays.length], date: day2, kind: "holiday", type: 1 });
      events.push({ id: `${calendar.id}-comp-2`, calendarId: calendar.id, title: companyHolidays[(index + 2) % companyHolidays.length], date: day2, kind: "holiday", type: 2 });
      events.push({ id: `${calendar.id}-user-4`, calendarId: calendar.id, title: userHolidays[(index + 4) % userHolidays.length].title, date: day2, kind: "holiday", type: 3, userName: userHolidays[(index + 4) % userHolidays.length].userName });

      // Day +4: scattered events for month view
      const day4 = toDateKey(addDays(today, 4));
      events.push({ id: `${calendar.id}-pub-4`, calendarId: calendar.id, title: publicHolidays[(index + 4) % publicHolidays.length], date: day4, kind: "holiday", type: 1 });
      events.push({ id: `${calendar.id}-comp-3`, calendarId: calendar.id, title: companyHolidays[(index + 3) % companyHolidays.length], date: day4, kind: "holiday", type: 2 });

      // Day +7, +14, +21 for week/month navigation
      [7, 14, 21].forEach((offset, oi) => {
        const dk = toDateKey(addDays(today, offset));
        events.push({ id: `${calendar.id}-week-${oi}-a`, calendarId: calendar.id, title: publicHolidays[(index + oi) % publicHolidays.length], date: dk, kind: "holiday", type: 1 });
        events.push({ id: `${calendar.id}-week-${oi}-b`, calendarId: calendar.id, title: companyHolidays[(index + oi) % companyHolidays.length], date: dk, kind: "holiday", type: 2 });
        events.push({ id: `${calendar.id}-week-${oi}-c`, calendarId: calendar.id, title: userHolidays[(index + oi) % userHolidays.length].title, date: dk, kind: "holiday", type: 3, userName: userHolidays[(index + oi) % userHolidays.length].userName });
        events.push({ id: `${calendar.id}-week-${oi}-d`, calendarId: calendar.id, title: userHolidays[(index + oi + 1) % userHolidays.length].title, date: dk, kind: "holiday", type: 3, userName: userHolidays[(index + oi + 1) % userHolidays.length].userName });
      });

      return events;
    });
  }, [calendarLists]);

  const selectedCalendarEvents = useMemo(
    () => staticEvents.filter((event) => event.calendarId === selectedCalendarId),
    [staticEvents, selectedCalendarId],
  );

  const detailHolidays = useMemo(() => {
    const source = holidayDetailData?.data?.managedHolidays || holidayDetailData?.data || [];
    const normalized = Array.isArray(source) ? source : [];
    const apiHolidays = normalized.length > 0 ? normalized.map((item: any) => ({
      id: String(item?.id || Math.random()),
      title: item?.name || item?.title || "Holiday",
      date: item?.date || item?.startDate || "",
      type: item?.type,
      status: item?.status,
      userName: item?.user?.name || item?.userName,
    })) : [];

    const staticHolidays = selectedCalendarEvents
      .filter((event) => event.kind === "holiday")
      .map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        type: event.type,
        userName: event.userName,
      }));

    // Merge both, prioritizing static for this specific UI requirement
    return [...staticHolidays, ...apiHolidays];
  }, [holidayDetailData, selectedCalendarEvents]);

  const detailShifts = useMemo(() => {
    const source = shiftDetailData?.data?.shifts || shiftDetailData?.data || [];
    const normalized = Array.isArray(source) ? source : [];
    if (normalized.length > 0) {
      return normalized.slice(0, 12).map((item: any, index: number) => ({
        id: String(item?.id || index),
        name: item?.name || "Shift",
        timezone: item?.timezone || "UTC",
      }));
    }

    return selectedCalendarEvents
      .filter((event) => event.kind === "shift")
      .slice(0, 12)
      .map((event) => ({ id: event.id, name: event.title, timezone: selectedCalendar?.timezone || "UTC" }));
  }, [shiftDetailData, selectedCalendarEvents, selectedCalendar?.timezone]);

  const getCalendarMetrics = (calendarId: string) => {
    const events = staticEvents.filter((event) => event.calendarId === calendarId);
    const holidays = events.filter((event) => event.kind === "holiday").length;
    const shifts = events.filter((event) => event.kind === "shift").length;
    return { holidays, shifts };
  };

  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();

    // Add static holidays always
    selectedCalendarEvents.forEach((event) => {
      if (event.kind !== "holiday") return;
      const key = event.date;
      const current = map.get(key) || [];
      // Avoid duplicates if same ID
      if (!current.some(e => e.id === event.id)) {
        current.push(event);
        map.set(key, current);
      }
    });

    // Add real holidays
    detailHolidays.forEach((holiday) => {
      if (!holiday.date) return;
      const key = holiday.date.includes('T') ? toDateKey(new Date(holiday.date)) : holiday.date;
      const current = map.get(key) || [];
      // Avoid duplicates
      if (!current.some(e => e.id === holiday.id)) {
        current.push({ ...holiday, kind: "holiday" });
        map.set(key, current);
      }
    });

    return map;
  }, [selectedCalendarEvents, detailHolidays]);

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

    const typeLabel = isPublic ? "Public Holiday" : isCompany ? "Company Holiday" : isUser ? "User Holiday" : null;
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
                    onClick={() => setViewMoreSheet({ open: true, title: `${WEEK_DAYS[day.getDay()]}, ${day.getDate()} ${MONTH_NAMES[day.getMonth()]} ${day.getFullYear()}`, events: dayEvents })}
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
                        onClick={() => setViewMoreSheet({ open: true, title: `${WEEK_DAYS[day.getDay()]}, ${day.getDate()} ${MONTH_NAMES[day.getMonth()]} ${day.getFullYear()}`, events: dayEvents })}
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
              className={`min-h-[180px] border-b border-r border-slate-200 flex flex-col transition-colors ${
                inMonth ? (isToday ? "bg-primary/5" : "bg-white hover:bg-slate-50/30") : "bg-slate-50/30 opacity-60"
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
                    onClick={() => setViewMoreSheet({
                      open: true,
                      title: `${monthName} ${year} — All Holidays`,
                      events: monthEvents,
                    })}
                    className="w-full rounded-md border border-dashed border-primary/30 bg-primary/5 py-1 text-[10px] font-bold text-primary hover:bg-primary/10 transition-colors"
                  >
                    + {monthEvents.length - 4} more holidays
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
      <div className="flex items-center justify-center py-8">
        <Loader className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <EmptyState
          onClick={() => {}}
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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={calendarSearch}
              onChange={(e) => setCalendarSearch(e.target.value)}
              placeholder="Search calendar lists..."
              className="pl-9"
            />
          </div>
          <p className="text-xs text-slate-500">{filteredCalendarLists.length} calendars</p>
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
                  const metrics = getCalendarMetrics(calendar.id);

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
                      <TableCell>{metrics.holidays}</TableCell>
                      <TableCell>{metrics.shifts}</TableCell>
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
              <div className="flex flex-wrap items-center justify-between gap-2">
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
                    onClick={() => {
                      setDetailMode("holidays");
                    }}
                  >
                    Holidays
                  </Button>
                  <Button
                    type="button"
                    variant={detailMode === "shifts" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setDetailMode("shifts");
                    }}
                  >
                    Shifts
                  </Button>
                </div>

              </div>

              {detailMode === "overview" && (
                <>
                  <div className="flex flex-wrap items-center justify-end gap-2 mb-2">
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
                      <SelectTrigger className="w-[140px] border-primary/20 bg-primary/5 text-primary font-bold hover:bg-primary/10 transition-colors">
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
                  </div>
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
                    {selectedCalendar ? renderBoard() : (
                      <div className="flex flex-col items-center justify-center py-40 text-slate-400">
                        <CalendarDays className="h-16 w-16 mb-4 opacity-10 text-primary" />
                        <p className="text-lg font-bold text-slate-900 uppercase tracking-widest opacity-20 text-center">Select a Location<br/><span className="text-sm font-medium normal-case tracking-normal">to view the global holiday calendar</span></p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {detailMode !== "overview" && (
                <>
                  <div className="flex items-center justify-end gap-2 border-t pt-4">
                    {detailMode === "holidays" ? (
                      <>
                        <PermissionGuard moduleId={20} action="create">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setHolidayCreateSignal((prev) => prev + 1)}
                            disabled={!selectedCalendarId}
                          >
                            Add Holiday
                          </Button>
                        </PermissionGuard>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => setHolidayRefreshSignal((prev) => prev + 1)}
                          aria-label="Refresh location holidays"
                          disabled={!selectedCalendarId}
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <PermissionGuard moduleId={21} action="create">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setShiftCreateSignal((prev) => prev + 1)}
                            disabled={!selectedCalendarId}
                          >
                            Create Shift
                          </Button>
                        </PermissionGuard>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => setShiftRefreshSignal((prev) => prev + 1)}
                          aria-label="Refresh location shifts"
                          disabled={!selectedCalendarId}
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>

                  {detailMode === "holidays" ? (
                    <HolidaysTab
                      createSignal={holidayCreateSignal}
                      refreshSignal={holidayRefreshSignal}
                      locationId={selectedCalendarId}
                    />
                  ) : (
                    <CompanyShiftsTab
                      createSignal={shiftCreateSignal}
                      refreshSignal={shiftRefreshSignal}
                      locationId={selectedCalendarId}
                    />
                  )}
                </>
              )}
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
                {viewMoreSheet.events.length} {viewMoreSheet.events.length === 1 ? "holiday" : "holidays"}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {viewMoreSheet.events.map((event) => renderEventCard(event))}
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
