"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Eye,
  File,
  GripVertical,
  Loader,
  Plus,
  X,
  Info,
  Pencil,
  Search,
  Users,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// drag-n-drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { toast } from "@/hooks/use-toast";
import { UserSearch } from "@/components/user-search";

function SortableFieldItem({
  id,
  field,
  index,
  onRemove,
  onEdit,
}: {
  id: string;
  field: any;
  index: number;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 px-2 text-xs font-bold text-blue-700">
                {field.sequence}
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-900 text-sm">
                  {field.fieldName}
                </div>
                <div className="text-xs text-slate-500">
                  {field.fieldType} {field.required ? "• Required" : "• Optional"}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={onEdit}
                title="Edit Field"
                className="h-8 w-8 p-0 hover:bg-blue-50"
              >
                <Pencil className="h-4 w-4 text-blue-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onRemove}
                title="Delete Field"
                className="h-8 w-8 p-0 hover:bg-red-50"
              >
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FormBuilder({
  formData,
  updateForm,
  nextStep,
  prevStep,
  buttonText,
  loading,
  isEdit = false,
}: {
  formData: any;
  updateForm: (field: string, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
  buttonText?: string;
  loading?: boolean;
  isEdit?: boolean;
}) {
  const indentForm = formData?.workflowTemplate?.indent?.form || [];

  const [newInitiator, setNewInitiator] = useState<any>({
    id: null,
    userId: [],
  });

  const [verifierType, setVerifierType] = useState<"user" | "group">("user");
  const [groupOptionsType, setGroupOptionsType] = useState<"user" | "group">(
    "user",
  );
  const [showInitiatorDropdown, setShowInitiatorDropdown] = useState(false);
  const [showVerifierDropdown, setShowVerifierDropdown] = useState(false);
  const [initiatorInputFocused, setInitiatorInputFocused] = useState(false);
  const [verifierInputFocused, setVerifierInputFocused] = useState(false);
  const [editFieldIndex, setEditFieldIndex] = useState<number | null>(null);
  const [newField, setNewField] = useState<any>({
    sequence: indentForm.length + 1,
    fieldName: "",
    fieldType: "",
    required: false,
    fieldValue: "",
    description: "",
    options: [],
  });
  const [initiatorSearch, setInitiatorSearch] = useState<string>("");
  const [verifierSearch, setVerifierSearch] = useState<string>("");
  const [showFormPreview, setShowFormPreview] = useState(false);

  const { data: grouplist } = useApiQuery(
    ["Groups", 1, 1000],
    `${API_ENDPOINTS.GROUPS}?start=1&limit=1000&sortBy=name&sortOrder=asc`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );
  let groups = grouplist?.data?.groupUsers || [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAddField = () => {
    if (!newField.fieldName?.trim()) return;
    let regex = null;
    if (
      newField.fieldType === "number" &&
      newField.minValue &&
      newField.maxValue
    ) {
      if (newField.minValue >= newField.maxValue) {
        toast({
          title: "Error!",
          description: "Minimum value must be less than maximum value.",
          variant: "destructive",
        });
        return;
      } else {
        const min = Number(newField.minValue);
        const max = Number(newField.maxValue);
        if (!isNaN(min) && !isNaN(max) && min <= max) {
          regex = `^(?:${Array.from(
            { length: max - min + 1 },
            (_, i) => i + min,
          ).join("|")})$`;
        } else {
          regex = "";
        }
      }
    }
    const fieldWithRegex = regex ? { ...newField, regex } : newField;
    const needsOptions = ["select", "checkbox", "radio"].includes(
      newField.fieldType,
    );
    if (needsOptions && (!newField.options || newField.options.length === 0)) {
      alert("Please add at least one option for this field type.");
      return;
    }
    if (editFieldIndex !== null) {
      const updatedForm = indentForm.map((item: any, i: number) =>
        i === editFieldIndex
          ? {
            ...item,
            // ...newField,
            ...fieldWithRegex,
            id: item.id,
            sequence: i + 1,
          }
          : item,
      );
      updateForm("workflowTemplate", {
        ...(formData.workflowTemplate || {}),
        indent: {
          ...(formData.workflowTemplate.indent || {}),
          form: updatedForm,
        },
      });
      setEditFieldIndex(null);
      setNewField({
        id: updatedForm.length + 1,
        sequence: updatedForm.length + 1,
        fieldName: "",
        fieldType: "text",
        required: false,
        fieldValue: "",
        description: "",
        options: [],
        tempOptionLabel: "",
        tempOptionValue: "",
      });
    } else {
      const newFieldEntry = {
        // ...newField,
        ...fieldWithRegex,
        id: indentForm.length + 1,
        sequence: indentForm.length + 1,
      };
      const updatedForm = [...indentForm, newFieldEntry];

      updateForm("workflowTemplate", {
        ...(formData.workflowTemplate || {}),
        indent: {
          ...(formData.workflowTemplate?.indent || {}),
          form: updatedForm,
        },
      });

      setNewField({
        id: updatedForm.length + 1,
        sequence: updatedForm.length + 1,
        fieldName: "",
        fieldType: "text",
        required: false,
        fieldValue: "",
        description: "",
        options: [],
        tempOptionLabel: "",
        tempOptionValue: "",
      });
    }
  };

  const handleRemoveField = (index: number) => {
    const updatedForm = indentForm
      .filter((_: any, i: any) => i !== index)
      .map((item: any, i: any) => ({ ...item, sequence: i + 1 }));
    updateForm("workflowTemplate", {
      ...(formData.workflowTemplate || {}),
      indent: {
        ...(formData.workflowTemplate.indent || {}),
        form: updatedForm,
      },
    });
  };

  const handleEditField = (index: number) => {
    const field = indentForm[index];
    setEditFieldIndex(index);
    setNewField({
      ...newField,
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      required: field.required,
      fieldValue: field.fieldValue,
      description: field.description,
      options: field.options,
      minValue: field.minValue,
      maxValue: field.maxValue,
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = indentForm.findIndex((f: any) => f.id === active.id);
    const newIndex = indentForm.findIndex((f: any) => f.id === over.id);
    const reordered = arrayMove(indentForm, oldIndex, newIndex).map(
      (item: any, i) => ({ ...item, sequence: i + 1 }),
    );

    updateForm("workflowTemplate", {
      ...(formData.workflowTemplate || {}),
      indent: {
        ...(formData.workflowTemplate.indent || {}),
        form: reordered,
      },
    });
  };
  const { data: locationData } = useApiQuery(
    ["COMPANY_LOCATION_create_fms"],
    `${API_ENDPOINTS.COMPANY_LOCATION}?start=1&limit=1000`,
  );
  let locations = locationData?.data || [];

  const renderPreviewFieldControl = (field: any, keyPrefix: string) => {
    const fieldType = (field?.fieldType || "text").toLowerCase();
    const options = Array.isArray(field?.options) ? field.options : [];
    const rawValue = field?.fieldValue;
    const stringValue = rawValue === null || rawValue === undefined ? "" : String(rawValue);
    const multiValues = Array.isArray(rawValue)
      ? rawValue.map((v: any) => String(v))
      : typeof rawValue === "string" && rawValue.includes(",")
        ? rawValue
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
        : stringValue
          ? [stringValue]
          : [];

    if (["text", "email", "number", "date", "time"].includes(fieldType)) {
      return (
        <Input
          type={fieldType === "number" ? "number" : fieldType}
          placeholder={`Enter ${field?.fieldName || "value"}`}
          value={stringValue}
          readOnly
        />
      );
    }

    if (fieldType === "datetime") {
      return <Input type="datetime-local" value={stringValue} readOnly />;
    }

    if (fieldType === "textarea") {
      return (
        <textarea
          placeholder={`Enter ${field?.fieldName || "value"}`}
          value={stringValue}
          readOnly
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
        />
      );
    }

    if (fieldType === "select") {
      return (
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
          defaultValue={stringValue || ""}
        >
          <option value="">Select an option</option>
          {options.map((opt: any, idx: number) => (
            <option key={`${keyPrefix}-opt-${idx}`} value={String(opt?.value ?? idx)}>
              {opt?.label ?? String(opt?.value ?? `Option ${idx + 1}`)}
            </option>
          ))}
        </select>
      );
    }

    if (fieldType === "radio") {
      return (
        <div className="space-y-2">
          {options.map((opt: any, idx: number) => (
            <label key={`${keyPrefix}-radio-${idx}`} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name={`${keyPrefix}-radio-group`}
                defaultChecked={stringValue === String(opt?.value ?? idx)}
              />
              <span>{opt?.label ?? String(opt?.value ?? `Option ${idx + 1}`)}</span>
            </label>
          ))}
        </div>
      );
    }

    if (fieldType === "checkbox") {
      return (
        <div className="space-y-2">
          {options.map((opt: any, idx: number) => (
            <label key={`${keyPrefix}-check-${idx}`} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                defaultChecked={multiValues.includes(String(opt?.value ?? idx))}
              />
              <span>{opt?.label ?? String(opt?.value ?? `Option ${idx + 1}`)}</span>
            </label>
          ))}
        </div>
      );
    }

    if (fieldType === "file") {
      return (
        <Input
          value={stringValue}
          placeholder="No file selected"
          readOnly
        />
      );
    }

    if (fieldType === "currentuser" || fieldType === "group") {
      return (
        <Input
          value={multiValues.length > 0 ? multiValues.join(", ") : stringValue}
          placeholder={`Select ${fieldType === "group" ? "group" : "user"}`}
          readOnly
        />
      );
    }

    return <Input value={stringValue} placeholder="Enter value" readOnly />;
  };

  return (
    <div className="space-y-8 pb-36">
      <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
        <div className="md:col-span-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Add Indent Form Field</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Add form fields that will be used in the indent workflow.
                  These fields can be dragged to reorder and are required for
                  creating indents.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Define the indent fields with clear ordering and validation.
          </p>
        </div>

        <div className="md:col-span-7 space-y-6">
          {/* Single Add Form */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label>
                  Field Name<span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Enter field name"
                  value={newField.fieldName}
                  onChange={(e) =>
                    setNewField({ ...newField, fieldName: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Field Type</Label>
                <Select
                  value={newField.fieldType}
                  onValueChange={(val) =>
                    setNewField({ ...newField, fieldType: val })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="datetime">DateTime</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="textarea">Textarea</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                    <SelectItem value="radio">Radio</SelectItem>
                    <SelectItem value="file">File Upload</SelectItem>
                    <SelectItem value="currentUser">Current User</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {["select", "checkbox", "radio"].includes(newField.fieldType) && (
                <div className="col-span-2">
                  <Label className="mb-2 block">Add Options</Label>
                  <div className="flex flex-col gap-3 mt-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Option Label"
                        value={newField.tempOptionLabel || ""}
                        onChange={(e) => {
                          let label = e.target.value;
                          if (label.length > 0) {
                            label =
                              label.charAt(0).toUpperCase() + label.slice(1);
                          }
                          setNewField((prev: any) => {
                            const wasAutoValue =
                              !prev.tempOptionValue ||
                              prev.tempOptionValue ===
                              (newField.options?.length || 0) + 1;

                            return {
                              ...prev,
                              tempOptionLabel: label,
                              tempOptionValue: wasAutoValue
                                ? (newField.options?.length || 0) + 1
                                : prev.tempOptionValue,
                            };
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault(); // prevent form submit or line break
                            if (newField.tempOptionLabel?.trim()) {
                              const newOption = {
                                label: newField.tempOptionLabel.trim(),
                                value: (newField.options?.length || 0) + 1,
                              };

                              setNewField((prev: any) => ({
                                ...prev,
                                options: [...(prev.options || []), newOption],
                                tempOptionLabel: "",
                                tempOptionValue: "",
                              }));
                            }
                          }
                        }}
                      />

                      {/* <Input
                        placeholder="Option Value"
                        value={newField.tempOptionValue || ""}
                        onChange={(e) =>
                          setNewField({ ...newField, tempOptionValue: e.target.value })
                        }
                      /> */}
                      <Button
                        variant="secondary"
                        className="h-auto"
                        onClick={() => {
                          if (!newField.tempOptionLabel?.trim()) return;
                          const label = newField.tempOptionLabel.trim();
                          // const value =
                          //   newField.tempOptionValue?.trim() ||
                          //   label.toLowerCase().replace(/\s+/g, "_");
                          setNewField({
                            ...newField,
                            options: [
                              ...(newField.options || []),
                              {
                                label,
                                value: (newField.options?.length || 0) + 1,
                              },
                            ],
                            tempOptionLabel: "",
                            tempOptionValue: "",
                          });
                        }}
                      >
                        <Plus className="w-5 h-4 text-primary" />
                        Add
                      </Button>
                    </div>

                    {newField.options?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {newField.options.map((opt: any, idx: any) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 border border-cyan-200 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600" />
                            <span>{opt.label}</span>
                            <span className="text-slate-400 text-xs ml-1">
                              #{opt.value}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = newField.options.filter(
                                  (_: any, i: any) => i !== idx,
                                );
                                setNewField({ ...newField, options: updated });
                              }}
                              className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {["number"].includes(newField?.fieldType) && (
              <div className="grid md:grid-cols-2 gap-6 mt-4">
                <div className="grid gap-2">
                  <Label>Minimum Value</Label>
                  <Input
                    placeholder="Enter Minimum Value"
                    type="number"
                    min={0}
                    onChange={(e) =>
                      setNewField({ ...newField, minValue: e.target.value })
                    }
                    value={newField.minValue ?? ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Maximum Value</Label>
                  <Input
                    placeholder="Enter Maximum Value"
                    type="number"
                    min={0}
                    onChange={(e) =>
                      setNewField({ ...newField, maxValue: e.target.value })
                    }
                    value={newField.maxValue ?? ""}
                  />
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600"
                  checked={newField.required}
                  onChange={(e) =>
                    setNewField({ ...newField, required: e.target.checked })
                  }
                />
                <div className="flex flex-col gap-1">
                  <Label className="cursor-pointer">Field is Required</Label>
                  <span className="text-sm text-slate-500">
                    Users must fill this field before submitting.
                  </span>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full sm:min-w-[190px] sm:w-auto"
                onClick={handleAddField}
              >
                <Plus className="w-5 h-4 text-primary" />
                {editFieldIndex !== null ? "Update Field" : "Add Field to Indent"}
              </Button>
            </div>
          </div>

          {/* Drag + List */}
          {indentForm.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">
                  {indentForm.length} Form Field{indentForm.length !== 1 ? 's' : ''} Added
                </h3>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={indentForm.map((f: any) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid gap-3">
                    {indentForm.map((field: any, index: number) => (
                      <SortableFieldItem
                        key={field.id}
                        id={field.id}
                        field={field}
                        index={index}
                        onRemove={() => handleRemoveField(index)}
                        onEdit={() => handleEditField(index)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </div>

      {/* Reference ID Prefix */}
      {!isEdit && (
        <>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
            <div className="md:col-span-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Reference ID Prefix </h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Add a prefix to the reference ID for the indent. This will
                      be used to generate the reference ID for the indent.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="md:col-span-7 space-y-4">
              <div className="space-y-2">
                <Label>
                  Reference ID Prefix<span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Enter Reference ID Prefix"
                  minLength={2}
                  maxLength={5}
                  // onChange={(e) => {
                  //   const filteredValue = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 5);
                  //   updateForm("workflowTemplate", { ...(formData.workflowTemplate || {}), indent: { ...(formData.workflowTemplate.indent || {}), referenceIdPrefix: filteredValue } });
                  // }}
                  // value={formData?.workflowTemplate?.indent?.referenceIdPrefix ?? ""}
                  value={formData.templeteCode}
                  onChange={(e) => {
                    const filteredValue = e.target.value
                      .replace(/[^A-Za-z]/g, "")
                      .toUpperCase()
                      .slice(0, 5);
                    updateForm("templeteCode", filteredValue);
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Location Selection */}
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
        <div className="md:col-span-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Add Location</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Select the location where the indent will be created.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="md:col-span-7 space-y-4">
          <div className="space-y-2">
            <Label>Select Location</Label>
            <Select
              value={formData?.workflowTemplate?.indent?.locationId ?? ""}
              onValueChange={(val) => {
                updateForm("workflowTemplate", {
                  ...(formData.workflowTemplate || {}),
                  indent: {
                    ...(formData.workflowTemplate.indent || {}),
                    locationId: val,
                  },
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Location" />
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
      </div>

      <Separator />
      {/* Assignment */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
        {/* Label */}
        <div className="md:col-span-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Add Initiators</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Select users or groups who can initiate indents using this
                  form. Initiators are the ones who will create and submit new
                  indent requests.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-7 space-y-4">
          <div className="space-y-2">
            {/* Multi-select dropdown */}
            <Label>Select Initiator(s)</Label>
            <Select
              value={groupOptionsType}
              onValueChange={(val) =>
                setGroupOptionsType(val as "user" | "group")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="group">Group</SelectItem>
              </SelectContent>
            </Select>
            {(() => {
              const initiatorsData =
                formData?.workflowTemplate?.indent?.initiators || {};
              const initiators = {
                groupIds: initiatorsData.groupIds || [],
                userIds: initiatorsData.userIds || [],
                userfullnames: initiatorsData.userfullnames || [],
                groupfullnames: initiatorsData.groupfullnames || [],
              };

              if (groupOptionsType === "user") {
                return (
                  <UserSearch
                    marginTop="-mt-3"
                    isFocused={initiatorInputFocused}
                    setIsFocused={setInitiatorInputFocused}
                    showDropdown={showInitiatorDropdown}
                    setShowDropdown={setShowInitiatorDropdown}
                    onChange={(e) => setInitiatorSearch(e.target.value)}
                    onFocus={() => setInitiatorInputFocused(true)}
                    onBlur={() => setInitiatorInputFocused(false)}
                    search={initiatorSearch}
                    selectedUserIds={initiators.userIds || []}
                    setSearch={setInitiatorSearch}
                    onSelect={(u: any) => {
                      const currentData = initiators;
                      const fullname = `${u.firstName} ${u.lastName}`;
                      updateForm("workflowTemplate", {
                        ...(formData.workflowTemplate || {}),
                        indent: {
                          ...(formData.workflowTemplate.indent || {}),
                          initiators: {
                            ...currentData,
                            userIds: [...(currentData.userIds || []), u.id],
                            userfullnames: [
                              ...(currentData.userfullnames || []),
                              fullname,
                            ],
                          },
                        },
                      });
                    }}
                  />
                );
              } else {
                return (
                  <Select
                    value=""
                    onValueChange={(val) => {
                      const currentData = initiators;
                      if (currentData.groupIds?.includes(val)) return;
                      const group = groups.find((g: any) => g.id === val);
                      const groupname = group ? group.groups : "";

                      updateForm("workflowTemplate", {
                        ...(formData.workflowTemplate || {}),
                        indent: {
                          ...(formData.workflowTemplate.indent || {}),
                          initiators: {
                            ...currentData,
                            groupIds: [...(currentData.groupIds || []), val],
                            groupfullnames: [
                              ...(currentData.groupfullnames || []),
                              groupname,
                            ],
                          },
                        },
                      });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select groups" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g: any) => (
                        <SelectItem
                          key={g.id}
                          value={g.id}
                          disabled={Boolean(
                            initiators.groupIds?.includes?.(g.id),
                          )}
                        >
                          {g.groups}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }
            })()}
            <div className="flex flex-wrap gap-2 mt-2">
              {(() => {
                const currentData = formData?.workflowTemplate?.indent
                  ?.initiators || {
                  groupIds: [],
                  userIds: [],
                  userfullnames: [],
                  groupfullnames: [],
                };
                const userIds = currentData.userIds || [];
                const groupIds = currentData.groupIds || [];
                const userfullnames = currentData.userfullnames || [];
                const groupfullnames = currentData.groupfullnames || [];

                if (userIds.length === 0 && groupIds.length === 0) {
                  return (
                    <p className="text-xs text-gray-400">
                      No initiator selected yet.
                    </p>
                  );
                }

                const handleRemoveUser = (uid: string, index: number) => {
                  updateForm("workflowTemplate", {
                    ...(formData.workflowTemplate || {}),
                    indent: {
                      ...(formData.workflowTemplate.indent || {}),
                      initiators: {
                        ...currentData,
                        userIds:
                          currentData.userIds?.filter(
                            (id: string) => id !== uid,
                          ) || [],
                        userfullnames: userfullnames.filter(
                          (_: any, i: number) => i !== index,
                        ),
                      },
                    },
                  });
                };

                const handleRemoveGroup = (gid: string, index: number) => {
                  updateForm("workflowTemplate", {
                    ...(formData.workflowTemplate || {}),
                    indent: {
                      ...(formData.workflowTemplate.indent || {}),
                      initiators: {
                        ...currentData,
                        groupIds:
                          currentData.groupIds?.filter(
                            (id: string) => id !== gid,
                          ) || [],
                        groupfullnames: groupfullnames.filter(
                          (_: any, i: number) => i !== index,
                        ),
                      },
                    },
                  });
                };

                return (
                  <>
                    {userIds.map((uid: string, index: number) => {
                      // const user = initiatorUsers.find((u: any) => u.id === uid);
                      const fullname = userfullnames[index] || null;
                      return (
                        <span
                          key={uid}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-full text-sm font-medium border border-indigo-200 text-slate-700 hover:border-indigo-300 transition-colors"
                        >
                          <Users className="h-3.5 w-3.5 text-indigo-600" />
                          {fullname || "Unknown"}
                          <button
                            onClick={() => handleRemoveUser(uid, index)}
                            className="text-gray-400 hover:text-red-500 ml-1 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                    {groupIds.map((gid: string, index: number) => {
                      const group = groups.find((g: any) => g.id === gid);
                      const groupname =
                        groupfullnames[index] || (group ? group.groups : null);
                      return (
                        <span
                          key={gid}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-full text-sm font-medium border border-emerald-200 text-slate-700 hover:border-emerald-300 transition-colors"
                        >
                          <Users className="h-3.5 w-3.5 text-emerald-600" />
                          {groupname || "Unknown"}
                          <button
                            onClick={() => handleRemoveGroup(gid, index)}
                            className="text-gray-400 hover:text-red-500 ml-1 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </>
                );
              })()}
            </div>
            {/* Group Options Section */}
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
        {/* Label */}
        <div className="md:col-span-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Verifier</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Select users or groups who will verify and approve indents
                  created using this form. Verifiers review and validate indent
                  requests before they are processed.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-7 space-y-4">
          <div className="space-y-2">
            {/* Add Verifier Section */}
            <Label>Select Verifier</Label>
            <Select
              value={verifierType}
              onValueChange={(val) => setVerifierType(val as "user" | "group")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="group">Group</SelectItem>
              </SelectContent>
            </Select>
            {(() => {
              const verifiersData =
                formData?.workflowTemplate?.indent?.verifiers || {};
              const verifiers = {
                groupIds: verifiersData.groupIds || [],
                userIds: verifiersData.userIds || [],
                userfullnames: verifiersData.userfullnames || [],
                groupfullnames: verifiersData.groupfullnames || [],
              };

              if (verifierType === "user") {
                return (
                  <UserSearch
                    marginTop="-mt-3"
                    isFocused={verifierInputFocused}
                    setIsFocused={setVerifierInputFocused}
                    showDropdown={showVerifierDropdown}
                    setShowDropdown={setShowVerifierDropdown}
                    onChange={(e) => setVerifierSearch(e.target.value)}
                    onFocus={() => setVerifierInputFocused(true)}
                    onBlur={() => setVerifierInputFocused(false)}
                    search={verifierSearch}
                    selectedUserIds={verifiers.userIds || []}
                    setSearch={setVerifierSearch}
                    onSelect={(u: any) => {
                      const currentData = verifiers;
                      const fullname = `${u.firstName} ${u.lastName}`;
                      updateForm("workflowTemplate", {
                        ...(formData.workflowTemplate || {}),
                        indent: {
                          ...(formData.workflowTemplate.indent || {}),
                          verifiers: {
                            ...currentData,
                            userIds: [...(currentData.userIds || []), u.id],
                            userfullnames: [
                              ...(currentData.userfullnames || []),
                              fullname,
                            ],
                          },
                        },
                      });
                    }}
                  />
                );
              } else {
                return (
                  <Select
                    value=""
                    onValueChange={(val) => {
                      const currentData = verifiers;
                      if (currentData.groupIds?.includes(val)) return;
                      const group = groups.find((g: any) => g.id === val);
                      const groupname = group ? group.groups : "";

                      updateForm("workflowTemplate", {
                        ...(formData.workflowTemplate || {}),
                        indent: {
                          ...(formData.workflowTemplate.indent || {}),
                          verifiers: {
                            ...currentData,
                            groupIds: [...(currentData.groupIds || []), val],
                            groupfullnames: [
                              ...(currentData.groupfullnames || []),
                              groupname,
                            ],
                          },
                        },
                      });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select groups" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g: any) => (
                        <SelectItem
                          key={g.id}
                          value={g.id}
                          disabled={Boolean(
                            verifiers.groupIds?.includes?.(g.id),
                          )}
                        >
                          {g.groups}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }
            })()}
            <div className="flex flex-wrap gap-2 mt-2">
              {(() => {
                const currentData = formData?.workflowTemplate?.indent
                  ?.verifiers || {
                  groupIds: [],
                  userIds: [],
                  userfullnames: [],
                  groupfullnames: [],
                };
                const userIds = currentData.userIds || [];
                const groupIds = currentData.groupIds || [];
                const userfullnames = currentData.userfullnames || [];
                const groupfullnames = currentData.groupfullnames || [];

                if (userIds.length === 0 && groupIds.length === 0) {
                  return (
                    <p className="text-xs text-gray-400">
                      No verifier selected yet.
                    </p>
                  );
                }

                const handleRemoveUser = (uid: string, index: number) => {
                  updateForm("workflowTemplate", {
                    ...(formData.workflowTemplate || {}),
                    indent: {
                      ...(formData.workflowTemplate.indent || {}),
                      verifiers: {
                        ...currentData,
                        userIds:
                          currentData.userIds?.filter(
                            (id: string) => id !== uid,
                          ) || [],
                        userfullnames: userfullnames.filter(
                          (_: any, i: number) => i !== index,
                        ),
                      },
                    },
                  });
                };

                const handleRemoveGroup = (gid: string, index: number) => {
                  updateForm("workflowTemplate", {
                    ...(formData.workflowTemplate || {}),
                    indent: {
                      ...(formData.workflowTemplate.indent || {}),
                      verifiers: {
                        ...currentData,
                        groupIds:
                          currentData.groupIds?.filter(
                            (id: string) => id !== gid,
                          ) || [],
                        groupfullnames: groupfullnames.filter(
                          (_: any, i: number) => i !== index,
                        ),
                      },
                    },
                  });
                };

                return (
                  <>
                    {userIds.map((uid: string, index: number) => {
                      // const user = verifierUsers.find((u: any) => u.id === uid);
                      const fullname = userfullnames[index] || null;
                      return (
                        <span
                          key={uid}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-50 to-pink-50 rounded-full text-sm font-medium border border-rose-200 text-slate-700 hover:border-rose-300 transition-colors"
                        >
                          <Users className="h-3.5 w-3.5 text-rose-600" />
                          {fullname || "Unknown"}
                          <button
                            onClick={() => handleRemoveUser(uid, index)}
                            className="text-gray-400 hover:text-red-500 ml-1 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                    {groupIds.map((gid: string, index: number) => {
                      const group = groups.find((g: any) => g.id === gid);
                      const groupname =
                        groupfullnames[index] || (group ? group.groups : null);
                      return (
                        <span
                          key={gid}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-full text-sm font-medium border border-amber-200 text-slate-700 hover:border-amber-300 transition-colors"
                        >
                          <Users className="h-3.5 w-3.5 text-amber-600" />
                          {groupname || "Unknown"}
                          <button
                            onClick={() => handleRemoveGroup(gid, index)}
                            className="text-gray-400 hover:text-red-500 ml-1 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
      <Separator />

      {/* Navigation - Fixed Footer */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white shadow-[0_-10px_30px_rgba(15,23,42,0.08)] md:left-64">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6 md:pr-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Review your setup and continue.</span>
            <span className="sm:hidden">Continue setup.</span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={prevStep}>
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFormPreview(true)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Preview Form</span>
              <span className="sm:hidden">Preview</span>
            </Button>
            <Button
              onClick={nextStep}
              disabled={
                indentForm?.length === 0 || formData?.templeteCode?.length < 2
              }
              className="min-w-[200px]"
            >
              {loading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <File className="h-4 w-4" />
              )}
              {buttonText || "Publish"}
            </Button>
          </div>
        </div>
      </div>

      {/* Form Preview Drawer */}
      {showFormPreview && (
        <Sheet open={showFormPreview} onOpenChange={setShowFormPreview}>
          <SheetContent side="right" className="w-full p-0 sm:max-w-2xl">
            <SheetHeader>
              <SheetTitle>Indent Form Preview</SheetTitle>
              <SheetDescription>
                Preview of how the indent form will appear with all configured fields
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
              {/* Form Overview */}
              <div className="grid gap-3">
                <h3 className="font-semibold text-slate-900">Form Overview</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Reference Prefix</span>
                    <p className="font-medium mt-1 font-mono text-lg text-purple-600">{formData?.templeteCode || 'Not set'}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-700 mb-1">
                      <FileText className="h-4 w-4" />
                      <span className="text-slate-500">Total Fields</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{indentForm.length}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Form Fields Preview */}
              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-slate-900">Form Fields</h3>
                </div>
                {indentForm && indentForm.length > 0 ? (
                  <div className="space-y-4">
                    {indentForm.map((field: any) => (
                      <div
                        key={field.id}
                        className="rounded-lg border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-slate-900 text-sm">
                                {field.fieldName}
                              </div>
                              {field.required && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                                  Required
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-2 text-xs font-bold text-slate-700">
                            {field.sequence}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1.5">
                          <p className="flex items-center gap-1.5">
                            <span className="font-medium min-w-12">Type:</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full capitalize font-medium text-slate-700">
                              {field.fieldType}
                            </span>
                          </p>
                          {field.fieldType === 'number' && (
                            <>
                              {field.minValue && <p><span className="font-medium">Min:</span> {field.minValue}</p>}
                              {field.maxValue && <p><span className="font-medium">Max:</span> {field.maxValue}</p>}
                            </>
                          )}
                          {['select', 'checkbox', 'radio'].includes(field.fieldType) && field.options && field.options.length > 0 && (
                            <div>
                              <p className="font-medium mb-1.5">Options:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {field.options.map((opt: any, idx: number) => (
                                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-slate-700">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {opt.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-3">
                          {renderPreviewFieldControl(field, `form-preview-${field.id}`)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No form fields added yet</p>
                )}
              </div>
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={() => setShowFormPreview(false)}>
                Close
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
