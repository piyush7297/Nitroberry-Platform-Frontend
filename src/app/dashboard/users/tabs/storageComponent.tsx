"use client";

import React, { useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApi";
import { PermissionDeniedState } from "@/components/PermissionGuard";
// import { usePermissionsContext } from "@/context/PermissionsContext"; // Removed permission context
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, HardDrive, Users } from "lucide-react";
import { Pagination } from "../pagination";

interface StorageCategory {
  category: string;
  count: number;
  sizeMB: number;
}

interface StorageUser {
  id: string;
  userName: string;
  initials: string;
  email: string;
  files: number;
  sizeMB: number;
  categories: StorageCategory[];
}

interface StoragePagination {
  start: number;
  limit: number;
  total: number;
  raw: Record<string, unknown>;
}

interface StorageData {
  companyStorageUsage: number;
  totalSpace: number;
  lastUpdated: string;
  categories: StorageCategory[];
  users: StorageUser[];
  pagination: StoragePagination;
}

interface StorageComponentProps {
  searchTerm?: string;
}

interface CategoryChartItem extends StorageCategory {
  share: number;
  color: string;
}

const PROGRESS_GRADIENTS = [
  "bg-gradient-to-r from-blue-500 to-cyan-500",
  "bg-gradient-to-r from-emerald-500 to-teal-500",
  "bg-gradient-to-r from-violet-500 to-indigo-500",
  "bg-gradient-to-r from-amber-500 to-orange-500",
];

const CATEGORY_COLORS: Record<string, string> = {
  photos: "#38bdf8",
  documents: "#10b981",
  audio: "#8b5cf6",
  videos: "#f59e0b",
  others: "#94a3b8",
  zip: "#f97316",
};

const FALLBACK_CATEGORY_COLORS = [
  "#06b6d4",
  "#22c55e",
  "#a855f7",
  "#f43f5e",
  "#eab308",
  "#3b82f6",
  "#14b8a6",
  "#ef4444",
];

const getProgressGradient = (index: number): string => {
  return PROGRESS_GRADIENTS[index % PROGRESS_GRADIENTS.length];
};

const getCategoryColor = (category: string, index: number): string => {
  const normalized = category.trim().toLowerCase();
  return CATEGORY_COLORS[normalized] ?? FALLBACK_CATEGORY_COLORS[index % FALLBACK_CATEGORY_COLORS.length];
};

const resolveCategoryShareReference = (categories: StorageCategory[], fallbackTotal: number): number => {
  const categoryTotal = categories.reduce((accumulator, item) => accumulator + item.sizeMB, 0);
  if (categoryTotal > 0) {
    return categoryTotal;
  }

  return Math.max(fallbackTotal, 0);
};

const buildCategoryChartData = (
  categories: StorageCategory[],
  shareReference: number,
): CategoryChartItem[] => {
  return categories.map((category, index) => {
    const share =
      shareReference > 0
        ? Math.min(100, (category.sizeMB / shareReference) * 100)
        : 0;

    return {
      ...category,
      share,
      color: getCategoryColor(category.category, index),
    };
  });
};

const buildDonutBackground = (
  categoryChartData: CategoryChartItem[],
  shareReference: number,
): string => {
  const nonZero = categoryChartData.filter((item) => item.sizeMB > 0);

  if (nonZero.length === 0 || shareReference <= 0) {
    return "conic-gradient(#dbeafe 0deg 360deg)";
  }

  let currentAngle = 0;

  const segments = nonZero.map((item, index) => {
    const remaining = 360 - currentAngle;
    const angle =
      index === nonZero.length - 1
        ? remaining
        : Math.max(0, Math.min(remaining, (item.sizeMB / shareReference) * 360));
    const nextAngle = Math.min(360, currentAngle + angle);
    const segment = `${item.color} ${currentAngle.toFixed(2)}deg ${nextAngle.toFixed(2)}deg`;
    currentAngle = nextAngle;
    return segment;
  });

  return `conic-gradient(${segments.join(", ")})`;
};

const formatMegabytes = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 MB";
  }

  if (value >= 1024) {
    const inGb = value / 1024;
    return `${inGb.toFixed(inGb >= 100 ? 0 : 2)} GB`;
  }

  return `${value.toFixed(value >= 100 ? 0 : 2)} MB`;
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("en-US").format(value);
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const formatCategory = (value: string): string => {
  const normalized = value.trim().replace(/[_-]+/g, " ");
  if (!normalized) {
    return "Others";
  }

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatLastUpdated = (value: string): string => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
};

const resolveCategoryRows = (raw: unknown): StorageCategory[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const merged = new Map<string, StorageCategory>();

  const append = (item: unknown) => {
    const source = asRecord(item);
    if (!source) {
      return;
    }

    const categoryValue = source.category ?? source.name ?? source.type;
    if (typeof categoryValue !== "string" || categoryValue.trim() === "") {
      return;
    }

    const normalizedCategoryKey = categoryValue.trim().toLowerCase();
    const count =
      toFiniteNumber(source.count ?? source.files ?? source.fileCount ?? source.totalCount) ?? 0;
    const sizeMB =
      toFiniteNumber(
        source.sizeMB ??
        source.sizeMb ??
        source.totalSize ??
        source.storageUsedMB ??
        source.usedMB ??
        source.used ??
        source.size,
      ) ?? 0;

    const existing = merged.get(normalizedCategoryKey);
    if (existing) {
      existing.count += count;
      existing.sizeMB += sizeMB;
      return;
    }

    merged.set(normalizedCategoryKey, {
      category: formatCategory(categoryValue),
      count,
      sizeMB,
    });
  };

  raw.forEach((item) => {
    const source = asRecord(item);
    if (!source) {
      return;
    }

    if (Array.isArray(source.details)) {
      source.details.forEach((detail) => append(detail));
    }

    append(source);
  });

  return Array.from(merged.values()).sort((first, second) => second.sizeMB - first.sizeMB);
};

const resolveDisplayName = (source: Record<string, unknown>, index: number): string => {
  const fullName =
    (typeof source.fullName === "string" && source.fullName.trim()) ||
    (typeof source.name === "string" && source.name.trim()) ||
    `${typeof source.firstName === "string" ? source.firstName : ""} ${typeof source.lastName === "string" ? source.lastName : ""}`.trim();

  if (fullName) {
    return fullName;
  }

  if (typeof source.email === "string" && source.email.trim()) {
    return source.email.trim();
  }

  return `User ${index + 1}`;
};

const resolveInitials = (name: string): string => {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return "U";
  }
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }
  return `${tokens[0][0] || ""}${tokens[1][0] || ""}`.toUpperCase();
};

const resolveUserRows = (raw: unknown): StorageUser[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const users = raw
    .map((entry, index) => {
      const source = asRecord(entry);
      if (!source) {
        return null;
      }

      const userName = resolveDisplayName(source, index);
      const categories = resolveCategoryRows(
        source.details ?? source.categories ?? source.breakdown ?? source.storageDetails,
      );
      const categoryFiles = categories.reduce((sum, item) => sum + item.count, 0);
      const categorySizeMB = categories.reduce((sum, item) => sum + item.sizeMB, 0);

      const files =
        toFiniteNumber(source.files ?? source.count ?? source.fileCount ?? source.totalFiles) ??
        categoryFiles;

      const sizeMB =
        toFiniteNumber(
          source.sizeMB ??
          source.sizeMb ??
          source.storageUsedMB ??
          source.usedMB ??
          source.used ??
          source.size,
        ) ?? categorySizeMB;

      return {
        id: String(source.id ?? source.userId ?? source._id ?? `user-${index + 1}`),
        userName,
        initials: resolveInitials(userName),
        email: typeof source.email === "string" ? source.email : "",
        files: Math.max(files, 0),
        sizeMB: Math.max(sizeMB, 0),
        categories,
      };
    })
    .filter((user): user is StorageUser => Boolean(user));

  return users;
};

const resolveCategoryTotals = (
  users: StorageUser[],
  primaryCategoryCandidates: unknown[],
  fallbackCategoryCandidates: unknown[],
): StorageCategory[] => {
  const mergeCategories = (input: StorageCategory[]): StorageCategory[] => {
    const merged = new Map<string, StorageCategory>();

    input.forEach((category) => {
      const key = category.category.toLowerCase();
      const existing = merged.get(key);
      if (existing) {
        existing.count += category.count;
        existing.sizeMB += category.sizeMB;
        return;
      }

      merged.set(key, {
        category: formatCategory(category.category),
        count: category.count,
        sizeMB: category.sizeMB,
      });
    });

    return Array.from(merged.values()).sort((first, second) => second.sizeMB - first.sizeMB);
  };

  const primaryCategoryFromApi = mergeCategories(
    primaryCategoryCandidates.flatMap((candidate) => resolveCategoryRows(candidate)),
  );

  if (primaryCategoryFromApi.length > 0) {
    return primaryCategoryFromApi;
  }

  const fallbackCategoryFromApi = mergeCategories(
    fallbackCategoryCandidates.flatMap((candidate) => resolveCategoryRows(candidate)),
  );

  if (fallbackCategoryFromApi.length > 0) {
    return fallbackCategoryFromApi;
  }

  return mergeCategories(users.flatMap((user) => user.categories));
};

const resolvePaginationData = (
  source: Record<string, unknown> | null,
  fallbackStart: number,
  fallbackLimit: number,
  fallbackTotal: number,
): StoragePagination => {
  const start =
    toFiniteNumber(source?.start ?? source?.page ?? source?.currentPage) ?? fallbackStart;
  const limit = toFiniteNumber(source?.limit ?? source?.pageSize) ?? fallbackLimit;
  const responseTotal =
    toFiniteNumber(source?.total ?? source?.totalItems ?? source?.totalCount ?? source?.count) ??
    fallbackTotal;

  return {
    start: Math.max(1, Math.trunc(start)),
    limit: Math.max(1, Math.trunc(limit)),
    total: Math.max(0, Math.trunc(responseTotal)),
    raw: source ?? {},
  };
};

const resolveStorageData = (
  payload: unknown,
  fallbackStart: number,
  fallbackLimit: number,
): StorageData => {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;

  const userCandidates = [
    data?.storageList,
    data?.users,
    data?.items,
    root?.storageList,
    root?.users,
    root?.items,
    payload,
  ];

  let users: StorageUser[] = [];
  for (const candidate of userCandidates) {
    users = resolveUserRows(candidate);
    if (users.length > 0) {
      break;
    }
  }

  const categoryTotalsCandidates = [
    data?.categoryTotals,
    root?.categoryTotals,
  ];

  const fallbackCategoryCandidates = [
    data?.details,
    data?.categories,
    root?.details,
    root?.categories,
  ];

  const categories = resolveCategoryTotals(
    users,
    categoryTotalsCandidates,
    fallbackCategoryCandidates,
  );

  const totalFromCategories = categories.reduce((accumulator, item) => accumulator + item.sizeMB, 0);
  const totalFromUsers = users.reduce((accumulator, item) => accumulator + item.sizeMB, 0);
  const companyStorageUsage =
    toFiniteNumber(data?.companyStorageUsage) ??
    toFiniteNumber(root?.companyStorageUsage) ??
    toFiniteNumber(data?.totalUsageMB) ??
    toFiniteNumber(root?.totalUsageMB) ??
    Math.max(totalFromCategories, totalFromUsers);

  const paginationSource = asRecord(data?.pagination) ?? asRecord(root?.pagination);
  const pagination = resolvePaginationData(
    paginationSource,
    fallbackStart,
    fallbackLimit,
    users.length,
  );

  const lastUpdatedValue =
    (typeof data?.updatedAt === "string" && data.updatedAt) ||
    (typeof root?.updatedAt === "string" && root.updatedAt) ||
    (typeof data?.lastUpdated === "string" && data.lastUpdated) ||
    (typeof root?.lastUpdated === "string" && root.lastUpdated) ||
    "";

  const totalSpaceValue =
    toFiniteNumber(data?.totalSpace) ||
    toFiniteNumber(root?.totalSpace) ||
    toFiniteNumber(data?.totalStorageMB) ||
    toFiniteNumber(root?.totalStorageMB) ||
    0;

  return {
    companyStorageUsage: Math.max(companyStorageUsage, 0),
    totalSpace: Math.max(totalSpaceValue, 0),
    categories,
    lastUpdated: lastUpdatedValue,
    users,
    pagination,
  };
};

const buildCategorySummary = (categories: StorageCategory[]): string => {
  const nonZero = categories
    .filter((item) => item.sizeMB > 0 || item.count > 0)
    .sort((first, second) => second.sizeMB - first.sizeMB);

  if (nonZero.length === 0) {
    return "No category details";
  }

  return nonZero
    .slice(0, 2)
    .map((item) => `${item.category}: ${item.sizeMB.toFixed(2)} MB`)
    .join(" | ");
};

export const StorageComponent: React.FC<StorageComponentProps> = ({ searchTerm = "" }) => {
  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(10);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  
  // Removed permission related variables
  const isPermissionsLoading = false; 
  const isAuthenticated = true;

  const trimmedSearch = searchTerm.trim();

  // const storageModuleId = useMemo(() => { ... });
  const canAccessStorage = true; // Temporary bypass

  useEffect(() => {
    setStart(1);
  }, [trimmedSearch]);

  const storageUrl = useMemo(() => {
    const params = new URLSearchParams({
      start: String(start),
      limit: String(limit),
    });

    if (trimmedSearch) {
      params.set("search", trimmedSearch);
    }

    return `${API_ENDPOINTS.USER_STORAGE}?${params.toString()}`;
  }, [start, limit, trimmedSearch]);

  const { data: storageApiData, isLoading, isFetching, error } = useApiQuery(
    ["UserStorage", start, limit, trimmedSearch],
    storageUrl,
    {
      refetchOnWindowFocus: false,
      refetchOnMount: "always",
      staleTime: 0,
      retry: 1,
      enabled: true, // Always enabled for now
    } as const,
  );

  // Removed Permission loading and access guards block

  const storageData = useMemo(
    () => resolveStorageData(storageApiData, start, limit),
    [storageApiData, start, limit],
  );

  const visibleUsers = useMemo(() => {
    if (!trimmedSearch) {
      return storageData.users;
    }

    const query = trimmedSearch.toLowerCase();
    return storageData.users.filter((user) => {
      const categoryText = user.categories
        .map((item) => item.category)
        .join(" ")
        .toLowerCase();

      return (
        user.userName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        categoryText.includes(query)
      );
    });
  }, [storageData.users, trimmedSearch]);

  const visiblePageUsage = useMemo(
    () => visibleUsers.reduce((sum, user) => sum + user.sizeMB, 0),
    [visibleUsers],
  );

  const totalSpaceReference = storageData.totalSpace > 0 ? storageData.totalSpace : storageData.companyStorageUsage > 0 ? storageData.companyStorageUsage : visiblePageUsage;

  const usagePercentage =
    totalSpaceReference > 0
      ? Math.min(100, (storageData.companyStorageUsage / totalSpaceReference) * 100)
      : 0;

  const totalUsageReference =
    storageData.companyStorageUsage > 0 ? storageData.companyStorageUsage : visiblePageUsage;

  const categoryShareReference = useMemo(
    () => resolveCategoryShareReference(storageData.categories, totalUsageReference),
    [storageData.categories, totalUsageReference],
  );

  const categoryChartData = useMemo(
    () => buildCategoryChartData(storageData.categories, categoryShareReference),
    [storageData.categories, categoryShareReference],
  );

  const donutBackground = useMemo(() => {
    return buildDonutBackground(categoryChartData, categoryShareReference);
  }, [categoryChartData, categoryShareReference]);

  useEffect(() => {
    if (expandedUserId && !visibleUsers.some((user) => user.id === expandedUserId)) {
      setExpandedUserId(null);
    }
  }, [expandedUserId, visibleUsers]);

  const paginationTotal =
    storageData.pagination.total > 0 ? storageData.pagination.total : visibleUsers.length;

  const formattedLastUpdated = storageData.lastUpdated ? formatLastUpdated(storageData.lastUpdated) : "";

  // Removed Permission Error logic

  return (
    <section className="w-full space-y-5">
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HardDrive className="h-5 w-5 text-blue-600" />
              Company Storage Usage
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">Total Usage</p>
            <p className="text-3xl font-bold text-slate-900">
              {formatMegabytes(storageData.companyStorageUsage)}
              {storageData.totalSpace > 0 && (
                <span className="ml-2 text-lg font-normal text-slate-500">
                  / {formatMegabytes(storageData.totalSpace)}
                </span>
              )}
            </p>
            {formattedLastUpdated ? (
              <p className="mt-1 text-xs text-slate-500">Last updated: {formattedLastUpdated}</p>
            ) : null}

            {storageData.totalSpace > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Storage Usage</span>
                  <span>{usagePercentage.toFixed(2)}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, usagePercentage))}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-100 bg-white lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">Category Distribution</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Category-wise usage summary</p>
              <span className="text-xs text-slate-500">{formatMegabytes(categoryShareReference)}</span>
            </div>

            {categoryChartData.length === 0 ? (
              <p className="text-sm text-slate-600">No category storage details found.</p>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative h-36 w-36 shrink-0">
                  <div
                    className="h-full w-full rounded-full border border-slate-200/80"
                    style={{ background: donutBackground }}
                  />
                  <div className="absolute inset-[20%] flex flex-col items-center justify-center rounded-full bg-white/90 text-center shadow-inner">
                    <span className="text-[11px] uppercase tracking-wide text-slate-500">Total</span>
                    <span className="px-2 text-sm font-semibold text-slate-800">
                      {formatMegabytes(categoryShareReference)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 sm:max-w-[420px]">
                  {categoryChartData.map((category) => (
                    <div key={category.category} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate text-sm font-medium text-slate-800">
                        {category.category}
                      </span>
                      <span className="text-xs text-slate-400">-</span>
                      <div className="whitespace-nowrap text-xs text-slate-600">
                        {formatNumber(category.count)} files | {category.sizeMB.toFixed(2)} MB |{" "}
                        {category.share.toFixed(2)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-slate-600" />
            Storage Used By Users
          </CardTitle>
          <CardDescription>
            User-wise storage usage with progress bars and API pagination.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0">
          {isLoading || isFetching ? (
            <div className="space-y-2 px-6 pb-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : visibleUsers.length === 0 ? (
            <div className="px-6 pb-4 pt-2 text-sm text-slate-600">
              No user storage records found for the current response.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Files</TableHead>
                    <TableHead className="text-right">Storage Used</TableHead>
                    <TableHead className="text-left">Usage Progress</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleUsers.map((user, index) => {
                    const share =
                      totalUsageReference > 0
                        ? Math.min(100, (user.sizeMB / totalUsageReference) * 100)
                        : 0;
                    const fillWidth = share === 0 ? 0 : Math.max(2, share);
                    const isExpanded = expandedUserId === user.id;
                    const userCategoryShareReference = resolveCategoryShareReference(
                      user.categories,
                      user.sizeMB,
                    );
                    const userCategoryChartData = buildCategoryChartData(
                      user.categories,
                      userCategoryShareReference,
                    );
                    const userDonutBackground = buildDonutBackground(
                      userCategoryChartData,
                      userCategoryShareReference,
                    );

                    return (
                      <React.Fragment key={user.id}>
                        <TableRow
                          className="cursor-pointer transition-colors hover:bg-slate-50"
                          onClick={() => {
                            setExpandedUserId((previous) => (previous === user.id ? null : user.id));
                          }}
                        >
                          <TableCell className="min-w-[220px]">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                {user.initials}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-900">{user.userName}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(user.files)}</TableCell>
                          <TableCell className="text-right">{user.sizeMB.toFixed(2)} MB</TableCell>
                          <TableCell className="w-full min-w-[300px]">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-slate-600">
                                <span>{formatMegabytes(user.sizeMB)}</span>
                                <span>{share.toFixed(2)}%</span>
                              </div>
                              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full transition-all ${getProgressGradient(index)}`}
                                  style={{ width: `${Math.min(100, fillWidth)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow className="bg-slate-50/60">
                            <TableCell colSpan={5} className="py-4">
                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="mb-3 flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                      {user.userName} Category Distribution
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {formatNumber(user.files)} files | {formatMegabytes(user.sizeMB)}
                                    </p>
                                  </div>
                                  {/* <span className="text-xs text-slate-500">
                                    {formatMegabytes(userCategoryShareReference)}
                                  </span> */}
                                </div>

                                {userCategoryChartData.length === 0 ? (
                                  <p className="text-sm text-slate-600">No category storage details found for this user.</p>
                                ) : (
                                  <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-16">
                                    <div className="relative h-32 w-32 shrink-0">
                                      <div
                                        className="h-full w-full rounded-full border border-slate-200"
                                        style={{ background: userDonutBackground }}
                                      />
                                      <div className="absolute inset-[20%] flex flex-col items-center justify-center rounded-full bg-white/90 text-center shadow-inner">
                                        <span className="text-[10px] uppercase tracking-wide text-slate-500">User Total</span>
                                        <span className="px-2 text-xs font-semibold text-slate-800">
                                          {formatMegabytes(userCategoryShareReference)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="w-full space-y-2 md:max-w-[520px]">
                                      {userCategoryChartData.map((category) => (
                                        <div
                                          key={`${user.id}-${category.category}`}
                                          className="flex items-center gap-2"
                                        >
                                          <span
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{ backgroundColor: category.color }}
                                          />
                                          <span className="truncate text-sm font-medium text-slate-800">
                                            {category.category}
                                          </span>
                                          <span className="text-xs text-slate-400">-</span>
                                          <div className="whitespace-nowrap text-xs text-slate-600">
                                            {formatNumber(category.count)} files | {category.sizeMB.toFixed(2)} MB |{" "}
                                            {category.share.toFixed(2)}%
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {!isLoading && (
          <div className="border-t px-4 pb-4">
            <Pagination
              start={start}
              limit={limit}
              total={paginationTotal}
              pagination={storageData.pagination.raw}
              onPageChange={(newStart) => setStart(newStart)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setStart(1);
              }}
            />
          </div>
        )}
      </Card>

    </section>
  );
};
