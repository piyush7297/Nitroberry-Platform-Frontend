"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@nitroberry/ui";
import { Label } from "@nitroberry/ui";
import { Button } from "@nitroberry/ui";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@nitroberry/ui";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@nitroberry/ui";
import { Loader, MoreVertical, Edit, Trash2, CircleCheck, ShieldCheck } from "lucide-react";
import { useApiMutation, useApiQuery, useStatusMutation } from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import { API_ENDPOINTS } from "@/api/endpoints";
import { EmptyState } from "@/components/not-found";
import { PermissionGuard, useModulePermissions } from "@/components/PermissionGuard";
import { ConfirmationModal } from "@/components/models/confirmationModal";
import { Badge } from "@nitroberry/ui";
import { Pagination } from "../pagination";
import { Textarea } from "@nitroberry/ui";
import { Checkbox } from "@nitroberry/ui";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@nitroberry/ui";

type RoleDrawerMode = "create" | "details" | "edit-role" | "edit-permissions";

const PERMISSION_COLUMNS = [
    { key: "create", label: "Create" },
    { key: "read", label: "Read" },
    { key: "update", label: "Update" },
    { key: "delete", label: "Delete" },
    { key: "viewall", label: "View All" },
] as const;

const normalizeActionName = (actionName: string) =>
    actionName.toLowerCase().replace(/\s+/g, "");

const getModuleName = (module: any) => {
    return (
        module?.moduleName ||
        module?.name ||
        module?.module?.name ||
        (module?.moduleId ? `Module ${module.moduleId}` : "-")
    );
};

const toStringValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return "";
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return value as Record<string, unknown>;
};

const resolveRoleIdFromCreateResponse = (payload: unknown): string => {
    const root = asRecord(payload);
    const data = asRecord(root?.data) ?? root;

    return toStringValue(
        data?.id ??
        data?._id ??
        (asRecord(data?.role)?.id ?? asRecord(data?.role)?._id) ??
        (asRecord(data?.Role)?.id ?? asRecord(data?.Role)?._id),
    );
};

const resolveRoleDetailsFromResponse = (payload: unknown): Record<string, unknown> | null => {
    const root = asRecord(payload);
    const data = asRecord(root?.data) ?? root;

    const candidates: unknown[] = [
        data?.role,
        data?.Role,
        data?.item,
        data,
        root?.role,
        root?.Role,
        payload,
    ];

    for (const candidate of candidates) {
        const source = asRecord(candidate);
        if (source) {
            return source;
        }
    }

    return null;
};

interface RolesComponentProps {
    searchTerm?: string;
    createSignal?: number;
    refreshSignal?: number;
}

export const RolesComponent: React.FC<RolesComponentProps> = ({
    searchTerm = "",
    createSignal = 0,
    refreshSignal = 0,
}) => {
    const [roleName, setRoleName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [modalState, setModalState] = useState<{
        action: "delete" | "status" | null;
        job: any | null;
    }>({ action: null, job: null });
    const [start, setStart] = useState(1);
    const [limit, setLimit] = useState(10);
    const previousCreateSignal = useRef(createSignal);
    const previousRefreshSignal = useRef(refreshSignal);

    const [roleDrawerMode, setRoleDrawerMode] =
        useState<RoleDrawerMode>("create");
    const [isRoleDrawerOpen, setIsRoleDrawerOpen] = useState(false);
    const [activeRole, setActiveRole] = useState<any | null>(null);

    const [modules, setModules] = useState<any[]>([]);
    const [permissionUpdates, setPermissionUpdates] = useState<
        Record<number, boolean>
    >({});
    const [savingPermissions, setSavingPermissions] = useState(false);

    const isDrawerBusy = loading || savingPermissions;

    const createRoles = useApiMutation(HTTP_METHODS.POST, API_ENDPOINTS.ROLES);
    const updateStatus = useStatusMutation(
        HTTP_METHODS.PUT,
        ({ id }) => `${API_ENDPOINTS.ROLES}/${id}/status`,
    );
    const deleteRole = useStatusMutation(
        HTTP_METHODS.DELETE,
        (id) => `${API_ENDPOINTS.ROLES}/${id}`,
    );
    const updateRoles = useStatusMutation(
        HTTP_METHODS.PUT,
        ({ id }) => `${API_ENDPOINTS.ROLES}/${id}`,
    );

    const { create: canCreate } = useModulePermissions(11);

    const queryParams = new URLSearchParams({
        start: String(start),
        limit: String(limit),
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
    }).toString();

    const { data, isLoading, isFetching, refetch } = useApiQuery(
        ["Roles", start, limit, searchTerm],
        `${API_ENDPOINTS.ROLES}?${queryParams}`,
        {
            refetchOnWindowFocus: false,
            retry: 1,
        } as const,
    );

    const {
        data: permissionsData,
        isLoading: permissionsLoading,
        refetch: refetchPermissions,
    } = useApiQuery(
        ["RolePermissions", activeRole?.id],
        activeRole?.id
            ? `${API_ENDPOINTS.ROLE_PERMISSIONS}/${activeRole.id}?type=1&start=1&limit=100&status=true`
            : "",
        {
            enabled: !!activeRole?.id && isRoleDrawerOpen && roleDrawerMode !== "create",
            refetchOnWindowFocus: false,
            retry: 1,
        } as const,
    );

    const { data: roleDetailsData, isLoading: roleDetailsLoading } = useApiQuery(
        ["RoleDetails", activeRole?.id],
        activeRole?.id ? `${API_ENDPOINTS.ROLES}/${activeRole.id}` : "",
        {
            enabled: !!activeRole?.id && isRoleDrawerOpen && roleDrawerMode !== "create",
            refetchOnWindowFocus: false,
            retry: 1,
        } as const,
    );

    const updateRolePermissions = useStatusMutation(
        HTTP_METHODS.PUT,
        ({ id }) => `${API_ENDPOINTS.ROLE_PERMISSIONS}/${id}`,
    );

    const resetRoleDrawerState = () => {
        setIsRoleDrawerOpen(false);
        setRoleDrawerMode("create");
        setActiveRole(null);
        setRoleName("");
        setDescription("");
        setModules([]);
        setPermissionUpdates({});
        setSavingPermissions(false);
    };

    const openModal = (action: "delete" | "status", job: any) => {
        setModalState({ action, job });
    };

    const openCreateRoleDrawer = () => {
        setRoleDrawerMode("create");
        setActiveRole(null);
        setRoleName("");
        setDescription("");
        setModules([]);
        setPermissionUpdates({});
        setIsRoleDrawerOpen(true);
    };

    useEffect(() => {
        if (createSignal === previousCreateSignal.current) return;
        previousCreateSignal.current = createSignal;
        if (createSignal <= 0) return;
        openCreateRoleDrawer();
    }, [createSignal]);

    useEffect(() => {
        if (refreshSignal === previousRefreshSignal.current) return;
        previousRefreshSignal.current = refreshSignal;
        if (refreshSignal <= 0) return;
        refetch();
    }, [refreshSignal, refetch]);

    useEffect(() => {
        setStart(1);
    }, [searchTerm]);

    const openRoleDetailsDrawer = (role: any) => {
        setRoleDrawerMode("details");
        setActiveRole(role);
        setRoleName(role?.name || "");
        setDescription(role?.description || "");
        setModules([]);
        setPermissionUpdates({});
        setIsRoleDrawerOpen(true);
    };

    const openRoleEditDrawer = (role: any) => {
        setRoleDrawerMode("edit-role");
        setActiveRole(role);
        setRoleName(role?.name || "");
        setDescription(role?.description || "");
        setModules([]);
        setPermissionUpdates({});
        setIsRoleDrawerOpen(true);
    };

    const openRolePermissionsDrawer = (role: any) => {
        setRoleDrawerMode("edit-permissions");
        setActiveRole(role);
        setRoleName(role?.name || "");
        setDescription(role?.description || "");
        setModules([]);
        setPermissionUpdates({});
        setIsRoleDrawerOpen(true);
    };

    const handleCloseRoleDrawer = () => {
        if (isDrawerBusy) return;
        resetRoleDrawerState();
    };

    useEffect(() => {
        if (!permissionsData?.data) return;

        const rolesData = permissionsData.data?.Roles || [];
        setModules(rolesData);

        const initialUpdates: Record<number, boolean> = {};
        rolesData.forEach((module: any) => {
            if (!Array.isArray(module.permissions)) return;

            module.permissions.forEach((perm: any) => {
                const permissionId = Number(perm.id);
                if (Number.isFinite(permissionId)) {
                    initialUpdates[permissionId] = Boolean(perm.isAllowed);
                }
            });
        });

        setPermissionUpdates(initialUpdates);
    }, [permissionsData]);

    useEffect(() => {
        const roleDetails = resolveRoleDetailsFromResponse(roleDetailsData);
        if (!roleDetails) return;

        setActiveRole((prev: any) => ({
            ...(prev || {}),
            ...roleDetails,
            id: toStringValue(roleDetails.id ?? roleDetails._id ?? prev?.id),
        }));

        if (!roleName && typeof roleDetails.name === "string") {
            setRoleName(roleDetails.name);
        }
        if (!description && typeof roleDetails.description === "string") {
            setDescription(roleDetails.description);
        }
    }, [roleDetailsData, roleName, description]);

    const handlePermissionToggle = (
        permissionId: number,
        currentStatus: boolean,
    ) => {
        setPermissionUpdates((prev) => ({
            ...prev,
            [permissionId]: !currentStatus,
        }));
    };

    const getPermissionChanges = () => {
        const updates: Array<{ id: number; status: boolean }> = [];

        modules.forEach((module: any) => {
            if (!Array.isArray(module.permissions)) return;

            module.permissions.forEach((perm: any) => {
                const permissionId = Number(perm.id);
                if (!Number.isFinite(permissionId)) return;

                const newStatus = permissionUpdates[permissionId];
                if (newStatus !== undefined && Boolean(perm.isAllowed) !== newStatus) {
                    updates.push({
                        id: permissionId,
                        status: newStatus,
                    });
                }
            });
        });

        return updates;
    };

    const handleSaveRoleDrawer = () => {
        if (roleDrawerMode === "create") {
            const nextRoleName = roleName.trim();
            const nextDescription = description.trim();
            if (!nextRoleName) return;

            setLoading(true);
            createRoles.mutate(
                {
                    name: nextRoleName,
                    ...(nextDescription ? { description: nextDescription } : {}),
                },
                {
                    onSuccess: (response: unknown) => {
                        const createdRoleId = resolveRoleIdFromCreateResponse(response);
                        refetch();
                        setLoading(false);

                        if (!createdRoleId) {
                            setRoleName(nextRoleName);
                            setDescription(nextDescription);
                            return;
                        }

                        setRoleDrawerMode("details");
                        setActiveRole({
                            id: createdRoleId,
                            name: nextRoleName,
                            description: nextDescription,
                        });
                        setRoleName(nextRoleName);
                        setDescription(nextDescription);
                        setModules([]);
                        setPermissionUpdates({});
                        setIsRoleDrawerOpen(true);
                    },
                    onError: (err) => {
                        console.error("Failed to create role:", err);
                        setLoading(false);
                    },
                },
            );
            return;
        }

        if (!activeRole?.id) return;

        if (roleDrawerMode === "edit-role") {
            if (!roleName.trim()) return;

            setLoading(true);

            const payload: any = {
                id: activeRole.id,
                name: roleName.trim(),
            };

            if (description?.trim()) payload.description = description.trim();

            updateRoles.mutate(payload, {
                onSuccess: () => {
                    refetch();
                    setLoading(false);
                    resetRoleDrawerState();
                },
                onError: (err: any) => {
                    console.error("Failed to update role:", err);
                    setLoading(false);
                },
            });
            return;
        }

        const updates = getPermissionChanges();

        if (updates.length === 0) {
            resetRoleDrawerState();
            return;
        }

        setSavingPermissions(true);
        updateRolePermissions.mutate(
            { id: activeRole.id, updates },
            {
                onSuccess: () => {
                    refetch();
                    refetchPermissions();
                    setSavingPermissions(false);
                    resetRoleDrawerState();
                },
                onError: (err: any) => {
                    console.error("Failed to update permissions:", err);
                    setSavingPermissions(false);
                },
            },
        );
    };

    const handleConfirm = () => {
        if (!modalState.job || !modalState.action) return;
        const { action, job } = modalState;

        if (action === "delete") {
            setLoading(true);
            deleteRole.mutate(job.id, {
                onSuccess: () => {
                    refetch();
                    setModalState({ action: null, job: null });
                    setLoading(false);
                },
                onError: (err: any) => {
                    setLoading(false);
                    console.error(err);
                },
            });
            return;
        }

        if (action === "status") {
            setLoading(true);
            updateStatus.mutate(
                { id: job.id, status: !job.status },
                {
                    onSuccess: () => {
                        refetch();
                        setModalState({ action: null, job: null });
                        setLoading(false);
                    },
                    onError: (err: any) => {
                        setLoading(false);
                        console.error(err);
                    },
                },
            );
        }
    };

    const renderPermissionsTable = (editable: boolean) => {
        if (permissionsLoading) {
            return (
                <div className="flex items-center justify-center py-8">
                    <Loader className="h-6 w-6 animate-spin" />
                </div>
            );
        }

        if (modules.length === 0) {
            return <div className="py-8 text-center text-sm text-gray-500">No permissions found</div>;
        }

        return (
            <div className="overflow-hidden rounded-lg border">
                <Table>
                    <TableHeader className="bg-gray-100">
                        <TableRow>
                            <TableHead className="font-semibold">Module</TableHead>
                            {PERMISSION_COLUMNS.map((column) => (
                                <TableHead key={column.key} className="text-center font-semibold">
                                    {column.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {modules.map((module: any) => {
                            const permissionsByAction: Record<string, any> = {};

                            if (Array.isArray(module.permissions)) {
                                module.permissions.forEach((perm: any) => {
                                    const actionKey = normalizeActionName(perm.actionName || "");
                                    permissionsByAction[actionKey] = perm;
                                });
                            }

                            return (
                                <TableRow
                                    key={String(module.moduleId || module.moduleName || module.name)}
                                    className="hover:bg-gray-50"
                                >
                                    <TableCell className="font-medium">{getModuleName(module)}</TableCell>
                                    {PERMISSION_COLUMNS.map((column) => {
                                        const permission = permissionsByAction[column.key];

                                        if (!permission) {
                                            return (
                                                <TableCell key={column.key} className="text-center text-gray-400">
                                                    -
                                                </TableCell>
                                            );
                                        }

                                        const permissionId = Number(permission.id);
                                        const currentValue = Number.isFinite(permissionId)
                                            ? permissionUpdates[permissionId] ?? Boolean(permission.isAllowed)
                                            : Boolean(permission.isAllowed);

                                        if (!editable) {
                                            return (
                                                <TableCell key={column.key} className="text-center">
                                                    <div className="flex justify-center">
                                                        <Badge variant={currentValue ? "active" : "disabled"}>
                                                            {currentValue ? "Allowed" : "Not Allowed"}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                            );
                                        }

                                        return (
                                            <TableCell key={column.key} className="text-center">
                                                {Number.isFinite(permissionId) ? (
                                                    <Checkbox
                                                        checked={currentValue}
                                                        onCheckedChange={() =>
                                                            handlePermissionToggle(permissionId, currentValue)
                                                        }
                                                    />
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    };

    const renderRoleEditorCard = () => (
        <div className="rounded-xl border bg-white p-4">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="role-title">Role Name</Label>
                    <Input
                        id="role-title"
                        type="text"
                        placeholder="Enter Role Name"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        placeholder="Enter Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                    />
                </div>
            </div>
        </div>
    );

    const renderRoleDetailsCard = () => (
        <div className="rounded-xl border bg-white p-4">
            {roleDetailsLoading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader className="h-5 w-5 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <p className="text-xs font-medium uppercase text-slate-500">Role Name</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                            {activeRole?.name || "-"}
                        </p>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-medium uppercase text-slate-500">Status</p>
                            <div className="mt-1">
                                <Badge variant={activeRole?.status ? "active" : "disabled"}>
                                    {activeRole?.status ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                        </div>

                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setRoleDrawerMode("edit-role")}
                            disabled={loading}
                        >
                            Edit
                        </Button>
                    </div>

                    <div className="sm:col-span-2">
                        <p className="text-xs font-medium uppercase text-slate-500">Description</p>
                        <p className="mt-1 text-sm text-slate-700">{activeRole?.description || "-"}</p>
                    </div>

                    <div>
                        <p className="text-xs font-medium uppercase text-slate-500">Created At</p>
                        <p className="mt-1 text-sm text-slate-700">
                            {activeRole?.createdAt
                                ? new Date(activeRole.createdAt).toLocaleDateString()
                                : "-"}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );

    const roles = data?.data?.Roles || [];
    const pagination = data?.data?.pagination;
    const skeletonRows = Array.from({ length: 5 });
    const hasSearch = searchTerm.trim().length > 0;

    const drawerTitle =
        roleDrawerMode === "create"
            ? "Create Role"
            : roleDrawerMode === "edit-role"
                ? "Edit Role"
                : roleDrawerMode === "edit-permissions"
                    ? "Manage Role Permissions"
                    : "Role Details & Permissions";

    const drawerDescription =
        roleDrawerMode === "create"
            ? "Add a new role to the system."
            : roleDrawerMode === "edit-role"
                ? "Update the selected role details from this drawer."
                : roleDrawerMode === "edit-permissions"
                    ? "Enable or disable permissions for the selected role."
                    : "Review role details and module permissions in one place.";

    const saveButtonLabel =
        roleDrawerMode === "create"
            ? "Create"
            : roleDrawerMode === "edit-role"
                ? "Save Role"
                : "Save Permissions";

    const isSaveDisabled =
        roleDrawerMode === "edit-permissions"
            ? isDrawerBusy || permissionsLoading
            : isDrawerBusy || !roleName.trim();

    return (
        <div className="space-y-3">
            <div className="w-full">
                {!isLoading && roles.length === 0 && hasSearch ? (
                    <div className="flex items-center justify-center py-12">
                        <EmptyState
                            onClick={openCreateRoleDrawer}
                            buttonTitle=""
                            title="No results found"
                            description="Please refine your search and try again."
                        />
                    </div>
                ) : !isLoading && roles.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <EmptyState
                            onClick={openCreateRoleDrawer}
                            buttonTitle={canCreate ? "Create Role" : ""}
                            title="No Roles Created Yet"
                            description="You haven't added any roles to your system. Add your first role."
                        />
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <Table>
                            <TableHeader className="bg-gray-100">
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>

                            {isLoading || isFetching ? (
                                <TableBody>
                                    {skeletonRows.map((_, idx) => (
                                        <TableRow key={idx} className="animate-pulse">
                                            <TableCell>
                                                <div className="h-4 w-3/4 rounded bg-gray-200"></div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="h-4 w-1/2 rounded bg-gray-200"></div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="h-4 w-1/3 rounded bg-gray-200"></div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="h-4 w-1/2 rounded bg-gray-200"></div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="h-4 w-1/4 rounded bg-gray-200"></div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            ) : (
                                <TableBody>
                                    {roles.map((role: any) => (
                                        <TableRow key={role.id} className="hover:bg-gray-50">
                                            <TableCell>
                                                <button
                                                    type="button"
                                                    onClick={() => openRoleDetailsDrawer(role)}
                                                    className="text-left transition-colors hover:text-primary hover:underline"
                                                >
                                                    {role.name}
                                                </button>
                                            </TableCell>
                                            <TableCell>{role.description || "-"}</TableCell>
                                            <TableCell>
                                                <Badge variant={role.status ? "active" : "disabled"}>
                                                    {role.status ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(role.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="p-1">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <PermissionGuard moduleId={11} action="update">
                                                            <DropdownMenuItem
                                                                className="flex items-center gap-2"
                                                                onClick={() => openRoleEditDrawer(role)}
                                                            >
                                                                <Edit className="w-4 h-4 text-primary" /> Edit
                                                            </DropdownMenuItem>
                                                        </PermissionGuard>
                                                        <PermissionGuard moduleId={11} action="update">
                                                            <DropdownMenuItem
                                                                className="flex items-center gap-2"
                                                                onClick={() => openModal("status", role)}
                                                            >
                                                                <CircleCheck className="w-4 h-4 text-primary" />
                                                                {role.status ? "Disable" : "Active"}
                                                            </DropdownMenuItem>
                                                        </PermissionGuard>
                                                        <PermissionGuard moduleId={11} action="update">
                                                            <DropdownMenuItem
                                                                className="flex items-center gap-2"
                                                                onClick={() => openRolePermissionsDrawer(role)}
                                                            >
                                                                <ShieldCheck className="h-4 w-4 text-primary" /> Manage Permissions
                                                            </DropdownMenuItem>
                                                        </PermissionGuard>
                                                        <PermissionGuard moduleId={11} action="delete">
                                                            <DropdownMenuItem
                                                                variant="destructive"
                                                                onClick={() => openModal("delete", role)}
                                                            >
                                                                <Trash2 /> Delete
                                                            </DropdownMenuItem>
                                                        </PermissionGuard>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            )}
                        </Table>
                        <div className="items-center border-t px-4 pb-4">
                            <Pagination
                                start={start}
                                limit={limit}
                                total={roles?.length || 0}
                                pagination={pagination}
                                onPageChange={(newStart) => setStart(newStart)}
                                onLimitChange={(newLimit) => {
                                    setLimit(newLimit);
                                    setStart(1);
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <Sheet
                open={isRoleDrawerOpen}
                onOpenChange={(open) => {
                    if (open) {
                        setIsRoleDrawerOpen(true);
                        return;
                    }
                    handleCloseRoleDrawer();
                }}
            >
                <SheetContent side="right" className="w-[96vw] gap-0 p-0 sm:max-w-4xl">
                    <div className="flex h-full flex-col">
                        <SheetHeader className="border-b px-6 py-4">
                            <SheetTitle>{drawerTitle}</SheetTitle>
                            <SheetDescription>{drawerDescription}</SheetDescription>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {roleDrawerMode === "create" ? (
                                renderRoleEditorCard()
                            ) : (
                                <div className="space-y-6">
                                    {roleDrawerMode === "edit-role"
                                        ? renderRoleEditorCard()
                                        : renderRoleDetailsCard()}

                                    <div className="rounded-xl border bg-white p-4">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="text-sm font-semibold text-slate-900">
                                                    Module Permissions
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    {roleDrawerMode === "edit-permissions"
                                                        ? "Enable or disable role access by module and action."
                                                        : "Current module permissions for this role."}
                                                </p>
                                            </div>

                                            {roleDrawerMode !== "edit-permissions" && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => setRoleDrawerMode("edit-permissions")}
                                                    disabled={permissionsLoading}
                                                >
                                                    Edit
                                                </Button>
                                            )}
                                        </div>
                                        {renderPermissionsTable(roleDrawerMode === "edit-permissions")}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t px-6 py-4">
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCloseRoleDrawer}
                                    disabled={isDrawerBusy}
                                >
                                    {roleDrawerMode === "details" ? "Close" : "Cancel"}
                                </Button>

                                {roleDrawerMode !== "details" && (
                                    <Button
                                        type="button"
                                        onClick={handleSaveRoleDrawer}
                                        disabled={isSaveDisabled}
                                    >
                                        {isDrawerBusy && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                        {saveButtonLabel}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {modalState.job && (
                <ConfirmationModal
                    open={!!modalState.job}
                    title={modalState.action === "delete" ? "Delete Role?" : "Change Status?"}
                    description={
                        modalState.action === "delete"
                            ? `Are you sure you want to delete "${modalState.job.name}"?`
                            : `Are you sure you want to ${modalState.job.status ? "disable" : "enable"} "${modalState.job.name}"?`
                    }
                    confirmText={modalState.action === "delete" ? "Delete" : "Confirm"}
                    onCancel={() => setModalState({ action: null, job: null })}
                    onConfirm={handleConfirm}
                    loading={loading}
                />
            )}
        </div>
    );
};
