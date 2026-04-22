"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { HTTP_METHODS } from "@/api/methods";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecurringTypeEnum } from "@/lib/enums/routes.enum";
import { Loader2 } from "lucide-react";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

const BREADCRUMBS = [
  { name: "", href: "/dashboard", icon: true },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Task Templates", href: "/dashboard/task/template" },
  { name: "Edit Template", href: null },
];

const RECURRING_TYPE_LABELS: Record<number, string> = {
  [RecurringTypeEnum.DAILY]: "Daily",
  [RecurringTypeEnum.WEEKLY]: "Weekly",
  [RecurringTypeEnum.MONTHLY]: "Monthly",
  [RecurringTypeEnum.YEARLY]: "Yearly",
  [RecurringTypeEnum.CUSTOM]: "Custom",
};

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 7];

const EditTaskTemplatePage = () => {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);

  const { update: canUpdate } = useModulePermissions(12);
  const [errors, setErrors] = useState<{
    endDate?: string;
  }>({});
  const [formData, setFormData] = useState({
    recurringSettings: {
      recurringType: RecurringTypeEnum.WEEKLY,
      interval: 1,
      daysOfWeek: [] as number[],
      endDate: "",
    },
  });

  const { data, isLoading } = useApiQuery(
    ["TASK_TEMPLATE_DETAIL", id],
    `${API_ENDPOINTS.TASK_TEMPLATE}${id}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!id,
    } as const,
  );

  useEffect(() => {
    if (data?.data?.recurringSettings) {
      const settings = data.data.recurringSettings;
      setFormData({
        recurringSettings: {
          recurringType: settings.recurringType || RecurringTypeEnum.WEEKLY,
          interval: settings.interval || 1,
          daysOfWeek: settings.daysOfWeek || [],
          endDate: settings.endDate
            ? new Date(settings.endDate).toISOString().split("T")[0]
            : "",
        },
      });
    }
  }, [data]);

  const updateTemplate = useApiMutation(
    HTTP_METHODS.PUT,
    `${API_ENDPOINTS.TASK_TEMPLATE}${id}`,
  );

  const validateEndDate = (endDate: string, startDate?: string) => {
    if (endDate && startDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        setErrors((prev) => ({
          ...prev,
          endDate: "End date must be after start date",
        }));
        return false;
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.endDate;
          return newErrors;
        });
      }
    }
    return true;
  };

  const handleRecurringChange = (field: string, value: any) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        recurringSettings: {
          ...prev.recurringSettings,
          [field]: value,
        },
      };

      // Validate end date if start date exists
      if (field === "endDate" && data?.data?.recurringSettings?.startDate) {
        validateEndDate(
          value,
          data.data.recurringSettings.startDate
            ? new Date(data.data.recurringSettings.startDate)
              .toISOString()
              .split("T")[0]
            : undefined,
        );
      }

      return newData;
    });
  };

  const handleToggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      recurringSettings: {
        ...prev.recurringSettings,
        daysOfWeek: prev.recurringSettings.daysOfWeek.includes(day)
          ? prev.recurringSettings.daysOfWeek.filter((d) => d !== day)
          : [...prev.recurringSettings.daysOfWeek, day],
      },
    }));
  };

  const handleSubmit = () => {
    // Reset errors
    setErrors({});

    // Validate end date if start date exists
    if (
      data?.data?.recurringSettings?.startDate &&
      formData.recurringSettings.endDate
    ) {
      const startDate = new Date(data.data.recurringSettings.startDate)
        .toISOString()
        .split("T")[0];
      if (!validateEndDate(formData.recurringSettings.endDate, startDate)) {
        return;
      }
    }

    setLoading(true);

    const payload = {
      recurringSettings: {
        recurringType: formData.recurringSettings.recurringType,
        interval: formData.recurringSettings.interval,
        daysOfWeek: formData.recurringSettings.daysOfWeek.sort((a, b) => a - b),
        endDate: formData.recurringSettings.endDate,
      },
    };

    updateTemplate.mutate(payload, {
      onSuccess: () => {
        setLoading(false);
        router.push(`/dashboard/task/template/${id}`);
      },
      onError: (err) => {
        console.error("Failed to update task template:", err);
        setLoading(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No data found for this task template.
      </div>
    );
  }

  if (canUpdate === false) {
    return <div className="p-4 sm:p-6 mt-4"><PermissionDeniedState /></div>;
  }

  const templateInfo = data?.data || {};
  const existingRecurringSettings = templateInfo?.recurringSettings || {};
  const startDate = existingRecurringSettings.startDate
    ? new Date(existingRecurringSettings.startDate).toISOString().split("T")[0]
    : "";

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <DynamicBreadcrumb breadcrumbs={BREADCRUMBS} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Edit Task Template
          </h1>
          <p className="text-sm text-muted-foreground">
            Update recurring settings for "{templateInfo?.title || "Template"}"
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Recurring Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Recurring Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="recurringType">Recurring Type</Label>
                <Select
                  value={String(formData.recurringSettings.recurringType)}
                  onValueChange={(value) =>
                    handleRecurringChange("recurringType", parseInt(value))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select recurring type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RECURRING_TYPE_LABELS).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col space-y-2">
                <Label htmlFor="interval">Interval</Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  placeholder="e.g., 1"
                  value={formData.recurringSettings.interval}
                  onChange={(e) =>
                    handleRecurringChange(
                      "interval",
                      parseInt(e.target.value) || 1,
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {formData.recurringSettings.recurringType ===
                    RecurringTypeEnum.WEEKLY
                    ? "Every X weeks"
                    : formData.recurringSettings.recurringType ===
                      RecurringTypeEnum.MONTHLY
                      ? "Every X months"
                      : formData.recurringSettings.recurringType ===
                        RecurringTypeEnum.YEARLY
                        ? "Every X years"
                        : "Interval"}
                </p>
              </div>
            </div>

            {formData.recurringSettings.recurringType ===
              RecurringTypeEnum.WEEKLY && (
                <div className="flex flex-col space-y-2">
                  <Label>Days of Week</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {DAY_VALUES.map((day) => (
                      <div
                        key={day}
                        className="flex items-center space-x-2 p-2 rounded border hover:bg-muted/50"
                      >
                        <Checkbox
                          id={`day-${day}`}
                          checked={formData.recurringSettings.daysOfWeek.includes(
                            day,
                          )}
                          onCheckedChange={() => handleToggleDay(day)}
                        />
                        <Label
                          htmlFor={`day-${day}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {DAY_NAMES[day - 1]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {startDate && (
                <div className="flex flex-col space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Start date cannot be changed
                  </p>
                </div>
              )}

              <div className="flex flex-col space-y-2">
                <Label htmlFor="endDate">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.recurringSettings.endDate}
                  onChange={(e) =>
                    handleRecurringChange("endDate", e.target.value)
                  }
                  className={errors.endDate ? "border-red-500" : ""}
                  min={startDate || new Date().toISOString().split("T")[0]}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-500">{errors.endDate}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/task/template/${id}`)}
            disabled={loading}
          >
            Cancel
          </Button>
          <PermissionGuard moduleId={12} action="update">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Template
            </Button>
          </PermissionGuard>
        </div>
      </div>
    </div>
  );
};

export default EditTaskTemplatePage;
