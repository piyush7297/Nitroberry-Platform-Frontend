"use client";

import { API_ENDPOINTS } from "@/api/endpoints";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useApiMutation,
  useApiMutationFormData,
  useApiQuery,
} from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_ENUM } from "@/lib/enums/routes.enum";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { File, Loader, UploadCloud, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";
import { Switch } from "@/components/ui/switch";
import { FileUploadType } from "@/lib/enums/file-upload-type.enum";

export default function FmsTemplatePage({
  params,
}: {
  params: Promise<{ name: string; id: string }>;
}) {
  const { name, id } = React.use(params);
  const { data: session }: any = useSession();
  const user = session?.user;
  const router = useRouter();
  const [numberError, setNumberError] = useState<any>({});

  const { create: canCreate } = useModulePermissions(1);

  const { data, isLoading, refetch } = useApiQuery(
    ["FmsTemplateDetails", id],
    `${API_ENDPOINTS.FMS_TEMPLATE}/${id}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!id && canCreate,
    } as const,
  );

  const template = data?.data;
  const resolvedFmsId =
    template?.fmsId ??
    template?.fms?.id ??
    template?.workflowTemplate?.fmsId ??
    template?.workflowTemplate?.fms?.id ??
    template?.id ??
    "";
  const indentFields = template?.workflowTemplate?.indent?.form || [];
  const [formValues, setFormValues] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(false);
  const [extraFields, setExtraFields] = useState({
    priority: "",
    locationId: "",
    comment: "",
    skipHolidays: true,
  });

  const createIndent = useApiMutation(
    HTTP_METHODS.POST,
    API_ENDPOINTS.FMS_INDENT,
  );

  const handleChange = (fieldId: string, value: any) => {
    setFormValues((prev: any) => ({
      ...prev,
      [fieldId]: value,
    }));
  };
  const handleExtraChange = (name: string, value: any) => {
    setExtraFields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!template?.id) return alert("Template ID missing");
    if (!resolvedFmsId) {
      toast({
        title: "FMS mapping missing",
        description: "Unable to submit indent because fmsId is missing for this template.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      id: template.id,
      indent: indentFields.map((field: any) => {
        let value = formValues[field.id];
        if (field.fieldType === "currentUser" || field.fieldType === "user") {
          value = user?.name;
        }
        if (value === undefined || value === null) {
          value = "";
        } else if (Array.isArray(value)) {
          value = value.map((v) => String(v));
        } else if (typeof value === "object") {
          value = "";
        } else if (typeof value === "boolean") {
          value = value ? "true" : "false";
        } else {
          value = String(value);
        }
        return {
          id: field.id,
          value,
        };
      }),
      priority: extraFields.priority,
      comment: extraFields.comment,
      locationId: extraFields.locationId,
      skipHolidays: extraFields.skipHolidays,
      fmsId: String(resolvedFmsId),
    };
    try {
      setLoading(true);
      createIndent.mutate(payload, {
        onSuccess: () => {
          setLoading(false);
          router.back();
        },
        onError: () => setLoading(false),
      });
    } catch {
      alert("Error submitting form");
      setLoading(false);
    }
  };
  const breadcrumbs = [
    { name: "", href: "/dashboard", icon: true },
    { name: "Workflow Templates", href: "/dashboard/workflow-templates" },
    { name: name, href: null },
  ];
  const uploadFile = useApiMutationFormData(
    HTTP_METHODS.POST,
    `${API_ENDPOINTS.COMMON_UPLOAD}`,
  );
  const [uploadingFields, setUploadingFields] = useState<
    Record<number, boolean>
  >({});
  const [fileNames, setFileNames] = useState<Record<number, string>>({});

  const handleRemoveImage = (fieldId: number) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: "",
    }));
    setFileNames((prev) => {
      const updated = { ...prev };
      delete updated[fieldId];
      return updated;
    });
    // Reset file input for this specific field
    const fileInput = document.querySelector(
      `input[type="file"][data-field-id="${fieldId}"]`,
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleFileChange = (e: any, fieldId: number) => {
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
      const fileInput = e.target;
      if (fileInput) fileInput.value = "";
      return;
    }

    setUploadingFields((prev) => ({ ...prev, [fieldId]: true }));
    if (!resolvedFmsId) {
      toast({
        title: "FMS mapping missing",
        description: "Cannot upload file before fmsId is available for this template.",
        variant: "destructive",
      });
      setUploadingFields((prev) => ({ ...prev, [fieldId]: false }));
      return;
    }

    const payload = new FormData();
    payload.append("file", file);
    // Submit-indent starts before an indentId exists, so uploads are FMS-scoped.
    payload.append("type", String(FileUploadType.FMS));
    payload.append("fmsId", String(resolvedFmsId));
    uploadFile.mutate(payload, {
      onSuccess: (res) => {
        // Handle response: { message: "File uploaded successfully", data: "https://..." }
        const imageUrl = res?.data?.data || res?.data || res?.url;
        if (imageUrl) {
          setFormValues((prev) => ({
            ...prev,
            [fieldId]: imageUrl,
          }));
          setFileNames((prev) => ({
            ...prev,
            [fieldId]: file.name,
          }));
          toast({
            title: "Success",
            description:
              res?.data?.message || `${file.name} uploaded successfully.`,
            variant: "default",
          });
        }
        setUploadingFields((prev) => ({ ...prev, [fieldId]: false }));
      },
      onError: (err) => {
        toast({
          title: "Error",
          description: err?.message || "Failed to upload file",
          variant: "destructive",
        });
        setUploadingFields((prev) => ({ ...prev, [fieldId]: false }));
      },
    });
  };
  const handleChangeNumber = (fieldId: any, value: any) => {
    const field = indentFields.find((f: any) => f.id === fieldId);
    if (field.regex) {
      const regex = new RegExp(field.regex);
      // Check if value matches regex
      if (!regex.test(value)) {
        setNumberError((prev: any) => ({
          ...prev,
          [fieldId]:
            "Invalid number. Please enter a number between " +
            field.minValue +
            " and " +
            field.maxValue,
        }));
      } else {
        setNumberError((prev: any) => ({ ...prev, [fieldId]: "" }));
      }
    }
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const { data: locationData } = useApiQuery(
    ["COMPANY_LOCATION_create_fms"],
    `${API_ENDPOINTS.COMPANY_LOCATION}?start=1&limit=1000`,
  );
  let locations = locationData?.data || [];

  if (canCreate === false) {
    return <div className="p-4 sm:p-3 mt-4"><PermissionDeniedState /></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <DynamicBreadcrumb breadcrumbs={breadcrumbs} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold capitalize">{name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {template?.description ||
              "Fill out the fields below to proceed with your request."}
          </p>
        </div>
      </div>

      <Separator />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
        <div>
          <div>Created On</div>
          <div className="text-foreground font-medium">
            {template?.createdAt
              ? new Date(template?.createdAt).toLocaleDateString()
              : "—"}
          </div>
        </div>
        <div>
          <div>Created By</div>
          <div className="text-foreground font-medium">
            {template?.createdByName || "—"}
          </div>
        </div>
      </div>

      {/* 🧾 Indent Form Section */}
      <div className="bg-gray-50 p-6 rounded-md shadow-sm">
        <div className="flex gap-5">
          <div className="w-1/2">
            <h2 className="text-lg font-semibold">Requested Form Fields</h2>
            <p className="text-sm text-muted-foreground">
              Please fill out the following fields to submit indent form.
            </p>
          </div>

          <div className="space-y-4 w-full">
            {isLoading ? (
              <p className="text-gray-500 text-sm">Loading form fields...</p>
            ) : indentFields.length > 0 ? (
              indentFields.map((field: any) => {
                const fieldType = field.fieldType.toLowerCase();
                const value = formValues[field.id] || "";
                return (
                  <div
                    key={field.id}
                    className="bg-white p-4 rounded-lg border space-y-2 shadow-sm"
                  >
                    <label className="block text-sm font-medium capitalize">
                      {field.fieldName}{" "}
                      {field.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>

                    {/* TEXT */}
                    {(fieldType === "text" || fieldType === "string") && (
                      <Input
                        type="text"
                        placeholder={`Enter ${field.fieldName}`}
                        value={value}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                      />
                    )}

                    {/* NUMBER */}
                    {fieldType === "number" && (
                      <React.Fragment>
                        <Input
                          type="number"
                          placeholder={`Enter ${field.fieldName}`}
                          value={value}
                          // onChange={(e) => handleChange(field.id, e.target.value)}
                          onChange={(e) =>
                            handleChangeNumber(field.id, e.target.value)
                          }
                          min={1}
                        />
                        <span className="text-red-500 text-xs">
                          {numberError[field.id]}
                        </span>
                      </React.Fragment>
                    )}

                    {/* DATE */}
                    {fieldType === "date" && (
                      <div className="relative">
                        <Input
                          type="date"
                          value={value}
                          max="9999-12-31"
                          onChange={(e) =>
                            handleChange(field.id, e.target.value)
                          }
                        />
                      </div>
                    )}

                    {/* TIME */}
                    {fieldType === "time" && (
                      <div className="relative">
                        <Input
                          type="time"
                          value={value}
                          onChange={(e) =>
                            handleChange(field.id, e.target.value)
                          }
                        />
                      </div>
                    )}

                    {/* DATETIME */}
                    {fieldType === "datetime" && (
                      <Input
                        type="datetime-local"
                        value={value}
                        max="9999-12-31T23:59"
                        onChange={(e) => handleChange(field.id, e.target.value)}
                      />
                    )}

                    {/* EMAIL */}
                    {fieldType === "email" && (
                      <Input
                        type="email"
                        placeholder={`Enter ${field.fieldName}`}
                        value={value}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                      />
                    )}

                    {/* TEXTAREA */}
                    {fieldType === "textarea" && (
                      <textarea
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring"
                        rows={4}
                        placeholder={`Enter ${field.fieldName}`}
                        value={value}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                      />
                    )}

                    {/* SELECT / DROPDOWN */}
                    {fieldType === "select" && (
                      <Select
                        value={value}
                        onValueChange={(v) => handleChange(field.id, v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((opt: any, idx: number) => (
                            <SelectItem key={idx} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* CHECKBOX (Multiple Selection) */}
                    {fieldType === "checkbox" && (
                      <div className="flex flex-col gap-2">
                        {field.options && field.options.length > 0 ? (
                          // Multiple options
                          field.options.map((opt: any, idx: number) => (
                            <label
                              key={idx}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="checkbox"
                                value={String(opt.value)}
                                checked={
                                  Array.isArray(value)
                                    ? value.includes(String(opt.value))
                                    : false
                                }
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const current = Array.isArray(value)
                                    ? value
                                    : [];
                                  const newValues = checked
                                    ? [...current, String(opt.value)]
                                    : current.filter(
                                      (v) => v !== String(opt.value),
                                    );
                                  handleChange(field.id, newValues);
                                }}
                                className="h-4 w-4 text-blue-600"
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))
                        ) : (
                          // Single checkbox (no options)
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={
                                Array.isArray(value)
                                  ? value.includes("true")
                                  : value === "true"
                              }
                              onChange={(e) =>
                                handleChange(
                                  field.id,
                                  e.target.checked ? ["true"] : [],
                                )
                              }
                              className="h-4 w-4 text-blue-600"
                            />
                            <span>{field.fieldName}</span>
                          </label>
                        )}
                      </div>
                    )}

                    {/* RADIO FIELD */}
                    {fieldType === "radio" && (
                      <div className="flex flex-col gap-2">
                        {field.options?.map((opt: any, idx: number) => (
                          <label key={idx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`radio-${field.id}`}
                              value={String(opt.value)} // always string
                              checked={String(value) === String(opt.value)}
                              onChange={() =>
                                handleChange(field.id, String(opt.value))
                              }
                              className="h-4 w-4 text-blue-600"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* FILE UPLOAD */}
                    {fieldType === "file" && (
                      <div className="grid gap-1.5">
                        <Label>Upload File</Label>
                        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
                          {uploadingFields[field.id] ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader className="h-4 w-4 animate-spin" />
                              Uploading file...
                            </div>
                          ) : formValues[field.id] && fileNames[field.id] ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <File className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate text-sm text-foreground">
                                    {fileNames[field.id]}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <label
                                    htmlFor={`file-field-${field.id}`}
                                    className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                                  >
                                    Replace
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(field.id)}
                                    className="rounded-md p-1 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                                    title="Remove file"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <Input
                                id={`file-field-${field.id}`}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                data-field-id={field.id}
                                onChange={(e) => handleFileChange(e, field.id)}
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
                                className="hidden"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CURRENT USER */}
                    {(fieldType === "currentuser" || fieldType === "user") && (
                      <div className="flex items-center gap-2">
                        <span>{user?.name}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-600 text-sm">
                No indent fields found in this template.
              </p>
            )}

            {indentFields.length > 0 && (
              <div className="space-y-4 bg-white p-4 rounded-lg border shadow-sm">
                {/* Priority */}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={extraFields.priority}
                      onValueChange={(v) => handleExtraChange("priority", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_ENUM).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Location
                    </label>
                    <Select
                      value={extraFields.locationId}
                      onValueChange={(v) => handleExtraChange("locationId", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location: any) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Comments
                  </label>
                  <Textarea
                    placeholder="Enter your comments or additional details"
                    value={extraFields.comment}
                    onChange={(e) =>
                      handleExtraChange("comment", e.target.value)
                    }
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label className="text-sm font-medium">Skip Holidays</Label>
                    <p className="text-xs text-muted-foreground">
                      Apply holiday skip logic for this workflow submission.
                    </p>
                  </div>
                  <Switch
                    checked={extraFields.skipHolidays}
                    onCheckedChange={(checked) =>
                      handleExtraChange("skipHolidays", checked)
                    }
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            {indentFields.length > 0 && (
              <div className="">
                <Button
                  onClick={handleSubmit}
                  className="w-full sm:w-auto"
                  disabled={
                    loading ||
                    Object.values(numberError).some(
                      (error: any) => error !== "",
                    )
                  }
                >
                  {loading ? "Submitting..." : "Submit Form"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
