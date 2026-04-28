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
import { Loader, MoreVertical, Edit, Trash2, CircleCheck } from "lucide-react";
import { useApiMutation, useApiQuery, useStatusMutation } from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import { API_ENDPOINTS } from "@/api/endpoints";
import { EmptyState } from "@/components/not-found";
import { PermissionGuard, useModulePermissions } from "@/components/PermissionGuard";
import { ConfirmationModal } from "@/components/models/confirmationModal";
import { Badge } from "@nitroberry/ui";
import { Pagination } from "../pagination";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@nitroberry/ui";

interface JobTitleComponentProps {
    searchTerm?: string;
    createSignal?: number;
    refreshSignal?: number;
}

export const JobTitleComponent: React.FC<JobTitleComponentProps> = ({
    searchTerm = "",
    createSignal = 0,
    refreshSignal = 0,
}) => {
    const [jobName, setJobName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [modalState, setModalState] = useState<{
        action: "delete" | "status" | null;
        job: any | null;
    }>({ action: null, job: null });
    const [editingJob, setEditingJob] = useState<any | null>(null);
    const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
    const [start, setStart] = useState(1);
    const [limit, setLimit] = useState(10);
    const previousCreateSignal = useRef(createSignal);
    const previousRefreshSignal = useRef(refreshSignal);

    const openModal = (action: "delete" | "status", job: any) => {
        setModalState({ action, job });
    };

    const openEdit = (job: any) => {
        setJobName(job.name);
        setDescription(job.description || "");
        setEditingJob(job);
        setIsFormDrawerOpen(true);
    };

    const handleCreateJobTitle = () => {
        setEditingJob(null);
        setJobName("");
        setDescription("");
        setIsFormDrawerOpen(true);
    };

    const handleCloseFormDrawer = () => {
        if (loading) return;
        setIsFormDrawerOpen(false);
        setEditingJob(null);
        setJobName("");
        setDescription("");
    };

    const createJobTitle = useApiMutation(
        HTTP_METHODS.POST,
        API_ENDPOINTS.JOB_TITLE,
    );
    const updateStatus = useStatusMutation(
        HTTP_METHODS.PUT,
        ({ id }) => `${API_ENDPOINTS.JOB_TITLE}/${id}/status`,
    );
    const deleteJobTitle = useStatusMutation(
        HTTP_METHODS.DELETE,
        (id) => `${API_ENDPOINTS.JOB_TITLE}/${id}`,
    );
    const updateJobTitle = useStatusMutation(
        HTTP_METHODS.PUT,
        ({ id }) => `${API_ENDPOINTS.JOB_TITLE}/${id}`,
    );
    
    const { create: canCreate } = useModulePermissions(8);

    const queryParams = new URLSearchParams({
        start: String(start),
        limit: String(limit),
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
    }).toString();

    const { data, isLoading, isFetching, refetch } = useApiQuery(
        ["JobTitle", start, limit, searchTerm],
        `${API_ENDPOINTS.JOB_TITLE}?${queryParams}`,
        {
            refetchOnWindowFocus: false,
            retry: 1,
        } as const,
    );

    useEffect(() => {
        if (createSignal === previousCreateSignal.current) return;
        previousCreateSignal.current = createSignal;
        if (createSignal <= 0) return;
        setEditingJob(null);
        setJobName("");
        setDescription("");
        setIsFormDrawerOpen(true);
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

    const handleSubmit = () => {
        if (!jobName.trim()) return;
        setLoading(true);

        if (editingJob) {
            const payload: any = { id: editingJob.id, name: jobName };
            if (description?.trim()) payload.description = description;

            updateJobTitle.mutate(payload, {
                onSuccess: () => {
                    setJobName("");
                    setDescription("");
                    setEditingJob(null);
                    setIsFormDrawerOpen(false);
                    refetch();
                    setLoading(false);
                },
                onError: (err: any) => {
                    console.error("Failed to update job title:", err);
                    setLoading(false);
                },
            });
            return;
        }

        createJobTitle.mutate(
            { name: jobName, ...(description?.trim() ? { description } : {}) },
            {
                onSuccess: () => {
                    setJobName("");
                    setDescription("");
                    setIsFormDrawerOpen(false);
                    refetch();
                    setLoading(false);
                },
                onError: (err) => {
                    console.error("Failed to create job title:", err);
                    setLoading(false);
                },
            },
        );
    };

    const handleConfirm = () => {
        if (!modalState.job || !modalState.action) return;
        const { action, job } = modalState;

        if (action === "delete") {
            setLoading(true);
            deleteJobTitle.mutate(job.id, {
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

    const jobTitles = data?.data?.JobTitles || [];
    const pagination = data?.data?.pagination;
    const skeletonRows = Array.from({ length: 5 });
    const hasSearch = searchTerm.trim().length > 0;

    return (
        <div className="space-y-3">
            <div className="w-full">
                {!isLoading && jobTitles.length === 0 && hasSearch ? (
                    <div className="flex justify-center items-center py-12">
                        <EmptyState
                            onClick={handleCreateJobTitle}
                            buttonTitle=""
                            title="No results found"
                            description="Please refine your search and try again."
                        />
                    </div>
                ) : !isLoading && jobTitles.length === 0 ? (
                    <div className="flex justify-center items-center py-12">
                        <EmptyState
                            onClick={handleCreateJobTitle}
                            buttonTitle={canCreate ? "Create Job Title" : ""}
                            title="No Job Titles Created Yet"
                            description="You haven't added any job titles to your system. Add your first job title ."
                        />
                    </div>
                ) : (
                    <div className="overflow-x-auto border rounded-lg">
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
                                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            ) : (
                                <TableBody>
                                    {jobTitles.map((job: any) => (
                                        <TableRow key={job.id} className="hover:bg-gray-50">
                                            <TableCell>{job.name}</TableCell>
                                            <TableCell>{job.description || "-"}</TableCell>
                                            <TableCell>
                                                <Badge variant={job.status ? "active" : "disabled"}>
                                                    {job.status ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(job.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="p-1">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <PermissionGuard moduleId={8} action="update">
                                                            <DropdownMenuItem
                                                                onClick={() => openEdit(job)}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <Edit className="w-4 h-4 text-primary" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                        </PermissionGuard>
                                                        <PermissionGuard moduleId={8} action="update">
                                                            <DropdownMenuItem
                                                                onClick={() => openModal("status", job)}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <CircleCheck className="w-4 h-4 text-primary" />
                                                                {job.status ? "Disable" : "Active"}
                                                            </DropdownMenuItem>
                                                        </PermissionGuard>
                                                        <PermissionGuard moduleId={8} action="delete">
                                                            <DropdownMenuItem
                                                                onClick={() => openModal("delete", job)}
                                                                className="text-destructive flex items-center gap-2"
                                                            >
                                                                <Trash2 className="w-4 h-4 text-red-600" />
                                                                Delete
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
                                total={jobTitles?.length || 0}
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
                open={isFormDrawerOpen}
                onOpenChange={(open) => {
                    if (open) {
                        setIsFormDrawerOpen(true);
                        return;
                    }
                    handleCloseFormDrawer();
                }}
            >
                <SheetContent side="right" className="w-[96vw] gap-0 p-0 sm:max-w-lg">
                    <div className="flex h-full flex-col">
                        <SheetHeader className="border-b px-6 py-4">
                            <SheetTitle>{editingJob ? "Edit Job Title" : "Create Job Title"}</SheetTitle>
                            <SheetDescription>
                                {editingJob
                                    ? "Update the selected job title information."
                                    : "Add a new job title to the system."}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="rounded-xl border bg-white p-4">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="job-title">Job Title</Label>
                                        <Input
                                            id="job-title"
                                            type="text"
                                            placeholder="Enter Job Title"
                                            value={jobName}
                                            onChange={(e) => setJobName(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Input
                                            id="description"
                                            type="text"
                                            placeholder="Enter Description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t px-6 py-4">
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCloseFormDrawer}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading || !jobName.trim()}
                                >
                                    {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingJob ? "Update" : "Create"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {modalState.job && (
                <ConfirmationModal
                    open={!!modalState.job}
                    title={
                        modalState.action === "delete"
                            ? "Delete Job Title?"
                            : "Change Status?"
                    }
                    description={
                        modalState.action === "delete"
                            ? `Are you sure you want to delete "${modalState.job.name}"?`
                            : `Are you sure you want to ${modalState.job.status ? "disable" : "enable"
                            } "${modalState.job.name}"?`
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