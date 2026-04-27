"use client";

import { useState, useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { useParams } from "next/navigation";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import { API_ENDPOINTS } from "@/api/endpoints";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HTTP_METHODS } from "@/api/methods";
import { useToast } from "@/hooks/use-toast";
import { FMSINDENTSTATUS } from "@/lib/enums/routes.enum";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

const breadcrumbs = [
  { name: "", href: "/dashboard", icon: true },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Draft details", href: null },
];

const STATUS_OPTIONS = [
  { value: FMSINDENTSTATUS.APPROVED, label: "Approved" },
  { value: FMSINDENTSTATUS.REJECTED, label: "Rejected" },
  { value: FMSINDENTSTATUS.INPROGRESS, label: "In Progress" },
] as const;

const FMSDraftListDetailsPage = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<number | "">("");
  const [comment, setComment] = useState<string>("");

  const { hasAccess: canRead, update: canUpdate } = useModulePermissions(6);

  const { data: draftListDetailsData, isLoading } = useApiQuery(
    ["FmsIndentDraftListDetails", id],
    `${API_ENDPOINTS.FMS_INDENT_DRAFT_LIST_DETAILS}/${id}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!id && canRead,
    } as const,
  );

  const resetForm = () => {
    setStatus("");
    setComment("");
  };

  const updateStatusMutation = useApiMutation(
    HTTP_METHODS.PATCH,
    `${API_ENDPOINTS.FMS_INDENT}/${id}/status`,
    {
      onSuccess: () => {
        // toast({
        //     title: 'Success',
        //     description: 'Status updated successfully',
        // });
        resetForm();
      },
      onError: (error: any) => {
        // toast({
        //     title: 'Error',
        //     description: error?.message || 'Failed to update status',
        //     variant: 'destructive',
        // });
      },
    },
  );

  const handleSubmit = () => {
    if (!status) {
      toast({
        title: "Validation Error",
        description: "Please select a status",
        variant: "destructive",
      });
      return;
    }

    updateStatusMutation.mutate({
      status,
      comment: comment || "",
    });
  };

  const isFormValid = Boolean(status && comment);

  // Extract data with defaults before conditional returns to maintain hook order
  const draftListDetails = draftListDetailsData?.data || {};
  const indentFields = draftListDetails?.indent?.form || [];
  const verifiers = draftListDetails?.indent?.verifiers || {};
  const initiators = draftListDetails?.indent?.initiators || {};

  // Move useMemo before conditional returns to maintain hook order
  const sectionsConfig = useMemo(
    () => [
      {
        title: "Verifiers",
        description: "Below are the configured verifiers for this Workflow.",
        data: verifiers,
        emptyTitle: "No verifiers configured.",
        emptyMessage: "No verifiers added yet. Start by creating one.",
      },
      {
        title: "Initiators",
        description: "Below are the configured initiators for this Workflow.",
        data: initiators,
        emptyTitle: "No initiators configured.",
        emptyMessage: "No initiators added yet. Start by creating one.",
      },
    ],
    [verifiers, initiators],
  );

  const hasData = (data: any) =>
    data?.userIds?.length > 0 ||
    data?.groupIds?.length > 0 ||
    data?.userfullnames?.length > 0 ||
    data?.groupfullnames?.length > 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!draftListDetailsData) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No data found for this draft list.
      </div>
    );
  }

  if (canRead === false) {
    return <div className="p-4 sm:p-3 mt-4"><PermissionDeniedState /></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Breadcrumbs */}
      <DynamicBreadcrumb breadcrumbs={breadcrumbs} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {draftListDetails?.name || "Draft List"}
          </h1>
        </div>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
        <div>
          <div>Created On</div>
          <div className="text-foreground font-medium">
            {draftListDetails?.createdAt
              ? new Date(draftListDetails.createdAt).toLocaleDateString()
              : "—"}
          </div>
        </div>
        <div>
          <div>Created By</div>
          <div className="text-foreground font-medium">
            {draftListDetails?.createdByName || "—"}
          </div>
        </div>
      </div>

      <Separator />

      {/* Indent (Request) Form Fields */}
      <div className="bg-gray-50 p-6 rounded-md">
        <div className="flex flex-col md:flex-row md:justify-between gap-6">
          <div className="md:w-1/2">
            <h2 className="text-lg font-semibold mb-1">Request Form Fields</h2>
            <p className="text-sm text-muted-foreground">
              These are the configured input fields required before workflow
              starts.
            </p>
          </div>

          <div className="md:w-1/2 space-y-5">
            {indentFields?.length > 0 ? (
              indentFields.map((field: any, idx: number) => (
                <div key={idx} className="flex flex-col">
                  <p className="text-gray-400 text-xs mb-1">Field {idx + 1}</p>
                  <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    {field.fieldName}
                    {field.required && <span className="text-red-500">*</span>}
                  </div>
                  <div className="text-gray-700 bg-white border rounded-md px-3 py-2 mt-1">
                    {field.fieldValue || "—"}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No indent form fields configured yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {sectionsConfig.map((section) => (
        <div key={section.title} className="bg-gray-50 p-6 rounded-md">
          <div className="flex flex-col md:flex-row md:justify-between gap-6">
            <div className="md:w-1/2">
              <h2 className="text-lg font-semibold mb-1">{section.title}</h2>
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>
            </div>

            <div className="md:w-1/2">
              {hasData(section.data) ? (
                <div className="border bg-white p-4 rounded-md space-y-3">
                  {section.data?.userfullnames?.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-800 mb-2">
                        Users:
                      </div>
                      <div className="text-sm text-gray-600 bg-gray-50 border rounded-md px-3 py-2">
                        {section.data.userfullnames.join(", ")}
                      </div>
                    </div>
                  )}
                  {section.data?.groupfullnames?.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-800 mb-2">
                        Groups:
                      </div>
                      <div className="text-sm text-gray-600 bg-gray-50 border rounded-md px-3 py-2">
                        {section.data.groupfullnames.join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col justify-center items-center text-center h-full min-h-[180px]">
                  <h3 className="text-gray-900 font-medium text-lg mb-2">
                    {section.emptyTitle}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {section.emptyMessage}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Status Update Section */}
      <div className="bg-gray-50 p-6 rounded-md">
        <div className="flex flex-col md:flex-row md:justify-between gap-6">
          <div className="md:w-1/2">
            <h2 className="text-lg font-semibold mb-1">Update Status</h2>
            <p className="text-sm text-muted-foreground">
              Update the status and add a comment for this indent.
            </p>
          </div>

          <div className="md:w-1/2 space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-800">
                Status <span className="text-red-500">*</span>
              </label>
              <Select value={status !== "" ? String(status) : ""} onValueChange={(v) => setStatus(Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-800">
                Comment
                <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Enter your comment here..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <PermissionGuard moduleId={6} action="update">
              <Button
                onClick={handleSubmit}
                disabled={updateStatusMutation.isPending || !isFormValid}
                className="w-full"
              >
                {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </PermissionGuard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FMSDraftListDetailsPage;
