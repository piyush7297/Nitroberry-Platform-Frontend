"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

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

const fallbackShareDetails: GanttShareDetails = {
  fmsName: "Workflow Timeline",
  indentName: "Indent • —",
  sharedWith: "—",
  generatedOn: new Date().toISOString(),
  linkExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  totalSteps: 0,
  completedSteps: 0,
};

const statusColorMap: Record<string, string> = {
  completed: "#22c55e", // Green
  in_progress: "#3b82f6", // Blue
  inprogress: "#3b82f6", // Blue
  scheduled: "#a855f7", // Purple
  failed: "#ef4444", // Red
  pending: "#f59e0b", // Yellow/Orange
  default: "#6b7280", // Gray
};

const statusSurfaceMap: Record<string, string> = {
  completed: "rgba(34, 197, 94, 0.18)", // green for completed
  in_progress: "rgba(59, 130, 246, 0.18)", // blue for in progress
  inprogress: "rgba(59, 130, 246, 0.18)", // blue for in progress
  scheduled: "rgba(99, 102, 241, 0.18)", // indigo for scheduled
  failed: "rgba(239, 68, 68, 0.18)", // red for failed
  pending: "rgba(148, 163, 184, 0.18)", // gray for pending
  default: "rgba(99, 102, 241, 0.18)", // indigo as default
};

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const FmsSharePage = () => {
  const searchParams = useSearchParams();
  const shareId = searchParams?.get("token") ?? "";
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 });

  const { data: ganttResponse, isLoading } = useApiQuery<ShareGanttResponse>(
    ["FMS_GANTT_SHARE", shareId],
    shareId ? `${API_ENDPOINTS.FMS_GANTT_CHART_VIEW}?token=${shareId}` : "",
    {
      enabled: Boolean(shareId),
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

  const shareDetails = useMemo<GanttShareDetails>(() => {
    const totalSteps = steps.length;
    const completedSteps = steps.filter(
      (step) => step.stepStatus?.toLowerCase() === "completed",
    ).length;

    if (Array.isArray(ganttResponse?.data)) {
      return {
        ...fallbackShareDetails,
        totalSteps,
        completedSteps,
      };
    }
    const apiShareDetails = (ganttResponse?.data as any)
      ?.shareDetails as GanttShareDetails;
    return apiShareDetails
      ? {
          ...apiShareDetails,
          totalSteps: apiShareDetails.totalSteps ?? totalSteps,
          completedSteps: apiShareDetails.completedSteps ?? completedSteps,
        }
      : {
          ...fallbackShareDetails,
          totalSteps,
          completedSteps,
        };
  }, [ganttResponse, steps]);

  const completedSteps = useMemo(
    () =>
      steps.filter((step) => step.stepStatus?.toLowerCase() === "completed")
        .length,
    [steps],
  );

  const infoCards = useMemo(
    () => [
      {
        label: "Shared With",
        value: shareDetails.sharedWith || "—",
        helper: shareDetails.owner ? `Owner • ${shareDetails.owner}` : "",
      },
      {
        label: "Link Expires",
        value: formatDate(shareDetails.linkExpiry),
        helper: "Auto-disabled after expiry",
      },
      {
        label: "Generated On",
        value: formatDate(shareDetails.generatedOn),
        helper: shareDetails.org ?? "",
      },
      {
        label: "Progress",
        value: `${completedSteps}/${steps.length || 1} steps`,
        helper: `${Math.round(
          (completedSteps / Math.max(steps.length, 1)) * 100,
        )}% complete`,
      },
    ],
    [shareDetails, completedSteps, steps.length],
  );

  const getStatusColor = (status: string) =>
    statusColorMap[status?.toLowerCase()] ?? statusColorMap.default;

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

      // Use timeline bounds for fallback dates to ensure visibility
      const fallbackStart = timelineBounds.start.getTime();
      const fallbackEnd = timelineBounds.start.getTime() + 24 * 60 * 60 * 1000; // 1 day duration

      let startTime = startDate ? new Date(startDate).getTime() : fallbackStart;
      let endTime = endDate
        ? new Date(endDate).getTime()
        : startDate
          ? new Date(startDate).getTime() + 24 * 60 * 60 * 1000
          : fallbackEnd;

      // Ensure minimum duration of 1 hour for visibility
      const minDuration = 60 * 60 * 1000; // 1 hour in milliseconds
      if (endTime <= startTime) {
        endTime = startTime + minDuration;
      } else if (endTime - startTime < minDuration) {
        endTime = startTime + minDuration;
      }

      return {
        x: step.name,
        y: [startTime, endTime],
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
  }, [steps, timelineBounds]);

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
          barHeight: "35%",
          rangeBarGroupRows: true,
          borderRadius: 4,
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
          align: "left" as const,
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
      // yaxis: {
      //   labels: {
      //     style: {
      //       colors: "#45556c",
      //       fontSize: "12px",
      //       fontWeight: 600,
      //     },
      //   },
      // },
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

  const totalSteps = steps.length;
  const linkHealthPercent = Math.round(
    (completedSteps / Math.max(totalSteps, 1)) * 100,
  );
  const shareCompleted = shareDetails.completedSteps ?? completedSteps;
  const shareTotalSteps = shareDetails.totalSteps ?? totalSteps;

  // Show message if no token
  if (!shareId) {
    return (
      <div className="min-h-screen px-4 py-10 sm:px-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Invalid Link
          </h1>
          <p className="text-slate-600">
            No token provided. Please check your link and try again.
          </p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen px-4 py-10 sm:px-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-4"></div>
          <p className="text-slate-600">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto flex flex-col gap-8">
        <section className="rounded-3xl bg-gradient-to-br from-[#1c0b41] via-[#1a1034] to-[#0e0a1c] p-6 text-white shadow-2xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              {/* <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                Link Snapshot
              </p> */}
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {shareDetails.fmsName}
                </h1>
                {/* <p className="text-sm text-white/70">{shareDetails.indentName}</p> */}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-white/80">
                {/* <span className="rounded-full border border-white/30 px-3 py-1">
                  Share ID • {shareId ?? "—"}
                </span> */}
                <span className="rounded-full border border-white/30 px-3 py-1">
                  Steps • {shareTotalSteps}
                </span>
                <span className="rounded-full border border-white/30 px-3 py-1">
                  {shareCompleted} completed
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-white/70">
                Progress
              </p>
              <p className="text-4xl font-semibold">
                {/* {linkHealthPercent}
                % */}
                {`${completedSteps}/${steps.length || 1} steps`}
              </p>
              <p className="text-sm text-white/70">
                {/* Workflow progress synced every 4 hours */}

                {`${Math.round(
                  (completedSteps / Math.max(steps.length, 1)) * 100,
                )}% complete`}
              </p>
            </div>
          </div>
        </section>

        {/* <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {infoCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {card.value}
              </p>
              <p className="text-sm text-slate-500">{card.helper}</p>
            </div>
          ))}
        </section> */}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-5 bg-white">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Timeline
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">
                  Workflow Timeline
                </h2>
                <p className="text-sm text-slate-500">
                  Current status across scheduled milestones
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {steps.length} Tasks
                </span>
              </div>
            </div>
          </div>
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
                          style={{ width: "150px", minWidth: "150px" }}
                        >
                          <div className="py-2 text-xs font-semibold text-slate-700 text-left border-b border-slate-300 uppercase tracking-wide px-3">
                            Workflow Steps
                          </div>
                          <div className="py-1 text-[10px] text-slate-600 text-left uppercase tracking-wide px-3">
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
    </div>
  );
};

export default FmsSharePage;
