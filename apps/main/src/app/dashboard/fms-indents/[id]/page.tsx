"use client";

import { Separator } from "@/components/ui/separator";
import { useParams } from "next/navigation";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import { API_ENDPOINTS } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

const breadcrumbs = [
  { name: "", href: "/dashboard", icon: true },
  { name: "Indent Lists", href: "/dashboard/fms-indents" },
  { name: "Indent detail", href: null },
];

const FMSDraftListDetailsPage = () => {
  const { id } = useParams();

  const { hasAccess: canRead } = useModulePermissions(6);

  const { data: draftListDetailsData, isLoading } = useApiQuery(
    ["FmsIndentDraftListDetail", id],
    `${API_ENDPOINTS.FMS_INDENT_DRAFT_LIST_DETAILS}/${id}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!id && canRead,
    } as const,
  );

  // Extract data with defaults before conditional returns to maintain hook order
  const draftListDetails = draftListDetailsData?.data || {};
  const indentFields = draftListDetails?.indent?.form || [];

  // Move useMemo before conditional returns to maintain hook order

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
    </div>
  );
};

export default FMSDraftListDetailsPage;
