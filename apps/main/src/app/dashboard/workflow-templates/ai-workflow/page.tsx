"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DynamicBreadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useApiMutation } from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Loader2, Sparkles } from "lucide-react";
import {
  PermissionDeniedState,
  useModulePermissions,
} from "@/components/PermissionGuard";

type AiWorkflowFields = {
  workflowGoal: string;
  industry: string;
  processType: string;
  businessContext: string;
  actors: string[];
  templeteCode: string;
  rules: string[];
  stepCountPreference: number;
  timelinePreference: string;
  outputLanguage: string;
};

type TemplateStep = {
  timelineInMinutes?: number;
  assignment?: Array<{
    userId?: unknown[];
  }>;
};

type AiTemplateResponse = {
  name?: string;
  description?: string;
  templeteCode?: string;
  workflowTemplate?: {
    steps?: TemplateStep[];
  };
};

const initialAiFields: AiWorkflowFields = {
  workflowGoal: "",
  industry: "",
  processType: "",
  businessContext: "",
  actors: [],
  templeteCode: "",
  rules: [],
  stepCountPreference: 0,
  timelinePreference: "",
  outputLanguage: "English",
};

const unwrapApiPayload = <T,>(payload: unknown): T | null => {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as { data?: unknown };

  if (candidate.data && typeof candidate.data === "object") {
    return candidate.data as T;
  }

  return payload as T;
};

const normalizeAiFieldsFromResponse = (
  response: unknown,
  fallbackDescription: string,
): AiWorkflowFields => {
  const data = unwrapApiPayload<Record<string, unknown>>(response);
  const templateCandidate = data as AiTemplateResponse | null;
  const steps = templateCandidate?.workflowTemplate?.steps ?? [];

  const explicit = data as Partial<AiWorkflowFields> | null;
  const workflowGoal =
    explicit?.workflowGoal ||
    templateCandidate?.name ||
    fallbackDescription ||
    "";

  const businessContext =
    explicit?.businessContext || templateCandidate?.description || "";

  const templateCode =
    explicit?.templeteCode || templateCandidate?.templeteCode || "";

  const computedTimeline =
    steps.length > 0
      ? `${steps.reduce((sum, step) => sum + (step.timelineInMinutes ?? 0), 0)} mins total`
      : "";

  const actorCount = steps.reduce(
    (sum, step) => sum + (step.assignment?.[0]?.userId?.length ?? 0),
    0,
  );

  return {
    workflowGoal,
    industry: explicit?.industry || "",
    processType: explicit?.processType || "",
    businessContext,
    actors: Array.isArray(explicit?.actors)
      ? explicit.actors.filter((x): x is string => typeof x === "string")
      : actorCount > 0
        ? [`${actorCount} assigned users in generated flow`]
        : [],
    templeteCode: templateCode,
    rules: Array.isArray(explicit?.rules)
      ? explicit.rules.filter((x): x is string => typeof x === "string")
      : [],
    stepCountPreference:
      typeof explicit?.stepCountPreference === "number"
        ? explicit.stepCountPreference
        : steps.length,
    timelinePreference:
      explicit?.timelinePreference || computedTimeline || "",
    outputLanguage:
      explicit?.outputLanguage || initialAiFields.outputLanguage,
  };
};

export default function AiWorkflowPage() {
  const router = useRouter();
  const { create: canCreate } = useModulePermissions(3);
  const generateFieldsMutation = useApiMutation(
    HTTP_METHODS.POST,
    API_ENDPOINTS.FMS_AI_WORKFLOW_GENERATE_FIELDS,
  );
  const generateTemplateMutation = useApiMutation(
    HTTP_METHODS.POST,
    API_ENDPOINTS.FMS_AI_WORKFLOW_GENERATE_TEMPLATE,
  );

  const [description, setDescription] = useState("");
  const [descriptionLocked, setDescriptionLocked] = useState(false);
  const [aiFields, setAiFields] = useState<AiWorkflowFields>(initialAiFields);
  const [hasGeneratedFields, setHasGeneratedFields] = useState(false);
  const [isGeneratingFields, setIsGeneratingFields] = useState(false);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);

  const canGenerate = description.trim().length > 0 && !isGeneratingFields;

  const canGenerateTemplate = useMemo(() => {
    return (
      hasGeneratedFields &&
      aiFields.workflowGoal.trim().length > 0 &&
      aiFields.templeteCode.trim().length > 0 &&
      !isGeneratingTemplate
    );
  }, [hasGeneratedFields, aiFields, isGeneratingTemplate]);

  const breadcrumbs = [
    { name: "", href: "/dashboard", icon: true },
    { name: "Workflow Templates", href: "/dashboard/workflow-templates" },
    { name: "Ai Workflow", href: null },
  ];

  const onGenerateFields = async () => {
    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please enter a description before generating fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGeneratingFields(true);

      const fieldsResponse = await generateFieldsMutation.mutateAsync({
        description: description.trim(),
      });

      const normalizedFields = normalizeAiFieldsFromResponse(
        fieldsResponse,
        description.trim(),
      );

      setAiFields(normalizedFields);
      setDescriptionLocked(true);
      setHasGeneratedFields(true);
      toast({
        title: "Fields generated",
        description: "You can edit fields before generating the template.",
      });
    } catch {
      toast({
        title: "Generate failed",
        description: "Failed to generate AI fields.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingFields(false);
    }
  };

  const onGenerateTemplate = async () => {
    try {
      setIsGeneratingTemplate(true);

      const templateResponse = await generateTemplateMutation.mutateAsync({
        description: description.trim(),
        ...aiFields,
      });

      const templateData =
        unwrapApiPayload<Record<string, unknown>>(templateResponse) ||
        templateResponse;
      const demoTemplateId = `demo-${Date.now()}`;

      const storedRaw = sessionStorage.getItem("aiGeneratedTemplatesById");
      const storedMap = storedRaw ? JSON.parse(storedRaw) : {};
      storedMap[demoTemplateId] = templateData;

      sessionStorage.setItem(
        "aiGeneratedTemplatesById",
        JSON.stringify(storedMap),
      );
      sessionStorage.setItem(
        "aiGeneratedTemplateData",
        JSON.stringify(templateData),
      );

      router.push(
        `/dashboard/workflow-templates/create?templateId=${encodeURIComponent(demoTemplateId)}&aiPrefill=1`,
      );
    } catch {
      toast({
        title: "Generate template failed",
        description: "Failed to generate demo template.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  const onUnlockDescription = () => {
    setDescriptionLocked(false);
    setHasGeneratedFields(false);
    setAiFields(initialAiFields);
  };

  if (canCreate === false) {
    return (
      <div className="p-4 sm:p-6 mt-4">
        <PermissionDeniedState />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      <DynamicBreadcrumb breadcrumbs={breadcrumbs} />

      <div>
        <h1 className="text-2xl font-semibold">Ai Workflow</h1>
        <p className="text-muted-foreground">
          Describe your process, generate AI fields, review them, and create a
          workflow template.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4 sm:p-6 space-y-4">
        <div className="grid gap-1.5">
          <Label>Description</Label>
          <Textarea
            placeholder="Describe the workflow you want to generate..."
            value={description}
            disabled={descriptionLocked}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onGenerateFields} disabled={!canGenerate}>
            {isGeneratingFields ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </Button>

          {descriptionLocked && (
            <Button variant="outline" onClick={onUnlockDescription}>
              Edit Description
            </Button>
          )}
        </div>
      </div>

      {hasGeneratedFields && (
        <div className="rounded-lg border bg-white p-4 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Generated Fields</h2>
            <p className="text-sm text-muted-foreground">
              Edit these fields if needed, then generate template.
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-1.5 md:col-span-2">
              <Label>Workflow Goal</Label>
              <Input
                value={aiFields.workflowGoal}
                onChange={(e) =>
                  setAiFields((prev) => ({ ...prev, workflowGoal: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Industry</Label>
              <Input
                value={aiFields.industry}
                onChange={(e) =>
                  setAiFields((prev) => ({ ...prev, industry: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Process Type</Label>
              <Input
                value={aiFields.processType}
                onChange={(e) =>
                  setAiFields((prev) => ({ ...prev, processType: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5 md:col-span-2">
              <Label>Business Context</Label>
              <Textarea
                rows={3}
                value={aiFields.businessContext}
                onChange={(e) =>
                  setAiFields((prev) => ({ ...prev, businessContext: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Template Code</Label>
              <Input
                value={aiFields.templeteCode}
                onChange={(e) =>
                  setAiFields((prev) => ({ ...prev, templeteCode: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Step Count Preference</Label>
              <Input
                type="number"
                min={0}
                value={aiFields.stepCountPreference}
                onChange={(e) =>
                  setAiFields((prev) => ({
                    ...prev,
                    stepCountPreference: Number(e.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Timeline Preference</Label>
              <Input
                value={aiFields.timelinePreference}
                onChange={(e) =>
                  setAiFields((prev) => ({ ...prev, timelinePreference: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Output Language</Label>
              <Input
                value={aiFields.outputLanguage}
                onChange={(e) =>
                  setAiFields((prev) => ({ ...prev, outputLanguage: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5 md:col-span-2">
              <Label>Actors (comma separated)</Label>
              <Input
                value={aiFields.actors.join(", ")}
                onChange={(e) =>
                  setAiFields((prev) => ({
                    ...prev,
                    actors: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </div>

            <div className="grid gap-1.5 md:col-span-2">
              <Label>Rules (one per line)</Label>
              <Textarea
                rows={4}
                value={aiFields.rules.join("\n")}
                onChange={(e) =>
                  setAiFields((prev) => ({
                    ...prev,
                    rules: e.target.value
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={onGenerateTemplate} disabled={!canGenerateTemplate}>
              {isGeneratingTemplate ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Template...
                </>
              ) : (
                "Generate Template"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
