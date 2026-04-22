"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { publicApiCall } from "@/api/publicApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircle, File, FileQuestion, Loader, UploadCloud, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { PRIORITY_ENUM } from "@/lib/enums/routes.enum";
import { useApiMutationFormData } from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import { FileUploadType } from "@/lib/enums/file-upload-type.enum";

interface IndentData {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  priority?: string;
  createdAt?: string;
  updatedAt?: string;
  form?: any[];
  [key: string]: any;
}

const FmsIndentTokenPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  // Support both path parameter and query parameter
  const token = (params?.token as string) || searchParams?.get("token") || "";
  const [indentData, setIndentData] = useState<IndentData | null>(null);
  const [formValues, setFormValues] = useState<Record<number, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numberError, setNumberError] = useState<any>({});
  const [extraFields, setExtraFields] = useState({
    priority: "",
    locationId: "",
    comment: "",
  });
  const [uploadingFields, setUploadingFields] = useState<
    Record<number, boolean>
  >({});
  const [fileNames, setFileNames] = useState<Record<number, string>>({});

  // Extract indent fields from data
  const indentFields = indentData?.indent || [];

  useEffect(() => {
    const fetchIndentData = async () => {
      if (!token) {
        setError("No token provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await publicApiCall<any>(
          "get",
          `${API_ENDPOINTS.FMS_INDENT_BY_TOKEN}/${token}`,
        );
        setIndentData(response?.data || response);
      } catch (err: any) {
        // Extract error message from various possible formats
        const errorMessage =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          err?.error?.message ||
          err?.error ||
          "Failed to load indent data";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIndentData();
  }, [token]);

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
    if (!indentData?.id) {
      toast({
        title: "Error",
        description: "Template ID missing",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      id: indentData.id,
      indent: indentFields.map((field: any) => {
        let value = formValues[field.id];
        if (field.fieldType === "currentUser" || field.fieldType === "user") {
          value = ""; // Public route - no user session
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
      fmsId: indentData?.fmsId || "",
    };

    try {
      setLoading(true);
      await publicApiCall(
        "post",
        `${API_ENDPOINTS.PUBLIC_FMS_INDENT}`,
        payload,
      );
      toast({
        title: "Success",
        description: "Indent form submitted successfully",
      });
      setLoading(false);
      // Reset form
      setFormValues({});
      setExtraFields({ priority: "", locationId: "", comment: "" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to submit form",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const uploadFile = useApiMutationFormData(
    HTTP_METHODS.POST,
    `${API_ENDPOINTS.COMMON_UPLOAD}`,
  );

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
    const payload = new FormData();
    payload.append("file", file);
    payload.append("type", String(FileUploadType.INDENT));
    if (indentData?.id) {
      payload.append("indentId", String(indentData.id));
    }
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
            description: res?.data?.message || "File uploaded successfully",
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
    const field = indentData?.indent?.find((f: any) => f.id === fieldId);
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

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    // Format error message: replace underscores with spaces and capitalize
    const formatErrorMessage = (msg: string) => {
      return msg
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();
    };

    const formattedError = formatErrorMessage(error);

    return (
      <div className="min-h-screen px-4 py-10 sm:px-8 flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-red-100 p-4">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-xl font-semibold text-gray-900">
                  {formattedError}
                </CardTitle>
                <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                  Please verify the link or contact support if you need
                  assistance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!indentData) {
    return (
      <div className="min-h-screen px-4 py-10 sm:px-8 flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-gray-100 p-4">
                <FileQuestion className="h-10 w-10 text-gray-600" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-xl font-semibold text-gray-900">
                  No Data Found
                </CardTitle>
                <p className="text-sm text-gray-600 leading-relaxed max-w-sm">
                  No indent data found for this token. Please verify the link or
                  contact support if the issue persists.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-8">
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold capitalize">
              {indentData?.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {indentData?.description ||
                "Fill out the fields below to proceed with your request."}
            </p>
          </div>
        </div>

        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
          <div>
            <div>Created By</div>
            <div className="text-foreground font-medium">
              {indentData?.createdByName || "—"}
            </div>
          </div>
          <div>
            <div>Created On</div>
            <div className="text-foreground font-medium">
              {indentData?.createdAt
                ? new Date(indentData?.createdAt).toLocaleDateString()
                : "—"}
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
              ) : indentData?.indent?.length > 0 ? (
                indentData?.indent?.map((field: any) => {
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
                          onChange={(e) =>
                            handleChange(field.id, e.target.value)
                          }
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
                          onChange={(e) =>
                            handleChange(field.id, e.target.value)
                          }
                        />
                      )}

                      {/* EMAIL */}
                      {fieldType === "email" && (
                        <Input
                          type="email"
                          placeholder={`Enter ${field.fieldName}`}
                          value={value}
                          onChange={(e) =>
                            handleChange(field.id, e.target.value)
                          }
                        />
                      )}

                      {/* TEXTAREA */}
                      {fieldType === "textarea" && (
                        <textarea
                          className="w-full p-2 border rounded-md focus:outline-none focus:ring"
                          rows={4}
                          placeholder={`Enter ${field.fieldName}`}
                          value={value}
                          onChange={(e) =>
                            handleChange(field.id, e.target.value)
                          }
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
                            <label
                              key={idx}
                              className="flex items-center gap-2"
                            >
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
                      {(fieldType === "currentuser" ||
                        fieldType === "user") && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              placeholder="Enter your name"
                              value={value}
                              onChange={(e) =>
                                handleChange(field.id, e.target.value)
                              }
                            />
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

                    {/* Location - Optional for public route */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Location
                      </label>
                      <Input
                        type="text"
                        placeholder="Enter location (optional)"
                        value={extraFields.locationId}
                        onChange={(e) =>
                          handleExtraChange("locationId", e.target.value)
                        }
                      />
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
                </div>
              )}

              {/* Submit Button */}
              {indentData?.indent?.length > 0 && (
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
    </div>
  );
};

export default FmsIndentTokenPage;
