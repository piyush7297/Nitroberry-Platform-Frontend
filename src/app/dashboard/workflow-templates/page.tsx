"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  CircleCheck,
  CircleX,
  Edit,
  File,
  Filter,
  Loader,
  MoreVertical,
  PlusIcon,
  RefreshCcw,
  Search,
  Share2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { EmptyState } from "@/components/not-found";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { useApiMutation, useApiQuery, useStatusMutation } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Pagination } from "../users/pagination";
import { MembersCell } from "../users/page";
import { HTTP_METHODS } from "@/api/methods";
import { PRIORITY_ENUM } from "@/lib/enums/routes.enum";
import { formatDateTime } from "@/lib/utils";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

const deleteReasons = [
  { label: "Duplicate Record", value: "duplicate" },
  { label: "Invalid Data", value: "invalid_data" },
  { label: "User Request", value: "user_request" },
  { label: "Other", value: "other" },
];

export default function Systems() {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<number | any>(null);
  const [deleteReason, setDeleteReason] = useState<string | undefined>();
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState<string>("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    createdBy: "",
  });
  const [tempFilters, setTempFilters] = useState(filters);
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(false);

  const [start, setStart] = useState(1);
  const [limit, setLimit] = useState(50);

  const { hasAccess: canRead, create: canCreate } = useModulePermissions(3);

  const isSearchActive = searchTerm.trim() !== "";
  const openDeleteModal = (id: any) => {
    setDeleteId(id);
  };

  const closeDeleteModal = () => {
    setDeleteId(null);
    setDeleteReason("");
    setDeleteConfirmText("");
  };
  const deleteFMS = useApiMutation(
    HTTP_METHODS.DELETE,
    `${API_ENDPOINTS.FMS_TEMPLATE}/${deleteId}`,
  );
  const handleDelete = () => {
    setLoading(true);
    deleteFMS.mutate(undefined, {
      onSuccess: () => {
        setLoading(false);
        refetch();
        closeDeleteModal();
      },
      onError: (error: any) => {
        setLoading(false);
        closeDeleteModal();
      },
    });
  };

  const {
    data: fmsdata,
    isLoading,
    refetch,
  } = useApiQuery(
    ["FMS_TEMPLATE", start, limit],
    `${API_ENDPOINTS.FMS_TEMPLATE}?start=${start}&limit=${limit}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: canRead,
    } as const,
  );
  let fmstemplates = fmsdata?.data?.templates || [];

  // Fetch template details for verifier information
  const { data: templateDetails, isLoading: isLoadingTemplateDetails } =
    useApiQuery(
      ["FMS_TEMPLATE_DETAILS", selectedRowId],
      `${API_ENDPOINTS.FMS_TEMPLATE}/${selectedRowId}`,
      {
        refetchOnWindowFocus: false,
        retry: 1,
        enabled: !!selectedRowId && shareModalOpen && canRead,
      } as const,
    );

  const verifiers =
    templateDetails?.data?.workflowTemplate?.indent?.verifiers || {};

  const updateFmsTemp = useStatusMutation(
    HTTP_METHODS.PATCH,
    ({ id }) => `fms/templete/${id}/status`,
  );

  const shareIndentMutation = useApiMutation(
    HTTP_METHODS.POST,
    API_ENDPOINTS.FMS_INDENT_SHARE,
  );

  const openShareModal = (rowId: string) => {
    setSelectedRowId(rowId);
    setShareEmail("");
    setShareModalOpen(true);
  };

  const closeShareModal = () => {
    setShareModalOpen(false);
    setShareEmail("");
    setSelectedRowId(null);
  };

  const handleShareSubmit = () => {
    if (!shareEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRowId) {
      toast({
        title: "Error",
        description: "No template selected",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shareEmail.trim())) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    shareIndentMutation.mutate(
      {
        id: selectedRowId,
        email: [shareEmail.trim()],
      },
      {
        onSuccess: () => {
          closeShareModal();
        },
        onError: (error: any) => { },
      },
    );
  };

  const handleActiveDisabled = (templateId: string, status: boolean) => {
    updateFmsTemp.mutate(
      { status: status, id: templateId },
      {
        onSuccess: () => {
          refetch();
        },
        onError: (err) => {
          console.error("Failed to update workflow template:", err);
        },
      },
    );
  };

  if (canRead === false) {
    return <div className="p-4 sm:p-3 mt-4"><PermissionDeniedState /></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold">Workflow Templates</h1>
          <p className="text-gray-600">
            View system status, assign ownership, and create new workflow
            template.
          </p>
        </div>
        <div className="flex">
          <PermissionGuard moduleId={3} action="create">
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/workflow-templates/ai-workflow">
                  <Bot className="w-4 h-4" />
                  Ai Workflow
                </Link>
              </Button>
              <Button asChild variant="default">
                <Link href="/dashboard/workflow-templates/create">
                  <PlusIcon className="w-4 h-4 text-white" />
                  Create Template
                </Link>
              </Button>
            </div>
          </PermissionGuard>
        </div>
      </div>

      {/* <div className="flex justify-between items-center mt-8">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search for Workflow..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              // setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setTempFilters(filters);
            setShowFilter(true);
          }}
        >
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div> */}

      {!isLoading &&
        ((isSearchActive && fmstemplates.length === 0) ||
          fmstemplates?.length === 0) ? (
        <div className="flex justify-center items-center py-12">
          {isSearchActive && fmstemplates.length === 0 ? (
            <EmptyState
              title="No workflow templates found for your search"
              description="Try adjusting your search or filters."
              onClick={() => setSearchTerm("")}
              buttonTitle="Clear Search"
            />
          ) : (
            <EmptyState
              title="No workflow templates found"
              description="Create a new workflow template to manage and track."
              onClick={() => { }}
              buttonTitle={canCreate ? "Create Template" : ""}
            />
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead>Workflow Name</TableHead>
                <TableHead>Templete Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx} className="animate-pulse">
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded w-6"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </TableCell>
                  </TableRow>
                ))
                : fmstemplates.map((row: any, idx: any) => (
                  <TableRow key={idx} className="hover:bg-gray-50">
                    {/* <TableCell>
                      <Switch
                        checked={row.enabled}
                        onCheckedChange={() => handleToggle(row.enabled)}
                      />
                    </TableCell> */}
                    <TableCell>{row?.name}</TableCell>
                    <TableCell>{row?.templeteCode ?? "-"}</TableCell>
                    <TableCell>
                      {row?.description ? (
                        <div className="relative group max-w-xs">
                          <span
                            className="block truncate cursor-pointer"
                          >
                            {row.description}
                          </span>
                          <div className="absolute z-10 hidden group-hover:block bg-white border border-gray-300 shadow-lg p-2 rounded text-xs w-64 left-0 top-full mt-1 whitespace-pre-line break-words">
                            {row.description}
                          </div>
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </TableCell>
                    <TableCell>{row?.createdByName ?? "-"}</TableCell>
                    <TableCell>
                      {formatDateTime(row?.createdAt) ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row?.status ? "active" : "destructive"}>
                        {row?.status ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="p-1">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/dashboard/template/${encodeURIComponent(
                                  row?.name
                                    ?.trim()
                                    .replace(/\s+/g, "-")
                                    .toLowerCase(),
                                )}/${row?.id}`,
                              )
                            }
                            className="flex items-center gap-2"
                            disabled={row?.status === false}
                          >
                            <RefreshCcw className="w-4 h-4" /> Submit Indent
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openShareModal(row?.id)}
                            className="flex items-center gap-2"
                            disabled={row?.status === false}
                          >
                            <Share2 className="w-4 h-4" /> Share Indent Form
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="flex items-center gap-2"
                            onClick={() =>
                              router.push(
                                `/dashboard/workflow-templates/${row.id}`,
                              )
                            }
                          >
                            <File className="w-4 h-4" /> View Details
                          </DropdownMenuItem>

                          <PermissionGuard moduleId={3} action="update">
                            <DropdownMenuItem
                              className="flex items-center gap-2"
                              onClick={() =>
                                router.push(
                                  `/dashboard/workflow-templates/edit/${row?.id}`,
                                )
                              }
                            >
                              <Edit className="w-4 h-4" /> Edit & Configure
                            </DropdownMenuItem>
                          </PermissionGuard>

                          <PermissionGuard moduleId={3} action="update">
                            <DropdownMenuItem
                              className="flex items-center gap-2"
                              onClick={() =>
                                handleActiveDisabled(row.id, !row.status)
                              }
                            >
                              {row.status ? (
                                <CircleX className="w-4 h-4" />
                              ) : (
                                <CircleCheck className="w-4 h-4" />
                              )}{" "}
                              {row.status ? "Disable" : "Active"}
                            </DropdownMenuItem>
                          </PermissionGuard>

                          <PermissionGuard moduleId={3} action="delete">
                            <DropdownMenuItem
                              className="flex items-center gap-2 text-red-600"
                              onClick={() => openDeleteModal(row.id)}
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </DropdownMenuItem>
                          </PermissionGuard>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>

          <div className="items-center border-t px-4 pb-4">
            <Pagination
              start={start}
              limit={limit}
              total={fmstemplates?.length || 0}
              pagination={fmsdata?.data?.pagination}
              onPageChange={(newStart) => setStart(newStart)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setStart(1);
              }}
            />
          </div>
        </div>
      )}

      <Dialog open={showFilter} onOpenChange={setShowFilter}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Status</p>
              <Select
                value={tempFilters.status}
                onValueChange={(val) =>
                  setTempFilters((p) => ({ ...p, status: val }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Priority</p>
              <Select
                value={tempFilters.priority}
                onValueChange={(val) =>
                  setTempFilters((p) => ({ ...p, priority: val }))
                }
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
            <div>
              <p className="text-sm font-medium mb-1">Created By</p>
              <Select
                value={tempFilters.createdBy}
                onValueChange={(val) =>
                  setTempFilters((p) => ({ ...p, createdBy: val }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {fmstemplates?.map((row: any) => (
                    <SelectItem key={row?.createdBy} value={row?.createdBy}>
                      {row?.createdBy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4 border-t border-[#EAECF0] pt-4">
            <Button
              variant="outline"
              onClick={() => {
                const emptyFilters = {
                  status: "",
                  priority: "",
                  createdBy: "",
                };
                setTempFilters(emptyFilters);
                setFilters(emptyFilters);
                setShowFilter(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setFilters(tempFilters);
                setShowFilter(false);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Confirmation Modal */}
      <Dialog open={deleteId !== null} onOpenChange={closeDeleteModal}>
        <DialogContent className="w-[95vw] max-w-md mx-auto overflow-y-auto pt-16 sm:w-[90vw] md:w-[80vw] lg:max-w-md max-h-[90vh]">
          <div
            className="absolute pointer-events-none w-[220px] h-[220px] bg-center bg-cover top-0 left-[25%] -translate-x-1/2 -z-10"
            style={{ backgroundImage: "url('/images/bg-decorative.svg')" }}
          />
          <div className="absolute top-6.5 left-4 w-12 h-12 flex items-center justify-center rounded-lg border border-gray-200 shadow-sm sm:top-4 sm:left-4 sm:w-10 sm:h-10 md:top-6.5 md:left-6 md:w-12 md:h-12">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <DialogHeader>
            <DialogTitle>{"Delete Workflow Template"}</DialogTitle>
            <DialogDescription>
              {
                "Are you sure you want to delete? This action cannot be undone. All related data will be removed.  "
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1 text-gray-500">
                Type <span className="font-bold text-gray-600">"delete"</span>{" "}
                to confirm
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type delete to confirm"
                className="w-full"
              />
            </div>

            {/* <div>
              <p className="text-sm font-medium mb-1">Reason for Deletion</p>
              <Select
                value={deleteReason}
                onValueChange={(val) => setDeleteReason(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {deleteReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}

            {/* <div>
              <p className="text-sm font-medium mb-1">Associated Orders</p>

              <div className="flex items-center gap-6 text-sm text-muted-foreground border border-border rounded-md p-4">
                <div className="flex flex-col items-start">
                  <span className="text-base font-semibold text-foreground">04</span>
                  <span>Completed</span>
                </div>

                <div className="h-6 w-px bg-border" />

                <div className="flex flex-col items-start">
                  <span className="text-base font-semibold text-foreground">01</span>
                  <span>In Progress</span>
                </div>

                <div className="h-6 w-px bg-border" />

                <div className="flex flex-col items-start">
                  <span className="text-base font-semibold text-foreground">0</span>
                  <span>Pending</span>
                </div>
              </div>
              <p className="text-xs font-medium mb-1 text-destructive mt-2">This Workflow cannot be deleted until all associated orders and steps are completed.</p>
            </div> */}
          </div>
          <DialogFooter className="w-full">
            <div className="flex justify-between w-full gap-4">
              <Button
                variant="outline"
                onClick={closeDeleteModal}
                className="flex-1"
              >
                Cancel
              </Button>
              <PermissionGuard moduleId={3} action="delete">
                <Button
                  variant="default"
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== "delete" || loading}
                  className="flex-1"
                >
                  {loading && <Loader className="animate-spin w-5 h-5" />} Yes,
                  delete
                </Button>
              </PermissionGuard>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Indent Form Modal */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share Indent Form</DialogTitle>
            <DialogDescription>
              Enter the email address to share the indent form with.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Verifier Details Section */}
            <div className="bg-gray-50 p-4 rounded-md border">
              <h3 className="text-sm font-semibold mb-2">Verifier Details</h3>
              {isLoadingTemplateDetails ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader className="animate-spin w-4 h-4" />
                  Loading verifier details...
                </div>
              ) : verifiers?.userfullnames?.length > 0 ||
                verifiers?.groupfullnames?.length > 0 ? (
                <div className="space-y-3">
                  {verifiers?.userfullnames?.length > 0 && (
                    <div>
                      <MembersCell
                        members={verifiers.userfullnames.map(
                          (name: string) => ({ fullname: name }),
                        )}
                        maxVisible={5}
                      />
                    </div>
                  )}
                  {verifiers?.groupfullnames?.length > 0 && (
                    <div>
                      <MembersCell
                        members={verifiers.groupfullnames.map(
                          (name: string) => ({ fullname: name }),
                        )}
                        maxVisible={5}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No verifiers configured for this template.
                </div>
              )}
            </div>

            {/* Email Input Section */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="share-email">Email</Label>
              <Input
                id="share-email"
                type="email"
                placeholder="Enter email address"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleShareSubmit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeShareModal}>
              Cancel
            </Button>
            <PermissionGuard moduleId={3} action="update">
              <Button
                onClick={handleShareSubmit}
                disabled={shareIndentMutation.isPending || !shareEmail.trim()}
              >
                {shareIndentMutation.isPending && (
                  <Loader className="animate-spin w-4 h-4 mr-2" />
                )}
                Submit
              </Button>
            </PermissionGuard>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

