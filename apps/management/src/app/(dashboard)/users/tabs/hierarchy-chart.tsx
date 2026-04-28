"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiCall } from "@nitroberry/api-client";
import { API_ENDPOINTS } from "@/api/endpoints";
import { HTTP_METHODS } from "@/api/methods";
import { EmptyState } from "@/components/not-found";
import { Button } from "@nitroberry/ui";
import { cn } from "@nitroberry/shared";
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  Columns,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Rows,
  ShieldCheck,
  User,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@nitroberry/ui";
import { Input } from "@nitroberry/ui";
import { Badge } from "@nitroberry/ui";



type TreeLayout = "vertical" | "horizontal";

interface HierarchyNode {
  id: string;
  userId: string;
  name: string;
  title: string;
  // subtitle: string;
  roleLabel: string;
  managerId: string | null;
  children: HierarchyNode[];
}

interface HierarchyNodeCardProps {
  node: HierarchyNode;
  isRoot?: boolean;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  onAdd?: () => void;
  onEdit?: () => void;
  onViewDetails?: () => void;
}

interface HierarchyTreeNodeProps {
  node: HierarchyNode;
  isRoot?: boolean;
  expandedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onViewDetails?: (node: HierarchyNode) => void;
}

interface HierarchyComponentProps {
  onOpenUserDetails?: (
    userId: string,
    mode?: "details" | "edit-user" | "edit-hierarchy",
  ) => void;
  reloadSignal?: number;
}

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.4;
const ZOOM_STEP = 0.1;

const getAllNodeIds = (nodes: HierarchyNode[]): string[] => {
  return nodes.flatMap((node) => [node.id, ...getAllNodeIds(node.children)]);
};

const toStringValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const getNodeName = (node: Record<string, unknown>): string => {
  const directName = toStringValue(node.name ?? node.fullName ?? node.userName);
  if (directName) return directName;

  const userObj =
    typeof node.user === "object" && node.user !== null
      ? (node.user as Record<string, unknown>)
      : null;

  const firstName = toStringValue(node.firstName ?? userObj?.firstName);
  const lastName = toStringValue(node.lastName ?? userObj?.lastName);
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || "Unknown User";
};

const getNodeTitle = (node: Record<string, unknown>): string => {
  const jobTitle =
    typeof node.jobTitle === "object" && node.jobTitle !== null
      ? (node.jobTitle as Record<string, unknown>)
      : null;

  const userObj =
    typeof node.user === "object" && node.user !== null
      ? (node.user as Record<string, unknown>)
      : null;

  return (
    toStringValue(
      node.title ??
      node.jobTitleName ??
      node.designation ??
      node.roleName ??
      jobTitle?.name ??
      userObj?.jobTitle ??
      userObj?.title,
    ) || "Team Member"
  );
};

// const getNodeSubtitle = (node: Record<string, unknown>): string => {
//   const department =
//     typeof node.department === "object" && node.department !== null
//       ? (node.department as Record<string, unknown>)
//       : null;

//   const userObj =
//     typeof node.user === "object" && node.user !== null
//       ? (node.user as Record<string, unknown>)
//       : null;

//   return (
//     toStringValue(
//       node.subtitle ??
//         node.departmentName ??
//         node.department ??
//         department?.name ??
//         userObj?.departmentName ??
//         userObj?.department ??
//         node.teamName,
//     ) || "General Operations"
//   );
// };

const getNodeRole = (node: Record<string, unknown>): string => {
  const role =
    typeof node.role === "object" && node.role !== null
      ? (node.role as Record<string, unknown>)
      : null;

  return (
    toStringValue(
      node.roleLabel ?? node.roleName ?? role?.name ?? node.designation,
    ) || "Member"
  );
};

const normalizeHierarchyNode = (rawNode: unknown): HierarchyNode | null => {
  if (!rawNode || typeof rawNode !== "object") return null;
  const node = rawNode as Record<string, unknown>;

  const id = toStringValue(node.id ?? node._id);
  if (!id) return null;

  const userObj =
    typeof node.user === "object" && node.user !== null
      ? (node.user as Record<string, unknown>)
      : null;

  const managerObj =
    typeof node.manager === "object" && node.manager !== null
      ? (node.manager as Record<string, unknown>)
      : null;

  const userId = toStringValue(
    node.userId ?? node.user_id ?? userObj?.id ?? userObj?._id,
  );

  const managerIdRaw = toStringValue(
    node.managerId ??
    node.manager_id ??
    node.parentId ??
    managerObj?.id ??
    managerObj?._id,
  );

  const rawChildren = Array.isArray(node.children)
    ? node.children
    : Array.isArray(node.reports)
      ? node.reports
      : Array.isArray(node.subordinates)
        ? node.subordinates
        : Array.isArray(node.nodes)
          ? node.nodes
          : [];

  const children = rawChildren
    .map((child) => normalizeHierarchyNode(child))
    .filter((child): child is HierarchyNode => Boolean(child));

  return {
    id,
    userId,
    name: getNodeName(node),
    title: getNodeTitle(node),
    // subtitle: getNodeSubtitle(node),
    roleLabel: getNodeRole(node),
    managerId: managerIdRaw || null,
    children,
  };
};

const getNodeTone = (node: HierarchyNode, isRoot: boolean) => {
  const roleSeed = `${node.title} ${node.roleLabel}`.toLowerCase();

  if (
    isRoot ||
    roleSeed.includes("owner") ||
    roleSeed.includes("principal") ||
    roleSeed.includes("director")
  ) {
    return {
      icon: ShieldCheck,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      titleColor: "text-indigo-600",
      border: "border-indigo-300",
    };
  }

  if (
    roleSeed.includes("admin") ||
    roleSeed.includes("manager") ||
    roleSeed.includes("lead")
  ) {
    return {
      icon: BriefcaseBusiness,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      titleColor: "text-blue-600",
      border: "border-slate-200",
    };
  }

  return {
    icon: User,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    titleColor: "text-violet-600",
    border: "border-slate-200",
  };
};

const HierarchyNodeCard = ({
  node,
  isRoot = false,
  hasChildren = false,
  isExpanded = false,
  onToggle,
  onAdd,
  onEdit,
  onViewDetails,
}: HierarchyNodeCardProps) => {
  const tone = getNodeTone(node, isRoot);
  const RoleIcon = tone.icon;

  return (
    <div
      className={cn(
        "relative w-[240px] rounded-xl border bg-white px-4 py-5 shadow-sm",
        tone.border,
      )}
    >
      {isRoot && (
        <span className="absolute -top-2 right-3 rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {node.roleLabel.toLowerCase().includes("owner") ? "OWNER" : "ROOT"}
        </span>
      )}

      <div className="mb-3 flex justify-center">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full",
            tone.iconBg,
          )}
        >
          <RoleIcon className={cn("h-5 w-5", tone.iconColor)} />
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onViewDetails}
            className="mx-auto block w-full cursor-pointer truncate text-center text-[15px] font-semibold text-slate-900 transition-colors hover:text-primary hover:underline"
          >
            {node.name}
          </button>
          <p className={cn("mt-1 text-center text-xs font-medium", tone.titleColor)}>
            {node.title}
          </p>
          <p className="mt-1 text-center text-[11px] text-slate-400">
            {/* {node.subtitle} */}
          </p>
        </div>
      </div>

      <div className="mt-3 flex shrink-0 items-center justify-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onAdd}
          title="Add report"
          className="text-emerald-600 hover:text-emerald-700"
        >
          <Plus className="h-4 w-4" />
        </Button>
        {!isRoot && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            title="Open edit options"
            className="text-blue-600 hover:text-blue-700"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {hasChildren && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            title={isExpanded ? "Collapse" : "Expand"}
            className="ml-1 text-slate-600"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {hasChildren && (
        <div className="mt-2 text-center">
          <Badge variant="outline" className="text-[10px]">
            {node.children.length} {node.children.length > 1 ? "reports" : "report"}
          </Badge>
        </div>
      )}
    </div>
  );
};

const VerticalHierarchyNode = ({
  node,
  isRoot = false,
  expandedIds = new Set(),
  onToggle,
  onAdd,
  onEdit,
  onViewDetails,
}: HierarchyTreeNodeProps & {
  onAdd?: (managerId: string) => void;
  onEdit?: (node: HierarchyNode) => void;
  onViewDetails?: (node: HierarchyNode) => void;
}) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  return (
    <div className="flex flex-col items-center">
      <HierarchyNodeCard
        node={node}
        isRoot={isRoot}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        onToggle={() => onToggle?.(node.id)}
        onAdd={() => onAdd?.(node.id)}
        onEdit={() => onEdit?.(node)}
        onViewDetails={() => onViewDetails?.(node)}
      />

      {hasChildren && isExpanded && (
        <div className="mt-4 flex flex-col items-center">
          <div className="h-5 w-px bg-slate-300" />

          <div className="relative flex flex-wrap justify-center gap-x-10 gap-y-8 pt-5">
            {node.children.length > 1 && (
              <div className="absolute left-8 right-8 top-0 h-px bg-slate-300" />
            )}

            {node.children.map((child) => (
              <div key={child.id} className="relative flex flex-col items-center">
                <div className="absolute -top-5 left-1/2 h-5 w-px -translate-x-1/2 bg-slate-300" />
                <VerticalHierarchyNode
                  node={child}
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                  onAdd={onAdd}
                  onEdit={onEdit}
                  onViewDetails={onViewDetails}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const HorizontalHierarchyNode = ({
  node,
  isRoot = false,
  expandedIds = new Set(),
  onToggle,
  onAdd,
  onEdit,
  onViewDetails,
}: HierarchyTreeNodeProps & {
  onAdd?: (managerId: string) => void;
  onEdit?: (node: HierarchyNode) => void;
  onViewDetails?: (node: HierarchyNode) => void;
}) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  return (
    <div className="flex items-start gap-8">
      <div className="relative">
        <HierarchyNodeCard
          node={node}
          isRoot={isRoot}
          hasChildren={hasChildren}
          isExpanded={isExpanded}
          onToggle={() => onToggle?.(node.id)}
          onAdd={() => onAdd?.(node.id)}
          onEdit={() => onEdit?.(node)}
          onViewDetails={() => onViewDetails?.(node)}
        />
        {hasChildren && isExpanded && (
          <div className="absolute left-full top-1/2 h-px w-8 -translate-y-1/2 bg-slate-300" />
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="relative flex flex-col gap-6 pl-8">
          {node.children.length > 1 && (
            <div className="absolute left-0 top-[22px] bottom-[22px] w-px bg-slate-300" />
          )}

          {node.children.map((child) => (
            <div key={child.id} className="relative">
              <div className="absolute -left-8 top-1/2 h-px w-8 -translate-y-1/2 bg-slate-300" />
              <HorizontalHierarchyNode
                node={child}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onAdd={onAdd}
                onEdit={onEdit}
                onViewDetails={onViewDetails}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const HierarchyComponent: React.FC<HierarchyComponentProps> = ({
  onOpenUserDetails,
  reloadSignal,
}) => {
  const [roots, setRoots] = useState<HierarchyNode[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [layout, setLayout] = useState<TreeLayout>("vertical");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<HierarchyNode | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [availableUsers, setAvailableUsers] = useState<
    { id: string; firstName: string; lastName: string; jobTitle: string }[]
  >([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [showChangeUser, setShowChangeUser] = useState(false);

  const allNodeIds = useMemo(() => getAllNodeIds(roots), [roots]);

  const loadChart = useCallback(async () => {
    setIsChartLoading(true);
    try {
      const response = await apiCall<unknown>(
        HTTP_METHODS.GET,
        API_ENDPOINTS.USER_HIERARCHY_CHART,
      );

      const payload =
        response &&
          typeof response === "object" &&
          "data" in (response as Record<string, unknown>)
          ? (response as { data?: unknown }).data ?? response
          : response;

      const payloadObj =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : null;

      const chartData = Array.isArray(payload)
        ? payload
        : Array.isArray(payloadObj?.hierarchy)
          ? payloadObj.hierarchy
          : Array.isArray(payloadObj?.chart)
            ? payloadObj.chart
            : Array.isArray(payloadObj?.roots)
              ? payloadObj.roots
              : payload && typeof payload === "object"
                ? [payload]
                : [];

      const normalizedRoots = chartData
        .map((node: unknown) => normalizeHierarchyNode(node))
        .filter((node: HierarchyNode | null): node is HierarchyNode =>
          Boolean(node),
        );

      setRoots(normalizedRoots);
      setExpandedIds(new Set(getAllNodeIds(normalizedRoots)));
    } finally {
      setIsChartLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChart();
  }, [loadChart, reloadSignal]);

  useEffect(() => {
    if (!isMemberDialogOpen) {
      setAvailableUsers([]);
      setIsUsersLoading(false);
      return;
    }

    // Only fetch if in add mode or if actively changing user in edit mode
    if (!isAddMode && !showChangeUser) {
      setAvailableUsers([]);
      setIsUsersLoading(false);
      return;
    }

    let isCancelled = false;
    setIsUsersLoading(true);

    const fetchUsers = async () => {
      try {
        const response = await apiCall<unknown>(
          HTTP_METHODS.GET,
          API_ENDPOINTS.USER_HIERARCHY_USERS,
          {
            start: 1,
            limit: 20,
            ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
          },
        );

        if (isCancelled) return;

        // Handle nested data structure from API
        let usersArray: any[] = [];

        if (Array.isArray(response)) {
          usersArray = response;
        } else if (typeof response === "object" && response !== null) {
          const responseObj = response as Record<string, unknown>;

          // Check for common response shapes
          if (
            typeof responseObj.data === "object" &&
            responseObj.data !== null &&
            Array.isArray((responseObj.data as Record<string, unknown>).users)
          ) {
            usersArray = (responseObj.data as Record<string, unknown>).users as any[];
          } else if (
            typeof responseObj.data === "object" &&
            responseObj.data !== null &&
            Array.isArray((responseObj.data as Record<string, unknown>).hierarchyUsers)
          ) {
            usersArray = (responseObj.data as Record<string, unknown>).hierarchyUsers as any[];
          } else if (Array.isArray(responseObj.data)) {
            usersArray = responseObj.data;
          } else if (Array.isArray(responseObj.users)) {
            usersArray = responseObj.users;
          } else if (Array.isArray(responseObj.hierarchyUsers)) {
            usersArray = responseObj.hierarchyUsers;
          }
        }

        if (!isCancelled) {
          const mappedUsers = usersArray.map((u: unknown) => {
            const user = u as Record<string, unknown>;
            const nestedUser =
              typeof user.user === "object" && user.user !== null
                ? (user.user as Record<string, unknown>)
                : null;

            return {
              id: String(user.userId ?? user.id ?? user._id ?? nestedUser?.id ?? nestedUser?._id ?? ""),
              firstName: String(
                user.firstName ??
                user.first_name ??
                nestedUser?.firstName ??
                nestedUser?.first_name ??
                user.name ??
                "",
              ),
              lastName: String(
                user.lastName ?? user.last_name ?? nestedUser?.lastName ?? nestedUser?.last_name ?? "",
              ),
              jobTitle: String(
                user.jobTitleName ??
                user.jobTitle ??
                user.job_title ??
                user.title ??
                nestedUser?.jobTitle ??
                nestedUser?.job_title ??
                nestedUser?.title ??
                "",
              ),
            };
          });
          setAvailableUsers(mappedUsers);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("❌ Error fetching users:", error);
          setAvailableUsers([]);
        }
      } finally {
        if (!isCancelled) {
          setIsUsersLoading(false);
        }
      }
    };

    // If dialog just opened, fetch immediately
    if (!searchTerm.trim()) {
      fetchUsers();
    } else {
      // Otherwise debounce the fetch
      const timer = setTimeout(fetchUsers, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      isCancelled = true;
    };
  }, [isMemberDialogOpen, isAddMode, showChangeUser, searchTerm]);

  const handleZoomIn = () => {
    setZoomLevel((prev) =>
      Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2))),
    );
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) =>
      Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2))),
    );
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
  };

  const handleToggleNode = (nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const openUserDetails = (node: HierarchyNode) => {
    const selectedUserId = node.userId || node.id;
    onOpenUserDetails?.(selectedUserId);
  };

  const openHierarchyEditorInDrawer = (node: HierarchyNode) => {
    const selectedUserId = node.userId || node.id;
    onOpenUserDetails?.(selectedUserId, "edit-hierarchy");
  };

  const openAddDialog = (managerId: string) => {
    setIsAddMode(true);
    setEditingNode({
      id: "",
      userId: "",
      name: "",
      title: "Team Member",
      // subtitle: "General Operations",
      roleLabel: "Member",
      managerId,
      children: [],
    });
    setSearchTerm("");
    setAvailableUsers([]);
    setIsMemberDialogOpen(true);
  };

  const closeMemberDialog = () => {
    setIsMemberDialogOpen(false);
    setEditingNode(null);
    setIsAddMode(false);
    setSearchTerm("");
    setAvailableUsers([]);
    setIsSaving(false);
    setShowChangeUser(false);
  };

  const handleSaveMember = async () => {
    if (!editingNode?.userId || isSaving) return;

    setIsSaving(true);
    try {
      const payload = {
        userId: editingNode.userId,
        managerId: editingNode.managerId ?? null,
      };

      if (isAddMode) {
        await apiCall(
          HTTP_METHODS.POST,
          `${API_ENDPOINTS.USER_HIERARCHY}/`,
          payload,
        );
      } else {
        await apiCall(
          HTTP_METHODS.PUT,
          `${API_ENDPOINTS.USER_HIERARCHY}/${editingNode.userId}`,
          payload,
        );
      }

      await loadChart();
      closeMemberDialog();
    } finally {
      setIsSaving(false);
    }
  };

  const zoomPercent = Math.round(zoomLevel * 100);
  const selectedUserId = editingNode?.userId ?? "";

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            title="Zoom out"
            onClick={handleZoomOut}
            disabled={zoomLevel <= MIN_ZOOM}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            title="Zoom in"
            onClick={handleZoomIn}
            disabled={zoomLevel >= MAX_ZOOM}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            title="Reset zoom"
            onClick={handleZoomReset}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <span className="ml-1 text-xs font-medium text-slate-500">
            {zoomPercent}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedIds(new Set(allNodeIds))}
            className="h-8 text-xs"
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedIds(new Set())}
            className="h-8 text-xs"
          >
            Collapse All
          </Button>

          <div className="inline-flex items-center rounded-md border border-slate-200 bg-white p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLayout("vertical")}
              className={cn(
                "h-8 rounded-sm px-3 text-xs",
                layout === "vertical"
                  ? "bg-primary text-white hover:bg-primary/90 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Rows className="h-4 w-4 text-current" />
              Vertical View
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLayout("horizontal")}
              className={cn(
                "h-8 rounded-sm px-3 text-xs",
                layout === "horizontal"
                  ? "bg-primary text-white hover:bg-primary/90 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Columns className="h-4 w-4 text-current" />
              Horizontal View
            </Button>
          </div>
        </div>
      </div>

      <div
        className="min-h-[520px] max-w-full overflow-x-auto overflow-y-hidden rounded-lg border border-slate-200 bg-slate-50 p-5"
        onWheel={(event) => {
          if (!event.ctrlKey) return;
          event.preventDefault();
          if (event.deltaY < 0) {
            handleZoomIn();
          } else {
            handleZoomOut();
          }
        }}
      >
        {isChartLoading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : roots.length === 0 ? (
          <EmptyState
            onClick={loadChart}
            buttonTitle="Reload Hierarchy"
            title="No Hierarchy Data Found"
            description="Hierarchy members are not configured yet. Add users to hierarchy to view the structure."
          />
        ) : (
          <div
            className={cn(
              "min-w-max transition-transform duration-150",
              layout === "vertical"
                ? "flex flex-col items-center gap-10"
                : "flex flex-col items-start gap-8",
            )}
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: layout === "vertical" ? "top center" : "top left",
            }}
          >
            {roots.map((root) =>
              layout === "vertical" ? (
                <VerticalHierarchyNode
                  key={root.id}
                  node={root}
                  isRoot
                  expandedIds={expandedIds}
                  onToggle={handleToggleNode}
                  onAdd={openAddDialog}
                  onEdit={openHierarchyEditorInDrawer}
                  onViewDetails={openUserDetails}
                />
              ) : (
                <HorizontalHierarchyNode
                  key={root.id}
                  node={root}
                  isRoot
                  expandedIds={expandedIds}
                  onToggle={handleToggleNode}
                  onAdd={openAddDialog}
                  onEdit={openHierarchyEditorInDrawer}
                  onViewDetails={openUserDetails}
                />
              ),
            )}
          </div>
        )}
      </div>

      <Dialog
        open={isMemberDialogOpen}
        onOpenChange={(open) => !open && closeMemberDialog()}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="mt-0">
            <DialogTitle>
              {isAddMode ? "Add Hierarchy Member" : "Edit Hierarchy Member"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!isAddMode && !showChangeUser && editingNode?.userId && (
              <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {editingNode.name}
                  </p>
                  <p className="text-xs text-slate-600">{editingNode.title}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChangeUser(true)}
                  className="shrink-0"
                >
                  Change
                </Button>
              </div>
            )}

            {isAddMode && (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">
                  Select a team member to add
                </p>
              </div>
            )}

            {(isAddMode || showChangeUser) && (
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    value={searchTerm}
                    placeholder="Search users by name..."
                    onChange={(event) => setSearchTerm(event.target.value)}
                    autoFocus
                    className="focus:ring-2"
                  />
                  {searchTerm.trim() && (
                    <p className="mt-1 text-xs text-slate-500">
                      Showing results for "{searchTerm.trim()}"...
                    </p>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200">
                  {isUsersLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}

                  {!isUsersLoading && availableUsers.length === 0 && searchTerm.trim() && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <User className="mb-2 h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">No users found</p>
                      <p className="text-xs text-slate-500">
                        Try searching with a different name
                      </p>
                    </div>
                  )}

                  {!isUsersLoading && availableUsers.length === 0 && !searchTerm.trim() && isAddMode && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <User className="mb-2 h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">Start typing to search</p>
                      <p className="text-xs text-slate-500">
                        Enter a user name to see available team members
                      </p>
                    </div>
                  )}

                  {!isUsersLoading &&
                    availableUsers.length === 0 &&
                    !searchTerm.trim() &&
                    !isAddMode && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <User className="mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">
                          Start typing to search
                        </p>
                        <p className="text-xs text-slate-500">
                          Search for a different user to reassign
                        </p>
                      </div>
                    )}

                  {!isUsersLoading &&
                    availableUsers.map((user) => {
                      const isSelected = selectedUserId === user.id;
                      const displayName = `${user.firstName} ${user.lastName}`.trim() || user.id;

                      return (
                        <button
                          type="button"
                          key={user.id}
                          onClick={() =>
                            setEditingNode((prev) =>
                              prev
                                ? {
                                  ...prev,
                                  userId: user.id,
                                  name: displayName,
                                  title: user.jobTitle || prev.title,
                                }
                                : prev,
                            )
                          }
                          className={cn(
                            "flex w-full cursor-pointer items-center justify-between gap-3 border-b px-4 py-3 text-left last:border-b-0 transition-colors",
                            isSelected
                              ? "bg-primary/10 hover:bg-primary/15"
                              : "hover:bg-slate-50",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {displayName}
                            </p>
                            {user.jobTitle && (
                              <p className="truncate text-xs text-slate-500">
                                {user.jobTitle}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <Badge variant="default" className="shrink-0">
                              Selected
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                </div>

                {!isAddMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowChangeUser(false);
                      setSearchTerm("");
                      setAvailableUsers([]);
                    }}
                    className="w-full"
                  >
                    Cancel Change
                  </Button>
                )}
              </div>
            )}

            {editingNode?.userId && !isUsersLoading && (isAddMode || showChangeUser) && (
              <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2">
                <div className="h-2 w-2 rounded-full bg-green-600" />
                <p className="text-xs text-green-700">
                  <strong>{editingNode.name}</strong> selected
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeMemberDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveMember}
              disabled={!editingNode?.userId || isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isAddMode ? "Add Member" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
