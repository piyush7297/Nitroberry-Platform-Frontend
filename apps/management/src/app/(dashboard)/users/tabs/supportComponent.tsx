"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@nitroberry/ui";
import { Label } from "@nitroberry/ui";
import { Button } from "@nitroberry/ui";
import { Textarea } from "@nitroberry/ui";
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
import { Badge, BadgeVariant } from "@nitroberry/ui";
import { Loader, MoreVertical, MessageSquare, CircleCheck, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/not-found";
import { PermissionGuard, useModulePermissions } from "@/components/PermissionGuard";
import { ConfirmationModal } from "@/components/models/confirmationModal";
import { Pagination } from "../pagination";
import { formatDateTime } from "@nitroberry/shared";
import { apiCall } from "@nitroberry/api-client";
import { API_ENDPOINTS } from "@/api/endpoints";
import { HTTP_METHODS } from "@/api/methods";
import { useApiQuery } from "@/hooks/useApi";
import { Skeleton } from "@nitroberry/ui";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@nitroberry/ui";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@nitroberry/ui";

type SupportStatus = "open" | "pending" | "resolved" | "closed" | "rejected";
type SupportPriority = "low" | "medium" | "high";

interface SupportTicket {
    id: string;
    ticketId?: string;
    subject: string;
    description?: string;
    status: SupportStatus;
    priority?: SupportPriority;
    createdAt: string;
    updatedAt?: string;
    assignedTo?: string;
}

interface SupportComponentProps {
    searchTerm?: string;
    createSignal?: number;
    refreshSignal?: number;
}

const statusVariantMap: Record<string, BadgeVariant> = {
    open: "default",
    pending: "secondary",
    resolved: "active",
    closed: "active",
    rejected: "destructive",
};

const priorityColorMap: Record<string, string> = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
};

const toStringValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return "";
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

const normalizeStatus = (value: unknown): SupportStatus => {
    const numericValue = toFiniteNumber(value);
    if (numericValue !== null) {
        if (numericValue === 0) return "pending";
        if (numericValue === 1) return "resolved";
        if (numericValue === 2) return "closed";
        if (numericValue === 3) return "open";
        if (numericValue === 4) return "rejected";
    }

    const raw = toStringValue(value).trim().toLowerCase();
    if (!raw) return "open";

    if (raw === "inprogress" || raw === "in_progress" || raw === "in-progress") {
        return "pending";
    }
    if (raw === "pending") {
        return "pending";
    }
    if (raw === "resolved" || raw === "complete" || raw === "completed") {
        return "resolved";
    }
    if (raw === "closed" || raw === "close") {
        return "closed";
    }
    if (raw === "rejected" || raw === "reject") {
        return "rejected";
    }
    return "open";
};

const normalizePriority = (value: unknown): SupportPriority | undefined => {
    const numericValue = toFiniteNumber(value);
    if (numericValue !== null) {
        if (numericValue === 1) return "low";
        if (numericValue === 2) return "medium";
        if (numericValue === 3) return "high";
    }

    const raw = toStringValue(value).trim();
    if (!raw) {
        return undefined;
    }
    const normalized = raw.toLowerCase();
    if (normalized === "low" || normalized === "medium" || normalized === "high") {
        return normalized;
    }

    return undefined;
};

const formatStatusLabel = (status: SupportStatus): string => {
    return status
        .split("-")
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(" ");
};

const formatPriorityLabel = (priority?: SupportPriority): string => {
    if (!priority) return "-";

    return priority
        .split("-")
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(" ");
};

const resolveSupportTicket = (entry: unknown, index = 0): SupportTicket | null => {
    const item = asRecord(entry);
    if (!item) return null;

    const assignedToObj =
        asRecord(item.assignedTo) ??
        asRecord(item.assignee) ??
        asRecord(item.assignedUser) ??
        asRecord(item.agent);

    const assignedTo =
        toStringValue(item.assignedToName ?? item.assignedTo) ||
        toStringValue(assignedToObj?.fullName) ||
        toStringValue(assignedToObj?.name) ||
        toStringValue(assignedToObj?.email) ||
        undefined;

    const createdAt =
        toStringValue(item.createdAt ?? item.created_at ?? item.date ?? item.createdDate) ||
        new Date().toISOString();

    const updatedAt =
        toStringValue(item.updatedAt ?? item.updated_at ?? item.modifiedAt ?? item.lastUpdated) ||
        undefined;

    return {
        id: toStringValue(item.id ?? item._id ?? item.ticketId ?? `ticket-${index + 1}`),
        ticketId: toStringValue(
            item.ticketId ?? item.ticketNo ?? item.referenceCode ?? item.code,
        ) || undefined,
        subject:
            toStringValue(item.subject ?? item.title ?? item.issue ?? item.topic) ||
            "Untitled",
        description: toStringValue(item.description ?? item.details ?? item.message) || undefined,
        status: normalizeStatus(item.status ?? item.ticketStatus ?? item.state),
        priority: normalizePriority(item.priority ?? item.priorityLevel ?? item.severity),
        createdAt,
        updatedAt,
        assignedTo,
    };
};

const resolveSupportListData = (payload: unknown) => {
    const root = asRecord(payload);
    const data = asRecord(root?.data) ?? root;

    const listCandidates: unknown[] = [
        data?.tickets,
        data?.supportTickets,
        data?.rows,
        data?.items,
        data?.list,
        data?.data,
        root?.tickets,
        root?.supportTickets,
        payload,
    ];

    let rows: unknown[] = [];
    for (const candidate of listCandidates) {
        if (Array.isArray(candidate)) {
            rows = candidate;
            break;
        }
    }

    const tickets = rows
        .map((entry, index) => resolveSupportTicket(entry, index))
        .filter((item): item is SupportTicket => item !== null);

    const pagination = asRecord(data?.pagination) ?? asRecord(root?.pagination) ?? {};
    const total =
        toFiniteNumber(
            pagination.totalItems ??
            pagination.totalCount ??
            pagination.total ??
            pagination.count ??
            data?.total ??
            root?.total,
        ) ?? tickets.length;

    return { tickets, pagination, total };
};

const resolveSupportDetailData = (payload: unknown): SupportTicket | null => {
    const root = asRecord(payload);
    const data = asRecord(root?.data) ?? root;

    const candidates: unknown[] = [
        data?.ticket,
        data?.supportTicket,
        data?.item,
        data,
        root?.ticket,
        root?.supportTicket,
        payload,
    ];

    for (const candidate of candidates) {
        const resolved = resolveSupportTicket(candidate, 0);
        if (resolved) {
            return resolved;
        }
    }

    return null;
};

export const SupportComponent: React.FC<SupportComponentProps> = ({
    searchTerm = "",
    createSignal = 0,
    refreshSignal = 0,
}) => {
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("1");
    const [loading, setLoading] = useState(false);
    const [ticketRows, setTicketRows] = useState<SupportTicket[]>([]);
    const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
    const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [selectedTicketPreview, setSelectedTicketPreview] = useState<SupportTicket | null>(null);
    const [start, setStart] = useState(1);
    const [limit, setLimit] = useState(10);
    const [modalState, setModalState] = useState<{
        action: "delete" | "resolve" | null;
        ticket: SupportTicket | null;
    }>({ action: null, ticket: null });
    const previousCreateSignal = useRef(createSignal);
    const previousRefreshSignal = useRef(refreshSignal);

    const { create: canCreate } = useModulePermissions(23);

    const trimmedSearch = searchTerm.trim();

    useEffect(() => {
        setStart(1);
    }, [trimmedSearch]);

    const supportListUrl = useMemo(() => {
        const params = new URLSearchParams({
            start: String(start),
            limit: String(limit),
        });

        if (trimmedSearch) {
            params.set("search", trimmedSearch);
        }

        return `${API_ENDPOINTS.SUPPORT_TICKET}/?${params.toString()}`;
    }, [start, limit, trimmedSearch]);

    const {
        data: supportListData,
        isLoading: isListLoading,
        isFetching: isListFetching,
        refetch,
    } = useApiQuery(
        ["SUPPORT_TICKET_LIST", start, limit, trimmedSearch],
        supportListUrl,
        {
            refetchOnWindowFocus: false,
            refetchOnMount: "always",
            staleTime: 0,
            retry: 1,
        } as const,
    );

    const { tickets, pagination, total } = useMemo(
        () => resolveSupportListData(supportListData),
        [supportListData],
    );

    const {
        data: supportDetailData,
        isLoading: isDetailLoading,
        isFetching: isDetailFetching,
    } = useApiQuery(
        ["SUPPORT_TICKET_DETAIL", selectedTicketId],
        `${API_ENDPOINTS.SUPPORT_TICKET}/${selectedTicketId}`,
        {
            enabled: isDetailDrawerOpen && Boolean(selectedTicketId),
            refetchOnWindowFocus: false,
            refetchOnMount: "always",
            staleTime: 0,
            retry: 1,
        } as const,
    );

    const detailTicket = useMemo(
        () => resolveSupportDetailData(supportDetailData) ?? selectedTicketPreview,
        [supportDetailData, selectedTicketPreview],
    );

    useEffect(() => {
        setTicketRows(tickets);
    }, [tickets]);

    useEffect(() => {
        if (createSignal > previousCreateSignal.current) {
            setIsFormDrawerOpen(true);
            previousCreateSignal.current = createSignal;
        }
    }, [createSignal]);

    useEffect(() => {
        if (refreshSignal > previousRefreshSignal.current) {
            setStart(1);
            void refetch();
            previousRefreshSignal.current = refreshSignal;
        }
    }, [refreshSignal, refetch]);

    const openModal = (action: "delete" | "resolve", ticket: SupportTicket) => {
        setModalState({ action, ticket });
    };

    const openDetailDrawer = (ticket: SupportTicket) => {
        setSelectedTicketId(ticket.id);
        setSelectedTicketPreview(ticket);
        setIsDetailDrawerOpen(true);
    };

    const closeDetailDrawer = () => {
        setIsDetailDrawerOpen(false);
        setSelectedTicketId(null);
        setSelectedTicketPreview(null);
    };

    const handleCreateTicket = async () => {
        if (!subject.trim()) {
            alert("Please enter a ticket subject");
            return;
        }

        setLoading(true);
        try {
            await apiCall(HTTP_METHODS.POST, `${API_ENDPOINTS.SUPPORT_TICKET}/`, {
                subject: subject.trim(),
                description: description.trim(),
                priority: Number(priority) || 1,
            });

            setSubject("");
            setDescription("");
            setPriority("1");
            setIsFormDrawerOpen(false);
            setStart(1);
            await refetch();
        } finally {
            setLoading(false);
        }
    };

    const handleResolveTicket = () => {
        if (!modalState.ticket) return;
        setLoading(true);

        setTicketRows((prev) =>
            prev.map((ticket) =>
                ticket.id === modalState.ticket?.id
                    ? {
                        ...ticket,
                        status: "resolved",
                        updatedAt: new Date().toISOString(),
                    }
                    : ticket,
            ),
        );

        setLoading(false);
        setModalState({ action: null, ticket: null });
    };

    const handleDeleteTicket = () => {
        if (!modalState.ticket) return;
        setLoading(true);

        setTicketRows((prev) => prev.filter((ticket) => ticket.id !== modalState.ticket?.id));
        setLoading(false);
        setModalState({ action: null, ticket: null });
    };

    const handleCloseFormDrawer = () => {
        if (loading) return;
        setIsFormDrawerOpen(false);
        setSubject("");
        setDescription("");
        setPriority("1");
    };

    const handleConfirm = () => {
        if (modalState.action === "resolve") {
            handleResolveTicket();
        } else if (modalState.action === "delete") {
            handleDeleteTicket();
        }
    };

    const totalRows = total > 0 ? total : ticketRows.length;

    return (
        <div className="space-y-6">

            <Sheet open={isFormDrawerOpen} onOpenChange={setIsFormDrawerOpen}>
                <SheetContent className="w-[96vw] sm:max-w-2xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Raise New Support Ticket</SheetTitle>
                        <SheetDescription>
                            Fill in the details below to create a new support ticket
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-4 px-4 pb-4 pt-2">
                        <div className="rounded-xl border bg-white p-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject *</Label>
                                    <Input
                                        id="subject"
                                        placeholder="Enter ticket subject"
                                        value={subject}
                                        onChange={(event) => setSubject(event.target.value)}
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Provide details about your issue"
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        disabled={loading}
                                        rows={4}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select value={priority} onValueChange={setPriority} disabled={loading}>
                                        <SelectTrigger id="priority">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">Low</SelectItem>
                                            <SelectItem value="2">Medium</SelectItem>
                                            <SelectItem value="3">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleCreateTicket} disabled={loading || !subject.trim()} className="flex-1">
                                {loading && <Loader className="w-4 h-4 animate-spin mr-2" />}
                                Create Ticket
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleCloseFormDrawer}
                                disabled={loading}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {isListLoading || isListFetching ? (
                <div className="overflow-x-auto border rounded-lg">
                    <Table>
                        <TableHeader className="bg-gray-100">
                            <TableRow>
                                <TableHead>Ticket #</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Updated</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 6 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-56" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : ticketRows.length === 0 ? (
                <EmptyState
                    onClick={() => setIsFormDrawerOpen(true)}
                    buttonTitle={canCreate ? "Create Your First Ticket" : ""}
                    title={trimmedSearch ? "No results found" : "No Support Tickets"}
                    description={
                        trimmedSearch
                            ? "No ticket matched your search. Try a different keyword."
                            : "You haven't raised any support tickets yet. Create one to get started."
                    }
                />
            ) : (
                <>
                    <div className="overflow-x-auto border rounded-lg">
                        <Table>
                            <TableHeader className="bg-gray-100">
                                <TableRow>
                                    <TableHead>Ticket #</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Updated</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ticketRows.map((ticket) => {
                                    const priorityKey = (ticket.priority || "").toLowerCase();

                                    return (
                                        <TableRow key={ticket.id} className="hover:bg-gray-50">
                                            <TableCell className="font-mono text-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => openDetailDrawer(ticket)}
                                                    className="text-left text-primary hover:underline"
                                                >
                                                    {ticket.ticketId || ticket.id.slice(0, 8).toUpperCase()}
                                                </button>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                <button
                                                    type="button"
                                                    onClick={() => openDetailDrawer(ticket)}
                                                    className="flex items-center gap-2 text-left hover:text-primary"
                                                >
                                                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    {ticket.subject}
                                                </button>
                                            </TableCell>
                                            <TableCell>
                                                {ticket.priority ? (
                                                    <span
                                                        className={`px-2 py-1 rounded text-sm font-medium ${priorityColorMap[priorityKey] || "bg-gray-100 text-gray-800"}`}
                                                    >
                                                        {formatPriorityLabel(ticket.priority)}
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusVariantMap[ticket.status] || "default"}>
                                                    {formatStatusLabel(ticket.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {formatDateTime(ticket.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {ticket.updatedAt ? formatDateTime(ticket.updatedAt) : "-"}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="p-1">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {(ticket.status === "open" || ticket.status === "pending") && (
                                                            <PermissionGuard moduleId={23} action="update">
                                                                <DropdownMenuItem
                                                                    onClick={() => openModal("resolve", ticket)}
                                                                >
                                                                    <CircleCheck />
                                                                    Mark as Resolved
                                                                </DropdownMenuItem>
                                                            </PermissionGuard>
                                                        )}
                                                        <PermissionGuard moduleId={23} action="delete">
                                                            <DropdownMenuItem
                                                                variant="destructive"
                                                                onClick={() => openModal("delete", ticket)}
                                                            >
                                                                <Trash2 />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </PermissionGuard>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <Pagination
                        start={start}
                        limit={limit}
                        total={totalRows}
                        pagination={pagination}
                        onPageChange={setStart}
                        onLimitChange={(newLimit) => {
                            setLimit(newLimit);
                            setStart(1);
                        }}
                    />
                </>
            )}

            <Sheet open={isDetailDrawerOpen} onOpenChange={(open) => !open && closeDetailDrawer()}>
                <SheetContent className="w-[96vw] sm:max-w-2xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Support Ticket Details</SheetTitle>
                        <SheetDescription>
                            Detailed information for the selected support ticket.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-4 px-4 pb-4 pt-2">
                        {isDetailLoading || isDetailFetching ? (
                            <div className="rounded-xl border bg-white p-4">
                                <div className="space-y-3">
                                    <Skeleton className="h-5 w-40" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-20 w-full" />
                                </div>
                            </div>
                        ) : !detailTicket ? (
                            <div className="rounded-xl border bg-white p-4">
                                <EmptyState
                                    title="Ticket details not available"
                                    description="Unable to load ticket details for this record."
                                    onClick={() => { }}
                                    buttonTitle=""
                                />
                            </div>
                        ) : (
                            <div className="rounded-xl border bg-white p-4">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Ticket ID</p>
                                        <p className="font-mono text-sm text-slate-800">{detailTicket.id}</p>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Subject</p>
                                        <p className="text-sm font-semibold text-slate-900">{detailTicket.subject}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Priority</p>
                                            <p className="text-sm text-slate-800">{formatPriorityLabel(detailTicket.priority)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                                            <Badge variant={statusVariantMap[detailTicket.status] || "default"}>
                                                {formatStatusLabel(detailTicket.status)}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Description</p>
                                        <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
                                            {detailTicket.description || "No description provided."}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="space-y-1">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Created At</p>
                                            <p className="text-sm text-slate-700">{formatDateTime(detailTicket.createdAt)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Updated At</p>
                                            <p className="text-sm text-slate-700">
                                                {detailTicket.updatedAt ? formatDateTime(detailTicket.updatedAt) : "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {modalState.ticket && (
                <ConfirmationModal
                    open={modalState.action !== null}
                    title={modalState.action === "resolve" ? "Mark as Resolved" : "Delete Ticket"}
                    description={
                        modalState.action === "resolve"
                            ? `Are you sure you want to mark ticket "${modalState.ticket.subject}" as resolved?`
                            : `Are you sure you want to delete ticket "${modalState.ticket.subject}"? This action cannot be undone.`
                    }
                    onConfirm={handleConfirm}
                    onCancel={() => setModalState({ action: null, ticket: null })}
                    loading={loading}
                    confirmText={modalState.action === "resolve" ? "Mark Resolved" : "Delete"}
                    cancelText="Cancel"
                    variant={modalState.action === "delete" ? "destructive" : "default"}
                />
            )}
        </div>
    );
};
