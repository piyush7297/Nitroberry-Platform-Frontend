import { Input } from "@nitroberry/ui";
import { Label } from "@nitroberry/ui";
import { Button } from "@nitroberry/ui";
import { Clock, Loader, PlusCircle, Trash2, UploadCloud } from "lucide-react";
import React, { memo, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nitroberry/ui";
import { useApiMutationFormData, useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { HTTP_METHODS } from "@/api/methods";
import { PermissionGuard, useModulePermissions } from "@/components/PermissionGuard";

const REGISTRATION_NAME_OPTIONS = [
  { value: "gst", label: "GST" },
  { value: "vat", label: "VAT" },
  { value: "pan", label: "PAN" },
  { value: "tan", label: "TAN" },
  { value: "cin", label: "CIN" },
  { value: "msme", label: "MSME / Udyam" },
  { value: "iec", label: "Import Export Code (IEC)" },
  { value: "ein", label: "EIN (US)" },
  { value: "company_reg", label: "Company registration" },
  { value: "trade_license", label: "Trade license" },
  { value: "other", label: "Other" },
] as const;

type RegistrationRow = {
  "Registration Name": string;
  "Registration Number": string;
};

type ThemeColorSettings = {
  textPrimaryColor: string;
  themePrimaryColor: string;
};

const DEFAULT_THEME_COLORS: ThemeColorSettings = {
  textPrimaryColor: "#1f2937",
  themePrimaryColor: "#7f56d9",
};

const THEME_COLOR_FIELDS: Array<{
  key: keyof ThemeColorSettings;
  label: string;
  helper: string;
}> = [
    {
      key: "themePrimaryColor",
      label: "Theme Primary",
      helper: "Used for primary buttons and section borders.",
    },
  ];

const normalizeHexColor = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)
    ? trimmed
    : fallback;
};

const resolveThemeColors = (companyData: any): ThemeColorSettings => {
  const companyUi = companyData?.companyUi || {};
  const uiSettings = companyUi?.uiSettings || companyUi;
  const lightMode = uiSettings?.core?.light || uiSettings?.light || {};

  return {
    textPrimaryColor: normalizeHexColor(
      lightMode?.["--foreground"] || uiSettings?.textPrimaryColor,
      DEFAULT_THEME_COLORS.textPrimaryColor,
    ),
    themePrimaryColor: normalizeHexColor(
      lightMode?.["--primary"] ||
      lightMode?.["--card-border-color"] ||
      lightMode?.["--border"] ||
      uiSettings?.themePrimaryColor ||
      uiSettings?.buttonPrimaryColor ||
      uiSettings?.borderColor,
      DEFAULT_THEME_COLORS.themePrimaryColor,
    ),
  };
};

const deriveButtonAndBorderColor = (colors: ThemeColorSettings) =>
  normalizeHexColor(colors.themePrimaryColor, DEFAULT_THEME_COLORS.themePrimaryColor);

function normalizeRegistrationRow(raw: Record<string, unknown>): RegistrationRow {
  const num =
    (raw["Registration Number"] as string) ??
    (raw.registrationNumber as string) ??
    "";
  const name =
    (raw["Registration Name"] as string) ??
    (raw.registrationName as string) ??
    "";
  return {
    "Registration Name": String(name),
    "Registration Number": String(num),
  };
}

function registrationRowComplete(row: RegistrationRow): boolean {
  return (
    Boolean(row["Registration Name"]?.trim()) &&
    Boolean(row["Registration Number"]?.trim())
  );
}

const CompanySettingsTabComponent = () => {
  const [loading, setLoading] = useState(false);

  const { update: canUpdate } = useModulePermissions(9);

  const [formData, setFormData] = useState<any>({
    name: "",
    website: "",
    category: "",
    street: "",
    city: "",
    country: "",
    timezone: "",
    photo: null,
    addresses: [
      {
        title: "",
        addresses: { street: "", city: "", country: "" },
        timeZone: null,
      },
    ],
    registrations: [
      { "Registration Name": "", "Registration Number": "" },
    ] satisfies RegistrationRow[],
    companyCode: null,
    themeColors: DEFAULT_THEME_COLORS,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  const { data, isLoading, refetch } = useApiQuery(
    ["Company"],
    API_ENDPOINTS.COMPANY,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  // --- Prefill form when data available ---
  useEffect(() => {
    if (data?.data) {
      const c = data.data;
      setFormData({
        name: c.name || "",
        website: c.website || "",
        category: c.category || "",
        addresses: c.addresses?.length
          ? c.addresses
          : [
            {
              title: "",
              addresses: { street: "", city: "", country: "" },
              timeZone: null,
            },
          ],
        registrations: c.registrationId?.length
          ? (c.registrationId as Record<string, unknown>[]).map(
            normalizeRegistrationRow,
          )
          : [{ "Registration Name": "", "Registration Number": "" }],
        timezone: c.timezone || "",
        companyLogo: c?.companyLogo,
        companyCode: c.companyCode || null,
        themeColors: resolveThemeColors(c),
      });
      if (c.companyLogo) setPreviewLogo(c.companyLogo);
    }
  }, [data]);

  useEffect(() => {
    const colors: ThemeColorSettings =
      formData.themeColors || DEFAULT_THEME_COLORS;
    const rootStyle = document.documentElement.style;

    rootStyle.setProperty("--foreground", colors.textPrimaryColor);
    rootStyle.setProperty("--primary", colors.themePrimaryColor);
    rootStyle.setProperty("--card-border-color", colors.themePrimaryColor);
  }, [formData.themeColors]);

  const updateCompany = useApiMutationFormData(
    HTTP_METHODS.PUT,
    API_ENDPOINTS.COMPANY,
  );

  // --- Handle text inputs ---
  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateThemeColor = (key: keyof ThemeColorSettings, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      themeColors: {
        ...(prev.themeColors || DEFAULT_THEME_COLORS),
        [key]: value,
      },
    }));
  };

  const normalizeThemeColor = (key: keyof ThemeColorSettings) => {
    setFormData((prev: any) => {
      const current = prev?.themeColors || DEFAULT_THEME_COLORS;
      return {
        ...prev,
        themeColors: {
          ...current,
          [key]: normalizeHexColor(current[key], DEFAULT_THEME_COLORS[key]),
        },
      };
    });
  };

  const resetThemeColors = () => {
    setFormData((prev: any) => ({
      ...prev,
      themeColors: DEFAULT_THEME_COLORS,
    }));
  };

  // --- Handle logo file ---
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setPreviewLogo(URL.createObjectURL(file));
    }
  };

  // --- Submit handler ---
  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = new FormData();

      payload.append("name", formData.name);
      payload.append("website", formData.website);
      const registrationsPayload = (formData.registrations as RegistrationRow[])
        .filter(registrationRowComplete)
        .map((row) => ({
          "Registration Name": row["Registration Name"].trim(),
          "Registration Number": row["Registration Number"].trim(),
        }));
      payload.append("registration", JSON.stringify(registrationsPayload));
      const addressesWithoutIsPrimary = formData.addresses.map(
        ({ isPrimary, ...rest }: { isPrimary: boolean; rest: any }) => rest,
      );
      payload.append("addresses", JSON.stringify(addressesWithoutIsPrimary));
      payload.append("category", formData.category);

      const themeColors: ThemeColorSettings =
        formData.themeColors || DEFAULT_THEME_COLORS;
      const themePrimaryColor = deriveButtonAndBorderColor(themeColors);

      const companyUiPayload = {
        uiSettings: {
          textPrimaryColor: themeColors.textPrimaryColor,
          buttonPrimaryColor: themePrimaryColor,
          borderColor: themePrimaryColor,
          core: {
            light: {
              "--foreground": themeColors.textPrimaryColor,
              "--primary": themePrimaryColor,
              "--card-border-color": themePrimaryColor,
            },
            dark: {
              "--foreground": themeColors.textPrimaryColor,
              "--primary": themePrimaryColor,
              "--card-border-color": themePrimaryColor,
            },
          },
        },
      };

      // payload.append("companyUi", JSON.stringify(companyUiPayload));
      payload.append(
        "themeSettings",
        JSON.stringify({
          ...themeColors,
          buttonPrimaryColor: themePrimaryColor,
          borderColor: themePrimaryColor,
        }),
      );

      if (logoFile) {
        payload.append("photo", logoFile);
      }

      updateCompany.mutate(payload, {
        onSuccess: () => {
          refetch();
          setLoading(false);
        },
        onError: (error: any) => {
          console.error(error);
          setLoading(false);
        },
      });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="animate-spin w-6 h-6" />
      </div>
    );
  }

  const previewPrimaryColor = deriveButtonAndBorderColor(
    formData?.themeColors || DEFAULT_THEME_COLORS,
  );

  return (
    <section className="w-full space-y-5">
      {/* Header */}
      <div className="border-b border-gray-200">
        <h1 className="text-xl font-semibold">Company Settings</h1>
        <p className="text-gray-600 text-sm font-normal mb-4">
          Update your company information and settings here.
        </p>
      </div>

      <div className="space-y-5">
        {/* Company Name */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <Label
            htmlFor="company_name"
            className="text-sm font-medium text-gray-700 md:col-span-1"
          >
            Company name
          </Label>
          <div className="md:col-span-2 grid grid-cols-2 gap-2">
            <Input
              id="company_name"
              placeholder="Oliva"
              className="w-full"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              type="text"
            />
            <Input
              id="companyCode"
              placeholder="company code"
              className="w-full"
              value={formData?.companyCode ?? ""}
              onChange={(e) => handleChange("companyCode", e.target.value)}
              type="text"
              readOnly
            />
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Website */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <label className="block text-sm font-medium text-gray-700 md:col-span-1">
            Website
          </label>
          <div className="md:col-span-2 grid grid-cols-2 gap-2">
            <Input
              id="website"
              placeholder="https://example.com"
              className="bg-white w-full"
              type="text"
              value={formData.website}
              onChange={(e) => handleChange("website", e.target.value)}
            />
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Logo */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <label className="block text-sm font-medium text-gray-700 md:col-span-1">
            Logo
            <br />
            <span className="text-xs text-gray-500">Upload your company logo</span>
          </label>
          <div className="md:col-span-2 flex items-start gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-300">
              {previewLogo ? (
                <img src={previewLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
              )}
            </div>

            <label className="flex-1 cursor-pointer relative border-2 border-primary rounded-lg p-4 flex flex-col items-center justify-center text-start hover:border-primary/80 hover:bg-primary/10 transition">
              <UploadCloud className="w-6 h-6 text-gray-400 mb-2" />
              <span className="text-sm text-gray-700">
                <span className="text-primary">Click to upload</span> or drag and drop
              </span>
              <span className="text-xs text-gray-400">SVG, PNG, JPG or GIF (max. 800×400px)</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleLogoChange}
              />
            </label>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Address */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <label className="block text-sm font-medium text-gray-700 md:col-span-1">
            Address
          </label>
          <div className="md:col-span-2 grid grid-cols-1 gap-2">
            {formData.addresses
              .filter((addr: any) => !addr.isDeleted)
              .map((addr: any, index: number) => (
                <div key={index} className="space-y-3 border p-4 rounded-lg relative">
                  <Input
                    placeholder="Title"
                    className="w-full"
                    type="text"
                    value={addr.title || ""}
                    onChange={(e) => {
                      const updated = [...formData.addresses];
                      updated[index] = { ...updated[index], title: e.target.value };
                      setFormData({ ...formData, addresses: updated });
                    }}
                  />
                  <Input
                    placeholder="Street"
                    className="w-full"
                    type="text"
                    value={addr.addresses?.street || ""}
                    onChange={(e) => {
                      const updated = [...formData.addresses];
                      updated[index] = {
                        ...updated[index],
                        addresses: {
                          ...updated[index].addresses,
                          street: e.target.value,
                        },
                      };
                      setFormData({ ...formData, addresses: updated });
                    }}
                  />
                  <Input
                    placeholder="City"
                    className="w-full"
                    type="text"
                    value={addr.addresses?.city || ""}
                    onChange={(e) => {
                      const updated = [...formData.addresses];
                      updated[index] = {
                        ...updated[index],
                        addresses: {
                          ...updated[index].addresses,
                          city: e.target.value,
                        },
                      };
                      setFormData({ ...formData, addresses: updated });
                    }}
                  />
                  <Select
                    value={addr.addresses?.country || ""}
                    onValueChange={(value) => {
                      const updated = [...formData.addresses];
                      updated[index] = {
                        ...updated[index],
                        addresses: {
                          ...updated[index].addresses,
                          country: value,
                        },
                      };
                      setFormData({ ...formData, addresses: updated });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="ca">Canada</SelectItem>
                      <SelectItem value="gb">United Kingdom</SelectItem>
                      <SelectItem value="au">Australia</SelectItem>
                      <SelectItem value="in">India</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={addr.timeZone || ""}
                    onValueChange={(value) => {
                      const updated = [...formData.addresses];
                      updated[index] = {
                        ...updated[index],
                        timeZone: value || null,
                      };
                      setFormData({ ...formData, addresses: updated });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PST">Pacific Standard Time (PST) UTC−08:00</SelectItem>
                      <SelectItem value="MST">Mountain Standard Time (MST) UTC−07:00</SelectItem>
                      <SelectItem value="CST">Central Standard Time (CST) UTC−06:00</SelectItem>
                      <SelectItem value="EST">Eastern Standard Time (EST) UTC−05:00</SelectItem>
                      <SelectItem value="GMT">Greenwich Mean Time (GMT) UTC+00:00</SelectItem>
                      <SelectItem value="IST">India Standard Time (IST) UTC+05:30</SelectItem>
                      <SelectItem value="5.5">UTC+05:30</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.addresses.length > 1 && !addr?.isPrimary && (
                    <button
                      type="button"
                      className="absolute right-4 top-4 text-red-500 hover:text-red-600 cursor-pointer"
                      onClick={() => {
                        const updated = formData.addresses.filter((_: any, i: any) => i !== index);
                        setFormData({ ...formData, addresses: updated });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-2">
            <div></div>
            <Button
              variant="secondary"
              size="sm"
              className="flex items-center gap-2 w-max"
              onClick={() =>
                setFormData({
                  ...formData,
                  addresses: [
                    ...formData.addresses,
                    {
                      title: "",
                      addresses: { street: "", city: "", country: "" },
                      timeZone: null,
                    },
                  ],
                })
              }
            >
              <PlusCircle className="w-4 h-4" /> Add Another Location
            </Button>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Timezone */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <label className="block text-sm font-medium text-gray-700 md:col-span-1">
            Timezone
          </label>
          <div className=" relative md:col-span-2 grid grid-cols-2 gap-2">
            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Select
              value={formData.timezone}
              onValueChange={(value) => handleChange("timezone", value)}
            >
              <SelectTrigger className="pl-10 w-full bg-white">
                <SelectValue placeholder="Select a timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PST">
                  Pacific Standard Time (PST) UTC−08:00
                </SelectItem>
                <SelectItem value="MST">
                  Mountain Standard Time (MST) UTC−07:00
                </SelectItem>
                <SelectItem value="CST">
                  Central Standard Time (CST) UTC−06:00
                </SelectItem>
                <SelectItem value="EST">
                  Eastern Standard Time (EST) UTC−05:00
                </SelectItem>
                <SelectItem value="GMT">
                  Greenwich Mean Time (GMT) UTC+00:00
                </SelectItem>
                <SelectItem value="IST">
                  India Standard Time (IST) UTC+05:30
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Theme Customization */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <label className="block text-sm font-medium text-gray-700 md:col-span-1">
            Theme customization
            <br />
            <span className="text-xs text-gray-500">
              Customize key brand colors for your company UI.
            </span>
          </label>
          <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {THEME_COLOR_FIELDS.map(({ key, label }) => {
                const colorValue =
                  formData?.themeColors?.[key] || DEFAULT_THEME_COLORS[key];

                return (
                  <div
                    key={key}
                    className="rounded-lg border bg-white p-3 flex items-center gap-3"
                  >
                    <div
                      className="h-8 w-8 rounded-md border"
                      style={{ backgroundColor: normalizeHexColor(colorValue, DEFAULT_THEME_COLORS[key]) }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">
                        {label}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{colorValue}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border bg-white p-3">
              <p
                className="text-sm font-semibold"
                style={{ color: formData?.themeColors?.textPrimaryColor }}
              >
                Theme preview
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  className="h-8 px-3 text-xs"
                  style={{
                    backgroundColor: previewPrimaryColor,
                    borderColor: previewPrimaryColor,
                  }}
                >
                  Primary Action
                </Button>
                <div
                  className="rounded-md border px-2 py-1 text-xs text-gray-600"
                  style={{ borderColor: previewPrimaryColor }}
                >
                  Border sample
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {THEME_COLOR_FIELDS.map(({ key, label, helper }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700">
                    {label} Color
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      className="h-10"
                      value={formData?.themeColors?.[key] || ""}
                      onChange={(e) => updateThemeColor(key, e.target.value)}
                      onBlur={() => normalizeThemeColor(key)}
                      placeholder={DEFAULT_THEME_COLORS[key]}
                    />
                    <Input
                      type="color"
                      className="h-10 w-12 min-w-12 p-1 cursor-pointer"
                      value={normalizeHexColor(
                        formData?.themeColors?.[key],
                        DEFAULT_THEME_COLORS[key],
                      )}
                      onChange={(e) => updateThemeColor(key, e.target.value)}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">{helper}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetThemeColors}
              >
                Reset to defaults
              </Button>
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Registration */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <label className="block text-sm font-medium text-gray-700 md:col-span-1">
            Registration details
          </label>
          <div className="md:col-span-2 grid grid-cols-1 gap-2">
            {(formData.registrations as RegistrationRow[]).map(
              (reg, index) => {
                const selectedOnOtherRows = new Set(
                  (formData.registrations as RegistrationRow[])
                    .map((r, i) =>
                      i !== index ? r["Registration Name"]?.trim() : "",
                    )
                    .filter(Boolean),
                );
                const currentName = reg["Registration Name"]?.trim() ?? "";
                const isKnownType = REGISTRATION_NAME_OPTIONS.some(
                  (o) => o.value === currentName,
                );
                const legacyOption =
                  currentName && !isKnownType
                    ? [{ value: currentName, label: currentName }]
                    : [];
                const nameOptions = [
                  ...legacyOption,
                  ...REGISTRATION_NAME_OPTIONS.filter(
                    (opt) =>
                      !selectedOnOtherRows.has(opt.value) ||
                      opt.value === reg["Registration Name"],
                  ),
                ];

                return (
                  <div
                    key={index}
                    className="relative space-y-3 rounded-lg border p-4"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600">
                          Registration name
                        </Label>
                        <Select
                          value={reg["Registration Name"] || undefined}
                          onValueChange={(value) => {
                            const updated = [
                              ...(formData.registrations as RegistrationRow[]),
                            ];
                            updated[index] = {
                              ...updated[index],
                              "Registration Name": value,
                            };
                            setFormData({ ...formData, registrations: updated });
                          }}
                        >
                          <SelectTrigger className="w-full bg-white">
                            <SelectValue placeholder="Select registration type" />
                          </SelectTrigger>
                          <SelectContent>
                            {nameOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600">
                          Registration number
                        </Label>
                        <Input
                          placeholder="Registration number"
                          value={reg["Registration Number"]}
                          onChange={(e) => {
                            const updated = [
                              ...(formData.registrations as RegistrationRow[]),
                            ];
                            updated[index] = {
                              ...updated[index],
                              "Registration Number": e.target.value,
                            };
                            setFormData({ ...formData, registrations: updated });
                          }}
                        />
                      </div>
                    </div>
                    {formData.registrations.length > 1 && (
                      <button
                        type="button"
                        className="absolute right-3 top-3 text-red-500 hover:text-red-600 cursor-pointer"
                        onClick={() => {
                          const updated = (
                            formData.registrations as RegistrationRow[]
                          ).filter((_, i) => i !== index);
                          setFormData({
                            ...formData,
                            registrations:
                              updated.length > 0
                                ? updated
                                : [
                                  {
                                    "Registration Name": "",
                                    "Registration Number": "",
                                  },
                                ],
                          });
                        }}
                        aria-label="Remove registration"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              },
            )}
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-2">
            <div />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex w-max items-center gap-2"
              disabled={
                !(formData.registrations as RegistrationRow[]).every(
                  registrationRowComplete,
                )
              }
              onClick={() =>
                setFormData({
                  ...formData,
                  registrations: [
                    ...(formData.registrations as RegistrationRow[]),
                    { "Registration Name": "", "Registration Number": "" },
                  ],
                })
              }
            >
              <PlusCircle className="h-4 w-4" /> Add Another Registration
            </Button>
          </div>
        </div>

        <hr className="border-gray-200" />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => { }}>
          Cancel
        </Button>
        <PermissionGuard moduleId={9} action="update">
          <Button disabled={loading} onClick={handleSave}>
            {loading && <Loader className="animate-spin w-5 h-5" />} Save
          </Button>
        </PermissionGuard>
      </div>
    </section>
  );
};

export const CompanySettingsTab = memo(CompanySettingsTabComponent);
