"use client";
import React, { useMemo, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import dynamic from "next/dynamic";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import { RoutesEnum } from "@/lib/enums/routes.enum";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
const breadcrumbs = [
  { name: "", href: "/dashboard", icon: true },
  { name: "Workflow", href: RoutesEnum.Workflow },
  { name: "Workflow Timeline", href: null },
];
type GanttStep = {
  id: string;
  name: string;
  stepStatus: string;
  actualStartDateTime: string | null;
  actualEndDateTime: string | null;
  scheduleStartDateTime: string | null;
  scheduleEndDateTime: string | null;
};

type GanttShareDetails = {
  fmsName: string;
  indentName: string;
  sharedWith: string;
  generatedOn: string;
  linkExpiry: string;
  owner?: string;
  org?: string;
  totalSteps?: number;
  completedSteps?: number;
};

type ShareGanttResponse = {
  data?:
  | {
    shareDetails?: GanttShareDetails;
    steps?: GanttStep[];
  }
  | GanttStep[];
};

const fallbackSteps: GanttStep[] = [];

const statusColorMap: Record<string | number, string> = {
  // numeric keys (FMSSTATUSVALUE)
  1: "#6b7280",  // NOTSTARTED - Gray
  2: "#3b82f6",  // INPROGRESS - Blue
  3: "#22c55e",  // COMPLETED - Green
  4: "#a855f7",  // SCHEDULED - Purple
  5: "#3b82f6",  // IN_PROGRESS - Blue
  6: "#f59e0b",  // PENDING - Yellow
  7: "#ef4444",  // CANCELLED - Red
  8: "#6b7280",  // NOTAPPLICABLE - Gray
  // legacy string keys
  completed: "#22c55e",
  in_progress: "#3b82f6",
  inprogress: "#3b82f6",
  scheduled: "#a855f7",
  failed: "#ef4444",
  pending: "#f59e0b",
  default: "#6b7280",
};

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const GanttChartPage = () => {
  const params = useParams<{ id: string }>();
  const shareId = params?.id;
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 });

  const { hasAccess: canRead } = useModulePermissions(1);

  const { data: ganttResponse, isLoading } = useApiQuery<ShareGanttResponse>(
    ["FMS_GANTT_SHARE", shareId],
    shareId ? `${API_ENDPOINTS.FMS_GANTT_CHART}/${shareId}` : "",
    {
      enabled: Boolean(shareId) && canRead,
    },
  );

  const steps = useMemo<GanttStep[]>(() => {
    let payload: any = ganttResponse?.data;
    payload =
      payload && payload.length > 0
        ? [...payload].sort((a, b) => Number(a.sequence) - Number(b.sequence))
        : [];
    const extracted: GanttStep[] = Array.isArray(payload)
      ? (payload as GanttStep[])
      : Array.isArray((payload as any)?.steps)
        ? ((payload as { steps: GanttStep[] }).steps ?? [])
        : [];

    const normalized = (extracted.length ? extracted : fallbackSteps).map(
      (step: GanttStep, index: number) => {
        const safeStart =
          step.scheduleStartDateTime ??
          step.actualStartDateTime ??
          fallbackSteps[0]?.scheduleStartDateTime;
        const safeEnd =
          step.scheduleEndDateTime ??
          step.actualEndDateTime ??
          safeStart ??
          fallbackSteps[0]?.scheduleEndDateTime;

        return {
          ...step,
          id: step.id ?? `step-${index}`,
          scheduleStartDateTime: safeStart,
          scheduleEndDateTime: safeEnd,
        };
      },
    );

    return normalized.sort((a: GanttStep, b: GanttStep) => {
      const aTime = new Date(a.scheduleStartDateTime ?? "").getTime();
      const bTime = new Date(b.scheduleStartDateTime ?? "").getTime();
      return aTime - bTime;
    });
  }, [ganttResponse]);

  const getStatusColor = (status: string | number) => {
    const numericStatus = Number(status);
    if (!isNaN(numericStatus) && statusColorMap[numericStatus]) {
      return statusColorMap[numericStatus];
    }
    return statusColorMap[typeof status === "string" ? status.toLowerCase() : status] ?? statusColorMap.default;
  };

  const getStatusLabel = (status?: string) =>
    (status?.replace(/_/g, " ") || "pending").toUpperCase();

  // Calculate date range for timeline
  const timelineBounds = useMemo(() => {
    if (!steps.length) {
      const now = new Date();
      return {
        start: now,
        end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      };
    }
    const startTimes = steps
      .map((step) => step.scheduleStartDateTime ?? step.actualStartDateTime)
      .filter(Boolean)
      .map((value) => new Date(value as string).getTime());

    const endTimes = steps
      .map((step) => step.scheduleEndDateTime ?? step.actualEndDateTime)
      .filter(Boolean)
      .map((value) => new Date(value as string).getTime());

    const start = startTimes.length
      ? new Date(Math.min(...startTimes))
      : new Date();
    const end = endTimes.length
      ? new Date(Math.max(...endTimes))
      : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    return { start, end };
  }, [steps]);

  // Generate month and week labels with proper date ranges
  const monthWeekLabels = useMemo(() => {
    const labels: {
      month: string;
      weeks: { weekNum: number; startDate: Date; endDate: Date }[];
      year: number;
      startDate: Date;
      endDate: Date;
    }[] = [];
    if (!timelineBounds.start || !timelineBounds.end) return labels;

    const firstOfMonth = new Date(
      timelineBounds.start.getFullYear(),
      timelineBounds.start.getMonth(),
      1,
    );
    const endBoundary = new Date(
      timelineBounds.end.getFullYear(),
      timelineBounds.end.getMonth() + 1,
      1,
    );

    let cursor = firstOfMonth;
    while (cursor < endBoundary) {
      const nextMonth = new Date(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        1,
      );
      const monthStart = new Date(
        Math.max(cursor.getTime(), timelineBounds.start.getTime()),
      );
      const monthEnd = new Date(
        Math.min(nextMonth.getTime(), timelineBounds.end.getTime()),
      );

      // Calculate weeks for this month
      const weeks: { weekNum: number; startDate: Date; endDate: Date }[] = [];
      let weekStart = new Date(monthStart);
      let weekNum = 1;

      while (weekStart < monthEnd) {
        const weekEnd = new Date(
          Math.min(
            weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1,
            monthEnd.getTime(),
          ),
        );
        weeks.push({
          weekNum,
          startDate: new Date(weekStart),
          endDate: new Date(weekEnd),
        });
        weekStart = new Date(weekEnd.getTime() + 1);
        weekNum++;
      }

      labels.push({
        month: cursor.toLocaleString("default", { month: "long" }),
        weeks,
        year: cursor.getFullYear(),
        startDate: monthStart,
        endDate: monthEnd,
      });

      cursor = nextMonth;
    }

    return labels;
  }, [timelineBounds]);

  // Transform steps to ApexCharts Gantt format
  const ganttSeries = useMemo(() => {
    const data = steps.map((step) => {
      const startDate = step.scheduleStartDateTime ?? step.actualStartDateTime;
      const endDate =
        step.scheduleEndDateTime ?? step.actualEndDateTime ?? startDate;

      return {
        x: step.name,
        y: [
          startDate ? new Date(startDate).getTime() : Date.now(),
          endDate ? new Date(endDate).getTime() : Date.now() + 86400000,
        ],
        fillColor: getStatusColor(step.stepStatus),
        status: step.stepStatus,
      };
    });

    return [
      {
        name: "Workflow Steps",
        data: data,
      },
    ];
  }, [steps]);

  const ganttOptions = useMemo(() => {
    return {
      chart: {
        type: "rangeBar" as const,
        height: Math.max(400, steps.length * 40),
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
        background: "transparent",
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "25%",
          rangeBarGroupRows: true,
          borderRadius: 4,
          columnWidth: "80%",
        },
      },
      xaxis: {
        type: "datetime" as const,
        min: timelineBounds.start.getTime(),
        max: timelineBounds.end.getTime(),
        labels: {
          show: false, // Hide default labels since we have custom header
          style: {
            colors: "#94a3b8",
            fontSize: "11px",
          },
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: {
        labels: {
          // align: "left" as const,
          maxWidth: 200,
          offsetX: 10,
          formatter: function (val: number, opts?: any) {
            // Get the actual label text from the series data
            const seriesData = opts?.w?.globals?.seriesNames?.[0];
            const dataIndex = val;
            const dataPoint =
              opts?.w?.globals?.initialSeries?.[0]?.data?.[dataIndex];
            const labelText = dataPoint?.x || String(val);

            // Wrap text at word boundaries
            const words = labelText.split(" ");
            const lines: string[] = [];
            let currentLine = "";

            words.forEach((word: string) => {
              if ((currentLine + word).length <= 30) {
                currentLine += (currentLine ? " " : "") + word;
              } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
              }
            });
            if (currentLine) lines.push(currentLine);

            return lines;
          },
          style: {
            colors: "#45556c",
            fontSize: "12px",
            fontWeight: 600,
          },
        },
      },
      grid: {
        borderColor: "rgba(0, 0, 0, 0.1)",
        strokeDashArray: 3,
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: function (val: any, opts: any) {
          const data =
            opts.w.globals.initialSeries[opts.seriesIndex].data[
            opts.dataPointIndex
            ];
          return data.x;
        },
        style: {
          colors: ["#1f2937"],
          fontSize: "12px",
          fontWeight: 600,
        },
        offsetX: 0,
        offsetY: -20,
      },
      tooltip: {
        theme: "light" as const,
        custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {
          const data =
            w.globals.initialSeries[seriesIndex].data[dataPointIndex];
          const startDate = formatDate(new Date(data.y[0]).toISOString());
          const endDate = formatDate(new Date(data.y[1]).toISOString());
          const status = data.status ? getStatusLabel(data.status) : "";

          return `
            <div class="p-3 bg-white rounded-lg border border-slate-200 shadow-lg">
              <p class="font-semibold text-slate-900 mb-1">${data.x}</p>
              <p class="text-xs text-slate-600 mb-1">${status}</p>
              <p class="text-xs text-slate-500">${startDate} - ${endDate}</p>
            </div>
          `;
        },
      },
      colors: ganttSeries[0]?.data.map((item: any) => item.fillColor) || [],
    };
  }, [ganttSeries, steps.length, timelineBounds]);

  // Calculate total timeline width for alignment
  const timelineWidth = useMemo(() => {
    if (!monthWeekLabels.length) return 800;
    const totalWeeks = monthWeekLabels.reduce((sum, item) => {
      const totalDays =
        (item.endDate.getTime() - item.startDate.getTime()) /
        (24 * 60 * 60 * 1000);
      return sum + Math.max(1, Math.ceil(totalDays / 7));
    }, 0);
    return Math.max(800, totalWeeks * 100);
  }, [monthWeekLabels]);

  // Drag handlers for chart
  const handleMouseDown = (e: React.MouseEvent) => {
    if (chartScrollRef.current) {
      setIsDragging(true);
      const rect = chartScrollRef.current.getBoundingClientRect();
      setDragStart({
        x: e.pageX - rect.left,
        scrollLeft: chartScrollRef.current.scrollLeft,
      });
      e.preventDefault();
    }
  };

  if (canRead === false) {
    return <div className="p-4 sm:p-3 mt-4"><PermissionDeniedState /></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Breadcrumbs */}
      <DynamicBreadcrumb breadcrumbs={breadcrumbs} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workflow Timeline</h1>
          <p className="text-sm text-muted-foreground">
            Timeline for the workflow.
          </p>
        </div>
      </div>
      <Separator />
      {isLoading ? (
        <div className="flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : (
        <div className="mx-auto flex flex-col gap-8">
          <section className="rounded-3xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <div className="bg-white p-6">
              {ganttSeries[0]?.data.length > 0 && (
                <div className="relative">
                  {/* Custom Month/Week Header - Sticky */}
                  {monthWeekLabels.length > 0 && (
                    <div className="sticky top-0 z-10 bg-white pb-2 mb-2">
                      <div className="overflow-x-auto -mx-6 px-6">
                        <div className="flex">
                          {/* Category column spacer to align with chart's y-axis */}
                          <div
                            className="flex-shrink-0 relative border-r border-slate-300 border-b"
                            style={{ width: "190px", minWidth: "190px" }}
                          >
                            <div className="py-2 text-xs font-semibold text-slate-700 text-left border-b border-slate-300 uppercase tracking-wide px-4">
                              Workflow Steps
                            </div>
                            <div className="py-1 text-[10px] text-slate-600 text-left uppercase tracking-wide px-4">
                              Weeks
                            </div>
                          </div>
                          {/* Timeline header */}
                          <div
                            className="inline-block flex-1"
                            style={{ minWidth: `${timelineWidth}px` }}
                          >
                            {/* Months Row */}
                            <div className="flex border-b border-slate-300 mb-1">
                              {monthWeekLabels.map((item, idx) => {
                                const totalDays =
                                  (item.endDate.getTime() -
                                    item.startDate.getTime()) /
                                  (24 * 60 * 60 * 1000);
                                const totalWeeks = Math.max(
                                  1,
                                  Math.ceil(totalDays / 7),
                                );
                                const weekWidth = 100; // Base week width
                                const monthWidth = totalWeeks * weekWidth;
                                const isFirstMonth = idx === 0;
                                return (
                                  <div
                                    key={`month-${idx}`}
                                    className={`py-2 text-xs font-semibold text-slate-700 text-center ${isFirstMonth ? "" : "border-l border-slate-300"}`}
                                    style={{
                                      width: `${monthWidth}px`,
                                      minWidth: `${monthWidth}px`,
                                    }}
                                  >
                                    {item.month} {item.year}
                                  </div>
                                );
                              })}
                            </div>
                            {/* Weeks Row */}
                            <div className="flex border-b border-slate-200 pb-2">
                              {monthWeekLabels.map((item, monthIdx) => {
                                return item.weeks.map((week, weekIdx) => {
                                  const isFirstWeek =
                                    monthIdx === 0 && weekIdx === 0;
                                  return (
                                    <div
                                      key={`week-${monthIdx}-${weekIdx}`}
                                      className={`py-1 text-left text-[10px] text-slate-600 ${isFirstWeek ? "" : "border-l border-slate-200"}`}
                                      style={{
                                        width: "100px",
                                        minWidth: "100px",
                                        paddingLeft: "8px",
                                      }}
                                    >
                                      W{week.weekNum}
                                    </div>
                                  );
                                });
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Gantt Chart */}
                  <div
                    ref={chartScrollRef}
                    className="overflow-x-auto -mx-6 px-6"
                    style={{
                      cursor: isDragging ? "grabbing" : "grab",
                    }}
                    onMouseDown={handleMouseDown}
                  >
                    <div style={{ minWidth: `${timelineWidth}px` }}>
                      <Chart
                        options={ganttOptions}
                        series={ganttSeries}
                        type="rangeBar"
                        height={Math.max(280, steps.length * 60)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default GanttChartPage;
