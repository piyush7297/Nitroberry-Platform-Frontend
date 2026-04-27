"use client";

import { useEffect, useState } from "react";
import BasicInfo from "./steps/basic-info";
import FormBuilder from "./steps/form-builder";
import WorkflowDesign from "./steps/workflow-design";
import { Check } from "lucide-react";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import { API_ENDPOINTS } from "@/api/endpoints";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

const getDefaultCreateTemplateFormData = () => ({
  name: "",
  description: "",
  templateCode: "",
  workflowTemplate: {
    steps: [],
    indent: {
      form: [],
      initiator: [],
      initiators: {},
      verifiers: {},
      indentFormData: [],
      referenceIdPrefix: "",
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
      timezone: "",
    },
  },
});

const normalizeTemplateForCreate = (fms: any) => {
  const defaults = getDefaultCreateTemplateFormData();
  return {
    ...defaults,
    name: fms?.name || "",
    description: fms?.description || "",
    templateCode: fms?.templateCode || "",
    workflowTemplate: {
      ...defaults.workflowTemplate,
      steps: fms?.workflowTemplate?.steps || fms?.step || [],
      indent: fms?.workflowTemplate?.indent || {
        ...defaults.workflowTemplate.indent,
        form: fms?.indent || [],
        initiator: fms?.initiator || [],
      },
    },
  };
};

const stripIndentExtras = (indent: any) => {
  const clean = { ...indent };
  if (clean.initiators) {
    const { groupIds, userfullnames, groupfullnames, ...rest } = clean.initiators;
    clean.initiators = rest;
  }
  if (clean.verifiers) {
    const { groupIds, userfullnames, groupfullnames, ...rest } = clean.verifiers;
    clean.verifiers = rest;
  }
  return clean;
};

const buildApiPayload = (formData: any) => {
  const { priority, skipHolidays, businessHours, ...wt } = formData.workflowTemplate ?? {};
  const steps = (wt.steps ?? []).map((step: any) => {
    const { fullnames: _af, _fullnames: _afh, ...assignment } = step.assignment ?? {};
    const { fullnames: _ef, _fullnames: _efh, ...escalation } = step.escalation ?? {};
    return { ...step, assignment, escalation };
  });
  return {
    ...formData,
    workflowTemplate: {
      ...wt,
      steps,
      indent: stripIndentExtras(wt.indent ?? {}),
    },
  };
};

export default function CreateFmsSystems() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");
  const aiPrefill = searchParams.get("aiPrefill");
  const isDemoTemplateId = Boolean(templateId?.startsWith("demo-"));
  const { create: canCreate } = useModulePermissions(3);
  const [prefillApplied, setPrefillApplied] = useState(false);

  // Global form state
  const [formData, setFormData] = useState<any>(getDefaultCreateTemplateFormData());

  const { data: templatePrefillData, isLoading: isLoadingTemplatePrefill } =
    useApiQuery(
      ["CreateFmsTemplatePrefill", templateId],
      `${API_ENDPOINTS.FMS_TEMPLATE}/${templateId}`,
      {
        refetchOnWindowFocus: false,
        retry: 1,
        enabled: !!templateId && !isDemoTemplateId && canCreate,
      } as const,
    );

  useEffect(() => {
    if (prefillApplied || !templateId || !isDemoTemplateId) return;

    try {
      const raw = sessionStorage.getItem("aiGeneratedTemplatesById");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const demoTemplate = parsed?.[templateId];
      if (!demoTemplate) return;

      setFormData(normalizeTemplateForCreate(demoTemplate));
      setPrefillApplied(true);
      toast({
        title: "Template loaded",
        description: "Workflow data has been prefilled from demo template.",
      });
    } catch (error) {
      console.error("Failed to load demo template prefill:", error);
    }
  }, [prefillApplied, templateId, isDemoTemplateId]);

  useEffect(() => {
    if (prefillApplied || !templatePrefillData?.data) return;

    setFormData(normalizeTemplateForCreate(templatePrefillData.data));
    setPrefillApplied(true);
    toast({
      title: "Template loaded",
      description: "Workflow data has been prefilled from generated template.",
    });
  }, [templatePrefillData, prefillApplied]);

  useEffect(() => {
    if (prefillApplied || aiPrefill !== "1") return;

    try {
      const raw = sessionStorage.getItem("aiGeneratedTemplateData");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const candidate = parsed?.workflowTemplate
        ? parsed
        : parsed?.data?.workflowTemplate
          ? parsed.data
          : null;

      if (!candidate) return;

      setFormData(normalizeTemplateForCreate(candidate));
      setPrefillApplied(true);
      sessionStorage.removeItem("aiGeneratedTemplateData");
      toast({
        title: "Template loaded",
        description: "Workflow data has been prefilled from AI response.",
      });
    } catch (error) {
      console.error("Failed to load AI template prefill:", error);
    }
  }, [aiPrefill, prefillApplied]);

  // Update any single field
  const updateForm = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const createFmsTemp = useApiMutation(
    HTTP_METHODS.POST,
    API_ENDPOINTS.FMS_TEMPLATE,
  );

  const handleSavePublish = () => {
    try {
      setLoading(true);
      createFmsTemp.mutate(buildApiPayload(formData), {
        onSuccess: () => {
          setLoading(false);
          router.push("/dashboard/workflow-templates");
        },
        onError: (err) => {
          console.error("Failed to create FMS template:", err);
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
    { name: "Create New Workflow", href: null },
  ];

  const handleNextStep = () => {
    // Validate business hours
    if (
      formData.workflowTemplate.businessHours.day.monday.start >
      formData.workflowTemplate.businessHours.day.monday.end
    ) {
      toast({
        title: "Error!",
        description: "End time cannot be less than start time",
        variant: "destructive",
      });
      return;
    }

    setStep(2);
  };

  if (canCreate === false) {
    return <div className="p-4 sm:p-6 mt-4"><PermissionDeniedState /></div>;
  }

  if (templateId && !isDemoTemplateId && isLoadingTemplatePrefill && !prefillApplied) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Loading generated template...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Breadcrumbs */}
      <DynamicBreadcrumb breadcrumbs={breadcrumbs} />

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold">Create New Workflow</h1>
        <p className="text-muted-foreground">
          Complete workflow system with custom forms and steps.
        </p>
      </div>

      {/* Stepper */}
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

      {/* Steps */}
      {step === 1 && (
        <BasicInfo
          formData={formData}
          updateForm={updateForm}
          nextStep={handleNextStep}
        />
      )}

      {step === 2 && (
        <FormBuilder
          formData={formData}
          updateForm={updateForm}
          nextStep={() => {
            if (formData.templateCode.length < 2) {
              toast({
                title: "Error!",
                description:
                  "Reference ID Prefix must be at least 2 characters long",
                variant: "destructive",
              });
              return;
            } else {
              setStep(3);
            }
          }}
          prevStep={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <WorkflowDesign
          formData={formData}
          setFormData={setFormData}
          // addWorkflowRule={addWorkflowRule}
          prevStep={() => setStep(2)}
          finish={() => handleSavePublish()}
          loading={loading}
        />
      )}
      {/* <ConfirmationModal
        open={isOpen}
        onClose={() => setOpen(false)}
        title="FMS Created Successfully"
        description="Your new FMS has been created and is now available in Systems Management."
        confirmText="Go to Dashboard"
        cancelText="Cancel"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      /> */}
    </div>
  );
}

// Reusable Step Indicator

type Step = {
  label: string;
  sub?: string;
};

type StepperProps = {
  steps: Step[];
  currentStep: number; // 1-based index
};

export function StepIndicator({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex flex-col items-start w-full">
      <div className="flex items-start w-[70%]">
        {steps.map((step, index) => {
          const isActive = index + 1 === currentStep;
          const isCompleted = index + 1 < currentStep;
          const isConnectorActive = index < currentStep;
          return (
            <div key={index} className="flex-1 flex items-center">
              {index !== 0 && (
                <div
                  className={`flex-1 h-0.5 ${isConnectorActive ? "bg-primary" : "bg-gray-300"
                    }`}
                />
              )}
              <div className="relative w-6 h-6 flex items-center justify-center z-10">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full border-2 border-primary bg-primary/30 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                ) : (
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isActive ? "border-primary" : "border-gray-300"
                      }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-primary" : "bg-gray-300"
                        }`}
                    />
                  </div>
                )}
              </div>
              {index !== steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${index + 1 < currentStep ? "bg-primary" : "bg-gray-300"
                    }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels below the steps */}
      <div className="flex justify-between w-full mt-3 text-start">
        {steps.map((step, index) => (
          <div key={index} className="flex-1 px-1">
            <div
              className={`text-sm font-medium ${index + 1 === currentStep ? "text-primary" : "text-gray-700"
                }`}
            >
              {step.label}
            </div>
            {step.sub && (
              <div
                className={`text-xs font-medium ${index + 1 === currentStep
                    ? "text-primary/80"
                    : "text-muted-foreground"
                  }`}
              >
                {step.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
