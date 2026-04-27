"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { StepIndicator } from "../../create/page";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import BasicInfo from "../../create/steps/basic-info";
import FormBuilder from "../../create/steps/form-builder";
import WorkflowDesign from "../../create/steps/workflow-design";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmationModal from "@/components/confirmationModal";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

export default function EditFmsSystemPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const { update: canUpdate } = useModulePermissions(3);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [businessMode, setBusinessMode] = useState<"same" | "custom">("same");

  // store which step to move next (after modal confirm)
  const [pendingNextStep, setPendingNextStep] = useState<null | (() => void)>(
    null,
  );

  // --- form data ---
  const [formData, setFormData] = useState<any>({
    name: "",
    description: "",
    templateCode: "",
    workflowTemplate: {
      steps: [],
      indent: {
        form: [],
        initiator: [],
      },
      priority: 3,
      skipHolidays: true,
      businessHours: {
        day: {
          monday: { start: "09:00", end: "17:00", isClosed: false },
          tuesday: { start: "09:00", end: "17:00", isClosed: false },
          wednesday: { start: "09:00", end: "17:00", isClosed: false },
          thursday: { start: "09:00", end: "17:00", isClosed: false },
          friday: { start: "09:00", end: "17:00", isClosed: false },
          saturday: { isClosed: true },
          sunday: { isClosed: true },
        },
        timezone: "America/New_York",
      },
    },
  });

  const { data, isLoading, refetch } = useApiQuery(
    ["EditFmsTemplateDetails", id],
    `${API_ENDPOINTS.FMS_TEMPLATE}/${id}`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!id && canUpdate,
    } as const,
  );

  const originalDataRef = useRef<any>(null);

  useEffect(() => {
    if (data?.data) {
      const fms = data.data;
      const normalized = {
        name: fms.name || "",
        description: fms.description || "",
        templateCode: fms.templateCode || fms.templeteCode || "",
        workflowTemplate: {
          steps: fms.workflowTemplate?.steps || fms.step || [],
          indent: fms.workflowTemplate?.indent || {
            form: fms.indent || [],
            initiator: fms.initiator || [],
          },
          priority: fms.workflowTemplate?.priority ?? 3,
          skipHolidays: fms.workflowTemplate?.skipHolidays ?? true,
          businessHours: fms.workflowTemplate?.businessHours || {
            day: {
              monday: { start: "09:00", end: "17:00", isClosed: false },
              tuesday: { start: "09:00", end: "17:00", isClosed: false },
              wednesday: { start: "09:00", end: "17:00", isClosed: false },
              thursday: { start: "09:00", end: "17:00", isClosed: false },
              friday: { start: "09:00", end: "17:00", isClosed: false },
              saturday: { isClosed: true },
              sunday: { isClosed: true },
            },
            timezone:
              fms.workflowTemplate?.businessHours?.timezone || "Asia/Kolkata",
          },
        },
      };

      setFormData(normalized);
      originalDataRef.current = JSON.parse(JSON.stringify(normalized));
    }
  }, [data]);

  useEffect(() => {
    const days = formData?.workflowTemplate?.businessHours?.day;
    if (!days) return;

    const dayList = Object.values(days);
    const first: any = dayList[0];

    const isCustom =
      dayList.some((d: any) => d.isClosed) ||
      !dayList.every(
        (d: any) =>
          !d.isClosed && d.start === first.start && d.end === first.end,
      );

    setBusinessMode(isCustom ? "custom" : "same");
  }, [formData?.workflowTemplate?.businessHours?.day]);

  const updateForm = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateFmsTemp = useApiMutation(
    HTTP_METHODS.PUT,
    `${API_ENDPOINTS.FMS_TEMPLATE}/${id}`,
  );

  const buildApiPayload = (data: any) => {
    const { templateCode, ...topLevel } = data;
    const { priority, skipHolidays, businessHours, ...wt } = topLevel.workflowTemplate ?? {};
    const indent = { ...wt.indent };
    if (indent.initiators) {
      const { groupIds, userfullnames, groupfullnames, ...rest } = indent.initiators;
      indent.initiators = rest;
    }
    if (indent.verifiers) {
      const { groupIds, userfullnames, groupfullnames, ...rest } = indent.verifiers;
      indent.verifiers = rest;
    }
    const steps = (wt.steps ?? []).map((step: any) => {
      const { fullnames: _af, _fullnames: _afh, ...assignment } = step.assignment ?? {};
      const { fullnames: _ef, _fullnames: _efh, ...escalation } = step.escalation ?? {};
      return { ...step, assignment, escalation };
    });
    return { ...topLevel, workflowTemplate: { ...wt, steps, indent } };
  };

  const isDataChanged = () =>
    JSON.stringify(formData) !== JSON.stringify(originalDataRef.current);

  // --- handle next step ---
  const handleConditionalNext = (next: () => void) => {
    if (isDataChanged()) {
      setLoading(true);
      // first hit API directly
      updateFmsTemp.mutate(buildApiPayload(formData), {
        onSuccess: () => {
          setLoading(false);
          // after API success, show modal
          refetch();
          setShowModal(true);
          setPendingNextStep(() => next);
          // refresh reference
          originalDataRef.current = JSON.parse(JSON.stringify(formData));
        },
        onError: (err) => {
          console.error("Failed to update FMS template:", err);
          setLoading(false);
        },
      });
    } else {
      // no change → go next directly
      next();
    }
  };

  // --- modal handlers ---
  const handleModalNext = () => {
    setShowModal(false);
    if (pendingNextStep) pendingNextStep();
    setPendingNextStep(null);
  };

  const handleModalStay = () => {
    setShowModal(false);
    setPendingNextStep(null);
  };

  const handleUpdate = () => {
    try {
      setLoading(true);
      updateFmsTemp.mutate(buildApiPayload(formData), {
        onSuccess: () => {
          setLoading(false);
          refetch();
          // router.push("/dashboard/workflow-templates");
        },
        onError: (err) => {
          console.error("Failed to update FMS template:", err);
          setLoading(false);
        },
      });
    } catch (err) {
      console.error("Error while building payload:", err);
      setLoading(false);
    }
  };

  const breadcrumbs = [
    { name: "", href: "/dashboard", icon: true },
    { name: "Workflow Templates", href: "/dashboard/workflow-templates" },
    { name: "Edit Workflow", href: null },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-2 w-1/4" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (canUpdate === false) {
    return <div className="p-4 sm:p-3 mt-4"><PermissionDeniedState /></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      <DynamicBreadcrumb breadcrumbs={breadcrumbs} />

      <div>
        <h1 className="text-2xl font-semibold">Edit FMS</h1>
        <p className="text-muted-foreground">
          Manage workflow system with custom forms and steps.
        </p>
      </div>

      <StepIndicator
        currentStep={step}
        steps={[
          {
            label: "FMS Configuration & Working Hours",
            sub: "Basic info and hours to calculate timelines.",
          },
          {
            label: "Enhanced Request Form Builder",
            sub: "Add dynamic forms with smart user fields.",
          },
          {
            label: "Advanced Workflow Design",
            sub: "Create workflows conditions, logic and timelines.",
          },
        ]}
      />

      {step === 1 && (
        <BasicInfo
          formData={formData}
          updateForm={updateForm}
          nextStep={() => handleConditionalNext(() => setStep(2))}
          buttonText="Save & Continue"
          loading={loading}
          _businessMode={businessMode}
        />
      )}

      {step === 2 && (
        <FormBuilder
          formData={formData}
          updateForm={updateForm}
          nextStep={() => handleConditionalNext(() => setStep(3))}
          prevStep={() => setStep(1)}
          buttonText="Save & Continue"
          loading={loading}
          isEdit={true}
        />
      )}

      {step === 3 && (
        <WorkflowDesign
          formData={formData}
          setFormData={setFormData}
          prevStep={() => setStep(2)}
          finish={() => handleUpdate()}
          loading={loading}
          buttonText="Save & Update"
        />
      )}

      {/* Show modal only after successful update */}
      <ConfirmationModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="FMS Updated Successfully"
        description="Your FMS has been updated successfully. Do you want to move to the next step?"
        confirmText="Yes, Next Step"
        cancelText="Stay Here"
        onConfirm={handleModalNext}
        onCancel={handleModalStay}
      />
    </div>
  );
}
