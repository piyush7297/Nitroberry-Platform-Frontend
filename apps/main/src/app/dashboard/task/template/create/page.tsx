"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { HTTP_METHODS } from "@/api/methods";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRIORITY_ENUM, RecurringTypeEnum } from "@/lib/enums/routes.enum";
import { Loader2 } from "lucide-react";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

const USERS_PAGE_SIZE = 50;

const BREADCRUMBS = [
  { name: "", href: "/dashboard", icon: true },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Task Templates", href: "/dashboard/task/template" },
  { name: "Create Template", href: null },
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

const getUserDisplayName = (user: any) =>
  `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
  user?.fullname ||
  user?.email ||
  String(user?.id || "Unknown");

const getUserInitials = (label: string) => {
  const words = label.split(" ").filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
  }
  return (words[0] || "U").slice(0, 2).toUpperCase();
};

const CreateTaskTemplatePage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [usersStart, setUsersStart] = useState(1);
  const [users, setUsers] = useState<any[]>([]);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [selectedUserMeta, setSelectedUserMeta] = useState<
    Record<string, { label: string; initials: string }>
  >({});

  const { create: canCreate } = useModulePermissions(12);
  const [errors, setErrors] = useState<{
    title?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "1",
    assignedUsers: [] as string[],
    recurringSettings: {
      recurringType: RecurringTypeEnum.WEEKLY,
      interval: 1,
      daysOfWeek: [] as number[],
      startDate: "",
      endDate: "",
    },
  });

  const trimmedUserSearch = userSearch.trim();

  const usersUrl = useMemo(
    () =>
      `${API_ENDPOINTS.USERS_COMMON}/search?start=${usersStart}&limit=${USERS_PAGE_SIZE}${trimmedUserSearch ? `&search=${encodeURIComponent(trimmedUserSearch)}` : ""
      }`,
    [usersStart, trimmedUserSearch],
  );

  const { data: usersData, isLoading: isUsersLoading, isFetching: isUsersFetching } = useApiQuery(
    ["USERS_LIST_FOR_TEMPLATE", usersStart, trimmedUserSearch],
    usersUrl,
    {
      enabled: true,
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  useEffect(() => {
    setUsersStart(1);
    setUsers([]);
    setHasMoreUsers(true);
  }, [trimmedUserSearch]);

  useEffect(() => {
    const incoming =
      usersData?.data?.users ||
      usersData?.data?.data ||
      (Array.isArray(usersData?.data) ? usersData.data : []);

    if (!Array.isArray(incoming)) {
      return;
    }

    setUsers((prev) => {
      if (usersStart === 1) {
        return incoming;
      }

      const existingIds = new Set(prev.map((u: any) => String(u?.id)));
      const appended = incoming.filter(
        (u: any) => !existingIds.has(String(u?.id)),
      );
      return [...prev, ...appended];
    });

    const pagination = usersData?.data?.pagination;
    if (pagination?.totalPages) {
      setHasMoreUsers(usersStart < Number(pagination.totalPages));
    } else {
      setHasMoreUsers(incoming.length === USERS_PAGE_SIZE);
    }
  }, [usersData, usersStart]);

  const createTemplate = useApiMutation(
    HTTP_METHODS.POST,
    API_ENDPOINTS.TASK_TEMPLATE,
  );

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateDates = (startDate: string, endDate: string) => {
    if (startDate && endDate) {
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

      // Validate dates when either changes
      if (field === "startDate" || field === "endDate") {
        const startDate =
          field === "startDate" ? value : newData.recurringSettings.startDate;
        const endDate =
          field === "endDate" ? value : newData.recurringSettings.endDate;
        validateDates(startDate, endDate);
      }

      return newData;
    });
  };

  const handleToggleUser = (user: any) => {
    const userId = String(user?.id || "");
    if (!userId) return;

    const label = getUserDisplayName(user);
    const initials = getUserInitials(label);

    setSelectedUserMeta((prev) => ({
      ...prev,
      [userId]: { label, initials },
    }));

    setFormData((prev) => ({
      ...prev,
      assignedUsers: prev.assignedUsers.includes(userId)
        ? prev.assignedUsers.filter((id) => id !== userId)
        : [...prev.assignedUsers, userId],
    }));
  };

  const handleAssignedUsersScroll = (
    event: React.UIEvent<HTMLDivElement, UIEvent>,
  ) => {
    const el = event.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;

    if (nearBottom && hasMoreUsers && !isUsersLoading && !isUsersFetching) {
      setUsersStart((prev) => prev + 1);
    }
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

    // Validate title
    if (!formData.title.trim()) {
      setErrors((prev) => ({ ...prev, title: "Title is required" }));
      return;
    }

    // Validate start date
    if (!formData.recurringSettings.startDate) {
      setErrors((prev) => ({
        ...prev,
        startDate: "Start date is required",
      }));
      return;
    }

    // Validate end date
    if (!formData.recurringSettings.endDate) {
      setErrors((prev) => ({
        ...prev,
        endDate: "End date is required",
      }));
      return;
    }

    // Validate end date is after start date
    if (
      !validateDates(
        formData.recurringSettings.startDate,
        formData.recurringSettings.endDate,
      )
    ) {
      return;
    }

    setLoading(true);

    const payload = {
      title: formData.title,
      description: formData.description || undefined,
      priority: parseInt(formData.priority),
      assignedUsers: formData.assignedUsers,
      recurringSettings: {
        recurringType: formData.recurringSettings.recurringType,
        interval: formData.recurringSettings.interval,
        daysOfWeek: formData.recurringSettings.daysOfWeek.sort((a, b) => a - b),
        startDate: formData.recurringSettings.startDate,
        endDate: formData.recurringSettings.endDate,
      },
    };

    createTemplate.mutate(payload, {
      onSuccess: () => {
        setLoading(false);
        router.push("/dashboard/task/template");
      },
      onError: (err) => {
        console.error("Failed to create task template:", err);
        setLoading(false);
      },
    });
  };

  if (canCreate === false) {
    return <div className="p-4 sm:p-6 mt-4"><PermissionDeniedState /></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <DynamicBreadcrumb breadcrumbs={BREADCRUMBS} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Create Task Template
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a new recurring task template.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Enter task title"
                  value={formData.title}
                  onChange={(e) => {
                    handleChange("title", e.target.value);
                    if (errors.title) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.title;
                        return newErrors;
                      });
                    }
                  }}
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title}</p>
                )}
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => handleChange("priority", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_ENUM).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter task description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Assigned Users */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="assigned-user-search">Search users</Label>
              <Input
                id="assigned-user-search"
                placeholder="Search by name or email"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            {formData.assignedUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {formData.assignedUsers.slice(0, 3).map((userId: string) => (
                    <div
                      key={userId}
                      title={selectedUserMeta[userId]?.label || userId}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700 ring-2 ring-white"
                    >
                      {selectedUserMeta[userId]?.initials || "U"}
                    </div>
                  ))}
                  {formData.assignedUsers.length > 3 && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 ring-2 ring-white">
                      +{formData.assignedUsers.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formData.assignedUsers.length} selected
                </span>
              </div>
            )}

            {isUsersLoading && users.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No users available.
              </div>
            ) : (
              <div
                className="space-y-2 max-h-64 overflow-y-auto pr-1"
                onScroll={handleAssignedUsersScroll}
              >
                {users.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={formData.assignedUsers.includes(String(user.id))}
                      onCheckedChange={() => handleToggleUser(user)}
                    />
                    <Label
                      htmlFor={`user-${user.id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {getUserDisplayName(user)}
                    </Label>
                  </div>
                ))}
                {isUsersFetching && (
                  <div className="py-2 text-center text-xs text-muted-foreground">
                    Loading more users...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
              <div className="flex flex-col space-y-2">
                <Label htmlFor="startDate">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.recurringSettings.startDate}
                  onChange={(e) =>
                    handleRecurringChange("startDate", e.target.value)
                  }
                  className={errors.startDate ? "border-red-500" : ""}
                  min={new Date().toISOString().split("T")[0]}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-500">{errors.startDate}</p>
                )}
              </div>

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
                  min={
                    formData.recurringSettings.startDate ||
                    new Date().toISOString().split("T")[0]
                  }
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
            onClick={() => router.push("/dashboard/task/template")}
            disabled={loading}
          >
            Cancel
          </Button>
          <PermissionGuard moduleId={12} action="create">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Template
            </Button>
          </PermissionGuard>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskTemplatePage;
