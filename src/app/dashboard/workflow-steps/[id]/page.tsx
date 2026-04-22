"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  useApiMutation,
  useApiMutationFormData,
  useApiQuery,
} from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/not-found";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { HTTP_METHODS } from "@/api/methods";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { getBadgeVariant } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { FMSSTATUSVALUE, RoutesEnum } from "@/lib/enums/routes.enum";
import { Checkbox } from "@/components/ui/checkbox";
import { File, Loader2, UploadCloud, X } from "lucide-react";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";
import { FileUploadType } from "@/lib/enums/file-upload-type.enum";

export default function FMSSteps() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const stepId = params?.id ?? "";

  const { hasAccess: canRead, update: canUpdate } = useModulePermissions(2);

  // --- Fetch Workflow Step API (Dynamic) ---
  const { data, isLoading, refetch } = useApiQuery(
    ["STEP_LIST", stepId],
    `${API_ENDPOINTS.FMS_STEP}/${stepId}`,
    { refetchOnWindowFocus: false, retry: 1, enabled: !!stepId && canRead } as const,
  );

  // --- Extract step data safely ---
  const stepData = data?.data?.stepData || {};
  const formFields = stepData?.form || [];
  const stepName = stepData?.stepName || "—";
  const stepStatusRaw = stepData?.stepStatus;
  const stepStatus = stepStatusRaw != null
    ? (typeof stepStatusRaw === "object" ? stepStatusRaw?.name ?? "—" : String(stepStatusRaw))
    : "—";
  const isStepCompleted = Number(typeof stepStatusRaw === "object" ? stepStatusRaw?.name : stepStatusRaw) === FMSSTATUSVALUE.COMPLETED
    || (typeof stepStatusRaw === "object" && stepStatusRaw?.name === "completed")
    || stepStatusRaw === "completed";
  const createdAt = data?.data?.createdAt || "";
  const updatedAt = data?.data?.updateAt || "";
  const createdByName = data?.data?.createdByName || "";
  const comment = stepData?.comment || "";
  const indentIdsData = stepData?.indentIdsData;

  // --- Local state for dynamic form ---
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [formComment, setFormComment] = useState("");
  const [reasonforDeay, setReasonforDelay] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFields, setUploadingFields] = useState<
    Record<number, boolean>
  >({});
  const [fileNames, setFileNames] = useState<Record<number, string>>({});

  // === Required field validation ===
  const allRequiredFilled = formFields
    .filter((f: any) => f.required)
    .every(
      (field: any) =>
        formValues[field.id] !== undefined &&
        String(formValues[field.id]).trim() !== "",
    );

  useEffect(() => {
    const s = stepData?.stepStatus;
    // stepStatus may be a number (new backend) or an object with .name (legacy)
    setStatus(s != null ? String(typeof s === "object" ? s?.name ?? "" : s) : "");
  }, [stepData]);

  // Initialize form values with existing field values
  useEffect(() => {
    if (formFields.length > 0) {
      const initialValues: Record<string, string | string[]> = {};
      const initialFileNames: Record<number, string> = {};

      formFields.forEach((field: any) => {
        if (
          field.fieldValue !== null &&
          field.fieldValue !== undefined &&
          field.fieldValue !== ""
        ) {
          if (field.fieldType === "checkbox") {
            if (Array.isArray(field.fieldValue)) {
              initialValues[field.id] = field.fieldValue.map((v: any) =>
                v.toString(),
              );
            } else if (typeof field.fieldValue === "string") {
              initialValues[field.id] = field.fieldValue.split(",");
            } else {
              initialValues[field.id] = [];
            }
          } else if (field.fieldType === "file") {
            // Store the URL in formValues
            initialValues[field.id] = field.fieldValue.toString();
            // Extract filename from URL or use a default name
            const url = field.fieldValue.toString();
            const fileName =
              url.split("/").pop() || url.split("\\").pop() || "Uploaded file";
            initialFileNames[field.id] = fileName;
          } else {
            initialValues[field.id] = field.fieldValue.toString();
          }
        }
      });
      setFormValues(initialValues as Record<string, string>);
      setFileNames(initialFileNames);
    }
    if (comment) {
      setFormComment(comment);
    }
  }, [formFields, comment]);

  const handleInputChange = (fieldId: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  };
  const updateIndent = useApiMutation(
    HTTP_METHODS.PATCH,
    `${API_ENDPOINTS.UPDATE_FMS_STEP}`,
  );
  const uploadFile = useApiMutationFormData(
    HTTP_METHODS.POST,
    `${API_ENDPOINTS.COMMON_UPLOAD}`,
  );

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldId: number,
  ) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    // Reject SVG files
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    if (fileType === "image/svg+xml" || fileName.endsWith(".svg")) {
      toast({
        title: "Error",
        description:
          "SVG files are not allowed. Please upload JPG, PNG, GIF, or WebP images.",
        variant: "destructive",
      });
      // Reset file input
      e.target.value = "";
      return;
    }

    // Check file size (optional: limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description:
          "File size exceeds 10MB limit. Please upload a smaller file.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setUploadingFields((prev) => ({ ...prev, [fieldId]: true }));
    const uploadIndentId = indentIdsData?.indentId || stepData?.indentId;
    const uploadFmsId = indentIdsData?.fmsId || stepData?.fmsId;

    if (!uploadIndentId && !uploadFmsId) {
      toast({
        title: "Error",
        description: "Unable to determine upload context (indentId/fmsId).",
        variant: "destructive",
      });
      setUploadingFields((prev) => ({ ...prev, [fieldId]: false }));
      e.target.value = "";
      return;
    }

    const payload = new FormData();
    payload.append("file", file);
    if (uploadIndentId) {
      payload.append("type", String(FileUploadType.INDENT));
      payload.append("indentId", String(uploadIndentId));
    } else if (uploadFmsId) {
      payload.append("type", String(FileUploadType.FMS));
      payload.append("fmsId", String(uploadFmsId));
    }

    uploadFile.mutate(payload, {
      onSuccess: (res: any) => {
        // Response structure: { message: "File uploaded successfully", data: "https://..." }
        const imageUrl = res?.data;
        // Store the URL in formValues (for submission)
        setFormValues((prev) => ({
          ...prev,
          [fieldId]: imageUrl,
        }));
        // Store the original filename for display
        setFileNames((prev) => ({
          ...prev,
          [fieldId]: file.name,
        }));
        setUploadingFields((prev) => ({ ...prev, [fieldId]: false }));
        // Reset file input
        e.target.value = "";
      },
      onError: (err: any) => {
        toast({
          title: "Error",
          description:
            err?.message ||
            err?.response?.data?.message ||
            "Failed to upload file",
          variant: "destructive",
        });
        setUploadingFields((prev) => ({ ...prev, [fieldId]: false }));
        // Reset file input
        e.target.value = "";
      },
    });
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    if (!allRequiredFilled) {
      toast({
        title: "Required fields missing",
        description: "Please fill all required fields before submitting.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    if (isStepCompleted) {
      toast({
        title: "Error",
        description: "Step is already completed",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    // Convert formValues object to array of { id, value }
    const stepArray = Object.entries(formValues).map(([id, value]) => ({
      id: Number(id), // ensure numeric id if applicable
      value,
    }));

    const payload = {
      id: stepId, // or whatever matches your API key
      step: stepArray,
      status,
      comment: formComment,
      reasonForDelay: reasonforDeay,
    };
    updateIndent.mutate(payload, {
      onSuccess: () => {
        // Invalidate dashboard queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["Dashboard_Stats"] });
        queryClient.invalidateQueries({ queryKey: ["TASKS"] });
        queryClient.invalidateQueries({ queryKey: ["USER_STEP_LIST"] });
        queryClient.invalidateQueries({ queryKey: ["DRAFT_INDENT_TASKS"] });
        router.push(RoutesEnum.DASHBOARD);
        setIsSubmitting(false);
      },
      onError: (error: any) => console.error("Error updating field:", error),
      onSettled: () => {
        setIsSubmitting(false);
      },
    });
    // 🔹 Example: integrate with API later
    // useApiMutation(API_ENDPOINTS.FMS_STEP_UPDATE, payload)
  };
  // --- Skeleton Loader ---
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-60" />
        <Separator />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (canRead === false) {
    return <div className="p-4 sm:p-3 mt-4"><PermissionDeniedState /></div>;
  }

  // --- Empty State ---
  if (!stepData || !formFields.length) {
    return (
      <div className="flex justify-center items-center h-screen">
        <EmptyState
          onClick={() => router.push("/dashboard/workflow-templates")}
          buttonTitle="Go to Workflow List"
          title="No Steps Found"
          description="No steps or form fields available for this Workflow."
        />
      </div>
    );
  }

  const breadcrumbs = [
    { name: "", href: "/dashboard", icon: true },
    { name: "Step form", href: null },
  ];

  // --- Main UI ---
  return (
    <div className="p-4 sm:p-6 space-y-2 sm:space-y-4">
      {/* Breadcrumbs */}
      <DynamicBreadcrumb breadcrumbs={breadcrumbs} />

      {/* Header */}
      <div className="flex items-center justify-start">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          {stepName || "Workflow System"}
          <Badge variant={getBadgeVariant(stepStatus)}>
            {stepStatus ? stepStatus.replace(/([A-Z])/g, " $1") : "Unknown"}
          </Badge>
        </h1>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 text-sm text-muted-foreground">
        <div>
          <div>Created On</div>
          <div className="text-foreground font-medium">
            {createdAt ? new Date(createdAt).toLocaleString() : "—"}
          </div>
        </div>
        <div>
          <div>Updated On</div>
          <div className="text-foreground font-medium">
            {updatedAt ? new Date(updatedAt).toLocaleString() : "—"}
          </div>
        </div>
        <div>
          <div>Created By</div>
          <div className="text-foreground font-medium">
            {createdByName || "—"}
          </div>
        </div>
        <div>
          <div>Assigned Users</div>
          <div className="text-foreground font-medium">
            {stepData?.assignment
              ?.map((user: any) => user.fullname)
              .join(", ") || "—"}
          </div>
        </div>
        <div>
          <div>Schedule Start</div>
          <div className="text-foreground font-medium">
            {stepData?.scheduleStartDateTime
              ? new Date(stepData.scheduleStartDateTime).toLocaleString()
              : "—"}
          </div>
        </div>
        <div>
          <div>Schedule End</div>
          <div className="text-foreground font-medium">
            {stepData?.scheduleEndDateTime
              ? new Date(stepData.scheduleEndDateTime).toLocaleString()
              : "—"}
          </div>
        </div>
      </div>

      <Separator />
      {indentIdsData.length > 0 && (
        <div className="bg-gray-50 p-6 rounded-md">
          <div className="flex flex-col md:flex-row md:justify-between gap-6">
            <div className="md:w-1/3">
              <h2 className="text-lg font-semibold mb-1">Indent Details</h2>
              <p className="text-sm text-muted-foreground">
                These are the configured input fields required before workflow
                starts.
              </p>
            </div>
            <div className="w-full md:flex-1">
              <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {indentIdsData &&
                  indentIdsData?.map((item: any) => {
                    // Check if field has options
                    const hasOptions =
                      item.options &&
                      Array.isArray(item.options) &&
                      item.options.length > 0;

                    // Check if fieldValue is an array (checkbox type)
                    const isCheckboxType =
                      Array.isArray(item.fieldValue) && hasOptions;

                    let displayValue: any = "-";

                    if (isCheckboxType) {
                      // Show only selected options in a compact format
                      const selectedLabels = item.options
                        .filter((opt: any) =>
                          item.fieldValue.includes(opt.value.toString()),
                        )
                        .map((opt: any) => opt.label);

                      displayValue =
                        selectedLabels.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {item.options.map((option: any) => {
                              const isSelected = item.fieldValue.includes(
                                option.value.toString(),
                              );
                              if (!isSelected) return null; // Only show selected
                              return (
                                <div
                                  key={option.value}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200"
                                >
                                  <div className="w-2.5 h-2.5 rounded border border-blue-500 bg-blue-500 flex items-center justify-center flex-shrink-0">
                                    <svg
                                      className="w-1.5 h-1.5 text-white"
                                      fill="none"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="3"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <span className="text-xs font-medium text-blue-900">
                                    {option.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">
                            No selections
                          </span>
                        );
                    } else if (hasOptions && item.fieldValue) {
                      // Single select dropdown - find matching option and show label
                      const fieldValueStr = String(item.fieldValue);
                      const matchedOption = item.options.find(
                        (opt: any) => String(opt.value) === fieldValueStr,
                      );
                      displayValue = matchedOption
                        ? matchedOption.label
                        : item.fieldValue || "-";
                    } else {
                      // Regular field value display
                      displayValue = item.fieldValue || "-";
                    }
                    const normalizedValue =
                      typeof displayValue === "string"
                        ? displayValue
                        : (displayValue?.toString?.() ?? "");
                    const fieldName = item.fieldName || "";
                    const shouldShowTooltip = Boolean(
                      fieldName || (normalizedValue && normalizedValue !== "-"),
                    );
                    const tooltipContent = (
                      <div className="space-y-1">
                        {fieldName && (
                          <div>
                            <div className="text-xs text-white mt-0.5">
                              {fieldName}
                            </div>
                          </div>
                        )}
                        {normalizedValue && normalizedValue !== "-" && (
                          <div>
                            <div className="text-xs text-white mt-0.5">
                              {normalizedValue}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    const valueNode = (
                      <div
                        className={`$${isCheckboxType
                          ? ""
                          : "text-sm font-semibold text-gray-900 leading-snug line-clamp-2"
                          }`}
                      >
                        {displayValue}
                      </div>
                    );
                    const fieldNameNode = (
                      <span className="text-xs text-gray-500 font-medium capitalize line-clamp-1">
                        {fieldName}
                      </span>
                    );
                    const cardContent = (
                      <div className="flex flex-col gap-1.5 rounded-lg   bg-white px-3 py-2 shadow-sm min-h-[60px] border-l-4 border-primary">
                        {fieldNameNode}
                        {valueNode}
                      </div>
                    );
                    return shouldShowTooltip ? (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-xs break-words whitespace-pre-wrap text-left"
                        >
                          {tooltipContent}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div key={item.id}>{cardContent}</div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indent (Request) Form Fields */}
      <div className="bg-gray-50 p-6 rounded-md">
        <div className="flex flex-col md:flex-row md:justify-between gap-6">
          <div className="md:w-1/3">
            <h2 className="text-lg font-semibold mb-1">Request Step Fields</h2>
            <p className="text-sm text-muted-foreground">
              These are the configured input fields required before workflow
              starts.
            </p>
          </div>

          <div className="w-full md:flex-1">
            {formFields.map((field: any) => (
              <div key={field.id} className="flex flex-col gap-1.5 mt-4">
                {/* Label */}
                <label className="font-medium text-sm text-gray-700 capitalize">
                  {field.fieldName || "Unnamed Field"}{" "}
                  {field.required && <span className="text-red-500">*</span>}
                </label>

                {/* Text Input */}
                {field.fieldType?.toLowerCase() === "text" && (
                  <Input
                    type="text"
                    placeholder={field.fieldValue || "Enter text..."}
                    value={formValues[field.id] || ""}
                    onChange={(e) =>
                      handleInputChange(field.id.toString(), e.target.value)
                    }
                    disabled={isStepCompleted}
                  />
                )}

                {/* Number Input */}
                {field.fieldType?.toLowerCase() === "number" && (
                  <Input
                    type="number"
                    placeholder={field.fieldName || "Enter number..."}
                    value={formValues[field.id] || ""}
                    onChange={(e) =>
                      handleInputChange(field.id.toString(), e.target.value)
                    }
                    min={0}
                    disabled={isStepCompleted}
                  />
                )}

                {/* Textarea */}
                {field.fieldType?.toLowerCase() === "textarea" && (
                  <Textarea
                    placeholder={field.fieldValue || "Enter details..."}
                    value={formValues[field.id] || ""}
                    onChange={(e) =>
                      handleInputChange(field.id.toString(), e.target.value)
                    }
                    disabled={isStepCompleted}
                  />
                )}

                {/* Date */}
                {field.fieldType === "date" && (
                  <Input
                    type="date"
                    placeholder={field.fieldValue || "Select date"}
                    value={formValues[field.id] || ""}
                    max="9999-12-31"
                    onChange={(e) =>
                      handleInputChange(field.id.toString(), e.target.value)
                    }
                    disabled={isStepCompleted}
                  />
                )}

                {/* Time */}
                {field.fieldType === "time" && (
                  <Input
                    type="time"
                    placeholder={field.fieldValue || "Select time"}
                    value={formValues[field.id] || ""}
                    onChange={(e) =>
                      handleInputChange(field.id.toString(), e.target.value)
                    }
                    disabled={isStepCompleted}
                  />
                )}

                {/* DateTime */}
                {field.fieldType === "datetime" && (
                  <Input
                    type="datetime-local"
                    placeholder={field.fieldValue || "Select date & time"}
                    value={formValues[field.id] || ""}
                    max="9999-12-31T23:59"
                    onChange={(e) =>
                      handleInputChange(field.id.toString(), e.target.value)
                    }
                    disabled={isStepCompleted}
                  />
                )}

                {/* Select */}
                {field.fieldType === "select" && (
                  <Select
                    value={formValues[field.id] || ""}
                    onValueChange={(val) =>
                      handleInputChange(field.id.toString(), val)
                    }
                    disabled={isStepCompleted}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.length ? (
                        field.options.map((opt: any, idx: number) => (
                          <SelectItem key={idx} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-options" disabled>
                          No options
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}

                {/* Radio */}
                {field.fieldType === "radio" && (
                  <div className="space-y-2">
                    {field.options && field.options.length > 0 ? (
                      field.options.map((option: any, optIdx: number) => {
                        const optionValue = option.value.toString();
                        const currentValue =
                          formValues[field.id]?.toString() ||
                          field.fieldValue?.toString() ||
                          "";
                        const isSelected = optionValue === currentValue;

                        return (
                          <div
                            key={optIdx}
                            onClick={() =>
                              handleInputChange(
                                field.id.toString(),
                                optionValue,
                              )
                            }
                            className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${isSelected
                              ? "bg-blue-50 border-blue-300"
                              : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                              }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected
                                ? "border-blue-500"
                                : "border-gray-400"
                                }`}
                            >
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <span
                              className={`text-sm ${isSelected
                                ? "font-medium text-blue-900"
                                : "text-gray-700"
                                }`}
                            >
                              {option.label}
                            </span>
                            {isSelected && (
                              <span className="ml-auto text-xs text-blue-600 font-medium">
                                Selected
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        No options available
                      </p>
                    )}
                  </div>
                )}
                {/* Checkbox */}
                {field.fieldType === "checkbox" && (
                  <div className="space-y-2 flex flex-row flex-wrap gap-3 border border-gray-200 rounded-md p-2">
                    {field.options &&
                      field.options.length > 0 &&
                      field.options.map((option: any, optIdx: number) => {
                        const optionValue = option.value.toString();

                        // Unified value logic
                        const current =
                          formValues[field.id] !== undefined
                            ? formValues[field.id]
                            : field.fieldValue !== undefined
                              ? field.fieldValue
                              : [];
                        const checkedArray = Array.isArray(current)
                          ? current
                            .map(String)
                            .filter(
                              (val: string) =>
                                val !== "" && val.trim() !== "",
                            )
                          : typeof current === "string" &&
                            current !== "" &&
                            current.trim() !== ""
                            ? [current]
                            : [];
                        const isChecked = checkedArray.includes(optionValue);

                        return (
                          <div key={optIdx}>
                            <label className="flex items-center gap-2">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => {
                                  let newChecked: any = [...checkedArray];
                                  if (isChecked) {
                                    newChecked = newChecked.filter(
                                      (val: any) =>
                                        val !== optionValue &&
                                        val !== "" &&
                                        val.trim() !== "",
                                    );
                                  } else {
                                    if (
                                      optionValue &&
                                      optionValue.trim() !== ""
                                    ) {
                                      newChecked.push(optionValue);
                                    }
                                  }
                                  // Filter out empty strings before passing to handleInputChange
                                  newChecked = newChecked.filter(
                                    (val: any) =>
                                      val !== "" && val.trim() !== "",
                                  );
                                  handleInputChange(
                                    field.id.toString(),
                                    newChecked,
                                  );
                                }}
                                disabled={
                                  isStepCompleted
                                }
                              />
                              <span>{option.label}</span>
                            </label>
                          </div>
                        );
                      })}
                  </div>
                )}
                {field.fieldType === "file" && (
                  <div className="grid gap-1.5">
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
                      {uploadingFields[field.id] ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Uploading file...
                        </div>
                      ) : formValues[field.id] ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <File className="h-4 w-4 text-muted-foreground" />
                              <span
                                className="truncate text-sm text-foreground"
                                title={fileNames[field.id] || formValues[field.id]}
                              >
                                {fileNames[field.id] || "Uploaded file"}
                              </span>
                            </div>
                            {!isStepCompleted && (
                              <div className="flex items-center gap-1.5">
                                <label
                                  htmlFor={`file-field-${field.id}`}
                                  className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                                >
                                  Replace
                                </label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setFormValues((prev) => {
                                      const newValues = { ...prev };
                                      delete newValues[field.id];
                                      return newValues;
                                    });
                                    setFileNames((prev) => {
                                      const newNames = { ...prev };
                                      delete newNames[field.id];
                                      return newNames;
                                    });
                                  }}
                                  className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <Input
                            id={`file-field-${field.id}`}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            data-field-id={field.id}
                            onChange={(e) => handleFileChange(e, field.id)}
                            disabled={isStepCompleted}
                            className="hidden"
                          />
                        </div>
                      ) : (
                        <>
                          <label
                            htmlFor={`file-field-${field.id}`}
                            className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-border bg-background px-4 py-6 text-center hover:bg-muted/50"
                          >
                            <UploadCloud className="mb-2 h-5 w-5 text-primary" />
                            <span className="text-sm font-medium text-foreground">
                              Click to upload image
                            </span>
                            <span className="mt-1 text-xs text-muted-foreground">
                              JPG, PNG, GIF, WebP (max 10MB)
                            </span>
                          </label>
                          <Input
                            id={`file-field-${field.id}`}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            data-field-id={field.id}
                            onChange={(e) => handleFileChange(e, field.id)}
                            disabled={isStepCompleted}
                            className="hidden"
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Status Dropdown */}
            <div className="flex flex-col gap-1.5 mt-4 mb-4">
              <label className="font-medium text-sm text-gray-700">
                Update Status
              </label>
              <Select
                value={status || ""}
                onValueChange={setStatus}
                disabled={isStepCompleted}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(FMSSTATUSVALUE.PENDING)}>Pending</SelectItem>
                  <SelectItem value={String(FMSSTATUSVALUE.INPROGRESS)}>In Progress</SelectItem>
                  <SelectItem value={String(FMSSTATUSVALUE.COMPLETED)}>Completed</SelectItem>
                  <SelectItem value={String(FMSSTATUSVALUE.SCHEDULED)}>Scheduled</SelectItem>
                  <SelectItem value={String(FMSSTATUSVALUE.CANCELLED)}>Cancelled</SelectItem>
                  <SelectItem value={String(FMSSTATUSVALUE.NOTAPPLICABLE)}>Not Applicable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Reason for Delay */}
            {stepData?.scheduleEndDateTime &&
              new Date(stepData.scheduleEndDateTime) < new Date() && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-sm text-gray-700">
                    Reason for delay
                  </label>
                  <Textarea
                    placeholder="Reason for delay..."
                    value={reasonforDeay}
                    onChange={(e) => setReasonforDelay(e.target.value)}
                    disabled={isStepCompleted}
                  />
                </div>
              )}

            {/* Comment */}
            <div className="flex flex-col gap-1.5 mt-4">
              <label className="font-medium text-sm text-gray-700">
                Comment
              </label>
              <Textarea
                placeholder="Add a comment..."
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                disabled={isStepCompleted}
              />
            </div>

            {/* Submit Button */}
            {!isStepCompleted && (
              <div className="mt-4 w-75">
                <PermissionGuard moduleId={2} action="update">
                  <Button
                    onClick={handleSubmit}
                    className="w-1/2"
                    disabled={isSubmitting || !allRequiredFilled}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Updates"}
                  </Button>
                </PermissionGuard>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
