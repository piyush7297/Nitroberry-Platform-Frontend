"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { File, Loader, Info, X, Edit } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export default function BasicInfo({
  formData,
  updateForm,
  nextStep,
  buttonText = "Next Step",
  loading,
  _businessMode,
}: {
  formData: any;
  updateForm: (field: string, value: any) => void;
  nextStep: () => void;
  buttonText?: any;
  loading?: boolean;
  _businessMode?: "same" | "custom";
}) {
  const [businessMode, setBusinessMode] = useState<"same" | "custom">(
    _businessMode ?? "same",
  );
  const [nameError, setNameError] = useState<string>("");

  const getMinutesFromTime = (value?: string) => {
    if (!value) return null;
    const [hours, minutes] = value.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const daysOfWeek = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const businessHoursByDay =
    formData.workflowTemplate?.businessHours?.day || ({} as Record<string, any>);
  const activeDaysCount = daysOfWeek.filter(
    (day) => !businessHoursByDay?.[day]?.isClosed,
  ).length;
  const weeklyMinutes = daysOfWeek.reduce((total, day) => {
    const dayConfig = businessHoursByDay?.[day];
    if (!dayConfig || dayConfig.isClosed) return total;

    const start = getMinutesFromTime(dayConfig.start);
    const end = getMinutesFromTime(dayConfig.end);
    if (start === null || end === null || end <= start) return total;

    return total + (end - start);
  }, 0);
  const weeklyHoursLabel = `${(weeklyMinutes / 60).toFixed(
    Number.isInteger(weeklyMinutes / 60) ? 0 : 1,
  )} hrs`;

  // Initialize business hours if missing
  useEffect(() => {
    if (!formData.workflowTemplate?.businessHours) {
      const defaultDayConfig = {
        start: "09:00",
        end: "17:00",
        isClosed: false,
      };
      const dayObj = daysOfWeek.reduce(
        (acc, day) => {
          acc[day] =
            day === "saturday" || day === "sunday"
              ? { isClosed: true }
              : { ...defaultDayConfig };
          return acc;
        },
        {} as Record<string, any>,
      );

      updateForm("workflowTemplate", {
        ...(formData.workflowTemplate || {}),
        businessHours: {
          day: dayObj,
          timezone: "America/New_York",
        },
      });
    }
  }, [formData, updateForm]);

  const handleBusinessHoursChange = (
    day: string,
    key: string,
    value: string | boolean,
  ) => {
    const current = formData.workflowTemplate?.businessHours?.day?.[day] || {};
    let updatedDay = { ...current };

    if (key === "isClosed") {
      if (value === true) {
        // Keep only isClosed when true
        updatedDay = { isClosed: true };
      } else {
        // Reopen day with default times if missing
        updatedDay = {
          isClosed: false,
          start: current.start || "09:00",
          end: current.end || "17:00",
        };
      }
    } else {
      updatedDay = { ...current, [key]: value };
    }

    const updated = {
      ...formData.workflowTemplate.businessHours,
      day: {
        ...formData.workflowTemplate.businessHours.day,
        [day]: updatedDay,
      },
    };

    updateForm("workflowTemplate", {
      ...formData.workflowTemplate,
      businessHours: updated,
    });
  };

  const handleSameTimeChange = (type: "start" | "end", value: string) => {
    const days = formData.workflowTemplate.businessHours.day as Record<
      string,
      { start?: string; end?: string; isClosed?: boolean }
    >;

    if (!days) return;

    const [firstDay] = Object.values(days);
    const start = type === "start" ? value : firstDay?.start || "09:00";
    const end = type === "end" ? value : firstDay?.end || "17:00";

    const updatedDays = Object.fromEntries(
      Object.entries(days).map(([day, info]) => [
        day,
        { ...info, start, end, isClosed: false },
      ]),
    );

    updateForm("workflowTemplate", {
      ...formData.workflowTemplate,
      businessHours: {
        ...formData.workflowTemplate.businessHours,
        day: updatedDays,
      },
    });
  };

  // const [exceptions, setExceptions] = useState<any>([]);
  // const [current, setCurrent] = useState({
  //   type: "",
  //   rule: {
  //     frequency: "",
  //     dayOfWeek: "",
  //     weekOfMonth: "",
  //   },
  //   date: "",
  //   action: "",
  // });
  // const [editIndex, setEditIndex] = useState(null);

  // const handleAddOrUpdate = () => {
  //   if (editIndex !== null) {
  //     // update existing
  //     setExceptions((prev: any) =>
  //       prev.map((item: any, i: any) => (i === editIndex ? current : item))
  //     );
  //     setEditIndex(null);
  //   } else {
  //     // add new
  //     setExceptions((prev: any) => [...prev, current]);
  //   }

  //   // reset form
  //   setCurrent({
  //     type: "",
  //     rule: { frequency: "", dayOfWeek: "", weekOfMonth: "" },
  //     date: "",
  //     action: "",
  //   });
  // };

  // const handleDelete = (index: number) => {
  //   setExceptions((prev: any) => prev.filter((_: any, i: any) => i !== index));
  // };

  // const handleEdit = (index: any) => {
  //   setCurrent(exceptions[index]);
  //   setEditIndex(index);
  // };

  // const isFormValid = !!(
  //   current.type &&
  //   current.action &&
  //   (
  //     (current.type === "recurring" &&
  //       current.rule.frequency &&
  //       current.rule.dayOfWeek &&
  //       (current.rule.frequency !== "monthly" || current.rule.weekOfMonth)) ||
  //     (current.type === "date" && current.date)
  //   )
  // );
  return (
    <div className="space-y-8 mt-10 pb-36">
      {/* Basic Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
        <div className="md:col-span-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">FMS Configuration</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Enter the basic information for your FMS system including
                  name, priority level, and description. This information will
                  be used to identify and categorize your workflow system.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Basic information used to identify this workflow template.
          </p>
        </div>

        <div className="md:col-span-7 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Name*</Label>
              <Input
                placeholder="Write name"
                value={formData.name}
                onChange={(e) => {
                  updateForm("name", e.target.value);
                  // Clear error when user starts typing
                  if (nameError) {
                    setNameError("");
                  }
                }}
                className={
                  nameError ? "border-red-500 focus:border-red-500" : ""
                }
              />
              {nameError && <p className="text-sm text-red-500">{nameError}</p>}
            </div>

            {/* <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select
                value={String(formData.workflowTemplate?.priority || 5)}
                onValueChange={(val) =>
                  updateForm("workflowTemplate", {
                    ...formData.workflowTemplate,
                    priority: Number(val),
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Low (Standard)</SelectItem>
                  <SelectItem value="3">Medium (Normal)</SelectItem>
                  <SelectItem value="5">High (Urgent)</SelectItem>
                </SelectContent>
              </Select>
            </div> */}
          </div>

          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="Write description"
              value={formData.description}
              onChange={(e) => updateForm("description", e.target.value)}
              rows={8}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Working Hours Section */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
        <div className="md:col-span-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Working Hours</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Configure business hours and timezone for your workflow. Set
                  working hours for each day and select the appropriate
                  timezone for accurate scheduling.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Business hours are used to calculate workflow SLAs and timelines.
          </p>
        </div>

        <div className="md:col-span-7 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Set Business Hours*</Label>
                <Select
                  value={businessMode}
                  onValueChange={(val: "same" | "custom") =>
                    setBusinessMode(val)
                  }
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="same">Same for all days</SelectItem>
                    <SelectItem value="custom">
                      Set different for each day
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label>Timezone*</Label>
                <Select
                  value={
                    formData.workflowTemplate?.businessHours?.timezone ||
                    "America/New_York"
                  }
                  onValueChange={(val) =>
                    updateForm("workflowTemplate", {
                      ...formData.workflowTemplate,
                      businessHours: {
                        ...formData.workflowTemplate?.businessHours,
                        timezone: val,
                      },
                    })
                  }
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">
                      Indian Standard Time (IST)
                    </SelectItem>
                    <SelectItem value="America/New_York">
                      Eastern Time (EST)
                    </SelectItem>
                    <SelectItem value="UTC">Universal (UTC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Active Days
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {activeDaysCount} / 7
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Weekly Capacity
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {weeklyHoursLabel}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Timeline Mode
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900 capitalize">
                  {businessMode === "same" ? "Uniform" : "Per-day"}
                </p>
              </div>
            </div>
          </div>

          {(businessMode === "same" || businessMode === "custom") && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Add Timings</h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure operating windows used for deadline calculations.
              </p>
            </div>
          )}

          {/* Same for all days */}
          {businessMode === "same" && (
            <div className="grid md:grid-cols-2 gap-4 mt-4 rounded-xl border border-slate-200 p-4">
              <div className="grid gap-1.5">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={
                    formData.workflowTemplate.businessHours.day.monday?.start ||
                    "09:00"
                  }
                  onChange={(e) =>
                    handleSameTimeChange("start", e.target.value)
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={
                    formData.workflowTemplate.businessHours.day.monday?.end ||
                    "17:00"
                  }
                  onChange={(e) => handleSameTimeChange("end", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Custom per day */}
          {businessMode === "custom" && (
            <div className="space-y-4 mt-4">
              <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span className="md:col-span-3">Day</span>
                <span className="md:col-span-1 text-center">Status</span>
                <span className="md:col-span-4">Start Time</span>
                <span className="md:col-span-4">End Time</span>
              </div>
              {daysOfWeek.map((day) => {
                const d = formData.workflowTemplate?.businessHours?.day?.[day];
                return (
                  <div
                    key={day}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center rounded-xl border border-slate-200 p-4"
                  >
                    <div className="md:col-span-3 flex items-center justify-between md:justify-start md:gap-3 md:pr-2">
                      <div>
                        <Label
                          className={
                            !d?.isClosed ? "text-slate-900" : "text-gray-400"
                          }
                        >
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </Label>
                        <p className="text-xs text-slate-500 mt-1">
                          {d?.isClosed ? "Closed" : "Open"}
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-1 flex justify-end md:justify-center">
                      <Switch
                        checked={!d?.isClosed}
                        onCheckedChange={(checked) =>
                          handleBusinessHoursChange(day, "isClosed", !checked)
                        }
                      />
                    </div>

                    <div
                      className={`md:col-span-4 flex flex-col ${d?.isClosed ? "opacity-60" : ""
                        }`}
                    >
                      <Label className="text-xs font-medium">Start Time</Label>
                      <Input
                        type="time"
                        value={d?.start || ""}
                        onChange={(e) =>
                          handleBusinessHoursChange(
                            day,
                            "start",
                            e.target.value,
                          )
                        }
                        disabled={d?.isClosed}
                      />
                    </div>

                    <div
                      className={`md:col-span-4 flex flex-col ${d?.isClosed ? "opacity-60" : ""
                        }`}
                    >
                      <Label className="text-xs font-medium">End Time</Label>
                      <Input
                        type="time"
                        value={d?.end || ""}
                        onChange={(e) =>
                          handleBusinessHoursChange(day, "end", e.target.value)
                        }
                        disabled={d?.isClosed}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Special Rules / Exceptions</h3>
            <div className="grid md:grid-cols-4 gap-3 items-center border rounded-xl p-4 shadow-sm">
              <Select
                value={current.type}
                onValueChange={(val) => setCurrent({ ...current, type: val })}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="date">Specific Date</SelectItem>
                </SelectContent>
              </Select>

              {current.type === "recurring" && (
                <>
                  <Select
                    value={current.rule.frequency}
                    onValueChange={(val) =>
                      setCurrent({ ...current, rule: { ...current.rule, frequency: val } })
                    }
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Frequency" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={current.rule.dayOfWeek}
                    onValueChange={(val) =>
                      setCurrent({ ...current, rule: { ...current.rule, dayOfWeek: val } })
                    }
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Day" /></SelectTrigger>
                    <SelectContent>
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {current.rule.frequency === "monthly" && (
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      className="w-full"
                      placeholder="Week # (1–5)"
                      value={current.rule.weekOfMonth}
                      onChange={(e) =>
                        setCurrent({
                          ...current,
                          rule: { ...current.rule, weekOfMonth: e.target.value },
                        })
                      }
                    />
                  )}
                </>
              )}

              {current.type === "date" && (
                <Input
                  type="date"
                  className="w-full"
                  value={current.date}
                  onChange={(e) => setCurrent({ ...current, date: e.target.value })}
                />
              )}
              <Select
                value={current.action}
                onValueChange={(val) => setCurrent({ ...current, action: val })}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="open">Open (override)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="secondary" size="sm" onClick={handleAddOrUpdate} disabled={!isFormValid}>
              {editIndex !== null ? "Update Exception" : "+ Add Exception"}
            </Button>
            <div className="space-y-2">
              {exceptions.length === 0 ? (
                <p className="text-gray-400 text-sm italic">No exceptions added yet</p>
              ) : (
                exceptions.map((ex: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between border p-3 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-700">
                      {ex.type === "recurring"
                        ? `${ex.rule.frequency} - ${ex.rule.dayOfWeek} ${ex.rule.frequency === "monthly" ? `(Week ${ex.rule.weekOfMonth})` : ""
                        }`
                        : `Date: ${ex.date}`}
                      <span className="ml-2 text-gray-500">→ {ex.action}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(idx)}>
                        <Edit className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(idx)}>
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div> */}
        </div>
      </div>

      <Separator />

      {/* Navigation - Fixed Footer */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white shadow-[0_-10px_30px_rgba(15,23,42,0.08)] md:left-64">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6 md:pr-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Set up basic configuration and continue.</span>
            <span className="sm:hidden">Continue setup.</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                // Validate name before proceeding
                if (!formData.name || formData.name.trim().length === 0) {
                  setNameError("Name is required");
                  return;
                }
                setNameError("");
                nextStep();
              }}
              className="min-w-[200px]"
            >
              {loading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <File className="h-4 w-4" />
              )}
              {buttonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
