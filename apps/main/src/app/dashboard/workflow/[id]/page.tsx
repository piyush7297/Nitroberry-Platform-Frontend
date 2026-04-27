"use client";

import { Separator } from "@/components/ui/separator";
import { useParams } from "next/navigation";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import { useApiQuery } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { PRIORITY_ENUM, RoutesEnum } from "@/lib/enums/routes.enum";
import { getBadgeVariant } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Eye, Info } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState, useMemo } from "react";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

const breadcrumbs = [
  { name: "", href: "/dashboard", icon: true },
  { name: "Workflow", href: RoutesEnum.Workflow },
  { name: "Workflow Detail", href: null },
];

const formatTimeline = (minutes: number) => {
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;

  const result: string[] = [];

  if (days > 0) result.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours > 0) result.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  if (mins > 0) result.push(`${mins} minute${mins > 1 ? "s" : ""}`);
  return result.join(" ");
};

const FMSDraftListDetailsPage = () => {
  const { id } = useParams();

  const { hasAccess: canRead } = useModulePermissions(1);

  const [selectedStep, setSelectedStep] = useState<any>(null);
  const { data: draftListDetailsData, isLoading } = useApiQuery(
    ["FmsIndentDraftListDetails", id],
    `fms/${id}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!id && canRead,
    } as const,
  );

  const draftListDetails = draftListDetailsData?.data || {};
  const fmsIndentData = draftListDetails?.fmsIndentData || {};
  const indentFields = fmsIndentData?.form || [];
  let stepsData = draftListDetails?.steps;
  stepsData =
    stepsData && stepsData.length > 0
      ? [...stepsData].sort((a, b) => a.sequence - b.sequence)
      : [];
  const { data: stepDetail, isLoading: stepLoading } = useApiQuery(
    ["SingleStepDetails", selectedStep],
    selectedStep ? `fms/step/${selectedStep}` : "",
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!selectedStep,
    },
  );

  const formattedTimeline = useMemo(() => {
    if (!stepDetail?.data?.stepData?.timelineInMinutes) return "—";
    return formatTimeline(stepDetail.data.stepData.timelineInMinutes);
  }, [stepDetail?.data?.stepData?.timelineInMinutes]);

  const handleStepClick = (step: any) => {
    setSelectedStep(step.id);
    const el = document.getElementById(step.id);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300); // delay so expansion animation finishes
    }
  };

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
        No data found for this workflow record.
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
            Workflow Detail
          </h1>
          <p className="text-sm text-gray-500">
            Priority:{" "}
            <Badge variant={getBadgeVariant(draftListDetails.priority)}>
              {PRIORITY_ENUM[draftListDetails.priority] || "Unknown"}
            </Badge>
          </p>
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
        <div>
          <div>Reference Code</div>
          <div className="text-foreground font-medium">
            {draftListDetails?.prefixCode || "—"}
          </div>
        </div>
      </div>

      <Separator />

      {/* Indent Form Fields */}
      <div className="bg-gray-50 p-6 rounded-md">
        <div className="flex flex-col md:flex-row md:justify-between gap-6">
          <div className="md:w-1/2">
            <h2 className="text-lg font-semibold mb-1">Request Form Fields</h2>
            <p className="text-sm text-muted-foreground">
              These are the configured input fields submitted for this workflow
              Indent.
            </p>
          </div>

          <div className="md:w-1/2 space-y-5">
            {indentFields?.length > 0 ? (
              indentFields?.map((field: any, idx: number) => {
                let displayValue: any = "—";

                switch (field.fieldType) {
                  case "select":
                  case "radio":
                    const selectedOption = field.options.find(
                      (o: any) =>
                        o.value.toString() === field.fieldValue?.toString(),
                    );
                    displayValue = selectedOption ? selectedOption.label : "—";
                    break;

                  case "checkbox":
                    if (Array.isArray(field.fieldValue)) {
                      const selectedLabels = field.options
                        .filter((o: any) =>
                          field.fieldValue.includes(o.value.toString()),
                        )
                        ?.map((o: any) => o.label)
                        ?.join(", ");
                      displayValue = selectedLabels || "—";
                    }
                    break;

                  case "file":
                    displayValue = field.fieldValue ? (
                      <a
                        href={field.fieldValue}
                        target="_blank"
                        className="text-blue-500 underline"
                      >
                        View File
                      </a>
                    ) : (
                      "—"
                    );
                    break;

                  default:
                    displayValue = field.fieldValue || "—";
                }

                return (
                  <div key={idx} className="flex flex-col">
                    <p className="text-gray-400 text-xs mb-1">
                      Field {idx + 1}
                    </p>
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      {field.fieldName}
                      {field.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </div>
                    <div className="text-gray-700 bg-white border rounded-md px-3 py-2 mt-1">
                      {displayValue}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-muted-foreground">
                No fields configured in this indent.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Step Details</h2>
          <p className="text-sm text-gray-600">
            Below is the list of workflow steps with their current status,
            sequence, and assigned users.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-3 ">
          {stepsData &&
            stepsData?.length > 0 &&
            stepsData?.map((step: any) => (
              <AccordionItem
                id={step.id}
                key={step.id}
                value={step.id}
                className="border border-gray-200 rounded-md bg-white px-4 "
              >
                <AccordionTrigger
                  className="flex justify-between items-center px-4 py-3 text-left hover:no-underline cursor-pointer"
                  onClick={() => handleStepClick(step)}
                >
                  <div className="flex flex-col w-full gap-3">
                    {/* Step name + status */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-medium text-gray-900 capitalize">
                          {step.name}
                        </span>
                        <Badge variant={getBadgeVariant(step.status?.name)}>
                          {step.status?.name}
                        </Badge>
                      </div>
                    </div>

                    {/* Step summary (label above, value below) */}
                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-700">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Step No.
                        </p>
                        <p className="mt-1 text-gray-900">{step.sequence}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Created
                        </p>
                        <p className="mt-1 text-gray-900">
                          {new Date(step.created).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Assigned Users
                        </p>
                        <p className="mt-1 text-gray-900">
                          {step.assignment && step.assignment.length > 0
                            ? step.assignment
                              .slice(0, 2)
                              ?.flatMap(
                                (assign: any) => assign.fullname || [],
                              )
                              ?.filter((name: string) => name)
                              ?.join(", ") || "—"
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="border-t border-gray-200 rounded-b-md pb-4 max-h-[36rem] overflow-y-auto custom-scrollbar">
                  {stepLoading && selectedStep === step.id ? (
                    <p className="text-sm text-muted-foreground px-4 py-2">
                      Loading...
                    </p>
                  ) : (
                    selectedStep === step.id &&
                    stepDetail?.data?.stepData && (
                      <div className="text-sm text-gray-800 px-4 py-3 space-y-6 border-gray-200 bg-gray-50 ">
                        {/* === Step Information === */}
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-1">
                            Step Information
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                Step Name
                              </p>
                              <p className="font-medium capitalize">
                                {stepDetail.data.stepData.stepName}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                Schedule Start
                              </p>
                              <p className="font-medium">
                                {stepDetail.data.stepData.scheduleStartDateTime
                                  ? new Date(
                                    stepDetail.data.stepData
                                      .scheduleStartDateTime,
                                  ).toLocaleString()
                                  : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                Status
                              </p>
                              <Badge
                                variant={getBadgeVariant(
                                  stepDetail.data.stepData.stepStatus?.name,
                                )}
                              >
                                {stepDetail.data.stepData.stepStatus?.name ||
                                  "-"}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                Timeline (min)
                              </p>
                              <p className="font-medium">{formattedTimeline}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                Schedule End
                              </p>
                              <p className="font-medium">
                                {stepDetail.data.stepData.scheduleEndDateTime
                                  ? new Date(
                                    stepDetail.data.stepData
                                      .scheduleEndDateTime,
                                  ).toLocaleString()
                                  : "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                Delay
                              </p>
                              <p className="font-medium">
                                {stepDetail.data.stepData.delay || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                Actual Start
                              </p>
                              <p className="font-medium">
                                {stepDetail.data.stepData.actualStartDateTime
                                  ? new Date(
                                    stepDetail.data.stepData
                                      .actualStartDateTime,
                                  ).toLocaleString()
                                  : "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                Actual End
                              </p>
                              <p className="font-medium">
                                {stepDetail.data.stepData.actualEndDateTime
                                  ? new Date(
                                    stepDetail.data.stepData
                                      .actualEndDateTime,
                                  ).toLocaleString()
                                  : "—"}
                              </p>
                            </div>
                            <div className="flex flex-col">
                              <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center justify-between">
                                Activation
                                {stepDetail.data.stepData.activationId?.fieldCondition && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="text-gray-400 hover:text-primary transition-colors focus:outline-none">
                                        <Info className="h-3.5 w-3.5" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent 
                                      className="w-80 p-0 shadow-xl border-0 overflow-hidden rounded-xl" 
                                      align="end" 
                                      sideOffset={10}
                                    >
                                      <div className="bg-primary px-4 py-3 text-white">
                                        <div className="flex items-center gap-2">
                                          <Eye className="h-4 w-4" />
                                          <h4 className="font-semibold text-sm">Activation Logic</h4>
                                        </div>
                                      </div>
                                      <div className="p-4 space-y-4 bg-white">
                                        <div className="space-y-3">
                                          <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Trigger Field</span>
                                            <span className="text-xs font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded border">
                                              {stepDetail.data.stepData.activationId.fieldName || "—"}
                                            </span>
                                          </div>
                                          
                                          <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Comparison</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-tighter">
                                              {stepDetail.data.stepData.activationId.fieldCondition}
                                            </span>
                                          </div>
                                          
                                          <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Required Value</span>
                                            <span className="text-xs font-semibold text-primary truncate max-w-[150px]">
                                              {String(stepDetail.data.stepData.activationId.fieldValue) || "—"}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        <div className="pt-3 border-t">
                                          <p className="text-[10px] text-gray-500 leading-relaxed italic">
                                            This step remains locked until the field above matches the specified condition.
                                          </p>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </p>
                              <p className="font-medium text-gray-900">
                                {stepDetail.data.stepData.activationId?.name}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                Reason for Delay
                              </p>
                              <p className="font-medium">
                                {stepDetail.data.stepData.reasonForDelay || "—"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* === Step form fields === */}
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-1">
                            Step Form Fields
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {stepDetail.data.stepData.form &&
                              stepDetail.data.stepData.form.length > 0 &&
                              stepDetail.data.stepData.form.map(
                                (field: any) => {
                                  // Check if fieldValue is an array and has options (checkbox type)
                                  const isCheckboxType =
                                    field.fieldType === "checkbox" &&
                                    Array.isArray(field.fieldValue) &&
                                    field.options &&
                                    field.options.length > 0;

                                  // Check if radio or select type
                                  const isRadioOrSelectType =
                                    (field.fieldType === "radio" ||
                                      field.fieldType === "select") &&
                                    field.options &&
                                    field.options.length > 0;

                                  let displayValue: any = "-";

                                  if (isCheckboxType) {
                                    // Show only selected options in a compact format
                                    displayValue =
                                      field.fieldValue.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                          {field.options &&
                                            field.options.length > 0 &&
                                            field.options.map((option: any) => {
                                              const isSelected =
                                                field.fieldValue.includes(
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
                                        <span className="text-xs text-gray-500 italic mt-1">
                                          No selections
                                        </span>
                                      );
                                  } else if (isRadioOrSelectType) {
                                    // Show all radio options with selected one highlighted
                                    if (field.fieldType === "radio") {
                                      displayValue =
                                        field.options &&
                                          field.options.length > 0 ? (
                                          <div className="space-y-2 mt-1">
                                            {field.options &&
                                              field.options.length > 0 &&
                                              field.options.map(
                                                (
                                                  option: any,
                                                  optIdx: number,
                                                ) => {
                                                  const isSelected =
                                                    option.value.toString() ===
                                                    field.fieldValue?.toString();
                                                  return (
                                                    <div
                                                      key={optIdx}
                                                      className={`flex items-center gap-2 px-2 py-1 rounded-md border ${isSelected
                                                          ? "bg-blue-50 border-blue-300"
                                                          : "bg-gray-50 border-gray-200"
                                                        }`}
                                                    >
                                                      <div
                                                        className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected
                                                            ? "border-blue-500"
                                                            : "border-gray-400"
                                                          }`}
                                                      >
                                                        {isSelected && (
                                                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        )}
                                                      </div>
                                                      <span
                                                        className={`text-xs ${isSelected
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
                                                },
                                              )}
                                            {!field.fieldValue && (
                                              <p className="text-xs text-gray-500 italic">
                                                No option selected
                                              </p>
                                            )}
                                          </div>
                                        ) : (
                                          "-"
                                        );
                                    } else {
                                      // Select type - show selected option label
                                      const selectedOption = field.options.find(
                                        (o: any) =>
                                          o.value.toString() ===
                                          field.fieldValue?.toString(),
                                      );
                                      displayValue = selectedOption
                                        ? selectedOption.label
                                        : "-";
                                    }
                                  } else {
                                    // Regular field value display
                                    displayValue = field.fieldValue || "-";
                                  }

                                  return (
                                    <div
                                      key={field.id}
                                      className={`border rounded-lg bg-white shadow-sm p-3 hover:shadow-md transition ${isCheckboxType ||
                                          (isRadioOrSelectType &&
                                            field.fieldType === "radio")
                                          ? "min-h-[100px]"
                                          : ""
                                        }`}
                                    >
                                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                                        {field.fieldName} ({field.fieldType})
                                      </p>
                                      <div
                                        className={`${isCheckboxType || (isRadioOrSelectType && field.fieldType === "radio") ? "" : "font-medium mt-1"}`}
                                      >
                                        {displayValue}
                                      </div>
                                    </div>
                                  );
                                },
                              )}
                          </div>
                        </div>

                        {/* === Indent Details === */}
                        {stepDetail.data.stepData.indentIdsData &&
                          stepDetail.data.stepData.indentIdsData.length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-1">
                                Indent Details
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {stepDetail.data.stepData.indentIdsData &&
                                  stepDetail.data.stepData.indentIdsData
                                    .length > 0 &&
                                  stepDetail.data.stepData.indentIdsData.map(
                                    (indent: any) => {
                                      // Check if fieldValue is an array and has options (checkbox type)
                                      const isCheckboxType =
                                        Array.isArray(indent.fieldValue) &&
                                        indent.options &&
                                        indent.options.length > 0;

                                      let displayValue: any = "-";

                                      if (isCheckboxType) {
                                        // Show only selected options in a compact format
                                        displayValue =
                                          indent.fieldValue.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                              {indent.options &&
                                                indent.options.length > 0 &&
                                                indent.options.map(
                                                  (option: any) => {
                                                    const isSelected =
                                                      indent.fieldValue.includes(
                                                        option.value.toString(),
                                                      );
                                                    if (!isSelected)
                                                      return null; // Only show selected
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
                                                  },
                                                )}
                                            </div>
                                          ) : (
                                            <span className="text-xs text-gray-500 italic mt-1">
                                              No selections
                                            </span>
                                          );
                                      } else {
                                        // Regular field value display
                                        displayValue = indent.fieldValue || "-";
                                      }

                                      return (
                                        <div
                                          key={indent.id}
                                          className={`border rounded-lg bg-white shadow-sm p-3 hover:shadow-md transition ${isCheckboxType ? "min-h-[80px]" : ""
                                            }`}
                                        >
                                          <p className="text-xs text-gray-500 uppercase tracking-wide">
                                            {indent.fieldName}
                                          </p>
                                          <div
                                            className={`${isCheckboxType ? "" : "font-medium mt-1"}`}
                                          >
                                            {displayValue}
                                          </div>
                                        </div>
                                      );
                                    },
                                  )}
                              </div>
                            </div>
                          )}

                        {/* === Escalation === */}
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-1">
                            Escalation
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                Escalation Type
                              </p>
                              <p className="font-medium">
                                {(stepDetail.data.stepData &&
                                  stepDetail.data.stepData.activationId &&
                                  stepDetail.data.stepData.activationId.name) ||
                                  "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">
                                Frequency (min)
                              </p>
                              <p className="font-medium">
                                {(stepDetail.data.stepData &&
                                  stepDetail.data.stepData.escalation &&
                                  stepDetail.data.stepData.escalation
                                    .frequencyInMinutes) ||
                                  0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      </div>
    </div>
  );
};

export default FMSDraftListDetailsPage;
