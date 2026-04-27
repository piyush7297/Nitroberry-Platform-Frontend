"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useParams, useRouter } from "next/navigation";
import { Pencil, RefreshCcw } from "lucide-react";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import Link from "next/link";
import { API_ENDPOINTS } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { PRIORITY_ENUM } from "@/lib/enums/routes.enum";

export default function FmsSystemPage() {
  const { id } = useParams();
  const router = useRouter();

  const breadcrumbs = [
    { name: "", href: "/dashboard", icon: true },
    { name: "Workflow Templates", href: "/dashboard/workflow-templates" },
    { name: id, href: null },
  ];

  const { data, isLoading } = useApiQuery(
    ["FmsTemplateDetail", id],
    `${API_ENDPOINTS.FMS_TEMPLATE}/${id}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!id,
    } as const,
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No data found for this Workflow template.
      </div>
    );
  }

  const template = data?.data || {};
  const workflowTemplate = template?.workflowTemplate || {};
  const indentFields = workflowTemplate?.indent?.form || [];
  const workflowSteps = workflowTemplate?.steps || [];
  const verifiers = workflowTemplate?.indent?.verifiers || {};
  const initiators = workflowTemplate?.indent?.initiators || {};
  const indentFormData = workflowTemplate?.indent?.indentFormData || [];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Breadcrumbs */}
      <DynamicBreadcrumb breadcrumbs={breadcrumbs} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {template?.name || "Workflow System"}
            <Badge variant={template?.isActive ? "active" : "secondary"}>
              {template?.isActive ? "Active" : "Inactive"}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {template?.description || "No description available."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="default"
            onClick={() =>
              router.push(
                `/dashboard/template/${encodeURIComponent(
                  template?.name?.trim().replace(/\s+/g, "-").toLowerCase(),
                )}/${template?.id}`,
              )
            }
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Load Template
          </Button>
          <Button asChild variant="outline">
            <Link href={`/dashboard/workflow-templates/edit/${id}`}>
              <Pencil className="w-4 h-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
        <div>
          <div>Created On</div>
          <div className="text-foreground font-medium">
            {template?.createdAt
              ? new Date(template.createdAt).toLocaleDateString()
              : "—"}
          </div>
        </div>
        <div>
          <div>Created By</div>
          <div className="text-foreground font-medium">
            {template?.createdByName || "—"}
          </div>
        </div>
        <div>
          <div>Default Priority</div>
          <div className="text-foreground font-medium">
            {PRIORITY_ENUM[workflowTemplate?.priority] || "—"}
          </div>
        </div>
        <div>
          <div>Total Steps</div>
          <div className="text-foreground font-medium">
            {workflowSteps?.length || 0}
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

      {/* Indent Form Data */}
      {indentFormData.length > 0 && (
        <div className="bg-gray-50 p-6 rounded-md">
          <div className="flex flex-col md:flex-row md:justify-between gap-6">
            <div className="md:w-1/2">
              <h2 className="text-lg font-semibold mb-1">Indent Form Data</h2>
              <p className="text-sm text-muted-foreground">
                Selected form fields that will be used in the indent workflow.
              </p>
            </div>

            <div className="md:w-1/2">
              <div className="border bg-white p-4 rounded-md space-y-3">
                {indentFormData.map((fieldId: number) => {
                  const field = indentFields.find(
                    (f: any) => Number(f.id) === Number(fieldId),
                  );
                  return field ? (
                    <div key={fieldId}>
                      <div className="text-sm font-medium text-gray-800 mb-1">
                        {field.fieldName}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 bg-gray-50 border rounded-md px-3 py-1">
                        Type: {field.fieldType || "Text"} | Sequence:{" "}
                        {field.sequence}
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {[
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
      ].map((section) => (
        <div key={section.title} className="bg-gray-50 p-6 rounded-md">
          <div className="flex flex-col md:flex-row md:justify-between gap-6">
            <div className="md:w-1/2">
              <h2 className="text-lg font-semibold mb-1">{section.title}</h2>
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>
            </div>

            <div className="md:w-1/2">
              {section.data?.userIds?.length > 0 ||
                section.data?.groupIds?.length > 0 ||
                section.data?.userfullnames?.length > 0 ||
                section.data?.groupfullnames?.length > 0 ? (
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
                <div className="border bg-white rounded-md px-4 py-6 text-center">
                  <h3 className="text-gray-900 font-medium text-base mb-2">
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

      {/* Workflow Steps */}
      <div className="bg-gray-50 p-6 rounded-md">
        <div className="flex flex-col md:flex-row md:justify-between gap-6">
          <div className="md:w-1/2">
            <h2 className="text-lg font-semibold mb-1">Workflow Steps</h2>
            <p className="text-sm text-muted-foreground">
              Below are the configured workflow steps for this Workflow.
            </p>
          </div>

          <div className="md:w-1/2">
            {workflowSteps?.length > 0 ? (
              <div className="space-y-4">
                {workflowSteps.map((step: any, index: number) => (
                  <div
                    key={step.stepId || index}
                    className="border bg-white p-4 rounded-md"
                  >
                    <div className="font-medium text-gray-900">
                      Step {index + 1}: {step.stepName || "Untitled Step"}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {step.comment || "No description provided."}
                    </div>

                    <div className="mt-3 space-y-2">
                      {step.form?.map((field: any) => (
                        <div key={field.id}>
                          <div className="text-sm font-medium text-gray-800 flex items-center gap-1">
                            {field.fieldName}
                            {field.required && (
                              <span className="text-red-500">*</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 bg-gray-50 border rounded-md px-3 py-1">
                            Type: {field.fieldType}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-xs text-gray-400 mt-2">
                      {step.assignment?.length > 0
                        ? `Assigned to: ${step.assignment
                          .flatMap((a: any) => a.fullname)
                          .join(", ")}`
                        : "No assigned user"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border bg-white rounded-md px-4 py-6 text-center">
                <h3 className="text-gray-900 font-medium text-base mb-2">
                  No workflow steps configured.
                </h3>
                <p className="text-sm text-gray-600">
                  No steps added yet. Start by creating one.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
