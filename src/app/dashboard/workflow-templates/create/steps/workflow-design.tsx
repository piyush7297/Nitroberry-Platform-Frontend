"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Eye,
  File,
  GripVertical,
  Loader,
  Pencil,
  Plus,
  Trash2,
  X,
  Info,
  Clock,
  Users,
  FileText,
} from "lucide-react";
import { API_ENDPOINTS } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApi";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { STEPACTIVATION } from "@/lib/enums/routes.enum";
import { FieldActivationCondition, FieldActivationText } from "@/lib/utils";
import { UserSearch } from "@/components/user-search";
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

const getEmptyStepState = () => ({
  tempId: Date.now(),
  stepName: "",
  timeLine: "",
  timelineInMinutes: 0,
  activationId: { id: null, name: "", delayInMinutes: 0 },
  escalation: {
    notifyInDelay: 0,
    escalationType: { id: null, name: "" },
    userIds: [],
    fullnames: [],
    frequencyInMinutes: 0,
  },
  assignment: [{ id: null, userId: [], fullname: [] }],
  stepStatus: { id: null, name: "" },
  form: [],
  actualStartDateTime: "",
  actualEndDateTime: "",
  scheduleStartDateTime: "",
  scheduleEndDateTime: "",
  comment: "",
  indentIds: [],
});

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
      className="flex justify-between items-center border rounded-lg px-3 py-2 bg-white shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-400"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="font-medium">{field.fieldName}</span>
          <span className="text-xs text-gray-500">{field.fieldName}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400">Seq: {field.sequence}</span>
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <X className="w-4 h-4 text-red-500" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="w-4 h-4 text-primary" />
        </Button>
      </div>
    </div>
  );
}

function SortableStepItem({ step, onEdit, index, onDelete, onPreview }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: step.tempId });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const formCount = step?.form?.length || 0;
  const assignedCount = step?.assignment?.reduce(
    (total: number, assignmentItem: any) =>
      total + (assignmentItem?.userId?.length || 0),
    0,
  );
  const assignedNames = (step?.assignment || [])
    .flatMap((assignmentItem: any) => assignmentItem?.fullname || [])
    .filter(Boolean);
  const timelineValue = step?.timelineInMinutes ? `${step.timelineInMinutes} min` : "Not set";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 px-2 text-xs font-bold text-purple-700">
                {step.sequence}
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-900 text-sm">
                  {step.stepName}
                </div>
                <div className="text-xs text-slate-500">Step {step.sequence}</div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                <FileText className="h-3.5 w-3.5" />
                {formCount}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                <Clock className="h-3.5 w-3.5" />
                {timelineValue}
              </span>

              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onPreview(step)}
                  title="Preview Step"
                  className="h-7 w-7 p-0 hover:bg-white"
                >
                  <Eye className="h-3.5 w-3.5 text-slate-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(step)}
                  title="Edit Step"
                  className="h-7 w-7 p-0 hover:bg-white"
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(step.tempId)}
                  title="Delete Step"
                  className="h-7 w-7 p-0 hover:bg-white"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const activationOptions = [
  { value: 1, label: "Immediately after form submission" },
  { value: 2, label: "After specific step completes" },
  { value: 3, label: "After specific time delay" },
  { value: 4, label: "When specific condition matches" },
  { value: 5, label: "When specific indent condition matches" },
];
export default function WorkflowDesign({
  formData,
  setFormData,
  prevStep,
  finish,
  loading,
  buttonText,
}: {
  formData: any;
  setFormData: (updater: any) => void;
  prevStep: () => void;
  finish: () => void;
  loading?: boolean;
  buttonText?: string;
}) {
  const [currentStep, setCurrentStep] = useState<any>({
    ...getEmptyStepState(),
    activationId: {},
    escalation: {
      notifyInDelay: 0,
      escalationType: {},
      userIds: [],
      fullnames: [],
      frequencyInMinutes: 0,
    },
  });
  const [showNoChangeConfirm, setShowNoChangeConfirm] = useState(false);

  const [editFieldId, setEditFieldId] = useState<number | null>(null);
  // Assignment section states
  const [assignmentUserSearch, setAssignmentUserSearch] = useState<string>("");
  const [showAssignmentUserDropdown, setShowAssignmentUserDropdown] =
    useState(false);
  // CurrentUser field states
  const [currentUserSearch, setCurrentUserSearch] = useState<string>("");
  const [showCurrentUserDropdown, setShowCurrentUserDropdown] = useState(false);
  // Escalation section states
  const [escalationUserSearch, setEscalationUserSearch] = useState<string>("");
  const [showEscalationUserDropdown, setShowEscalationUserDropdown] =
    useState(false);
  const [showUnsavedStepConfirm, setShowUnsavedStepConfirm] = useState(false);

  // Preview modal states
  const [previewStepModal, setPreviewStepModal] = useState<any>(null);
  const [showWorkflowPreview, setShowWorkflowPreview] = useState(false);
  const [activeWorkflowPreviewStepId, setActiveWorkflowPreviewStepId] =
    useState<number | null>(null);

  const resetCurrentStep = () => {
    setCurrentStep(getEmptyStepState());
  };

  const normalizeStepForCompare = (step: any) => ({
    stepName: step?.stepName ?? "",
    timeLine: step?.timeLine ?? "",
    timelineInMinutes: step?.timelineInMinutes ?? 0,
    assignment: step?.assignment ?? [],
    escalation: step?.escalation ?? {},
    stepStatus: step?.stepStatus ?? {},
    activationId: step?.activationId ?? {},
    indentIds: step?.indentIds ?? [],
    form: (step?.form || []).map((f: any) => ({
      required: !!f?.required,
      fieldName: f?.fieldName || "",
      fieldType: f?.fieldType || "",
      fieldValue: f?.fieldValue ?? "",
      description: f?.description ?? "",
      options: f?.options || [],
      regex: f?.regex || null,
    })),
  });

  const hasPendingStepDraft = () => {
    const hasDraftContent =
      Boolean(currentStep?.stepName?.trim()) ||
      (currentStep?.form?.length || 0) > 0 ||
      (currentStep?.timelineInMinutes || 0) > 0 ||
      (currentStep?.assignment || []).some(
        (a: any) => (a?.userId?.length || 0) > 0,
      );

    if (!hasDraftContent) {
      return false;
    }

    const existingStep = (formData?.workflowTemplate?.steps || []).find(
      (s: any) => s.tempId === currentStep?.tempId,
    );

    if (!existingStep) {
      return true;
    }

    const currentComparable = normalizeStepForCompare(currentStep);
    const existingComparable = normalizeStepForCompare(existingStep);

    return JSON.stringify(currentComparable) !== JSON.stringify(existingComparable);
  };

  const handleFinishWithGuard = () => {
    if (hasPendingStepDraft()) {
      setShowUnsavedStepConfirm(true);
      return;
    }

    finish();
  };

  const addWorkflowRule = () => {
    if (
      !currentStep.stepName ||
      currentStep.form.length === 0 ||
      currentStep.assignment.some((a: any) => a.userId.length === 0) ||
      currentStep.timelineInMinutes === 0 ||
      currentStep.activationId === null
    ) {
      toast({
        title: "Error!",
        description: "All fields are required!",
        variant: "destructive",
      });
      return;
    }

    const existingStep = (formData?.workflowTemplate?.steps || []).find(
      (s: any) => s.tempId === currentStep.tempId,
    );

    if (existingStep) {
      const currentComparable = normalizeStepForCompare(currentStep);
      const existingComparable = normalizeStepForCompare(existingStep);

      if (JSON.stringify(currentComparable) === JSON.stringify(existingComparable)) {
        setShowNoChangeConfirm(true);
        return;
      }
    }

    setFormData((prev: any) => {
      const prevSteps = prev?.workflowTemplate?.steps || [];
      const updatedSteps = [...prevSteps];
      const existingIndex = updatedSteps.findIndex(
        (s: any) => s.tempId === currentStep.tempId,
      );

      const stepId =
        existingIndex !== -1
          ? updatedSteps[existingIndex].stepId
          : updatedSteps.length + 1;

      const assignment = (currentStep.assignment || []).map(
        (a: any, idx: number) => ({
          id: a.id ?? idx + 1,
          userId: Array.isArray(a.userId)
            ? a.userId
            : a.userId
              ? [a.userId]
              : [],
          fullname: a.fullname || [],
        }),
      );

      const form = (currentStep.form || []).map((f: any, i: number) => ({
        id: f.id || Date.now() + i,
        required: !!f.required,
        sequence: i + 1,
        fieldName: f.fieldName || "",
        fieldType: f.fieldType || "Text",
        fieldValue: f.fieldValue ?? "",
        description: f.description ?? "",
        options: f.options || [],
        ...(f.regex ? { regex: f.regex } : {}),
      }));

      const escalation = {
        notifyInDelay: currentStep.escalation?.notifyInDelay ?? 0,
        escalationType: {
          id: currentStep.escalation?.escalationType?.id ?? 1,
          name: currentStep.escalation?.escalationType?.name ?? "",
        },
        userIds: currentStep.escalation?.userIds ?? [],
        fullnames: currentStep.escalation?.fullnames ?? [],
        frequencyInMinutes: currentStep.escalation?.frequencyInMinutes ?? 0,
      };

      const stepStatus = {
        id: currentStep.stepStatus?.id ?? 0,
        name: currentStep.stepStatus?.name ?? "",
      };

      const activationId = {
        id: currentStep.activationId?.id,
        name: currentStep.activationId?.name ?? "",
        delayInMinutes: currentStep.activationId?.delayInMinutes ?? 0,
        triggerStepId: currentStep.activationId?.triggerStepId ?? null,
        fieldId: currentStep.activationId?.fieldId ?? null,
        fieldType: currentStep.activationId?.fieldType ?? null,
        fieldValue: currentStep.activationId?.fieldValue ?? null,
        fullnames: currentStep.activationId?.fullnames ?? [],
        fieldCondition: currentStep.activationId?.fieldCondition ?? null,
        triggerIndentId: currentStep.activationId?.triggerIndentId ?? null,
      };

      const stepPayload = {
        form,
        stepId,
        sequence: stepId,
        stepName: currentStep.stepName || "",
        timeLine: currentStep.timeLine ?? "",
        assignment,
        escalation,
        stepStatus,
        activationId,
        actualEndDateTime: currentStep.actualEndDateTime ?? "",
        actualStartDateTime: currentStep.actualStartDateTime ?? "",
        timelineInMinutes: currentStep.timelineInMinutes ?? 0,
        scheduleEndDateTime: currentStep.scheduleEndDateTime ?? "",
        scheduleStartDateTime: currentStep.scheduleStartDateTime ?? "",
        comment: currentStep.comment ?? "",
        tempId: currentStep.tempId || Date.now(),
        indentIds: currentStep.indentIds || [],
      };

      if (existingIndex !== -1) updatedSteps[existingIndex] = stepPayload;
      else updatedSteps.push(stepPayload);

      const resequenced = updatedSteps.map((s: any, idx: number) => ({
        ...s,
        sequence: idx + 1,
        stepId: s.stepId ?? idx + 1,
      }));

      return {
        ...prev,
        workflowTemplate: {
          ...prev.workflowTemplate,
          steps: resequenced,
        },
      };
    });

    resetCurrentStep();
  };

  const editStep = (step: any) => {
    const totalFrequencyMinutes = step.escalation?.frequencyInMinutes || 0;
    const totalTimelineMinutes = step.timelineInMinutes || 0;

    const freqWeeks = Math.floor(totalFrequencyMinutes / (7 * 24 * 60));
    const freqR1 = totalFrequencyMinutes % (7 * 24 * 60);

    const freqDays = Math.floor(freqR1 / (24 * 60));
    const freqR2 = freqR1 % (24 * 60);

    const freqHours = Math.floor(freqR2 / 60);
    const freqMinutes = freqR2 % 60;

    const timelineWeeks = Math.floor(totalTimelineMinutes / (7 * 24 * 60));
    const t1 = totalTimelineMinutes % (7 * 24 * 60);

    const timelineDays = Math.floor(t1 / (24 * 60));
    const t2 = t1 % (24 * 60);

    const timelineHours = Math.floor(t2 / 60);
    const timelineSettMinutes = t2 % 60;

    const updatedStep = {
      ...step,
      tempWeeks: freqWeeks,
      tempDays: freqDays,
      tempHours: freqHours,
      tempMinutes: freqMinutes,

      timelineWeeks,
      timelineDays,
      timelineHours,
      timelineSettMinutes,
    };
    setCurrentStep(updatedStep);
  };

  const deleteStep = (tempId: number) =>
    setFormData((prev: any) => ({
      ...prev,
      workflowTemplate: {
        ...prev.workflowTemplate,
        steps: (prev.workflowTemplate?.steps || []).filter(
          (s: any) => s.tempId !== tempId,
        ),
      },
    }));

  const updateFormField = (key: string, value: any) => {
    setCurrentStep((prev: any) => ({
      ...prev,
      tempField: { ...prev.tempField, [key]: value },
    }));
  };

  const addFormField = () => {
    const field = currentStep.tempField || {};

    if (!field.fieldName?.trim()) {
      toast({
        title: "Error!",
        description: "Field name is required!",
        variant: "destructive",
      });
      return;
    }

    if (["select", "checkbox", "radio"].includes(field.fieldType)) {
      if (!field.options || field.options.length === 0) {
        toast({
          title: "Missing options",
          description: `Please add at least one option for ${field.fieldType} field.`,
          variant: "destructive",
        });
        return;
      }
    }
    let regex = "";
    if (field.fieldType === "number" && field.minValue && field.maxValue) {
      const min = Number(field.minValue);
      const max = Number(field.maxValue);
      if (min >= max) {
        toast({
          title: "Error!",
          description: "Minimum value must be less than maximum value.",
          variant: "destructive",
        });
        return;
      } else {
        const min = Number(field.minValue);
        const max = Number(field.maxValue);
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

    const normalizedField = {
      fieldName: field.fieldName.trim(),
      fieldType: field.fieldType || "text",
      fieldValue: field.fieldValue || "",
      description: field.description?.trim() || "",
      required: !!field.required,
      options: field.options || [],
      minValue: field.minValue || null,
      maxValue: field.maxValue || null,
      regex: regex,
    };

    if (editFieldId !== null) {
      setCurrentStep((prev: any) => ({
        ...prev,
        form: (prev.form || []).map((f: any, index: number) =>
          f.id === editFieldId
            ? { ...f, ...normalizedField, id: f.id, sequence: index + 1 }
            : { ...f, sequence: index + 1 },
        ),
        tempField: {},
      }));
      setEditFieldId(null);
      toast({
        title: "Field updated!",
        description: `${field.fieldName} has been updated.`,
        variant: "default",
      });
      return;
    }

    setCurrentStep((prev: any) => {
      const nextSequence = (prev.form?.length || 0) + 1;
      const newField = {
        ...normalizedField,
        id: field.id || Date.now(),
        sequence: nextSequence,
      };
      return {
        ...prev,
        form: [...(prev.form || []), newField],
        tempField: {},
      };
    });

    toast({
      title: "Field added!",
      description: `${field.fieldName} added to this step.`,
      variant: "default",
    });
  };

  const removeFormField = (id: number) => {
    const updated = (currentStep.form || [])
      .filter((f: any) => f.id !== id)
      .map((f: any, idx: number) => ({ ...f, sequence: idx + 1 }));

    setCurrentStep({ ...currentStep, form: updated });
  };
  const editFormField = (id: number) => {
    setEditFieldId(id);
    const field = currentStep.form.find((f: any) => f.id === id);
    setCurrentStep({ ...currentStep, tempField: field });
  };
  const step = currentStep;

  // const handleFieldChange = (key: string, value: any) => {
  //   setCurrentStep((prev: any) => ({ ...prev, [key]: value }));
  //   setFormData((prev: any) => ({
  //     ...prev,
  //     workflowTemplate: {
  //       ...prev.workflowTemplate,
  //       steps: prev.workflowTemplate.steps.map((s: any) =>
  //         s.tempId === currentStep.tempId ? { ...s, [key]: value } : s
  //       ),
  //     },
  //   }));
  // };

  // const { data: userlist } = useApiQuery(
  //   ["Users", 1, 1000],
  //   `${API_ENDPOINTS.USERS}`,
  //   {
  //     refetchOnWindowFocus: false,
  //     retry: 1,
  //   } as const
  // );
  // let users = userlist?.data.users || [];
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = currentStep.form.findIndex((f: any) => f.id === active.id);
    const newIndex = currentStep.form.findIndex((f: any) => f.id === over.id);

    const reordered = arrayMove(currentStep.form, oldIndex, newIndex).map(
      (f: any, i: number) => ({ ...f, sequence: i + 1 }),
    );

    setCurrentStep({
      ...currentStep,
      form: reordered,
    });
  };

  const handleStepDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFormData((prev: any) => {
      const steps = prev.workflowTemplate?.steps || [];

      const oldIndex = steps.findIndex((s: any) => s.tempId === active.id);
      const newIndex = steps.findIndex((s: any) => s.tempId === over.id);

      if (oldIndex === -1 || newIndex === -1) return prev; // safety check

      const reordered = arrayMove(steps, oldIndex, newIndex).map(
        (step: any, i: number) => ({ ...step, sequence: i + 1 }),
      );

      return {
        ...prev,
        workflowTemplate: {
          ...prev.workflowTemplate,
          steps: reordered,
        },
      };
    });
  };
  const activationValue =
    step?.activationId?.id &&
      [1, 2, 3, 4, 5].includes(Number(step.activationId.id))
      ? step.activationId.id.toString()
      : "";
  let allowedConditions: FieldActivationCondition[] = [];

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

  const workflowPreviewSteps = [...(formData?.workflowTemplate?.steps || [])].sort(
    (a: any, b: any) => (a?.sequence ?? 0) - (b?.sequence ?? 0),
  );
  const getStepAssigneeNames = (step: any) =>
    (step?.assignment || [])
      .flatMap((assignmentItem: any) => assignmentItem?.fullname || [])
      .filter(Boolean);
  const getStepEscalationNames = (step: any) =>
    Array.isArray(step?.escalation?.fullnames)
      ? step.escalation.fullnames.filter(Boolean)
      : [];
  const getActivationSummary = (step: any) => {
    const activationName = step?.activationId?.name || "Not set";
    const delayInMinutes = Number(step?.activationId?.delayInMinutes || 0);
    if (delayInMinutes > 0) {
      return `${activationName} · ${delayInMinutes} min`;
    }
    return activationName;
  };
  const totalStepFields = (formData?.workflowTemplate?.steps || []).reduce(
    (sum: number, item: any) => sum + (item?.form?.length || 0),
    0,
  );
  const totalStepAssignees = (formData?.workflowTemplate?.steps || []).reduce(
    (sum: number, item: any) =>
      sum +
      (item?.assignment || []).reduce(
        (inner: number, assignmentItem: any) =>
          inner + (assignmentItem?.userId?.length || 0),
        0,
      ),
    0,
  );
  const totalTimelineMinutes = (formData?.workflowTemplate?.steps || []).reduce(
    (sum: number, item: any) => sum + (item?.timelineInMinutes || 0),
    0,
  );
  const activeWorkflowPreviewStep =
    workflowPreviewSteps.find(
      (s: any) => s.tempId === activeWorkflowPreviewStepId,
    ) || workflowPreviewSteps[0] || null;

  return (
    <div className="space-y-8 pb-28">
      {formData?.workflowTemplate?.steps?.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  Workflow Steps Overview
                </h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 cursor-help text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Review, reorder, edit, or delete every workflow step from
                      this top section before continuing with the workflow
                      settings below.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm whitespace-nowrap">
                {formData.workflowTemplate.steps.length} step
                {formData.workflowTemplate.steps.length === 1 ? "" : "s"}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              All configured workflow steps are shown here. Drag a step to change its order in the workflow.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Total Fields</p>
                <p className="text-base font-semibold text-slate-900">{totalStepFields}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Total Assignees</p>
                <p className="text-base font-semibold text-slate-900">{totalStepAssignees}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Total Timeline</p>
                <p className="text-base font-semibold text-slate-900">{totalTimelineMinutes} mins</p>
              </div>
            </div>
          </div>

          <div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleStepDragEnd}
            >
              <SortableContext
                items={formData.workflowTemplate.steps.map(
                  (s: any) => s.tempId,
                )}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid gap-3 lg:grid-cols-1">
                  {formData.workflowTemplate.steps.map(
                    (s: any, index: number) => (
                      <SortableStepItem
                        key={index}
                        step={s}
                        index={index}
                        onEdit={editStep}
                        onDelete={deleteStep}
                        onPreview={(step: any) => setPreviewStepModal(step)}
                      />
                    ),
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </section>
      )}

      {/* --- Step Form --- */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
        <div className="md:col-span-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Add New Workflow Step</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Create workflow steps that define the approval process. Each
                  step can have assignments, form fields, activation rules, and
                  escalation settings.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="md:col-span-7 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>
                Step Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Write step name"
                value={step.stepName || ""}
                onChange={(e) =>
                  setCurrentStep({ ...currentStep, stepName: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Assignment */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
        {/* Label */}
        <div className="md:col-span-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Step Assignment</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Assign users who will be responsible for completing this
                  workflow step. These users will receive notifications and can
                  take action on the step.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-7 space-y-4">
          {step.assignment.map((a: any, idx: number) => (
            <div key={a.id ?? idx} className="space-y-2">
              <UserSearch
                marginTop="mt-3"
                key={a.id ?? idx}
                search={assignmentUserSearch}
                setSearch={setAssignmentUserSearch}
                selectedUserIds={a.userId}
                onSelect={(user: any) => {
                  const fullname = `${user.firstName} ${user.lastName}`;
                  setCurrentStep({
                    ...currentStep,
                    assignment: currentStep.assignment.map(
                      (x: any, i: number) =>
                        i === idx
                          ? {
                            ...x,
                            userId: [...(x.userId || []), user.id],
                            fullname: [...(x.fullname || []), fullname],
                          }
                          : x,
                    ),
                  });
                }}
                isFocused={showAssignmentUserDropdown}
                setIsFocused={setShowAssignmentUserDropdown}
                showDropdown={showAssignmentUserDropdown}
                setShowDropdown={setShowAssignmentUserDropdown}
                onChange={(e) => setAssignmentUserSearch(e.target.value)}
                onFocus={() => setShowAssignmentUserDropdown(true)}
                onBlur={() => setShowAssignmentUserDropdown(false)}
                label="Assign to"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {a.userId.length > 0 ? (
                  a.userId.map((uid: string, userIndex: number) => {
                    const fullname = a.fullname?.[userIndex] || null;
                    return (
                      <span
                        key={uid}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full text-sm font-medium border border-blue-200 text-slate-700 hover:border-blue-300 transition-colors"
                      >
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        {fullname || "Unknown"}
                        <button
                          onClick={() =>
                            setCurrentStep({
                              ...currentStep,
                              assignment: currentStep.assignment.map(
                                (x: any, i: number) =>
                                  i === idx
                                    ? {
                                      ...x,
                                      userId: x.userId.filter(
                                        (_: string, index: number) =>
                                          index !== userIndex,
                                      ),
                                      fullname:
                                        x.fullname?.filter(
                                          (_: string, index: number) =>
                                            index !== userIndex,
                                        ) || [],
                                    }
                                    : x,
                              ),
                            })
                          }
                          className="text-gray-400 hover:text-red-500 ml-1 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-400">
                    No users assigned yet.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Form fields */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
        <div className="md:col-span-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Step Form Fields</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Add custom form fields that users need to fill out during this
                  workflow step. Fields can be dragged to reorder and marked as
                  required.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Configure fields for this step with proper sequence and validation.
          </p>
        </div>

        <div className="md:col-span-7 space-y-6">
          {/* Single add form */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label>
                  Field Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Enter field name"
                  value={currentStep.tempField?.fieldName || ""}
                  onChange={(e) => updateFormField("fieldName", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>
                  Field Type
                </Label>
                <Select
                  value={currentStep.tempField?.fieldType || "text"}
                  onValueChange={(v) => updateFormField("fieldType", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type" />
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
              {["select", "checkbox", "radio"].includes(
                currentStep.tempField?.fieldType,
              ) && (
                  <div className="col-span-2">
                    <Label className="mb-2 block">Add Options</Label>

                    <div className="flex flex-col gap-3 mt-3">
                      <div className="flex gap-2">
                        {/* Option Label Input */}
                        <Input
                          placeholder="Option Label"
                          value={currentStep.tempField?.tempOptionLabel || ""}
                          onChange={(e) => {
                            let label = e.target.value;
                            if (label.length > 0) {
                              label =
                                label.charAt(0).toUpperCase() + label.slice(1);
                            }

                            updateFormField("tempOptionLabel", label);

                            // Auto-generate value if user hasn't typed it manually
                            const wasAutoValue =
                              !currentStep.tempField?.tempOptionValue ||
                              currentStep.tempField?.tempOptionValue ===
                              currentStep.tempField?.tempOptionLabel
                                ?.toLowerCase()
                                .replace(/\s+/g, "_");

                            if (wasAutoValue) {
                              updateFormField(
                                "tempOptionValue",
                                // label.toLowerCase().replace(/\s+/g, "_")
                                currentStep.tempField?.options?.length || 1,
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const label =
                                currentStep.tempField?.tempOptionLabel?.trim();
                              // const value =
                              //   currentStep.tempField?.tempOptionValue?.trim() ||
                              //   label?.toLowerCase().replace(/\s+/g, "_");

                              if (label) {
                                const newOption = {
                                  label,
                                  value:
                                    (currentStep.tempField?.options?.length || 0) +
                                    1,
                                };
                                updateFormField("options", [
                                  ...(currentStep.tempField?.options || []),
                                  newOption,
                                ]);
                                updateFormField("tempOptionLabel", "");
                                updateFormField("tempOptionValue", "");
                              }
                            }
                          }}
                        />

                        {/* Option Value Input */}
                        {/* <Input
                      placeholder="Option Value"
                      value={currentStep.tempField?.tempOptionValue || ""}
                      onChange={(e) => updateFormField("tempOptionValue", e.target.value)}
                    /> */}

                        {/* Add Button */}
                        <Button
                          variant="secondary"
                          className="h-auto"
                          onClick={() => {
                            const label =
                              currentStep.tempField?.tempOptionLabel?.trim();
                            // const value =
                            //   currentStep.tempField?.tempOptionValue?.trim() ||
                            //   label?.toLowerCase().replace(/\s+/g, "_");
                            if (!label) return;

                            updateFormField("options", [
                              ...(currentStep.tempField?.options || []),
                              {
                                label,
                                value:
                                  (currentStep.tempField?.options?.length || 0) + 1,
                              },
                            ]);
                            updateFormField("tempOptionLabel", "");
                            updateFormField("tempOptionValue", "");
                          }}
                        >
                          <Plus className="w-5 h-4 text-primary" />
                          Add
                        </Button>
                      </div>

                      {/* Display Added Options */}
                      {currentStep.tempField?.options?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {currentStep.tempField.options.map(
                            (opt: any, idx: any) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-3 py-1.5 text-sm transition-colors"
                              >
                                <span className="font-medium text-slate-700">{opt.label}</span>
                                <span className="text-slate-500 text-xs">
                                  ({opt.value})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated =
                                      currentStep.tempField.options.filter(
                                        (_: any, i: number) => i !== idx,
                                      );
                                    updateFormField("options", updated);
                                  }}
                                  className="text-slate-400 hover:text-red-500 transition-colors ml-0.5"
                                >
                                  ×
                                </button>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              {["number"].includes(currentStep.tempField?.fieldType) && (
                <>
                  <div className="grid gap-2">
                    <Label>Minimum Value</Label>
                    <Input
                      placeholder="Enter minimum value"
                      type="number"
                      min={0}
                      onChange={(e) =>
                        updateFormField("minValue", e.target.value)
                      }
                      value={currentStep.tempField?.minValue ?? ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Maximum Value</Label>
                    <Input
                      placeholder="Enter maximum value"
                      type="number"
                      min={0}
                      onChange={(e) =>
                        updateFormField("maxValue", e.target.value)
                      }
                      value={currentStep.tempField?.maxValue ?? ""}
                    />
                  </div>
                </>
              )}

            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600"
                  checked={!!currentStep.tempField?.required}
                  onChange={(e) => updateFormField("required", e.target.checked)}
                />
                <div className="flex flex-col gap-1">
                  <Label className="cursor-pointer text-red-600 font-semibold">*</Label>
                  <span className="text-sm text-slate-500">
                    Users must fill this field before submitting.
                  </span>
                </div>
              </div>

              <Button variant="secondary" className="w-full sm:min-w-[190px] sm:w-auto" onClick={addFormField}>
                <Plus className="w-5 h-4 text-primary" />
                {editFieldId !== null ? "Update Field" : "Add Field to Step"}
              </Button>
            </div>
          </div>

          {/* Fields added list */}
          {currentStep.form.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">
                  {currentStep.form.length} Form Field{currentStep.form.length !== 1 ? 's' : ''} Added
                </h3>
              </div>
              <div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={currentStep.form.map((f: any) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid gap-3">
                      {currentStep.form.map((field: any, index: number) => (
                        <SortableFieldItem
                          key={field.id}
                          id={field.id}
                          field={field}
                          index={index}
                          onRemove={() => removeFormField(field.id)}
                          onEdit={() => editFormField(field.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Assignment */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
        {/* Label */}
        <div className="md:col-span-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Indent data</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Select which indent form fields will be available in this
                  workflow step. These fields are chosen from the form fields
                  you created in the previous step.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-7 space-y-4">
          <div className="space-y-2">
            {/* Multi-select dropdown */}
            <Label>Indent data</Label>
            <Select
              value=""
              onValueChange={(val) => {
                const fieldId = Number(val);
                setCurrentStep((prev: any) => {
                  const existing = new Set((prev.indentIds || []).map(Number));
                  if (existing.has(fieldId)) return prev;
                  return {
                    ...prev,
                    indentIds: [...existing, fieldId],
                  };
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select indent form fields" />
              </SelectTrigger>
              <SelectContent>
                {formData?.workflowTemplate?.indent?.form?.map((u: any) => {
                  const fieldId = Number(u.id);
                  const currentIds = (currentStep.indentIds || []).map(Number);
                  return (
                    <SelectItem
                      key={u.id}
                      value={String(u.id)}
                      disabled={currentIds.includes(fieldId)}
                    >
                      {u.fieldName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Selected form fields as pills */}
            <div className="flex flex-wrap gap-2 mt-2">
              {(currentStep.indentIds || []).length > 0 ? (
                (currentStep.indentIds || []).map((fieldId: number) => {
                  const field = formData?.workflowTemplate?.indent?.form?.find(
                    (f: any) => Number(f.id) === Number(fieldId),
                  );
                  return (
                    <span
                      key={fieldId}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-full text-sm font-medium border border-purple-200 text-slate-700 hover:border-purple-300 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5 text-purple-600" />
                      {field ? field.fieldName : "Unknown"}
                      <button
                        onClick={() =>
                          setCurrentStep((prev: any) => ({
                            ...prev,
                            indentIds: (prev.indentIds || []).filter(
                              (id: number) => Number(id) !== Number(fieldId),
                            ),
                          }))
                        }
                        className="text-gray-400 hover:text-red-500 ml-1 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400">No fields selected yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Activation & Escalation */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
        <div className="md:col-span-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Activation & Escalation</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Configure when this step activates, escalation settings, and
                  timelines.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="md:col-span-7 space-y-4">
          {/* --------------- ACTIVATION SETTINGS --------------- */}
          <section className="border rounded-xl p-4 space-y-4 shadow-sm">
            <h3 className="font-medium text-sm text-gray-700 border-b pb-1">
              Activation Settings
            </h3>

            <div className="grid md:grid-cols-2 gap-3">
              {/* Activation Type */}
              <div className="grid gap-1.5">
                <Label>
                  When should this step activate?{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={activationValue}
                  onValueChange={(v) => {
                    if (v === "clear") {
                      setCurrentStep({ ...step, activationId: null });
                      return;
                    }
                    const selected = activationOptions.find(
                      (opt) => opt.value === Number(v),
                    );
                    if (selected) {
                      setCurrentStep({
                        ...step,
                        activationId: {
                          id: selected.value,
                          name: selected.label,
                          triggerStepId: "",
                        },
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Activation" />
                  </SelectTrigger>
                  <SelectContent>
                    {activationOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                    {activationValue && (
                      <>
                        <div className="border-t my-1" />
                        <SelectItem value="clear" className="text-red-500">
                          Clear selection
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Delay */}
              {step.activationId?.id ===
                STEPACTIVATION.AFTER_SPECFICE_TIME_DELAY && (
                  <div className="grid gap-1.5">
                    <Label>Delay (Minutes)</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Minutes"
                      value={step.activationId?.delayInMinutes ?? ""}
                      onChange={(e) =>
                        setCurrentStep({
                          ...step,
                          activationId: {
                            ...step.activationId,
                            delayInMinutes: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                )}
              {/* Conditional Trigger Step */}
              {(step.activationId?.id ===
                STEPACTIVATION.After_Specific_Step_Completes ||
                step.activationId?.id ===
                STEPACTIVATION.WHEN_SPECIFIC_CONDITION_MATCHES) && (
                  <div className="grid gap-1.5">
                    <Label>Select Step to Trigger</Label>
                    <Select
                      value={
                        step.activationId?.triggerStepId?.toString() ?? undefined
                      }
                      onValueChange={(val) =>
                        setCurrentStep({
                          ...step,
                          activationId: {
                            ...step.activationId,
                            triggerStepId: val,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select step" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData?.workflowTemplate?.steps?.length > 0 ? (
                          formData.workflowTemplate.steps.map((s: any) => (
                            <SelectItem
                              key={s.stepId}
                              value={s.stepId.toString()}
                            >
                              {s.sequence}. {s.stepName}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No steps available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              {/* When specific indent condition matches */}
              {step.activationId?.id ===
                STEPACTIVATION.WHEN_SPECIFIC_INDENT_CONDITION_MATCHES && (
                  <div className="grid gap-1.5">
                    <Label>Select Indent to trigger</Label>

                    <Select
                      value={step.activationId?.triggerIndentId?.toString()}
                      onValueChange={(val) => {
                        const selectedField =
                          formData?.workflowTemplate?.indent?.form?.find(
                            (f: any) => f.id === Number(val),
                          );

                        if (!selectedField) return;

                        setCurrentStep({
                          ...step,
                          activationId: {
                            ...step.activationId,
                            triggerIndentId: Number(val),
                            fieldType: selectedField.fieldType,
                          },
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select indent field" />
                      </SelectTrigger>

                      <SelectContent>
                        {formData?.workflowTemplate?.indent?.form
                          ?.filter(
                            (f: any) => !["file", "group"].includes(f.fieldType),
                          )
                          .map((f: any) => (
                            <SelectItem key={f.id} value={f.id.toString()}>
                              {f.fieldName}-{`(${f.fieldType})`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              {step.activationId?.triggerStepId &&
                step.activationId?.id ===
                STEPACTIVATION.WHEN_SPECIFIC_CONDITION_MATCHES && (
                  <div className="grid gap-1.5">
                    <Label>Select fields</Label>
                    <Select
                      value={JSON.stringify({
                        id: step.activationId?.fieldId,
                        fieldType: step.activationId?.fieldType,
                      })}
                      onValueChange={(val) => {
                        const { id, fieldType } = JSON.parse(val);

                        setCurrentStep({
                          ...step,
                          activationId: {
                            ...step.activationId,
                            fieldId: id,
                            fieldType: fieldType,
                          },
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select fields" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData?.workflowTemplate?.steps
                          .find(
                            (s: any) =>
                              s.stepId ===
                              Number(currentStep?.activationId?.triggerStepId),
                          )
                          ?.form.map((f: any) => (
                            <SelectItem
                              key={f.id}
                              value={JSON.stringify({
                                id: f.id,
                                fieldType: f.fieldType,
                              })}
                            >
                              {f.fieldType}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              {(step.activationId?.triggerStepId ||
                step.activationId?.triggerIndentId) &&
                (step.activationId?.id ===
                  STEPACTIVATION.WHEN_SPECIFIC_CONDITION_MATCHES ||
                  step.activationId?.id ===
                  STEPACTIVATION.WHEN_SPECIFIC_INDENT_CONDITION_MATCHES) && (
                  <div className="grid gap-1.5">
                    <Label>Select Condition</Label>
                    {(() => {
                      const fieldType = step.activationId?.fieldType || "";
                      switch (fieldType) {
                        case "text":
                        case "textarea":
                        case "email":
                        case "select": // Dropdown
                        case "radio":
                        case "currentUser":
                          allowedConditions = [
                            FieldActivationCondition.EQUAL_TO,
                            FieldActivationCondition.NOT_EQUAL_TO,
                          ];
                          break;

                        case "number":
                          allowedConditions = [
                            FieldActivationCondition.LESS_THAN,
                            FieldActivationCondition.LESS_THAN_EQUAL_TO,
                            FieldActivationCondition.GREATER_THAN,
                            FieldActivationCondition.GREATER_THAN_EQUAL_TO,
                            FieldActivationCondition.EQUAL_TO,
                            FieldActivationCondition.NOT_EQUAL_TO,
                          ];
                          break;

                        case "date":
                        case "datetime":
                          allowedConditions = [
                            FieldActivationCondition.LESS_THAN,
                            FieldActivationCondition.LESS_THAN_EQUAL_TO,
                            FieldActivationCondition.GREATER_THAN,
                            FieldActivationCondition.GREATER_THAN_EQUAL_TO,
                            FieldActivationCondition.EQUAL_TO,
                            FieldActivationCondition.NOT_EQUAL_TO,
                            FieldActivationCondition.ADD,
                            FieldActivationCondition.SUB,
                          ];
                          break;

                        case "time":
                          allowedConditions = [
                            FieldActivationCondition.LESS_THAN,
                            FieldActivationCondition.LESS_THAN_EQUAL_TO,
                            FieldActivationCondition.GREATER_THAN,
                            FieldActivationCondition.GREATER_THAN_EQUAL_TO,
                            FieldActivationCondition.EQUAL_TO,
                            FieldActivationCondition.NOT_EQUAL_TO,
                          ];
                          break;

                        case "checkbox":
                          allowedConditions = [
                            FieldActivationCondition.EQUAL_TO,
                            FieldActivationCondition.NOT_EQUAL_TO,
                            FieldActivationCondition.CONTAINS,
                          ];
                          break;

                        case "file":
                        case "group":
                          // Do not show in condition builder
                          allowedConditions = [];
                          break;

                        default:
                          allowedConditions = [];
                      }
                      return (
                        <Select
                          value={
                            step.activationId?.fieldCondition
                              ? String(step.activationId.fieldCondition)
                              : undefined
                          }
                          onValueChange={(val) =>
                            setCurrentStep({
                              ...step,
                              activationId: {
                                ...step.activationId,
                                fieldCondition: Number(val),
                              },
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {allowedConditions.map((conditionKey) => (
                              <SelectItem
                                key={conditionKey}
                                value={String(conditionKey)}
                              >
                                {FieldActivationText[conditionKey]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </div>
                )}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {step.activationId?.fieldCondition &&
                (step.activationId?.id ===
                  STEPACTIVATION.WHEN_SPECIFIC_CONDITION_MATCHES ||
                  step.activationId?.id ===
                  STEPACTIVATION.WHEN_SPECIFIC_INDENT_CONDITION_MATCHES) && (
                  <div className="grid gap-1.5 grid-cols-1">
                    <Label>
                      Field Value <span className="text-red-500">*</span>
                    </Label>
                    {(() => {
                      const fieldType = step.activationId?.fieldType || "";
                      const condition = step.activationId?.fieldCondition;
                      const conditionNum =
                        typeof condition === "string"
                          ? Number(condition)
                          : condition;

                      /* ---------------- DATE / DATETIME / TIME ---------------- */

                      const isDateArithmetic =
                        (fieldType === "date" || fieldType === "datetime") &&
                        (conditionNum === FieldActivationCondition.ADD ||
                          conditionNum === FieldActivationCondition.SUB);

                      /* ---------------- INPUT TYPE ---------------- */

                      let inputType:
                        | "text"
                        | "number"
                        | "date"
                        | "time"
                        | "datetime-local" = "text";
                      let placeholder = "Enter value";

                      switch (fieldType) {
                        case "number":
                          inputType = "number";
                          placeholder = "Enter number";
                          break;

                        case "date":
                          if (isDateArithmetic) {
                            inputType = "number";
                            placeholder = "Enter number (days)";
                          } else {
                            inputType = "date";
                            placeholder = "Select date";
                          }
                          break;

                        case "datetime":
                          if (isDateArithmetic) {
                            inputType = "number";
                            placeholder = "Enter number";
                          } else {
                            inputType = "datetime-local";
                            placeholder = "Select date & time";
                          }
                          break;

                        case "time":
                          inputType = "time";
                          placeholder = "Select time";
                          break;

                        case "text":
                        case "textarea":
                        case "email":
                          inputType = "text";
                          placeholder = "Enter value";
                          break;
                      }

                      /* ---------------- DROPDOWN / RADIO / CURRENT USER ---------------- */

                      if (["select", "radio"].includes(fieldType)) {
                        let field: any;
                        let options: any[] = [];
                        if (
                          step?.activationId?.id ===
                          STEPACTIVATION.WHEN_SPECIFIC_INDENT_CONDITION_MATCHES
                        ) {
                          field = formData?.workflowTemplate?.indent?.form.find(
                            (f: any) =>
                              f.id ===
                              currentStep?.activationId?.triggerIndentId,
                          );
                        } else if (
                          step?.activationId?.id ===
                          STEPACTIVATION.WHEN_SPECIFIC_CONDITION_MATCHES
                        ) {
                          field = formData?.workflowTemplate?.steps
                            .find(
                              (f: any) =>
                                f.stepId == step?.activationId?.triggerStepId,
                            )
                            ?.form.find(
                              (f: any) => f.id == step?.activationId?.fieldId,
                            );
                        }

                        if (fieldType === "currentUser") {
                          options =
                            currentStep.assignment.map((u: any) => ({
                              value: String(u.id),
                              label: u.name || u.email,
                            })) || [];
                        } else {
                          options = field?.options || [];
                        }

                        if (options.length) {
                          return (
                            <Select
                              value={String(
                                step.activationId?.fieldValue ?? "",
                              )}
                              onValueChange={(val) =>
                                setCurrentStep({
                                  ...step,
                                  activationId: {
                                    ...step.activationId,
                                    fieldValue: val, // pass ID
                                  },
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                              <SelectContent>
                                {options.map((opt: any) => (
                                  <SelectItem
                                    key={opt.value}
                                    value={String(opt.value)}
                                  >
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        }
                      }

                      /* ---------------- CURRENT USER ---------------- */

                      if (fieldType === "currentUser") {
                        const fieldValueArray = Array.isArray(
                          step.activationId?.fieldValue,
                        )
                          ? step.activationId.fieldValue
                          : step.activationId?.fieldValue
                            ? [step.activationId.fieldValue]
                            : [];
                        const fullnameArray = Array.isArray(
                          step.activationId?.fullnames,
                        )
                          ? step.activationId.fullnames
                          : step.activationId?.fullnames
                            ? [step.activationId.fullnames]
                            : [];

                        return (
                          <div className="grid gap-1.5">
                            <UserSearch
                              marginTop="-mt-3"
                              isFocused={showCurrentUserDropdown}
                              setIsFocused={setShowCurrentUserDropdown}
                              showDropdown={showCurrentUserDropdown}
                              setShowDropdown={setShowCurrentUserDropdown}
                              onChange={(e) =>
                                setCurrentUserSearch(e.target.value)
                              }
                              onFocus={() => setShowCurrentUserDropdown(true)}
                              onBlur={() => setShowCurrentUserDropdown(false)}
                              search={currentUserSearch}
                              setSearch={setCurrentUserSearch}
                              selectedUserIds={fieldValueArray}
                              onSelect={(user: any) => {
                                const fullname = `${user.firstName} ${user.lastName}`;
                                setCurrentStep({
                                  ...currentStep,
                                  activationId: {
                                    ...step.activationId,
                                    fieldValue: [...fieldValueArray, user.id],
                                    fullnames: [...fullnameArray, fullname],
                                  },
                                });
                              }}
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                              {fieldValueArray.length > 0 ? (
                                fieldValueArray.map(
                                  (userId: string, userIndex: number) => {
                                    const fullname =
                                      fullnameArray[userIndex] || null;

                                    return (
                                      <span
                                        key={userId}
                                        className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm border border-gray-300"
                                      >
                                        {fullname || userId || "Unknown"}
                                        <button
                                          onClick={() =>
                                            setCurrentStep({
                                              ...currentStep,
                                              activationId: {
                                                ...step.activationId,
                                                fieldValue:
                                                  fieldValueArray.filter(
                                                    (
                                                      _: string,
                                                      index: number,
                                                    ) => index !== userIndex,
                                                  ),
                                                fullnames: fullnameArray.filter(
                                                  (_: string, index: number) =>
                                                    index !== userIndex,
                                                ),
                                              },
                                            })
                                          }
                                          className="text-gray-500 hover:text-red-500"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    );
                                  },
                                )
                              ) : (
                                <p className="text-xs text-gray-400">
                                  No user selected yet.
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      /* ---------------- CHECKBOX (MULTI SELECT) ---------------- */

                      if (fieldType === "checkbox") {
                        let field: any;
                        if (
                          step?.activationId?.id ===
                          STEPACTIVATION.WHEN_SPECIFIC_INDENT_CONDITION_MATCHES
                        ) {
                          field = formData?.workflowTemplate?.indent?.form.find(
                            (f: any) =>
                              f.id ===
                              currentStep?.activationId?.triggerIndentId,
                          );
                        } else if (
                          step?.activationId?.id ===
                          STEPACTIVATION.WHEN_SPECIFIC_CONDITION_MATCHES
                        ) {
                          field = formData?.workflowTemplate?.steps
                            .find(
                              (f: any) =>
                                f.stepId == step?.activationId?.triggerStepId,
                            )
                            ?.form.find(
                              (f: any) => f.id == step?.activationId?.fieldId,
                            );
                        }

                        const selectedValues: string[] = Array.isArray(
                          step.activationId?.fieldValue,
                        )
                          ? step.activationId.fieldValue
                          : [];

                        if (field?.options?.length) {
                          return (
                            <div className="flex flex-row flex-wrap gap-2 border border-gray-200 rounded-md p-2">
                              {field.options.map((opt: any) => (
                                <label
                                  key={opt.value}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedValues.includes(
                                      String(opt.value),
                                    )}
                                    onChange={(e) => {
                                      const updated = e.target.checked
                                        ? [...selectedValues, String(opt.value)]
                                        : selectedValues.filter(
                                          (v) => v !== String(opt.value),
                                        );

                                      setCurrentStep({
                                        ...step,
                                        activationId: {
                                          ...step.activationId,
                                          fieldValue: updated, // pass array of IDs
                                        },
                                      });
                                    }}
                                  />
                                  {opt.label}
                                </label>
                              ))}
                            </div>
                          );
                        }
                      }

                      /* ---------------- DEFAULT INPUT ---------------- */

                      return (
                        <Input
                          type={inputType}
                          placeholder={placeholder}
                          value={step.activationId?.fieldValue || ""}
                          onChange={(e) =>
                            setCurrentStep({
                              ...step,
                              activationId: {
                                ...step.activationId,
                                fieldValue: e.target.value,
                              },
                            })
                          }
                        />
                      );
                    })()}
                  </div>
                )}
            </div>
          </section>

          {/* Timeline Settings */}
          <section className="border rounded-xl p-4 space-y-4 shadow-sm">
            <h3 className="font-medium text-sm text-gray-700 border-b pb-1">
              Timeline Settings <span className="text-red-500">*</span>
            </h3>

            <div className="grid grid-cols-4 gap-3">
              {[
                { key: "timelineWeeks", label: "Weeks" },
                { key: "timelineDays", label: "Days" },
                { key: "timelineHours", label: "Hours" },
                { key: "timelineSettMinutes", label: "Minutes" },
              ].map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1">
                  <Input
                    type="number"
                    min={0}
                    placeholder={label}
                    value={step[key] || ""}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0;
                      const newStep = { ...step, [key]: value };

                      // Calculate total minutes dynamically
                      const totalMinutes =
                        (newStep.timelineWeeks || 0) * 7 * 24 * 60 +
                        (newStep.timelineDays || 0) * 24 * 60 +
                        (newStep.timelineHours || 0) * 60 +
                        (newStep.timelineSettMinutes || 0);

                      setCurrentStep({
                        ...newStep,
                        timelineInMinutes: totalMinutes, // store total for payload
                      });
                    }}
                  />
                  <span className="text-[10px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>

            {/* Optional Display */}
            <div className="text-sm text-gray-600 mt-2">
              Total Minutes : {step.timelineInMinutes || 0}
            </div>
          </section>

          {/* --------------- ESCALATION SETTINGS --------------- */}
          <section className="border rounded-xl p-4 space-y-4 shadow-sm">
            <h3 className="font-medium text-sm text-gray-700 border-b pb-1">
              Escalation Settings
            </h3>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="md:col-span-7 space-y-4">
                <div className="space-y-2">
                  {/* Multi-select dropdown */}
                  {(() => {
                    const userIdsArray = Array.isArray(step.escalation?.userIds)
                      ? step.escalation.userIds
                      : step.escalation?.userIds
                        ? [step.escalation.userIds]
                        : [];
                    const fullnamesArray = Array.isArray(
                      step.escalation?.fullnames,
                    )
                      ? step.escalation.fullnames
                      : step.escalation?.fullnames
                        ? [step.escalation.fullnames]
                        : [];

                    return (
                      <>
                        <UserSearch
                          marginTop="-mt-3"
                          isFocused={showEscalationUserDropdown}
                          setIsFocused={setShowEscalationUserDropdown}
                          showDropdown={showEscalationUserDropdown}
                          setShowDropdown={setShowEscalationUserDropdown}
                          onChange={(e) =>
                            setEscalationUserSearch(e.target.value)
                          }
                          onFocus={() => setShowEscalationUserDropdown(true)}
                          onBlur={() => setShowEscalationUserDropdown(false)}
                          search={escalationUserSearch}
                          setSearch={setEscalationUserSearch}
                          selectedUserIds={userIdsArray}
                          onSelect={(user: any) => {
                            const fullname = `${user.firstName} ${user.lastName}`;
                            setCurrentStep({
                              ...step,
                              escalation: {
                                ...step.escalation,
                                userIds: [...userIdsArray, user.id],
                                fullnames: [...fullnamesArray, fullname],
                              },
                            });
                          }}
                        />
                        {/* Selected users as pills */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {userIdsArray.length > 0 ? (
                            userIdsArray.map(
                              (uid: string, userIndex: number) => {
                                const fullname =
                                  fullnamesArray[userIndex] || null;
                                return (
                                  <span
                                    key={uid}
                                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm border border-gray-300"
                                  >
                                    {fullname || uid || "Unknown"}
                                    <button
                                      onClick={() =>
                                        setCurrentStep({
                                          ...step,
                                          escalation: {
                                            ...step.escalation,
                                            userIds: userIdsArray.filter(
                                              (id: string) => id !== uid,
                                            ),
                                            fullnames: fullnamesArray.filter(
                                              (_: string, index: number) =>
                                                index !== userIndex,
                                            ),
                                          },
                                        })
                                      }
                                      className="text-gray-500 hover:text-red-500"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                );
                              },
                            )
                          ) : (
                            <p className="text-xs text-gray-400">
                              No users assigned yet.
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            {/* Frequency */}
            <div className="grid gap-1.5">
              <Label>Frequency</Label>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { key: "tempWeeks", label: "Weeks", multiplier: 7 * 24 * 60 },
                  { key: "tempDays", label: "Days", multiplier: 24 * 60 },
                  { key: "tempHours", label: "Hours", multiplier: 60 },
                  { key: "tempMinutes", label: "Minutes", multiplier: 1 },
                ].map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <Input
                      type="number"
                      min={0}
                      placeholder={label}
                      value={step[key] || ""}
                      onChange={(e) => {
                        const value = Number(e.target.value) || 0;
                        const newStep = { ...step, [key]: value };

                        // Calculate total minutes dynamically
                        const totalMinutes =
                          (newStep.tempWeeks || 0) * 7 * 24 * 60 +
                          (newStep.tempDays || 0) * 24 * 60 +
                          (newStep.tempHours || 0) * 60 +
                          (newStep.tempMinutes || 0);

                        setCurrentStep({
                          ...newStep,
                          escalation: {
                            ...step.escalation,
                            frequencyInMinutes: totalMinutes,
                          },
                        });
                      }}
                    />
                    <span className="text-[10px] text-gray-500">{label}</span>
                  </div>
                ))}
              </div>

              {/* Optional Display */}
              <div className="text-sm text-gray-600 mt-2">
                Total Minutes : {step.escalation?.frequencyInMinutes || 0}
              </div>
            </div>
          </section>

          {/* --------------- ADD BUTTON --------------- */}
          <div className="flex justify-end">
            <Button onClick={addWorkflowRule}>
              <Plus className="w-5 h-4" />
              {formData?.workflowTemplate?.steps?.length > 0 &&
                currentStep?.stepName
                ? "Update This Step to Workflow"
                : "Add This Step to Workflow"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showNoChangeConfirm} onOpenChange={setShowNoChangeConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>No changes found</DialogTitle>
            <DialogDescription>
              You have not made any updates to this workflow step. Continue
              without updating this step?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNoChangeConfirm(false)}
            >
              Keep Editing
            </Button>
            <Button
              onClick={() => {
                resetCurrentStep();
                setShowNoChangeConfirm(false);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showUnsavedStepConfirm}
        onOpenChange={setShowUnsavedStepConfirm}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved workflow step changes</DialogTitle>
            <DialogDescription>
              You have updated step details that are not added to the workflow
              list yet. Continue with Save & Update without applying this step
              update?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnsavedStepConfirm(false)}
            >
              Go Back
            </Button>
            <Button
              onClick={() => {
                setShowUnsavedStepConfirm(false);
                finish();
              }}
            >
              Continue Save & Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* <Separator /> */}

      {/* Schedule & Status */}
      {/* <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
        <div className="md:col-span-3"><h2 className="text-sm font-semibold">Schedule & Status</h2></div>
        <div className="md:col-span-7 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              value={currentStep.scheduleStartDateTime || ""}
              onChange={(e) => handleFieldChange("scheduleStartDateTime", e.target.value)}
            />

            <Input
              type="datetime-local"
              value={currentStep.scheduleEndDateTime || ""}
              onChange={(e) => handleFieldChange("scheduleEndDateTime", e.target.value)}
            />
          </div>

          <Select
            value={step.stepStatus?.name || ""}
            onValueChange={(v) =>
              setCurrentStep({
                ...step,
                stepStatus: { id: step.stepStatus?.id ?? 0, name: v },
              })
            }
          >
            <SelectTrigger><SelectValue placeholder="Select Step Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Input placeholder="Comment" value={step.comment || ""} onChange={(e) => setCurrentStep({ ...step, comment: e.target.value })} />
         
        </div>

      </div> */}
      <Separator />

      {/* Navigation - Fixed Footer */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white shadow-[0_-10px_30px_rgba(15,23,42,0.08)] md:left-64">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6 md:pr-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Review the workflow steps before continuing.</span>
            <span className="sm:hidden">Review before continuing.</span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={prevStep}>
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const firstStepId =
                  (formData?.workflowTemplate?.steps || [])
                    .sort((a: any, b: any) => (a?.sequence ?? 0) - (b?.sequence ?? 0))[0]
                    ?.tempId ?? null;
                setActiveWorkflowPreviewStepId(firstStepId);
                setShowWorkflowPreview(true);
              }}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Preview Workflow</span>
              <span className="sm:hidden">Preview</span>
            </Button>
            <Button
              disabled={formData?.workflowTemplate?.steps?.length === 0}
              onClick={handleFinishWithGuard}
              className="min-w-[180px]"
            >
              {loading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <File className="h-4 w-4" />
              )}
              {buttonText ?? "Save & Publish"}
            </Button>
          </div>
        </div>
      </div>

      {/* Step Preview Drawer */}
      {previewStepModal && (
        <Sheet open={!!previewStepModal} onOpenChange={() => setPreviewStepModal(null)}>
          <SheetContent side="right" className="w-full p-0 sm:max-w-2xl">
            <SheetHeader>
              <SheetTitle>Preview: {previewStepModal.stepName}</SheetTitle>
              <SheetDescription>
                Form fields that will be displayed in this workflow step
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
              <div className="grid gap-2">
                <h3 className="font-semibold text-slate-900">Step Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Step Name</span>
                    <p className="font-medium mt-1">{previewStepModal.stepName}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Timeline</span>
                    </div>
                    <p className="font-medium">
                      {previewStepModal.timelineInMinutes ? `${previewStepModal.timelineInMinutes} min` : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Activation Settings</p>
                    <p className="mt-1 font-medium text-slate-900">{previewStepModal.activationId?.name || 'Not set'}</p>
                    {previewStepModal.activationId?.delayInMinutes ? (
                      <p className="text-xs text-slate-500">Delay: {previewStepModal.activationId.delayInMinutes} min</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Escalation Settings</p>
                    <p className="mt-1 font-medium text-slate-900">{previewStepModal.escalation?.escalationType?.name || 'Not set'}</p>
                    <p className="text-xs text-slate-500">
                      {getStepEscalationNames(previewStepModal).length > 0
                        ? getStepEscalationNames(previewStepModal).join(', ')
                        : 'No escalation users'}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Assignees</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {getStepAssigneeNames(previewStepModal).length > 0
                      ? getStepAssigneeNames(previewStepModal).join(', ')
                      : 'No assignees'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-slate-900">Form Fields ({previewStepModal.form?.length || 0})</h3>
                </div>
                {previewStepModal.form && previewStepModal.form.length > 0 ? (
                  <div className="space-y-3">
                    {previewStepModal.form.map((field: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-slate-900 text-sm">
                                {field.fieldName}
                              </div>
                              {field.required && (
                                <span className="inline-flex items-center px-1 py-0.5 text-xs font-semibold text-red-600">
                                  *
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                              <span>Type:</span>
                              <span className="inline-flex items-center gap-1 capitalize font-medium text-slate-700">
                                {field.fieldType}
                              </span>
                            </div>
                            {field.description && (
                              <div className="text-xs text-slate-600 mt-2">{field.description}</div>
                            )}
                            <div className="mt-3">
                              {renderPreviewFieldControl(field, `step-preview-${field.id || idx}`)}
                            </div>
                          </div>
                          <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 px-2 text-xs font-bold text-blue-700">
                            {field.sequence}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No form fields added to this step</p>
                )}
              </div>
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={() => setPreviewStepModal(null)}>
                Close
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Full Workflow Preview Drawer */}
      {showWorkflowPreview && (
        <Sheet open={showWorkflowPreview} onOpenChange={setShowWorkflowPreview}>
          <SheetContent side="right" className="w-full overflow-x-hidden p-0 sm:max-w-4xl">
            <SheetHeader>
              <SheetTitle>Workflow Preview</SheetTitle>
              <SheetDescription>
                Complete preview of your workflow template with all steps and form fields
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-4 pb-4">
              {/* Workflow Overview */}
              <div className="grid gap-3">
                <h3 className="font-semibold text-slate-900">Workflow Overview</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <span className="text-slate-500">Total Steps</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {formData.workflowTemplate?.steps?.length || 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <span className="text-slate-500">Template Name</span>
                    <p className="font-medium mt-1 truncate">{formData.workflowTemplate?.templateName || 'Unnamed'}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <span className="text-slate-500">Flow</span>
                    <p className="font-medium mt-1">
                      {workflowPreviewSteps.length > 0
                        ? `${workflowPreviewSteps[0]?.stepName || "Step 1"} -> ${workflowPreviewSteps[workflowPreviewSteps.length - 1]?.stepName || `Step ${workflowPreviewSteps.length}`}`
                        : "No flow defined"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Steps Preview */}
              <div className="grid gap-4">
                <h3 className="font-semibold text-slate-900">Steps Overview</h3>
                {workflowPreviewSteps.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-12">
                    <div className="space-y-2 lg:col-span-4">
                      {workflowPreviewSteps.map((step: any, idx: number) => (
                        <button
                          key={step.tempId}
                          type="button"
                          onClick={() => setActiveWorkflowPreviewStepId(step.tempId)}
                          className={`w-full rounded-lg border p-3 text-left transition-colors ${activeWorkflowPreviewStep?.tempId === step.tempId
                            ? "border-purple-300 bg-purple-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                              {step.sequence || idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{step.stepName || `Step ${idx + 1}`}</p>
                              <div className="text-xs text-slate-500 mt-1 space-y-1">
                                <p className="flex items-center gap-1.5">
                                  <FileText className="h-3 w-3 text-blue-600" />
                                  {step.form?.length || 0} field{(step.form?.length || 0) !== 1 ? "s" : ""}
                                </p>
                                <p className="flex items-center gap-1.5">
                                  <ArrowLeft className="h-3 w-3 text-purple-600 rotate-180" />
                                  Next: {workflowPreviewSteps[idx + 1]?.stepName || "Final Step"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-8">
                      {activeWorkflowPreviewStep ? (
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-700 text-sm">
                              {activeWorkflowPreviewStep.sequence}
                            </span>
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900">{activeWorkflowPreviewStep.stepName}</h4>
                              <div className="text-xs text-slate-500 mt-2 space-y-1.5">
                                <p className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-orange-600" />
                                  {activeWorkflowPreviewStep.timelineInMinutes ? `${activeWorkflowPreviewStep.timelineInMinutes} min` : "Not set"}
                                </p>
                                <p className="flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5 text-green-600" />
                                  {getStepAssigneeNames(activeWorkflowPreviewStep).length > 0
                                    ? getStepAssigneeNames(activeWorkflowPreviewStep).join(', ')
                                    : 'No assignees'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Activation Settings</p>
                                <p className="mt-1 font-medium text-slate-900">{activeWorkflowPreviewStep.activationId?.name || 'Not set'}</p>
                                {activeWorkflowPreviewStep.activationId?.delayInMinutes ? (
                                  <p className="text-xs text-slate-500">Delay: {activeWorkflowPreviewStep.activationId.delayInMinutes} min</p>
                                ) : null}
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Escalation Settings</p>
                                <p className="mt-1 font-medium text-slate-900">{activeWorkflowPreviewStep.escalation?.escalationType?.name || 'Not set'}</p>
                                <p className="text-xs text-slate-500">
                                  {getStepEscalationNames(activeWorkflowPreviewStep).length > 0
                                    ? getStepEscalationNames(activeWorkflowPreviewStep).join(', ')
                                    : 'No escalation users'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Assignees</p>
                              <p className="mt-1 font-medium text-slate-900">
                                {getStepAssigneeNames(activeWorkflowPreviewStep).length > 0
                                  ? getStepAssigneeNames(activeWorkflowPreviewStep).join(', ')
                                  : 'No assignees'}
                              </p>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Step Form</p>
                            </div>
                            {(activeWorkflowPreviewStep.form || []).length > 0 ? (
                              activeWorkflowPreviewStep.form.map((field: any) => (
                                <div key={field.id} className="rounded-md border border-slate-200 p-3 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-900 text-sm">{field.fieldName}</span>
                                        {field.required && (
                                          <span className="inline-flex items-center px-1 py-0.5 text-xs font-semibold text-red-600">
                                            *
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-slate-500 capitalize">({field.fieldType})</span>
                                    </div>
                                  </div>
                                  {renderPreviewFieldControl(
                                    field,
                                    `workflow-preview-${activeWorkflowPreviewStep.tempId}-${field.id}`,
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No form fields in this step.</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No active step selected.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No steps added to this workflow</p>
                )}
              </div>
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={() => setShowWorkflowPreview(false)}>
                Close
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}