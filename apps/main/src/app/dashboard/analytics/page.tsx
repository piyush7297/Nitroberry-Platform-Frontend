"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Pagination } from "../users/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/not-found";
import { Button } from "@/components/ui/button";
import { Filter, X, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MultiSearch } from "@/components/multi-search";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { WorkflowAnalytics } from "./workflowAnalytics";
import { TaskAnalytics } from "./taskAnalytics";
import { WorkflowAnalyticsChart } from "./workflowAnalyticsChart";
import { TaskAnalyticsChart } from "./taskAnalyticsChart";
import { getAnalyticsPagination } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  TaskTypeEnum,
  TaskStatusEnum,
  PRIORITY_ENUM,
} from "@/lib/enums/routes.enum";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

const ANALYTICS_TYPES = [
  { value: 1, label: "Workflow Analytics" },
  { value: 2, label: "Task Analytics" },
];

const STEP_STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Task Status options using TaskTypeEnum
const TASK_STATUS_OPTIONS = Object.entries(TaskStatusEnum)
  .filter(([_, value]) => typeof value === "number")
  .map(([key, value]) => ({
    value: value as number,
    label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
  }))
  .sort((a, b) => b.value - a.value); // Sort descending: 6,5,4,3,2,1

// Task Status Enum options for lookup (for badge display)
const TASK_STATUS_ENUM_OPTIONS = Object.entries(TaskStatusEnum)
  .filter(([_, value]) => typeof value === "number")
  .map(([key, value]) => ({
    value: value as number,
    label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
  }));

// Task Priority options using PRIORITY_ENUM
const TASK_PRIORITY_OPTIONS = Object.entries(PRIORITY_ENUM)
  .map(([key, label]) => ({
    value: Number(key),
    label: label,
  }))
  .sort((a, b) => b.value - a.value); // Sort descending: 3,2,1

// FMS Priority options using PRIORITY_ENUM (filtering to only 1 and 3)
const FMS_PRIORITY_OPTIONS = Object.entries(PRIORITY_ENUM)
  .filter(([key]) => key === "1" || key === "3")
  .map(([key, label]) => ({
    value: Number(key),
    label: label,
  }))
  .sort((a, b) => b.value - a.value); // Sort descending: 3,1

type MultiSelectOption = {
  value: string | number;
  label: string;
};

type MultiSelectFilterProps = {
  label: string;
  options: MultiSelectOption[];
  selected: (string | number)[];
  onToggle: (value: string | number) => void;
};

const MultiSelectFilter = ({
  label,
  options,
  selected,
  onToggle,
}: MultiSelectFilterProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        className="w-full justify-between"
        size="lg"
        type="button"
      >
        <span>{label}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {selected.length > 0 ? `${selected.length} selected` : "All"}
          <ChevronDown className="h-4 w-4" />
        </span>
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-56 p-2 space-y-1">
      {options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <div
            key={String(option.value)}
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

const AnalyticsPage = () => {
  const [selectedType, setSelectedType] = useState<number>(1);
  const [page, setPage] = useState<Record<number, number>>({
    1: 1,
    2: 1,
  });
  const [limit, setLimit] = useState<Record<number, number>>({
    1: 10,
    2: 10,
  });

  const { hasAccess: canRead } = useModulePermissions(17);
  const [filters, setFilters] = useState({
    fmsId: "",
    doerIds: "",
    stepIds: "",
    isData: true,
    minDelay: "",
    maxDelay: "",
    fromDate: "",
    toDate: "",
    referenceCode: "",
    stepStatus: "",
    taskStatus: "",
    taskPriority: "",
    fmsPriority: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [selectedStepStatus, setSelectedStepStatus] = useState<string[]>([]);
  const [selectedTaskStatus, setSelectedTaskStatus] = useState<number[]>([]);
  const [selectedTaskPriority, setSelectedTaskPriority] = useState<number[]>(
    [],
  );
  const [selectedFmsPriority, setSelectedFmsPriority] = useState<number[]>([]);
  const [fmsSearch, setFmsSearch] = useState<string>("");
  const [showFmsDropdown, setShowFmsDropdown] = useState(false);
  const [selectedFmsList, setSelectedFmsList] = useState<any[]>([]);
  const [selectedStepList, setSelectedStepList] = useState<any[]>([]);
  const [referenceCodeSearch, setReferenceCodeSearch] = useState<string>("");
  const [showReferenceCodeDropdown, setShowReferenceCodeDropdown] =
    useState(false);
  const [selectedReferenceCodeList, setSelectedReferenceCodeList] = useState<
    any[]
  >([]);
  const [userSearch, setUserSearch] = useState<string>("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUserList, setSelectedUserList] = useState<any[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [appliedUserList, setAppliedUserList] = useState<any[]>([]);
  const [appliedFmsList, setAppliedFmsList] = useState<any[]>([]);
  const [appliedStepList, setAppliedStepList] = useState<any[]>([]);
  const [appliedReferenceCodeList, setAppliedReferenceCodeList] = useState<
    any[]
  >([]);
  const hasAnyAppliedFilter = Object.values(appliedFilters).some(
    (v) => v !== "" && v !== false,
  );
  const buildQuery = useMemo(() => {
    const params = new URLSearchParams({
      type: String(selectedType),
      start: String(page[selectedType]),
      limit: String(limit[selectedType]),
    });

    // Use applied FMS IDs from appliedFilters
    if (appliedFilters.fmsId) params.append("fmsId", appliedFilters.fmsId);
    if (appliedFilters.doerIds) params.append("userId", appliedFilters.doerIds);
    if (appliedFilters.stepIds)
      params.append("stepIds", appliedFilters.stepIds);
    if (appliedFilters.referenceCode)
      params.append("referenceCode", appliedFilters.referenceCode);
    params.append("isData", String(appliedFilters.isData));
    if (appliedFilters.minDelay)
      params.append("minDelay", appliedFilters.minDelay);
    if (appliedFilters.maxDelay)
      params.append("maxDelay", appliedFilters.maxDelay);
    if (appliedFilters.fromDate)
      params.append("startDate", appliedFilters.fromDate);
    if (appliedFilters.toDate) params.append("endDate", appliedFilters.toDate);
    if (appliedFilters.stepStatus)
      params.append("stepStatus", appliedFilters.stepStatus);
    if (appliedFilters.taskStatus)
      params.append("taskStatus", appliedFilters.taskStatus);
    if (appliedFilters.taskPriority)
      params.append("taskPriority", appliedFilters.taskPriority);
    if (appliedFilters.fmsPriority)
      params.append("fmsPriority", appliedFilters.fmsPriority);

    return params.toString();
  }, [selectedType, page, limit, appliedFilters]);
  const { data: rawData, isLoading } = useApiQuery(
    [
      "Analytics",
      selectedType,
      page[selectedType],
      limit[selectedType],
      appliedFilters,
    ],
    `${API_ENDPOINTS.ANALYTICS}/?${buildQuery}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  );

  // Handle different response structures based on isData flag
  const analytics = useMemo(() => {
    if (appliedFilters.isData) {
      return rawData?.data?.data || [];
    }
    const aggregated = rawData?.data?.data;
    if (aggregated?.reportLabel) {
      return [aggregated];
    }
    if (rawData?.data?.reportLabel) {
      return [rawData.data];
    }
    return rawData?.data?.data || [];
  }, [rawData, appliedFilters.isData]);

  const pag: any = useMemo(() => getAnalyticsPagination(rawData), [rawData]);

  // Render table or chart based on isData flag
  // isData true = show table, isData false = show charts
  let contentRender = null;
  if (appliedFilters.isData) {
    // Show tables when isData is true
    if (selectedType === 1) {
      contentRender = <WorkflowAnalytics data={analytics} />;
    } else if (selectedType === 2) {
      contentRender = <TaskAnalytics data={analytics} />;
    }
  } else {
    // Show charts when isData is false
    if (selectedType === 1) {
      contentRender = <WorkflowAnalyticsChart data={analytics} />;
    } else if (selectedType === 2) {
      contentRender = <TaskAnalyticsChart data={analytics} />;
    }
  }

  // Apply search filters immediately when they change
  useEffect(() => {
    const updatedFilters = {
      ...filters,
      doerIds: selectedUserList.map((user) => user.id).join(","),
      fmsId: selectedFmsList.map((fms) => fms.id).join(","),
      stepIds: selectedStepList.map((step) => step.id).join(","),
      referenceCode: selectedReferenceCodeList
        .map((ref) => ref.code || ref.referenceCode || ref.id)
        .join(","),
    };
    setAppliedFilters(updatedFilters);
    setAppliedUserList(selectedUserList);
    setAppliedFmsList(selectedFmsList);
    setAppliedStepList(selectedStepList);
    setAppliedReferenceCodeList(selectedReferenceCodeList);
    // Reset to page 1 when filters change
    setPage((prev) => ({ ...prev, [selectedType]: 1 }));
  }, [
    selectedUserList,
    selectedFmsList,
    selectedStepList,
    selectedReferenceCodeList,
    selectedType,
  ]);

  const handleApplyFilters = () => {
    const updatedFilters = {
      ...filters,
      doerIds: selectedUserList.map((user) => user.id).join(","),
      fmsId: selectedFmsList.map((fms) => fms.id).join(","),
      stepIds: selectedStepList.map((step) => step.id).join(","),
      referenceCode: selectedReferenceCodeList
        .map((ref) => ref.code || ref.referenceCode || ref.id)
        .join(","),
      stepStatus: selectedStepStatus.join(","),
      taskStatus: selectedTaskStatus.join(","),
      taskPriority: selectedTaskPriority.join(","),
      fmsPriority: selectedFmsPriority.join(","),
    };
    setAppliedFilters(updatedFilters);
    setPage((prev) => ({ ...prev, [selectedType]: 1 }));
    setIsFilterOpen(false);
  };

  const handleClearAllFilters = () => {
    const emptyFilters = {
      fmsId: "",
      doerIds: "",
      stepIds: "",
      isData: true,
      minDelay: "",
      maxDelay: "",
      fromDate: "",
      toDate: "",
      referenceCode: "",
      stepStatus: "",
      taskStatus: "",
      taskPriority: "",
      fmsPriority: "",
    };

    // Reset filters
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);

    // Reset multi-select filters
    setSelectedStepStatus([]);
    setSelectedTaskStatus([]);
    setSelectedTaskPriority([]);
    setSelectedFmsPriority([]);

    // Reset FMS
    setSelectedFmsList([]);
    setAppliedFmsList([]);
    setFmsSearch("");

    // Reset Steps
    setSelectedStepList([]);
    setAppliedStepList([]);

    // Reset Reference Codes
    setSelectedReferenceCodeList([]);
    setAppliedReferenceCodeList([]);
    setReferenceCodeSearch("");

    // Reset Users
    setSelectedUserList([]);
    setAppliedUserList([]);
    setUserSearch("");

    // Reset pagination for current type
    setPage((prev) => ({
      ...prev,
      [selectedType]: 1,
    }));

    // Close filter panel
    setIsFilterOpen(false);
  };

  if (canRead === false) {
    return <div className="p-4 sm:p-3 mt-4"><PermissionDeniedState /></div>;
  }

  return (
    <div className="p-4 space-y-3 sm:p-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and filter task, workflow analytics by type.
          </p>
        </div>
      </div>
      <Separator />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2">
          {/* Select Report Type */}
          <div className="w-50">
            <Select
              value={String(selectedType)}
              onValueChange={(v) => {
                setSelectedType(Number(v));
                handleClearAllFilters();
              }}
            >
              <SelectTrigger size="sm" className="w-50">
                <SelectValue placeholder="Select analytics type" />
              </SelectTrigger>
              <SelectContent>
                {ANALYTICS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={String(type.value)}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* FMS */}
          <div className="w-50">
            <MultiSearch
              search={fmsSearch}
              setSearch={setFmsSearch}
              selectedList={selectedFmsList}
              onSelect={(fms) => {
                if (!selectedFmsList.find((f) => f.id === fms.id)) {
                  setSelectedFmsList((prev) => [...prev, fms]);
                }
              }}
              onRemove={(fmsId) => {
                setSelectedFmsList((prev) =>
                  prev.filter((f) => f.id !== fmsId),
                );
              }}
              isFocused={showFmsDropdown}
              setIsFocused={setShowFmsDropdown}
              showDropdown={showFmsDropdown}
              setShowDropdown={setShowFmsDropdown}
              onChange={(e) => setFmsSearch(e.target.value)}
              onFocus={() => setShowFmsDropdown(true)}
              onBlur={() => setShowFmsDropdown(false)}
              marginTop="-mt-7"
              placeholder="Search Workflow Templates"
              selectedIds={selectedFmsList.map((f) => f.id)}
              searchType="fms"
              getDisplayName={(fms) =>
                fms.fms || fms.referenceId || fms.name || `${fms.id}`
              }
              getItemId={(fms) => fms.id}
            />
          </div>

          {/* Steps */}
          {/* <div className="w-50">
            <MultiSearch
              search={stepSearch}
              setSearch={setStepSearch}
              selectedList={selectedStepList}
              onSelect={(step) => {
                if (!selectedStepList.find((s) => s.id === step.id)) {
                  setSelectedStepList((prev) => [...prev, step]);
                }
              }}
              onRemove={(stepId) => {
                setSelectedStepList((prev) =>
                  prev.filter((s) => s.id !== stepId)
                );
              }}
              isFocused={showStepDropdown}
              setIsFocused={setShowStepDropdown}
              showDropdown={showStepDropdown}
              setShowDropdown={setShowStepDropdown}
              onChange={(e) => setStepSearch(e.target.value)}
              onFocus={() => setShowStepDropdown(true)}
              onBlur={() => setShowStepDropdown(false)}
              marginTop="-mt-7"
              placeholder="Search Steps"
              selectedIds={selectedStepList.map((s) => s.id)}
              searchType="step"
              getDisplayName={(step) =>
                step.name || step.stepName || `Step-${step.id}`
              }
              getItemId={(step) => step.id}
            />
          </div> */}

          {/* Reference Codes */}
          <div className="w-50s">
            <MultiSearch
              search={referenceCodeSearch}
              setSearch={setReferenceCodeSearch}
              selectedList={selectedReferenceCodeList}
              onSelect={(ref) => {
                const refId = ref.code || ref.referenceCode || ref.id;
                if (
                  !selectedReferenceCodeList.find(
                    (r) => (r.code || r.referenceCode || r.id) === refId,
                  )
                ) {
                  setSelectedReferenceCodeList((prev) => [...prev, ref]);
                }
              }}
              onRemove={(refId) => {
                setSelectedReferenceCodeList((prev) =>
                  prev.filter(
                    (r) => (r.code || r.referenceCode || r.id) !== refId,
                  ),
                );
              }}
              isFocused={showReferenceCodeDropdown}
              setIsFocused={setShowReferenceCodeDropdown}
              showDropdown={showReferenceCodeDropdown}
              setShowDropdown={setShowReferenceCodeDropdown}
              onChange={(e) => setReferenceCodeSearch(e.target.value)}
              onFocus={() => setShowReferenceCodeDropdown(true)}
              onBlur={() => setShowReferenceCodeDropdown(false)}
              marginTop="-mt-7"
              placeholder="Reference Codes"
              selectedIds={selectedReferenceCodeList.map(
                (r) => r.code || r.referenceCode || r.id,
              )}
              searchType="referenceCode"
              getDisplayName={(ref) =>
                ref.code || ref.referenceCode || ref.name || `Ref-${ref.id}`
              }
              getItemId={(ref) => ref.code || ref.referenceCode || ref.id}
            />
          </div>

          {/* Doer */}
          <div className="w-50">
            <MultiSearch
              search={userSearch}
              setSearch={setUserSearch}
              selectedList={selectedUserList}
              onSelect={(user) => {
                if (!selectedUserList.find((u) => u.id === user.id)) {
                  setSelectedUserList((prev) => [...prev, user]);
                }
              }}
              onRemove={(userId) => {
                setSelectedUserList((prev) =>
                  prev.filter((u) => u.id !== userId),
                );
              }}
              isFocused={showUserDropdown}
              setIsFocused={setShowUserDropdown}
              showDropdown={showUserDropdown}
              setShowDropdown={setShowUserDropdown}
              onChange={(e) => setUserSearch(e.target.value)}
              onFocus={() => setShowUserDropdown(true)}
              onBlur={() => setShowUserDropdown(false)}
              marginTop="-mt-7"
              placeholder="Search doer"
              selectedIds={selectedUserList.map((u) => u.id)}
              searchType="user"
              getDisplayName={(user) =>
                `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                user.fullname ||
                `User-${user.id}`
              }
              getItemId={(user) => user.id}
            />
          </div>

          {/* Push to end */}
          <div className="ml-auto flex items-center gap-4">
            <ToggleGroup
              type="single"
              value={appliedFilters.isData ? "table" : "chart"}
              onValueChange={(value) => {
                if (value) {
                  const isData = value === "table";
                  setAppliedFilters((prev) => ({ ...prev, isData }));
                  setFilters((prev) => ({ ...prev, isData }));
                }
              }}
              variant="outline"
              size="sm"
              className="h-7 cursor-pointer [&_[data-state=on]]:bg-primary [&_[data-state=on]]:text-primary-foreground"
            >
              <ToggleGroupItem value="table" aria-label="Table View">
                Table
              </ToggleGroupItem>
              <ToggleGroupItem value="chart" aria-label="Chart View">
                Chart
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsFilterOpen(true)}
            >
              <Filter className="h-4 w-4" />
              More Filters
            </Button>
          </div>
        </div>
      </div>
      {(selectedFmsList.length > 0 ||
        selectedStepList.length > 0 ||
        selectedReferenceCodeList.length > 0 ||
        selectedUserList.length > 0 ||
        appliedFilters.minDelay ||
        appliedFilters.maxDelay ||
        appliedFilters.fromDate ||
        appliedFilters.toDate ||
        appliedFilters.stepStatus ||
        appliedFilters.taskStatus ||
        appliedFilters.taskPriority ||
        appliedFilters.fmsPriority) && (
        <div className="space-y-2 rounded-md border bg-white p-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Selected Filters
            </span>

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Clear All
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* FMS Templates */}
            {selectedFmsList.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500">
                  Workflow Templates
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedFmsList.map((item) => {
                    const id = item.id;
                    const name =
                      item.fms || item.referenceId || item.name || `${id}`;
                    return (
                      <div
                        key={id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs max-w-full"
                      >
                        <span className="truncate max-w-[200px]">{name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedFmsList((prev) =>
                              prev.filter((f) => f.id !== id),
                            );
                          }}
                          className="hover:bg-gray-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Steps */}
            {selectedStepList.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500">Steps</div>

                <div className="flex flex-wrap gap-2">
                  {selectedStepList.map((item) => {
                    const id = item.id;
                    const name = item.name || item.stepName || `Step-${id}`;

                    return (
                      <div
                        key={id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        <span className="truncate max-w-[200px]">{name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedStepList((prev) =>
                              prev.filter((s) => s.id !== id),
                            );
                          }}
                          className="hover:bg-gray-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reference Codes */}
            {selectedReferenceCodeList.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500">
                  Reference Codes
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedReferenceCodeList.map((item) => {
                    const id = item.code || item.referenceCode || item.id;

                    const name =
                      item.code || item.referenceCode || `Ref-${item.id}`;

                    return (
                      <div
                        key={id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        <span className="truncate max-w-[200px]">{name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedReferenceCodeList((prev) =>
                              prev.filter(
                                (r) =>
                                  (r.code || r.referenceCode || r.id) !== id,
                              ),
                            );
                          }}
                          className="hover:bg-gray-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Doer IDs */}
            {selectedUserList.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500">
                  Doer IDs
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedUserList.map((item) => {
                    const id = item.id;
                    const name =
                      `${item.firstName || ""} ${item.lastName || ""}`.trim() ||
                      item.fullname ||
                      `User-${id}`;

                    return (
                      <div
                        key={id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        <span className="truncate max-w-[200px]">{name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedUserList((prev) =>
                              prev.filter((u) => u.id !== id),
                            );
                          }}
                          className="hover:bg-gray-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {appliedFilters.fromDate && appliedFilters.toDate && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500">
                  Start Date - End Date
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                  <span className="truncate max-w-[200px]">
                    {appliedFilters.fromDate} - {appliedFilters.toDate}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAppliedFilters((prev) => ({
                        ...prev,
                        fromDate: "",
                        toDate: "",
                      }));
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Step Status */}
            {appliedFilters.stepStatus && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500">
                  Step Status
                </div>
                <div className="flex flex-wrap gap-2">
                  {appliedFilters.stepStatus.split(",").map((status) => {
                    const option = STEP_STATUS_OPTIONS.find(
                      (opt) => opt.value === status,
                    );
                    const label = option?.label || status;
                    return (
                      <div
                        key={status}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        <span className="truncate max-w-[200px]">{label}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const newStatuses = appliedFilters.stepStatus
                              .split(",")
                              .filter((s) => s !== status)
                              .join(",");
                            setAppliedFilters((prev) => ({
                              ...prev,
                              stepStatus: newStatuses,
                            }));
                            setSelectedStepStatus((prev) =>
                              prev.filter((s) => s !== status),
                            );
                          }}
                          className="hover:bg-gray-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Task Status */}
            {appliedFilters.taskStatus && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500">
                  Task Status
                </div>
                <div className="flex flex-wrap gap-2">
                  {appliedFilters.taskStatus.split(",").map((status) => {
                    const option = TASK_STATUS_OPTIONS.find(
                      (opt) => opt.value === Number(status),
                    );
                    const label = option?.label || `Status ${status}`;
                    return (
                      <div
                        key={status}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        <span className="truncate max-w-[200px]">{label}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const statusNum = Number(status);
                            const newStatuses = appliedFilters.taskStatus
                              .split(",")
                              .filter((s) => s !== status)
                              .join(",");
                            setAppliedFilters((prev) => ({
                              ...prev,
                              taskStatus: newStatuses,
                            }));
                            setSelectedTaskStatus((prev) =>
                              prev.filter((s) => s !== statusNum),
                            );
                          }}
                          className="hover:bg-gray-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Task Priority */}
            {appliedFilters.taskPriority && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500">
                  Task Priority
                </div>
                <div className="flex flex-wrap gap-2">
                  {appliedFilters.taskPriority.split(",").map((priority) => {
                    const option = TASK_PRIORITY_OPTIONS.find(
                      (opt) => opt.value === Number(priority),
                    );
                    const label = option?.label || `Priority ${priority}`;
                    return (
                      <div
                        key={priority}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        <span className="truncate max-w-[200px]">{label}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const priorityNum = Number(priority);
                            const newPriorities = appliedFilters.taskPriority
                              .split(",")
                              .filter((p) => p !== priority)
                              .join(",");
                            setAppliedFilters((prev) => ({
                              ...prev,
                              taskPriority: newPriorities,
                            }));
                            setSelectedTaskPriority((prev) =>
                              prev.filter((p) => p !== priorityNum),
                            );
                          }}
                          className="hover:bg-gray-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Workflow Priority */}
            {appliedFilters.fmsPriority && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500">
                  Workflow Priority
                </div>
                <div className="flex flex-wrap gap-2">
                  {appliedFilters.fmsPriority.split(",").map((priority) => {
                    const option = FMS_PRIORITY_OPTIONS.find(
                      (opt) => opt.value === Number(priority),
                    );
                    const label = option?.label || `Priority ${priority}`;
                    return (
                      <div
                        key={priority}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        <span className="truncate max-w-[200px]">{label}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const priorityNum = Number(priority);
                            const newPriorities = appliedFilters.fmsPriority
                              .split(",")
                              .filter((p) => p !== priority)
                              .join(",");
                            setAppliedFilters((prev) => ({
                              ...prev,
                              fmsPriority: newPriorities,
                            }));
                            setSelectedFmsPriority((prev) =>
                              prev.filter((p) => p !== priorityNum),
                            );
                          }}
                          className="hover:bg-gray-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={isFilterOpen}
        onOpenChange={(open) => {
          setIsFilterOpen(open);
          // When dialog opens, initialize selected lists from applied lists
          if (open) {
            setSelectedUserList(appliedUserList);
            setSelectedFmsList(appliedFmsList);
            setSelectedStepList(appliedStepList);
            setSelectedReferenceCodeList(appliedReferenceCodeList);
            // Initialize multi-select filters from applied filters
            setSelectedStepStatus(
              appliedFilters.stepStatus
                ? appliedFilters.stepStatus.split(",")
                : [],
            );
            setSelectedTaskStatus(
              appliedFilters.taskStatus
                ? appliedFilters.taskStatus.split(",").map(Number)
                : [],
            );
            setSelectedTaskPriority(
              appliedFilters.taskPriority
                ? appliedFilters.taskPriority.split(",").map(Number)
                : [],
            );
            setSelectedFmsPriority(
              appliedFilters.fmsPriority
                ? appliedFilters.fmsPriority.split(",").map(Number)
                : [],
            );
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>More Filters</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fromDate">From date</Label>
              <Input
                id="fromDate"
                type="date"
                value={filters.fromDate}
                max="9999-12-31"
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, fromDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="toDate">To date</Label>
              <Input
                id="toDate"
                type="date"
                value={filters.toDate}
                max="9999-12-31"
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, toDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Step Status</Label>
              <MultiSelectFilter
                label="Step Status"
                options={STEP_STATUS_OPTIONS}
                selected={selectedStepStatus}
                onToggle={(value) => {
                  const stringValue = String(value);
                  setSelectedStepStatus((prev) =>
                    prev.includes(stringValue)
                      ? prev.filter((v) => v !== stringValue)
                      : [...prev, stringValue],
                  );
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Task Status</Label>
              <MultiSelectFilter
                label="Task Status"
                options={TASK_STATUS_OPTIONS}
                selected={selectedTaskStatus}
                onToggle={(value) => {
                  const numValue = Number(value);
                  setSelectedTaskStatus((prev) =>
                    prev.includes(numValue)
                      ? prev.filter((v) => v !== numValue)
                      : [...prev, numValue],
                  );
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Task Priority</Label>
              <MultiSelectFilter
                label="Task Priority"
                options={TASK_PRIORITY_OPTIONS}
                selected={selectedTaskPriority}
                onToggle={(value) => {
                  const numValue = Number(value);
                  setSelectedTaskPriority((prev) =>
                    prev.includes(numValue)
                      ? prev.filter((v) => v !== numValue)
                      : [...prev, numValue],
                  );
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Workflow Priority</Label>
              <MultiSelectFilter
                label="Workflow Priority"
                options={FMS_PRIORITY_OPTIONS}
                selected={selectedFmsPriority}
                onToggle={(value) => {
                  const numValue = Number(value);
                  setSelectedFmsPriority((prev) =>
                    prev.includes(numValue)
                      ? prev.filter((v) => v !== numValue)
                      : [...prev, numValue],
                  );
                }}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearAllFilters}
            >
              Clear
            </Button>
            <Button type="button" onClick={handleApplyFilters}>
              Apply filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Table or Chart */}
      {isLoading ? (
        appliedFilters.isData ? (
          // Show table skeleton only when table view is active
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead>Workflow Name</TableHead>
                  <TableHead>Step Name</TableHead>
                  <TableHead>Reference Number</TableHead>
                  <TableHead>Step Status</TableHead>
                  <TableHead>Assigned Users</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Actual Date</TableHead>
                  <TableHead>Performance Status</TableHead>
                  <TableHead>Delay Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t px-4 pb-4">
              <Skeleton className="h-8 w-48" />
            </div>
          </div>
        ) : (
          // Show chart skeleton when chart view is active
          <div className="border rounded-lg p-6">
            <div className="h-[500px] w-full flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          </div>
        )
      ) : analytics.length === 0 ? (
        <EmptyState
          onClick={() => {}}
          buttonTitle=""
          title={
            hasAnyAppliedFilter
              ? "No analytics found"
              : "No analytics found yet"
          }
          description={
            hasAnyAppliedFilter
              ? "No analytics found please refain your filters."
              : "No analytics found yet. Create your first analytics to get started."
          }
        />
      ) : (
        <>
          <div
            className={`${appliedFilters.isData ? "overflow-x-auto" : ""} border rounded-lg`}
          >
            {contentRender}
            {appliedFilters.isData && (
              <div className="border-t px-4 pb-4">
                <Pagination
                  start={pag.start}
                  limit={pag.limit}
                  total={pag.total}
                  pagination={pag}
                  onPageChange={(newStart) =>
                    setPage((prev) => ({ ...prev, [selectedType]: newStart }))
                  }
                  onLimitChange={(newLimit) =>
                    setLimit((prev) => ({ ...prev, [selectedType]: newLimit }))
                  }
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
export default AnalyticsPage;

