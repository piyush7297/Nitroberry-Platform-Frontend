"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { ChevronRight, Mail, MapPin, Pencil, Loader2 } from "lucide-react";
import { apiCall } from "@nitroberry/api-client";
import { API_ENDPOINTS } from "@/api/endpoints";
import { HTTP_METHODS } from "@/api/methods";
import { useApiQuery } from "@/hooks/useApi";
import { validationSchemas } from "@/lib/validationsSchema";
import { Button } from "@nitroberry/ui";
import { Badge } from "@nitroberry/ui";
import { Input } from "@nitroberry/ui";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@nitroberry/ui";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@nitroberry/ui";
import EditUserForm from "../modals/editUserForm";

interface HierarchyNode {
    id: string;
    userId: string;
    name: string;
    title: string;
    roleLabel: string;
    managerId: string | null;
    children: HierarchyNode[];
}

interface UserDetails {
    id: string;
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    roleId: string;
    passwordPolicy: string;
    customExpireDays: number | null;
    department: string;
    departmentId: string;
    title: string;
    jobTitleId: string;
    location: string;
    locationId: string;
    isActive: boolean;
    linkedIn: string;
    calenderLink: string;
}

interface UserDetailsHierarchyDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string | null;
    initialMode?: "details" | "edit-user" | "edit-hierarchy";
    onSaved?: () => void;
    onNavigateUser?: (userId: string) => void;
}

type DrawerMode = "details" | "edit-user" | "edit-hierarchy";

interface HierarchyManagerOption {
    userId: string;
    hierarchyId: string;
    name: string;
    title: string;
}

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
    return `${firstName} ${lastName}`.trim() || "Unknown User";
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
        roleLabel: getNodeRole(node),
        managerId: managerIdRaw || null,
        children,
    };
};

const findNodeByUserId = (
    nodes: HierarchyNode[],
    targetUserId: string,
): HierarchyNode | null => {
    for (const node of nodes) {
        const isUserMatch = node.userId === targetUserId;
        const isLegacyNodeIdMatch = !node.userId && node.id === targetUserId;

        if (isUserMatch || isLegacyNodeIdMatch) {
            return node;
        }
        const childResult = findNodeByUserId(node.children, targetUserId);
        if (childResult) {
            return childResult;
        }
    }
    return null;
};

const buildNodeMaps = (roots: HierarchyNode[]) => {
    const byHierarchyId = new Map<string, HierarchyNode>();
    const byUserId = new Map<string, HierarchyNode>();

    const traverse = (nodes: HierarchyNode[]) => {
        nodes.forEach((node) => {
            byHierarchyId.set(node.id, node);
            if (node.userId) {
                byUserId.set(node.userId, node);
            }
            if (node.children.length > 0) {
                traverse(node.children);
            }
        });
    };

    traverse(roots);
    return { byHierarchyId, byUserId };
};

const getInitials = (name: string): string => {
    const parts = name
        .split(" ")
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 2);

    if (parts.length === 0) return "U";
    return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};

const getPasswordPolicyLabel = (
    policyType: number,
    customExpireDays: number | null,
): string => {
    if (policyType === 1) {
        return customExpireDays
            ? `Custom Expiry (${customExpireDays} days)`
            : "Custom Expiry";
    }
    if (policyType === 2) return "Never Expire";
    if (policyType === 3) return "Force Change Every 30 Days";
    return "-";
};

const normalizeUserDetails = (
    response: unknown,
    fallbackNode: HierarchyNode,
): UserDetails => {
    const payload =
        response &&
            typeof response === "object" &&
            "data" in (response as Record<string, unknown>)
            ? (response as { data?: unknown }).data ?? response
            : response;

    const userObj =
        payload && typeof payload === "object"
            ? (payload as Record<string, unknown>)
            : {};

    const roleObj =
        typeof userObj.role === "object" && userObj.role !== null
            ? (userObj.role as Record<string, unknown>)
            : null;

    const departmentRaw = userObj.department ?? userObj._department;
    const departmentObj =
        typeof departmentRaw === "object" && departmentRaw !== null
            ? (departmentRaw as Record<string, unknown>)
            : null;

    const jobTitleRaw = userObj.jobTitle ?? userObj.job_title;
    const jobTitleObj =
        typeof jobTitleRaw === "object" && jobTitleRaw !== null
            ? (jobTitleRaw as Record<string, unknown>)
            : null;

    const locationObj =
        typeof userObj.location === "object" && userObj.location !== null
            ? (userObj.location as Record<string, unknown>)
            : null;

    const profileLinksRaw = userObj.profileLinks ?? userObj.profile_links;
    const rawProfileLinks = Array.isArray(profileLinksRaw)
        ? (profileLinksRaw as Array<Record<string, unknown>>)
        : [];
    const firstProfile = rawProfileLinks[0] ?? {};

    const roleId = toStringValue(userObj.roleId ?? roleObj?.id);
    const departmentId = toStringValue(userObj.departmentId ?? departmentObj?.id);
    const jobTitleId = toStringValue(userObj.jobTitleId ?? jobTitleObj?.id);
    const locationId = toStringValue(userObj.locationId ?? locationObj?.id);

    const policyType =
        typeof userObj.policyType === "number" ? userObj.policyType : 2;
    const customExpireDays =
        typeof userObj.customExpireDays === "number"
            ? userObj.customExpireDays
            : null;

    const firstName = toStringValue(userObj.firstName);
    const lastName = toStringValue(userObj.lastName);
    const fullName =
        `${firstName} ${lastName}`.trim() ||
        toStringValue(userObj.name) ||
        fallbackNode.name;

    return {
        id: toStringValue(userObj.id ?? userObj._id) || fallbackNode.userId || fallbackNode.id,
        fullName,
        firstName: firstName || fullName.split(" ")[0] || "-",
        lastName: lastName || fullName.split(" ").slice(1).join(" ") || "-",
        email: toStringValue(userObj.email),
        role:
            toStringValue(userObj.roleName ?? roleObj?.name ?? roleObj?.label) ||
            fallbackNode.roleLabel ||
            "-",
        roleId,
        passwordPolicy: getPasswordPolicyLabel(policyType, customExpireDays),
        customExpireDays,
        department:
            toStringValue(
                userObj.departmentName ??
                departmentObj?.name ??
                (typeof departmentRaw === "string" ? departmentRaw : ""),
            ) || "-",
        departmentId,
        title:
            toStringValue(
                userObj.jobTitleName ??
                userObj.designation ??
                jobTitleObj?.name ??
                (typeof jobTitleRaw === "string" ? jobTitleRaw : ""),
            ) || fallbackNode.title,
        jobTitleId,
        location:
            toStringValue(
                locationObj?.title ?? locationObj?.name ?? userObj.locationName,
            ) || "-",
        locationId,
        isActive: Boolean(userObj.isActive),
        linkedIn: toStringValue(firstProfile.linkedIn ?? firstProfile.linkedin),
        calenderLink: toStringValue(firstProfile.calenderLink),
    };
};

const mapUserToFormikValues = (
    response: unknown,
    fallbackNode?: HierarchyNode,
) => {
    const payload =
        response &&
            typeof response === "object" &&
            "data" in (response as Record<string, unknown>)
            ? (response as { data?: unknown }).data ?? response
            : response;

    const userObj =
        payload && typeof payload === "object"
            ? (payload as Record<string, unknown>)
            : {};

    const roleObj =
        typeof userObj.role === "object" && userObj.role !== null
            ? (userObj.role as Record<string, unknown>)
            : null;

    const departmentRaw = userObj.department ?? userObj._department;
    const departmentObj =
        typeof departmentRaw === "object" && departmentRaw !== null
            ? (departmentRaw as Record<string, unknown>)
            : null;

    const jobTitleRaw = userObj.jobTitle ?? userObj.job_title;
    const jobTitleObj =
        typeof jobTitleRaw === "object" && jobTitleRaw !== null
            ? (jobTitleRaw as Record<string, unknown>)
            : null;

    const locationObj =
        typeof userObj.location === "object" && userObj.location !== null
            ? (userObj.location as Record<string, unknown>)
            : null;

    const profileLinksRaw = userObj.profileLinks ?? userObj.profile_links;
    const rawProfileLinks = Array.isArray(profileLinksRaw)
        ? (profileLinksRaw as Array<Record<string, unknown>>)
        : [];

    const firstProfile = rawProfileLinks[0] ?? {};

    return {
        firstName: toStringValue(userObj.firstName),
        lastName: toStringValue(userObj.lastName),
        email: toStringValue(userObj.email),
        roleId: toStringValue(userObj.roleId ?? roleObj?.id),
        isActive: Boolean(userObj.isActive),
        jobTitleId: toStringValue(userObj.jobTitleId ?? jobTitleObj?.id),
        departmentId: toStringValue(userObj.departmentId ?? departmentObj?.id),
        customExpireDays:
            typeof userObj.customExpireDays === "number"
                ? userObj.customExpireDays
                : null,
        policyType:
            typeof userObj.policyType === "number" ? userObj.policyType : 2,
        locationId: toStringValue(userObj.locationId ?? locationObj?.id),
        managerId: toStringValue(
            userObj.managerId ??
            userObj?.hierarchy?.managerId ??
            fallbackNode?.managerId,
        ),
        hierarchyId: toStringValue(
            userObj.hierarchyId ??
            userObj.hierarchyMemberId ??
            userObj?.hierarchy?.id ??
            fallbackNode?.id,
        ),
        profileLinks: [
            {
                linkedIn: toStringValue(
                    firstProfile.linkedIn ?? firstProfile.linkedin,
                ),
                calenderLink: toStringValue(firstProfile.calenderLink),
            },
        ],
    };
};

const EMPTY_FORM_VALUES = {
    firstName: "",
    lastName: "",
    email: "",
    roleId: "",
    isActive: false,
    jobTitleId: "",
    departmentId: "",
    customExpireDays: null as number | null,
    policyType: 2,
    locationId: "",
    managerId: "",
    hierarchyId: "",
    profileLinks: [{ linkedIn: "", calenderLink: "" }],
};

export const UserDetailsHierarchyDrawer: React.FC<
    UserDetailsHierarchyDrawerProps
> = ({ open, onOpenChange, userId, initialMode = "details", onSaved, onNavigateUser }) => {
    const [roots, setRoots] = useState<HierarchyNode[]>([]);
    const [details, setDetails] = useState<UserDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeMode, setActiveMode] = useState<DrawerMode>("details");
    const [isSaving, setIsSaving] = useState(false);
    const [isHierarchySaving, setIsHierarchySaving] = useState(false);
    const [hierarchyManagerUserId, setHierarchyManagerUserId] = useState<string | null>(null);
    const [hierarchySearchTerm, setHierarchySearchTerm] = useState("");
    const [hierarchyManagerOptions, setHierarchyManagerOptions] = useState<HierarchyManagerOption[]>([]);
    const [isHierarchyManagersLoading, setIsHierarchyManagersLoading] = useState(false);
    const [isTeamExpanded, setIsTeamExpanded] = useState(false);

    const { data: jobtitles } = useApiQuery(
        ["drawer-jobTitle"],
        `${API_ENDPOINTS.JOB_TITLE}?start=1&limit=100`,
        {
            enabled: open,
            refetchOnWindowFocus: false,
            retry: 1,
        } as const,
    );

    const { data: departments } = useApiQuery(
        ["drawer-department"],
        `${API_ENDPOINTS.DEPARTMENT}?start=1&limit=100`,
        {
            enabled: open,
            refetchOnWindowFocus: false,
            retry: 1,
        } as const,
    );

    const nodeMaps = useMemo(() => buildNodeMaps(roots), [roots]);

    const selectedNode = useMemo(() => {
        if (!userId) return null;
        return findNodeByUserId(roots, userId);
    }, [roots, userId]);

    const managerNode = useMemo(() => {
        if (!selectedNode?.managerId) return null;

        return (
            nodeMaps.byHierarchyId.get(selectedNode.managerId) ??
            nodeMaps.byUserId.get(selectedNode.managerId) ??
            null
        );
    }, [selectedNode, nodeMaps]);

    const directReports = selectedNode?.children ?? [];

    const hierarchyMemberId = selectedNode?.id ?? "";
    const hierarchyUserId = selectedNode?.userId || selectedNode?.id || userId || "";

    const blockedManagerIds = useMemo(() => {
        const blocked = new Set<string>();

        const markBranch = (node: HierarchyNode) => {
            blocked.add(node.id);
            if (node.userId) {
                blocked.add(node.userId);
            }
            node.children.forEach(markBranch);
        };

        if (selectedNode) {
            markBranch(selectedNode);
        }

        return blocked;
    }, [selectedNode]);

    const localHierarchyManagerOptions = useMemo<HierarchyManagerOption[]>(() => {
        const options: HierarchyManagerOption[] = [];
        const seen = new Set<string>();

        nodeMaps.byHierarchyId.forEach((node) => {
            const mappedUserId = node.userId || node.id;
            if (!mappedUserId || seen.has(mappedUserId)) return;
            if (blockedManagerIds.has(mappedUserId) || blockedManagerIds.has(node.id)) return;

            options.push({
                userId: mappedUserId,
                hierarchyId: node.id,
                name: node.name,
                title: node.title,
            });
            seen.add(mappedUserId);
        });

        return options.sort((a, b) => a.name.localeCompare(b.name));
    }, [blockedManagerIds, nodeMaps]);

    const filteredLocalHierarchyManagerOptions = useMemo(() => {
        const searchText = hierarchySearchTerm.trim().toLowerCase();
        if (!searchText) return localHierarchyManagerOptions;

        return localHierarchyManagerOptions.filter((option) =>
            `${option.name} ${option.title}`.toLowerCase().includes(searchText),
        );
    }, [localHierarchyManagerOptions, hierarchySearchTerm]);

    const managerOptionsForRender = useMemo(() => {
        if (hierarchyManagerOptions.length > 0) {
            return hierarchyManagerOptions;
        }

        if (!hierarchySearchTerm.trim()) {
            return localHierarchyManagerOptions;
        }

        return filteredLocalHierarchyManagerOptions;
    }, [
        hierarchyManagerOptions,
        hierarchySearchTerm,
        localHierarchyManagerOptions,
        filteredLocalHierarchyManagerOptions,
    ]);

    const selectedManagerOption = useMemo(
        () =>
            managerOptionsForRender.find(
                (option) => option.userId === hierarchyManagerUserId,
            ) ?? null,
        [managerOptionsForRender, hierarchyManagerUserId],
    );

    useEffect(() => {
        if (!open || activeMode !== "edit-hierarchy" || !selectedNode) {
            setHierarchyManagerOptions([]);
            setIsHierarchyManagersLoading(false);
            return;
        }

        let isCancelled = false;

        const fetchUsers = async () => {
            setIsHierarchyManagersLoading(true);
            try {
                const response = await apiCall<unknown>(
                    HTTP_METHODS.GET,
                    API_ENDPOINTS.USER_HIERARCHY_USERS,
                    {
                        start: 1,
                        limit: 100,
                        ...(hierarchySearchTerm.trim()
                            ? { search: hierarchySearchTerm.trim() }
                            : {}),
                    },
                );

                if (isCancelled) return;

                let usersArray: unknown[] = [];

                if (Array.isArray(response)) {
                    usersArray = response;
                } else if (typeof response === "object" && response !== null) {
                    const responseObj = response as Record<string, unknown>;

                    if (
                        typeof responseObj.data === "object" &&
                        responseObj.data !== null &&
                        Array.isArray((responseObj.data as Record<string, unknown>).users)
                    ) {
                        usersArray = (responseObj.data as Record<string, unknown>).users as unknown[];
                    } else if (
                        typeof responseObj.data === "object" &&
                        responseObj.data !== null &&
                        Array.isArray((responseObj.data as Record<string, unknown>).hierarchyUsers)
                    ) {
                        usersArray =
                            (responseObj.data as Record<string, unknown>).hierarchyUsers as unknown[];
                    } else if (Array.isArray(responseObj.data)) {
                        usersArray = responseObj.data;
                    } else if (Array.isArray(responseObj.users)) {
                        usersArray = responseObj.users;
                    } else if (Array.isArray(responseObj.hierarchyUsers)) {
                        usersArray = responseObj.hierarchyUsers;
                    }
                }

                const seen = new Set<string>();
                const options: HierarchyManagerOption[] = [];

                usersArray.forEach((candidate) => {
                    if (!candidate || typeof candidate !== "object") return;
                    const user = candidate as Record<string, unknown>;
                    const nestedUser =
                        typeof user.user === "object" && user.user !== null
                            ? (user.user as Record<string, unknown>)
                            : null;

                    const managerUserId = toStringValue(
                        user.userId ?? user.id ?? user._id ?? nestedUser?.id ?? nestedUser?._id,
                    );

                    if (!managerUserId || seen.has(managerUserId)) return;

                    const explicitHierarchyId = toStringValue(
                        user.hierarchyId ?? user.hierarchyMemberId ?? user.memberId,
                    );

                    const hierarchyId =
                        nodeMaps.byUserId.get(managerUserId)?.id || explicitHierarchyId;

                    if (!hierarchyId) return;
                    if (
                        blockedManagerIds.has(managerUserId) ||
                        blockedManagerIds.has(hierarchyId)
                    ) {
                        return;
                    }

                    const firstName = toStringValue(
                        user.firstName ?? user.first_name ?? nestedUser?.firstName ?? nestedUser?.first_name,
                    );
                    const lastName = toStringValue(
                        user.lastName ?? user.last_name ?? nestedUser?.lastName ?? nestedUser?.last_name,
                    );
                    const fullName = `${firstName} ${lastName}`.trim();

                    options.push({
                        userId: managerUserId,
                        hierarchyId,
                        name: fullName || toStringValue(user.name) || "Unknown User",
                        title:
                            toStringValue(
                                user.jobTitleName ??
                                user.jobTitle ??
                                user.job_title ??
                                user.title ??
                                nestedUser?.jobTitle ??
                                nestedUser?.job_title ??
                                nestedUser?.title,
                            ) || "Team Member",
                    });

                    seen.add(managerUserId);
                });

                options.sort((a, b) => a.name.localeCompare(b.name));
                setHierarchyManagerOptions(options);
            } catch {
                if (!isCancelled) {
                    setHierarchyManagerOptions(filteredLocalHierarchyManagerOptions);
                }
            } finally {
                if (!isCancelled) {
                    setIsHierarchyManagersLoading(false);
                }
            }
        };

        const timer = setTimeout(fetchUsers, hierarchySearchTerm.trim() ? 300 : 0);

        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [
        open,
        activeMode,
        selectedNode,
        hierarchySearchTerm,
        nodeMaps,
        blockedManagerIds,
        filteredLocalHierarchyManagerOptions,
    ]);

    const formik = useFormik({
        initialValues: EMPTY_FORM_VALUES,
        validationSchema: validationSchemas.editUser,
        onSubmit: async (values) => {
            if (!userId || isSaving) return;

            setIsSaving(true);
            try {
                const filteredValues = Object.fromEntries(
                    Object.entries(values).filter(
                        ([_, v]) =>
                            v !== null &&
                            v !== undefined &&
                            !(typeof v === "string" && v.trim().length === 0),
                    ),
                ) as Record<string, unknown>;

                const selectedManagerId = toStringValue(filteredValues.managerId);
                const selectedManagerHierarchyId = selectedManagerId
                    ? nodeMaps.byUserId.get(selectedManagerId)?.id || selectedManagerId
                    : "";
                const selectedHierarchyId =
                    toStringValue(filteredValues.hierarchyId) || hierarchyMemberId;
                const selectedUserId = hierarchyUserId || userId;

                const payload: Record<string, unknown> = {
                    firstName: filteredValues.firstName,
                    lastName: filteredValues.lastName,
                    roleId: filteredValues.roleId,
                    isActive: filteredValues.isActive,
                    jobTitleId: filteredValues.jobTitleId,
                    departmentId: filteredValues.departmentId,
                    customExpireDays:
                        filteredValues.policyType === 1
                            ? filteredValues.customExpireDays
                            : undefined,
                    locationId: filteredValues.locationId,
                    profile_links: {
                        linkedin:
                            (filteredValues.profileLinks &&
                                Array.isArray(filteredValues.profileLinks) &&
                                (filteredValues.profileLinks[0] as Record<string, unknown>)
                                    ?.linkedIn) ||
                            "",
                        calenderLink:
                            (filteredValues.profileLinks &&
                                Array.isArray(filteredValues.profileLinks) &&
                                (filteredValues.profileLinks[0] as Record<string, unknown>)
                                    ?.calenderLink) ||
                            "",
                    },
                    userId: selectedUserId || undefined,
                    hierarchyId: selectedHierarchyId || undefined,
                    managerId:
                        selectedManagerId || selectedHierarchyId
                            ? selectedManagerHierarchyId || null
                            : undefined,
                };

                const cleanedPayload = Object.fromEntries(
                    Object.entries(payload).filter(([, v]) => v !== undefined),
                );

                await apiCall(
                    HTTP_METHODS.PUT,
                    `${API_ENDPOINTS.USERS}/${userId}`,
                    cleanedPayload,
                );

                onSaved?.();
                await loadData();
                setActiveMode("details");
            } finally {
                setIsSaving(false);
            }
        },
    });

    const loadData = async () => {
        if (!open || !userId) {
            return;
        }

        setIsLoading(true);
        try {
            const [chartResult, userResult] = await Promise.allSettled([
                apiCall<unknown>(HTTP_METHODS.GET, API_ENDPOINTS.USER_HIERARCHY_CHART),
                apiCall<unknown>(HTTP_METHODS.GET, `${API_ENDPOINTS.USERS}/${userId}`),
            ]);

            let nextRoots: HierarchyNode[] = [];

            if (chartResult.status === "fulfilled") {
                const chartResponse = chartResult.value;
                const payload =
                    chartResponse &&
                        typeof chartResponse === "object" &&
                        "data" in (chartResponse as Record<string, unknown>)
                        ? (chartResponse as { data?: unknown }).data ?? chartResponse
                        : chartResponse;

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

                nextRoots = chartData
                    .map((node: unknown) => normalizeHierarchyNode(node))
                    .filter((node: HierarchyNode | null): node is HierarchyNode => Boolean(node));
            }

            const nextNodeMaps = buildNodeMaps(nextRoots);
            setRoots(nextRoots);

            const fallbackNode =
                findNodeByUserId(nextRoots, userId) ?? {
                    id: userId,
                    userId,
                    name: "Unknown User",
                    title: "Team Member",
                    roleLabel: "Member",
                    managerId: null,
                    children: [],
                };

            if (userResult.status === "fulfilled") {
                setDetails(normalizeUserDetails(userResult.value, fallbackNode));
                const formValues = mapUserToFormikValues(userResult.value, fallbackNode);
                const rawManagerId = toStringValue(formValues.managerId);
                const mappedManagerId = rawManagerId
                    ? nextNodeMaps.byHierarchyId.get(rawManagerId)?.userId || rawManagerId
                    : "";

                formik.setValues({
                    ...formValues,
                    managerId: mappedManagerId,
                });
            } else {
                setDetails(normalizeUserDetails(null, fallbackNode));
                formik.setValues(EMPTY_FORM_VALUES);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveHierarchy = async () => {
        if (
            !selectedNode ||
            !hierarchyUserId ||
            !hierarchyMemberId ||
            isHierarchySaving ||
            !hierarchyManagerUserId
        ) {
            return;
        }

        const mappedManagerHierarchyId =
            selectedManagerOption?.hierarchyId ??
            nodeMaps.byUserId.get(hierarchyManagerUserId)?.id ??
            hierarchyManagerUserId;

        setIsHierarchySaving(true);
        try {
            await apiCall(
                HTTP_METHODS.PUT,
                `${API_ENDPOINTS.USER_HIERARCHY}/${hierarchyUserId}`,
                {
                    userId: hierarchyUserId,
                    managerId: mappedManagerHierarchyId || null,
                },
            );

            onSaved?.();
            await loadData();
            setActiveMode("details");
        } finally {
            setIsHierarchySaving(false);
        }
    };

    useEffect(() => {
        if (!open) {
            setActiveMode("details");
            setIsSaving(false);
            setIsHierarchySaving(false);
            setHierarchyManagerUserId(null);
            setHierarchySearchTerm("");
            setHierarchyManagerOptions([]);
            setIsHierarchyManagersLoading(false);
            setIsTeamExpanded(false);
            return;
        }

        setActiveMode(initialMode);
        void loadData();
    }, [open, userId, initialMode]);

    useEffect(() => {
        if (!open || activeMode !== "edit-hierarchy") {
            return;
        }

        setHierarchySearchTerm("");
        setHierarchyManagerUserId(null);
        setHierarchyManagerOptions([]);
    }, [activeMode, managerNode?.id, managerNode?.userId, open, userId]);

    const selectedDisplayName =
        details?.fullName || selectedNode?.name || "this user";
    const isEditHierarchyDisabled = isLoading || !selectedNode;
    const editHierarchyDisabledReason = isLoading
        ? "Loading user details."
        : "User is not in hierarchy.";
    const managerNavigationId = managerNode?.userId || managerNode?.id || "";
    const DIRECT_REPORTS_PREVIEW_LIMIT = 3;
    const hasMoreThanPreviewReports =
        directReports.length > DIRECT_REPORTS_PREVIEW_LIMIT;
    const visibleDirectReports = isTeamExpanded
        ? directReports
        : directReports.slice(0, DIRECT_REPORTS_PREVIEW_LIMIT);
    const shouldScrollReports = directReports.length > 4 || isTeamExpanded;

    return (
        <Sheet
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    setActiveMode("details");
                    setIsSaving(false);
                    setIsHierarchySaving(false);
                    setHierarchyManagerUserId(null);
                    setHierarchySearchTerm("");
                    setHierarchyManagerOptions([]);
                    setIsHierarchyManagersLoading(false);
                    setIsTeamExpanded(false);
                }
                onOpenChange(nextOpen);
            }}
        >
            <SheetContent side="right" className="w-[96vw] gap-0 overflow-hidden p-0 sm:max-w-3xl">
                <div className="flex h-full min-h-0 flex-col">
                    <SheetHeader className="shrink-0 border-b bg-white px-6 py-4">
                        <div className="flex items-start justify-between gap-3 pr-8">
                            <div>
                                <SheetTitle>
                                    {activeMode === "edit-user"
                                        ? "Edit User Details"
                                        : activeMode === "edit-hierarchy"
                                            ? "Edit User Hierarchy"
                                            : "User Details & Hierarchy"}
                                </SheetTitle>
                                <SheetDescription>
                                    {activeMode === "edit-user"
                                        ? "Edit and save user information directly from this drawer."
                                        : activeMode === "edit-hierarchy"
                                            ? "Update this user's reporting manager within the hierarchy."
                                            : "Reference view for who reports to this user and who this user reports to."}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div
                        className={
                            activeMode === "details"
                                ? "flex-1 min-h-0 px-6 py-5"
                                : activeMode === "edit-user"
                                    ? "flex-1 min-h-0 px-6 py-5"
                                    : "flex-1 overflow-y-auto px-6 py-5"
                        }
                    >
                        {isLoading ? (
                            <div className="flex min-h-[240px] items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : activeMode === "edit-user" ? (
                            <div className="flex h-full min-h-0 flex-col gap-6">
                                <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-sm font-semibold text-white">
                                            {getInitials(selectedDisplayName)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                {selectedDisplayName}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">
                                                {details?.title || selectedNode?.title || "Team Member"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={formik.handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
                                    <div className="min-h-0 flex-1 overflow-y-auto">
                                        <div className="rounded-xl border bg-white p-4">
                                            <EditUserForm
                                                formik={formik}
                                                user={details}
                                                jobtitles={jobtitles}
                                                departments={departments}
                                                managerOptions={localHierarchyManagerOptions}
                                                excludeUserId={userId || details?.id}
                                                layout="drawer"
                                            />
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex justify-end gap-2 border-t bg-white px-2 py-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setActiveMode("details");
                                                void loadData();
                                            }}
                                            disabled={isSaving}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={isSaving}>
                                            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                            Save Changes
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        ) : activeMode === "edit-hierarchy" ? (
                            <div className="space-y-6">
                                <div className="space-y-4 rounded-xl border bg-white p-4">
                                    {!selectedNode ? (
                                        <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-slate-500">
                                            This user is not available in hierarchy data yet, so hierarchy edits are disabled.
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                    Current Reporting To
                                                </p>
                                                <p className="text-sm text-slate-800">
                                                    {managerNode ? managerNode.name : "Top Level (No Manager)"}
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                    Search Manager
                                                </p>
                                                <Input
                                                    value={hierarchySearchTerm}
                                                    placeholder="Search by name or title"
                                                    onChange={(event) =>
                                                        setHierarchySearchTerm(event.target.value)
                                                    }
                                                />
                                            </div>

                                            <div className="max-h-[320px] overflow-y-auto rounded-lg border border-slate-200">
                                                {/*
                                                <button
                                                    type="button"
                                                    onClick={() => setHierarchyManagerUserId("")}
                                                    className={`flex w-full cursor-pointer items-center justify-between gap-3 border-b px-4 py-3 text-left transition-colors ${hierarchyManagerUserId === ""
                                                        ? "bg-primary/10 hover:bg-primary/15"
                                                        : "hover:bg-slate-50"
                                                        }`}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-slate-900">
                                                            Top Level (No Manager)
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            This user will not report to anyone.
                                                        </p>
                                                    </div>
                                                    {hierarchyManagerUserId === "" && (
                                                        <Badge variant="default" className="shrink-0">
                                                            Selected
                                                        </Badge>
                                                    )}
                                                </button>
                                                */}

                                                {isHierarchyManagersLoading ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                    </div>
                                                ) : managerOptionsForRender.length === 0 ? (
                                                    <div className="px-4 py-6 text-center text-sm text-slate-500">
                                                        No matching hierarchy member found.
                                                    </div>
                                                ) : (
                                                    managerOptionsForRender.map((option) => {
                                                        const isSelected = hierarchyManagerUserId === option.userId;

                                                        return (
                                                            <button
                                                                key={option.hierarchyId}
                                                                type="button"
                                                                onClick={() => setHierarchyManagerUserId(option.userId)}
                                                                className={`flex w-full cursor-pointer items-center justify-between gap-3 border-b px-4 py-3 text-left last:border-b-0 transition-colors ${isSelected
                                                                    ? "bg-primary/10 hover:bg-primary/15"
                                                                    : "hover:bg-slate-50"
                                                                    }`}
                                                            >
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-sm font-medium text-slate-900">
                                                                        {option.name}
                                                                    </p>
                                                                    <p className="truncate text-xs text-slate-500">
                                                                        {option.title}
                                                                    </p>
                                                                </div>
                                                                {isSelected && (
                                                                    <Badge variant="default" className="shrink-0">
                                                                        Selected
                                                                    </Badge>
                                                                )}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            <p className="text-xs text-slate-500">
                                                {hierarchyManagerUserId
                                                    ? `New reporting line: ${selectedDisplayName} will report to ${selectedManagerOption?.name || "selected manager"}.`
                                                    : "Select a manager to preview the new reporting line."}
                                            </p>
                                        </>
                                    )}
                                </div>

                                <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t bg-white px-2 py-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setActiveMode("details")}
                                        disabled={isHierarchySaving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleSaveHierarchy}
                                        disabled={!selectedNode || isHierarchySaving || !hierarchyManagerUserId}
                                    >
                                        {isHierarchySaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Save Hierarchy
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-full min-h-0 flex-col">
                                <div className="rounded-xl border bg-white p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-base font-semibold text-white">
                                                {getInitials(selectedDisplayName)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-base font-semibold text-slate-900">
                                                    {selectedDisplayName}
                                                </p>
                                                <p className="truncate text-xs text-slate-500">
                                                    {details?.title || selectedNode?.title || "Team Member"}
                                                </p>
                                            </div>
                                        </div>

                                        {userId && (
                                            <div className="flex shrink-0 items-center gap-2">
                                                {isEditHierarchyDisabled ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="inline-flex cursor-not-allowed">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled
                                                                >
                                                                    Edit Hierarchy
                                                                </Button>
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="text-xs">
                                                            {editHierarchyDisabledReason}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setActiveMode("edit-hierarchy")}
                                                    >
                                                        Edit Hierarchy
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    onClick={() => setActiveMode("edit-user")}
                                                    disabled={isLoading}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    Edit User
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
                                    <div className="rounded-xl border bg-white p-4">
                                        <div className="grid flex-1 gap-3 sm:grid-cols-2">
                                            <div>
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                    First Name
                                                </p>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {details?.firstName || "-"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                    Last Name
                                                </p>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {details?.lastName || "-"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                    Email
                                                </p>
                                                <p className="flex items-center gap-1 text-sm text-slate-700">
                                                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                                                    {details?.email || "-"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                    Access Profile
                                                </p>
                                                <Badge variant="outline" className="mt-1 text-[11px]">
                                                    {details?.role || selectedNode?.roleLabel || "-"}
                                                </Badge>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                    Password Expiry Policy
                                                </p>
                                                <p className="text-sm text-slate-700">{details?.passwordPolicy || "-"}</p>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                    Department
                                                </p>
                                                <p className="text-sm text-slate-700">{details?.department || "-"}</p>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                    Job Title
                                                </p>
                                                <p className="text-sm text-slate-700">
                                                    {details?.title || selectedNode?.title || "-"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                    Active User
                                                </p>
                                                <p className="text-sm text-slate-700">{details?.isActive ? "Yes" : "No"}</p>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                    Location
                                                </p>
                                                <p className="flex items-center gap-1 text-sm text-slate-700">
                                                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                                                    {details?.location || "-"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                    LinkedIn
                                                </p>
                                                <p className="truncate text-sm text-slate-700">{details?.linkedIn || "-"}</p>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                    Calendar Link
                                                </p>
                                                <p className="truncate text-sm text-slate-700">{details?.calenderLink || "-"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid items-start gap-4 md:grid-cols-2">
                                        <section className="space-y-3">
                                            <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                                                Reporting To
                                            </h3>

                                            {managerNode ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!managerNavigationId) return;
                                                        onNavigateUser?.(managerNavigationId);
                                                    }}
                                                    className="flex w-full cursor-pointer items-center justify-between rounded-lg border bg-white p-4 text-left transition-colors hover:bg-slate-50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                                                            {getInitials(managerNode.name)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900">
                                                                {managerNode.name}
                                                            </p>
                                                            <p className="text-xs text-slate-500">{managerNode.title}</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                                </button>
                                            ) : (
                                                <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-slate-500">
                                                    This user is at the top level and does not report to anyone.
                                                </div>
                                            )}
                                        </section>

                                        <section className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                                                    Direct Reports ({directReports.length})
                                                </h3>
                                            </div>

                                            {directReports.length === 0 ? (
                                                <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-slate-500">
                                                    No direct reports assigned.
                                                </div>
                                            ) : (
                                                <div className="overflow-hidden rounded-xl border bg-white px-4 py-4">
                                                    <div className="space-y-3">
                                                        <div
                                                            className={shouldScrollReports ? "max-h-[320px] space-y-3 overflow-y-auto pr-1" : "space-y-3"}
                                                        >
                                                            {visibleDirectReports.map((report) => (
                                                                <button
                                                                    key={report.id}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        onNavigateUser?.(report.userId || report.id)
                                                                    }
                                                                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
                                                                >
                                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white text-sm font-semibold text-slate-500">
                                                                        {getInitials(report.name)}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="truncate text-sm font-semibold text-slate-900">
                                                                            {report.name}
                                                                        </p>
                                                                        <p className="truncate text-xs text-slate-500">
                                                                            {report.title}
                                                                        </p>
                                                                    </div>
                                                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                                                </button>
                                                            ))}

                                                            {isTeamExpanded &&
                                                                directReports.map((report) =>
                                                                    report.children.length > 0 ? (
                                                                        <div key={`${report.id}-children`} className="rounded-md border px-3 py-2">
                                                                            <p className="mb-2 text-[10px] font-medium tracking-wide text-slate-400 uppercase">
                                                                                Team under {report.name}
                                                                            </p>
                                                                            <div className="space-y-1">
                                                                                {report.children.map((member) => (
                                                                                    <button
                                                                                        key={member.id}
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            onNavigateUser?.(member.userId || member.id)
                                                                                        }
                                                                                        className="flex w-full cursor-pointer items-center justify-between rounded-md bg-slate-50 px-2 py-1.5 text-left hover:bg-slate-100"
                                                                                    >
                                                                                        <span className="truncate pr-3 text-xs font-medium text-slate-700">
                                                                                            {member.name}
                                                                                        </span>
                                                                                        <span className="truncate text-[10px] text-slate-500">
                                                                                            {member.title}
                                                                                        </span>
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ) : null,
                                                                )}
                                                        </div>

                                                        {hasMoreThanPreviewReports && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="w-full text-base font-semibold text-primary"
                                                                onClick={() => setIsTeamExpanded((prev) => !prev)}
                                                            >
                                                                {isTeamExpanded
                                                                    ? `Collapse Team (${directReports.length})`
                                                                    : `Expand Team (${directReports.length})`}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
