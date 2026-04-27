"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination } from "../users/pagination";
import {
  PRIORITY_ENUM,
  TaskStatusEnum,
  TaskTypeEnum,
} from "@/lib/enums/routes.enum";
import { ChevronDown, Loader, Search, X } from "lucide-react";
import { MembersCell } from "../users/page";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HTTP_METHODS } from "@/api/methods";
import { formatDateTime, getStatusInfo, STATUSTABLE } from "@/lib/utils";
import { EmptyState } from "@/components/not-found";
import { UserSearch } from "@/components/user-search";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

// Constants
const TASK_TYPE_OPTIONS = [
  { value: TaskTypeEnum.HELP, label: "Help" },
  { value: TaskTypeEnum.DELEGATION, label: "Delegation" },
];

const TASK_STATUS_OPTIONS = [
  { value: TaskStatusEnum.PENDING, label: "Pending" },
  { value: TaskStatusEnum.COMPLETED, label: "Completed" },
];

const TASK_TYPE_LABEL: Record<number, string> = TASK_TYPE_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {} as Record<number, string>,
);

const TASK_STATUS_LABEL: Record<number, string> = TASK_STATUS_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {} as Record<number, string>,
);

// Main Component
const TaskPage = () => {
  const router = useRouter();

  // State
  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const { hasAccess: canRead, create: canCreate } = useModulePermissions(12);
  const [selectedTypes, setSelectedTypes] = useState<number[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [iscreateopen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "",
    assignedUsers: [] as string[],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    type: "",
    id: "",
  });

  const [userSearch, setUserSearch] = useState<string>("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [pillUsers, setPillUsers] = useState<any[]>([]);

  const { data: userSearchList, isLoading: userSearchLoading } = useApiQuery(
    ["CommonUserSearch", userSearch],
    `${API_ENDPOINTS.USERS_COMMON
    }/search?start=1&limit=40&search=${encodeURIComponent(userSearch ?? "")}`,
    {
      enabled: !!userSearch?.trim(),
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );
  const userSearchResults = userSearchList?.data?.users || [];

  const taskQuery = useMemo(() => {
    const params = new URLSearchParams({
      start: String(start),
      limit: String(limit),
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    }

    if (selectedTypes.length) {
      params.set("type", selectedTypes.join(","));
    }

    if (selectedStatuses.length) {
      params.set("status", selectedStatuses.join(","));
    }

    if (selectedUserId) {
      params.set("assignedUserId", selectedUserId);
    }

    return `${API_ENDPOINTS.TASKS}?${params.toString()}`;
  }, [
    start,
    limit,
    searchQuery,
    selectedTypes,
    selectedStatuses,
    selectedUserId,
  ]);

  const {
    data: tasksData,
    isLoading,
    refetch: refetchTasks,
  } = useApiQuery(
    [
      "TASK_LIST",
      start,
      limit,
      searchQuery,
      selectedUserId || "",
      selectedTypes.join(","),
      selectedStatuses.join(","),
    ],
    taskQuery,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: canRead,
    } as const,
  );

  const tasks = tasksData?.data?.task || [];
  const pagination = tasksData?.data?.pagination || {};
  const total = Number(pagination?.total || tasks.length || 0);

  // API Mutations
  const createDelegation = useApiMutation(
    HTTP_METHODS.POST,
    API_ENDPOINTS.TASKS,
  );
  const updateDelegation = useApiMutation(
    HTTP_METHODS.PUT,
    `${API_ENDPOINTS.TASKS}/${formData.id}`,
  );

  // Helper Functions
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleValue = (
    value: number,
    setter: (next: number[]) => void,
    selected: number[],
  ) => {
    setter(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
    setStart(1);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedUserId(undefined);
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setStart(1);
  };

  const handleToggleUser = (user: any) => {
    setFormData((prev) => ({
      ...prev,
      assignedUsers: prev.assignedUsers.includes(user.id)
        ? prev.assignedUsers.filter((id) => id !== user.id)
        : [...prev.assignedUsers, user.id],
    }));
    setPillUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      if (exists) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const createTaskModal = () => {
    setLoading(false);
    setFormData({
      title: "",
      description: "",
      priority: "",
      assignedUsers: [],
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      type: "",
      id: "",
    });
    setCreateOpen(true);
  };

  const handleSubmit = () => {
    setLoading(true);
    if (formData.id) {
      const payload = {
        assignedUsers: formData.assignedUsers,
        startDate: formData.startDate || null,
        recurringSettings: {
          endDate: formData.endDate || null,
        },
        endDate: formData.endDate || null,
        priority: formData.priority || null,
      };
      updateDelegation.mutate(payload, {
        onSuccess: () => {
          setLoading(false);
          setCreateOpen(false);
          refetchTasks();
        },
        onError: (err) => {
          setLoading(false);
        },
      });
    } else {
      const payload = {
        title: formData.title,
        description: formData.description,
        type: parseInt(formData.type),
        assignedUsers: formData.assignedUsers,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        priority: formData.priority || null,
      };

      createDelegation.mutate(payload, {
        onSuccess: () => {
          setFormData({
            title: "",
            description: "",
            priority: "",
            assignedUsers: [],
            startDate: new Date().toISOString().split("T")[0],
            endDate: "",
            type: "",
            id: "",
          });
          setLoading(false);
          setCreateOpen(false);
          refetchTasks();
        },
        onError: (err) => {
          console.error("Failed to create delegation:", err);
          setLoading(false);
        },
      });
    }
  };

  const isFilterApplied =
    !!searchQuery.trim() ||
    !!selectedUserId ||
    selectedTypes.length > 0 ||
    selectedStatuses.length > 0;

  // Render Functions
  const renderFilters = () => (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setStart(1);
            }}
            className="pl-9 h-8"
          />
        </div>

        {/* <Select
        key={selectedUserId ?? "user-filter-empty"}
        value={selectedUserId ?? undefined}
        onValueChange={(val) => {
          setSelectedUserId(val || undefined);
          setStart(1);
        }}
      >
        <SelectTrigger className="justify-between px-4 w-56" size="sm">
          <SelectValue
            placeholder={isUsersLoading ? "Loading users..." : "Filter by user"}
          />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {users.map((user: any) => (
            <SelectItem key={user.id} value={user.id}>
              {user.firstName} {user.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select> */}

        <MultiSelectFilter
          label="Type"
          options={TASK_TYPE_OPTIONS}
          selected={selectedTypes}
          onToggle={(value) =>
            toggleValue(value, setSelectedTypes, selectedTypes)
          }
        />

        <MultiSelectFilter
          label="Status"
          options={TASK_STATUS_OPTIONS}
          selected={selectedStatuses}
          onToggle={(value) =>
            toggleValue(value, setSelectedStatuses, selectedStatuses)
          }
        />
      </div>

      <div className="flex items-center gap-2 self-start lg:self-auto">
        {isFilterApplied && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Reset
          </Button>
        )}
        <PermissionGuard moduleId={12} action="create">
          <Button size="sm" onClick={createTaskModal}>
            Create Task
          </Button>
        </PermissionGuard>
      </div>
    </div>
  );

  const renderSkeleton = () => (
    <Table className="border">
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assigned To</TableHead>
          <TableHead>Created By</TableHead>
          <TableHead>Created On</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, idx) => (
          <TableRow key={idx}>
            {Array.from({ length: 6 }).map((__, cellIdx) => (
              <TableCell key={cellIdx}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderTasks = () => {
    if (!tasks.length) {
      return (
        <div className="flex justify-center items-center min-h-[400px]">
          <EmptyState
            onClick={createTaskModal}
            buttonTitle={canCreate ? "Create Task" : ""}
            title="No Tasks Found"
            description={
              isFilterApplied
                ? "No tasks match the current filters. Try adjusting your search criteria."
                : "You haven't created any tasks yet. Create your first task to get started."
            }
          />
        </div>
      );
    }

    return (
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Created By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task: any) => {
              const assignedUsers = task?.assignedUsers || [];
              const typeLabel = TASK_TYPE_LABEL[task?.type] || "Unknown";
              const createdBy = task?.createdByName || task?.createdById || "â€”";

              return (
                <TableRow
                  key={task.id}
                  className="cursor-pointer transition hover:bg-muted/60"
                  onClick={() =>
                    router.push(`/dashboard/task-detail/${task.id}`)
                  }
                >
                  <TableCell className="font-medium text-foreground">
                    <div className="flex flex-col">
                      <span className="line-clamp-1">
                        {task?.title || "Untitled task"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{typeLabel}</Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(task?.startDate)}</TableCell>
                  <TableCell>{formatDateTime(task?.endDate)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        getStatusInfo(STATUSTABLE.TASK_STATUS, task?.status)
                          ?.variant as any
                      }
                    >
                      {
                        getStatusInfo(STATUSTABLE.TASK_STATUS, task?.status)
                          .name
                      }
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <MembersCell members={assignedUsers} maxVisible={5} />
                  </TableCell>
                  <TableCell className="text-xs text-foreground">
                    {createdBy}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="border-t px-4 pb-4">
          <Pagination
            start={start}
            limit={limit}
            total={total}
            pagination={pagination}
            onPageChange={(newStart) => setStart(newStart)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setStart(1);
            }}
          />
        </div>
      </div>
    );
  };

  if (canRead === false) {
    return <div className="p-4 sm:p-3 mt-4"><PermissionDeniedState /></div>;
  }

  return (
    <div className="p-4 space-y-3 sm:p-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and filter tasks by assignee, type, and status.
          </p>
        </div>
      </div>
      <Separator />
      {renderFilters()}
      {isLoading ? renderSkeleton() : renderTasks()}

      {/* Create Task Drawer */}
      <Sheet open={iscreateopen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-[96vw] gap-0 p-0 sm:max-w-xl">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b px-6 py-4 text-left">
              <SheetTitle>Create New Task</SheetTitle>
              <SheetDescription>
                Fill in the details below to create a new task.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-4 rounded-lg border bg-white p-4">
                <div>
                  <Label className="mb-1.5">Task Title</Label>
                  <Input
                    placeholder="Enter task title"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                  />
                </div>

                <div>
                  <Label className="mb-1.5">Description</Label>
                  <Textarea
                    placeholder="Enter task description"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1.5">Task Type</Label>
                      <Select
                        onValueChange={(val) => handleChange("type", val)}
                        value={formData.type || ""}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select task type" />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_TYPE_OPTIONS.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={String(option.value)}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="mb-1.5">Priority</Label>
                      <Select
                        onValueChange={(val) => handleChange("priority", val)}
                        value={formData.priority}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_ENUM).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1.5">Start Date</Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleChange("startDate", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="mb-1.5">End Date</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleChange("endDate", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-2 relative">
                  <UserSearch
                    marginTop="mt-3"
                    search={userSearch}
                    setSearch={setUserSearch}
                    selectedUserIds={pillUsers.map((user: any) => user.id)}
                    onSelect={(user: any) => handleToggleUser(user)}
                    isFocused={showUserDropdown}
                    setIsFocused={setShowUserDropdown}
                    showDropdown={showUserDropdown}
                    setShowDropdown={setShowUserDropdown}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onFocus={() => setShowUserDropdown(true)}
                    onBlur={() => setShowUserDropdown(false)}
                    label="Assign to"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pillUsers.map((user: any) => (
                      <div
                        key={user.id}
                        className="flex items-center bg-primary/80 text-black rounded-full px-3 py-1 text-sm"
                      >
                        {user.firstName}
                        <button
                          type="button"
                          className="ml-2 text-black hover:black cursor-pointer"
                          onClick={() => handleToggleUser(user)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4">
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader className="animate-spin w-5 h-5 mr-2" />}
                  {formData.id ? "Update Task" : "Create Task"}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TaskPage;

// Child Components
type MultiSelectOption = { value: number; label: string };

type MultiSelectFilterProps = {
  label: string;
  options: MultiSelectOption[];
  selected: number[];
  onToggle: (value: number) => void;
};

const MultiSelectFilter = ({
  label,
  options,
  selected,
  onToggle,
}: MultiSelectFilterProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="justify-between px-4 w-40" size="sm">
        <span>{label}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {selected.length > 0 ? `${selected.length} selected` : "All"}
          <ChevronDown className="h-4 w-4" />
        </span>
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-40 p-2 space-y-1">
      {options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <div
            key={option.value}
            onClick={() => onToggle(option.value)}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-accent cursor-pointer"
          >
            <span>{option.label}</span>
            <Checkbox
              checked={checked}
              onCheckedChange={() => onToggle(option.value)}
            />
          </div>
        );
      })}
    </PopoverContent>
  </Popover>
);

// Helper Functions
const getStatusVariant = (status?: number) => {
  switch (status) {
    case TaskStatusEnum.COMPLETED:
      return "active" as const;
    case TaskStatusEnum.PENDING:
      return "disabled" as const;
    default:
      return "outline" as const;
  }
};

