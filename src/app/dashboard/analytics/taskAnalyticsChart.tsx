"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
} from "@/components/ui/chart";
import { Pie, PieChart, Cell } from "recharts";
import { useMemo } from "react";

export function TaskAnalyticsChart({ data }: { data: any[] }) {
  const chartConfig = {
    onTime: {
      label: "On Time",
      color: "hsl(142, 76%, 36%)", // Green
    },
    pending: {
      label: "Pending",
      color: "hsl(38, 92%, 50%)", // Yellow/Orange
    },
    delayed: {
      label: "Delayed",
      color: "hsl(0, 84%, 60%)", // Red
    },
    totalTasks: {
      label: "Total Tasks",
      color: "hsl(217, 91%, 60%)", // Blue
    },
  };
  // Transform data for pie chart - when isData is false, data comes as single aggregated object
  const pieData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Check if data has reportLabel (aggregated format when isData=false)
    if (data[0]?.reportLabel) {
      // Single aggregated object for type 2 - task analytics has different fields
      const item = data[0];
      const aggregated = {
        onTime: item.totalOnTime || 0,
        delayed: item.totalDelayed || 0,
        pending: item.totalPending || 0,
        totalTasks: item.totalTasks || 0,
      };

      // Transform to pie chart format with actual colors
      return [
        {
          name: "On Time",
          value: aggregated.onTime,
          fill: chartConfig.onTime.color,
        },
        {
          name: "Pending",
          value: aggregated.pending,
          fill: chartConfig.pending.color,
        },
        {
          name: "Delayed",
          value: aggregated.delayed,
          fill: chartConfig.delayed.color,
        },
        {
          name: "Total Tasks",
          value: aggregated.totalTasks,
          fill: chartConfig.totalTasks?.color || "hsl(217, 91%, 60%)",
        },
      ].filter((item) => item.value > 0); // Only show segments with data
    }

    // Original format: group by status (when isData=true but showing chart)
    const statusCounts = data?.reduce((acc: any, item: any) => {
      const status = item.performanceStatus?.toLowerCase() || "";
      if (status.includes("completed") || status.includes("on time")) {
        acc.onTime = (acc.onTime || 0) + 1;
      } else if (status.includes("pending")) {
        acc.pending = (acc.pending || 0) + 1;
      } else if (status.includes("delayed")) {
        acc.delayed = (acc.delayed || 0) + 1;
      } else if (status.includes("cancelled")) {
        acc.cancelled = (acc.cancelled || 0) + 1;
      }
      return acc;
    }, {});

    return [
      {
        name: "On Time",
        value: statusCounts.onTime || 0,
        fill: chartConfig.onTime.color,
      },
      {
        name: "Pending",
        value: statusCounts.pending || 0,
        fill: chartConfig.pending.color,
      },
      {
        name: "Delayed",
        value: statusCounts.delayed || 0,
        fill: chartConfig.delayed.color,
      },
    ].filter((item) => item.value > 0);
  }, [data]);

  if (pieData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        No data available for chart
      </div>
    );
  }

  // Get reportLabel from data if available
  const reportLabel = data[0]?.reportLabel || "Analytics Summary";

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Side - Report Label and Legend */}
        <div className="w-full lg:w-1/3 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {reportLabel}
            </h3>
          </div>
          <div className="space-y-3">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className="h-4 w-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.fill }}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">
                    {item.name}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({item.value})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Pie Chart */}
        <div className="w-full lg:w-2/3">
          <ChartContainer config={chartConfig} className="h-[600px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={180}
                innerRadius={90}
                label={({ name }) => name}
                labelLine={true}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
