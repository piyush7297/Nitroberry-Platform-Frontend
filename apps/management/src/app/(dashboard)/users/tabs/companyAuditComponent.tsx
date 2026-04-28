"use client";

import React, { useMemo, useState } from "react";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Button } from "@nitroberry/ui";
import { Input } from "@nitroberry/ui";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@nitroberry/ui";
import { Pagination } from "../pagination";
import { Skeleton } from "@nitroberry/ui";
import { EmptyState } from "@/components/not-found";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@nitroberry/ui";
import { Label } from "@nitroberry/ui";
import { Check, ChevronsUpDown } from "lucide-react";
import BaseModal from "../baseModal";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@nitroberry/ui";

interface CompanyAuditComponentProps {
    searchTerm?: string;
    filterSignal?: number;
    refreshSignal?: number;
}

const resolveUserName = (item: any) => {
    const nestedUser = item?.user || item?._user;
    if (nestedUser) {
        const fullName = `${nestedUser.firstName || ""} ${nestedUser.lastName || ""}`.trim();
        if (fullName) return fullName;
        return nestedUser.email || "-";
    }

    if (item?.fullname || item?.fullName) {
        return item?.fullname || item?.fullName;
    }

    const fullName = `${item?.firstName || ""} ${item?.lastName || ""}`.trim();
    if (fullName) return fullName;

    return item?.email || item?.userName || item?.userId || "-";
};

const resolveDate = (item: any) => {
    const value = item?.createdAt || item?.date || item?.timestamp;
    return value ? new Date(value).toLocaleString() : "-";
};

const resolveStatus = (item: any) => {
    if (typeof item?.isSuccess === "boolean") {
        return {
            label: item.isSuccess ? "Success" : "Failed",
            className: item.isSuccess ? "text-green-600" : "text-red-600",
        };
    }

    const rawStatus = String(item?.status || "-");
    const normalized = rawStatus.toLowerCase();

    if (normalized === "success" || normalized === "completed") {
        return { label: rawStatus, className: "text-green-600" };
    }

    if (normalized === "failed" || normalized === "error") {
        return { label: rawStatus, className: "text-red-600" };
    }

    return { label: rawStatus, className: "text-slate-600" };
};

export const CompanyAuditComponent: React.FC<CompanyAuditComponentProps> = ({
    searchTerm = "",
    filterSignal = 0,
    refreshSignal = 0,
}) => {
    const trimmedSearch = searchTerm.trim().toLowerCase();

    const [start, setStart] = useState(1);
    const [limit, setLimit] = useState(10);

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [userSearch, setUserSearch] = useState("");

    interface SelectedUser {
        id: string;
        label: string;
        initials: string;
    }
    const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
    const [draftSelectedUsers, setDraftSelectedUsers] = useState<SelectedUser[]>([]);

    const trimmedUserSearch = userSearch.trim();

    const userListUrl = useMemo(
        () =>
            `${API_ENDPOINTS.USERS_COMMON}/search?start=1&limit=10${trimmedUserSearch ? `&search=${encodeURIComponent(trimmedUserSearch)}` : ""
            }`,
        [trimmedUserSearch],
    );

    const { data: userListData, isLoading: isUserListLoading } = useApiQuery(
        [
            "COMPANY_AUDIT_USER_LIST",
            isFilterModalOpen,
            isUserDropdownOpen,
            trimmedUserSearch,
        ],
        userListUrl,
        {
            enabled: isFilterModalOpen && isUserDropdownOpen,
            refetchOnWindowFocus: false,
            staleTime: 0,
            retry: 1,
        } as const,
    );

    const userOptions = useMemo(() => {
        const users =
            userListData?.data?.users ||
            userListData?.data?.data ||
            (Array.isArray(userListData?.data) ? userListData?.data : []);
        return Array.isArray(users) ? users : [];
    }, [userListData]);

    const queryParams = useMemo(() => {
        const params = new URLSearchParams({
            limit: String(limit),
            start: String(start),
        });

        if (selectedUsers.length > 0) {
            params.set("userIds", selectedUsers.map(u => u.id).join(','));
        }

        return params.toString();
    }, [start, limit, selectedUsers]);

    const { data: auditData, isLoading, isFetching, refetch } = useApiQuery(
        ["USERS_COMPANY_AUDIT_LOGS", start, limit, selectedUsers],
        `${API_ENDPOINTS.COMPANY_AUDIT}?${queryParams}`,
        {
            refetchOnWindowFocus: false,
            refetchOnMount: "always",
            staleTime: 0,
            retry: 1,
        } as const,
    );

    const logs = useMemo(() => {
        const raw =
            auditData?.data?.data ||
            auditData?.data?.task ||
            auditData?.data?.logs ||
            auditData?.data?.items ||
            (Array.isArray(auditData?.data) ? auditData?.data : []);

        return Array.isArray(raw) ? raw : [];
    }, [auditData]);

    const filteredLogs = useMemo(() => {
        if (!trimmedSearch) return logs;

        return logs.filter((item: any) => {
            const searchableValues = [
                item?.message,
                item?.type,
                resolveUserName(item),
                resolveDate(item),
                resolveStatus(item).label,
            ]
                .map((value) => String(value ?? "").toLowerCase())
                .join(" ");

            return searchableValues.includes(trimmedSearch);
        });
    }, [logs, trimmedSearch]);

    const pagination = auditData?.data?.pagination || {};
    const total = Number(
        pagination?.totalItems ??
        pagination?.totalCount ??
        pagination?.total ??
        pagination?.count ??
        logs.length ??
        0,
    );

    const getUserLabel = (user: any) =>
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
        user?.fullname ||
        user?.email ||
        String(user?.id ?? user?.userId ?? "");

    const getUserInitials = (user: any) => {
        const fName = user?.firstName || "";
        const lName = user?.lastName || "";
        if (fName && lName) return `${fName[0]}${lName[0]}`.toUpperCase();
        if (fName) return fName.substring(0, 2).toUpperCase();
        if (user?.fullname) return user.fullname.substring(0, 2).toUpperCase();
        if (user?.email) return user.email.substring(0, 2).toUpperCase();
        return "U";
    };

    const toggleDraftUser = (user: any) => {
        const userId = String(user?.id ?? user?.userId ?? "");
        if (!userId) return;

        setDraftSelectedUsers(prev => {
            const isSelected = prev.some(u => u.id === userId);
            if (isSelected) {
                return prev.filter(u => u.id !== userId);
            } else {
                return [...prev, {
                    id: userId,
                    label: getUserLabel(user),
                    initials: getUserInitials(user)
                }];
            }
        });
    };

    const clearDraftUsers = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDraftSelectedUsers([]);
    };

    const closeFilterModal = () => {
        setIsUserDropdownOpen(false);
        setIsFilterModalOpen(false);
    };

    const applyFilter = () => {
        setSelectedUsers(draftSelectedUsers);
        setStart(1);
        setIsUserDropdownOpen(false);
        setIsFilterModalOpen(false);
    };

    const clearAppliedFilters = () => {
        setSelectedUsers([]);
        setDraftSelectedUsers([]);
        setStart(1);
    };

    const prevFilterSignal = React.useRef(filterSignal);
    const prevRefreshSignal = React.useRef(refreshSignal);

    React.useEffect(() => {
        if (filterSignal > 0 && filterSignal !== prevFilterSignal.current) {
            prevFilterSignal.current = filterSignal;
            setDraftSelectedUsers(selectedUsers);
            setUserSearch("");
            setIsUserDropdownOpen(false);
            setIsFilterModalOpen(true);
        }
    }, [filterSignal, selectedUsers]);

    React.useEffect(() => {
        if (refreshSignal > 0 && refreshSignal !== prevRefreshSignal.current) {
            prevRefreshSignal.current = refreshSignal;
            setStart(1);
            void refetch();
        }
    }, [refreshSignal, refetch]);

    return (
        <section className="w-full space-y-5">
            {selectedUsers.length > 0 && (
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">Filtered by:</span>
                    <div className="flex -space-x-2">
                        {selectedUsers.slice(0, 3).map((user) => (
                            <TooltipProvider key={user.id}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700 ring-2 ring-white z-10 hover:z-20 relative cursor-default">
                                            {user.initials}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{user.label}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                        {selectedUsers.length > 3 && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 ring-2 ring-white z-10 hover:z-20 relative cursor-default">
                                            +{selectedUsers.length - 3}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div className="flex flex-col gap-1 text-sm">
                                            {selectedUsers.slice(3).map(user => (
                                                <span key={user.id}>{user.label}</span>
                                            ))}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearAppliedFilters} className="h-8 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-transparent">Clear filters</Button>
                </div>
            )}

            {isLoading || isFetching ? (
                <div className="overflow-x-auto rounded-lg border">
                    <Table>
                        <TableHeader className="bg-gray-100">
                            <TableRow>
                                <TableHead>Message</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 8 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <Skeleton className="h-4 w-56" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-14" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-32" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-52" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-16" />
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
                <div className="overflow-x-auto rounded-lg border">
                    <Table>
                        <TableHeader className="bg-gray-100">
                            <TableRow>
                                <TableHead>Message</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.map((item: any) => {
                                const status = resolveStatus(item);

                                return (
                                    <TableRow key={item.id || `${item.message}-${item.createdAt}`} className="hover:bg-gray-50">
                                        <TableCell className="font-medium">{item?.message || "-"}</TableCell>
                                        <TableCell>{item?.type ?? "-"}</TableCell>
                                        <TableCell>{resolveUserName(item)}</TableCell>
                                        <TableCell>{resolveDate(item)}</TableCell>
                                        <TableCell>
                                            <span className={status.className}>{status.label}</span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {filteredLogs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">
                                        <EmptyState
                                            title="No company audit logs found"
                                            description="No company audit logs found"
                                            onClick={() => { }}
                                            buttonTitle=""
                                        />
                                    </TableCell>
                                </TableRow>
                            )}
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
            )}

            <BaseModal
                open={isFilterModalOpen}
                onClose={closeFilterModal}
                footerButtons={{ cancel: "Cancel", submit: "Apply Filter" }}
                onSubmit={applyFilter}
                activeModal={{ type: "filters" }}
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="mb-1.5 text-sm font-medium">User List</Label>
                        <Popover open={isUserDropdownOpen} onOpenChange={setIsUserDropdownOpen} modal={true}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-between font-normal"
                                >
                                    <span className="truncate text-left">
                                        {draftSelectedUsers.length > 0
                                            ? `${draftSelectedUsers.length} user(s) selected`
                                            : "Select users..."}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-[360px] max-w-[calc(100vw-5rem)] p-0">
                                <div className="border-b p-2">
                                    <Input
                                        type="search"
                                        placeholder="Search users..."
                                        value={userSearch}
                                        onChange={(event) => setUserSearch(event.target.value)}
                                        onKeyDown={(event) => event.stopPropagation()}
                                    />
                                </div>

                                <div className="max-h-56 overflow-y-auto p-1">
                                    <button
                                        type="button"
                                        onClick={clearDraftUsers}
                                        className="flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm hover:bg-gray-100"
                                    >
                                        <span>All users</span>
                                        <Check
                                            className={`h-4 w-4 ${draftSelectedUsers.length === 0 ? "opacity-100" : "opacity-0"}`}
                                        />
                                    </button>

                                    {isUserListLoading ? (
                                        <div className="px-2 py-3 text-sm text-gray-500">Loading users...</div>
                                    ) : userOptions.length > 0 ? (
                                        userOptions.map((user: any) => {
                                            const userId = String(user?.id ?? user?.userId ?? "");
                                            if (!userId) return null;

                                            const userLabel = getUserLabel(user);

                                            return (
                                                <button
                                                    key={userId}
                                                    type="button"
                                                    onClick={() => toggleDraftUser(user)}
                                                    className="flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm hover:bg-gray-100"
                                                >
                                                    <span className="truncate">{userLabel}</span>
                                                    <Check
                                                        className={`h-4 w-4 ${draftSelectedUsers.some(u => u.id === userId) ? "opacity-100" : "opacity-0"}`}
                                                    />
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="px-2 py-3 text-sm text-gray-500">No users found</div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </BaseModal>
        </section>
    );
};
