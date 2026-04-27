import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Clock, Loader, Mail, UploadCloud, User } from "lucide-react";
import React, { memo, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "next-auth/react";
import { FormikValues, useFormik } from "formik";
import { useApiMutationFormData } from "@/hooks/useApi";
import { HTTP_METHODS } from "@/api/methods";
import { API_ENDPOINTS } from "@/api/endpoints";

const AccountDetailsComponentTab = () => {
  const { data: session, update }: any = useSession();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const updateProfile = useApiMutationFormData(
    HTTP_METHODS.PUT,
    `${API_ENDPOINTS.UPDATE_PROFILE}`,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.image_link) {
      setPreviewImage(session?.user?.image_link);
    }
  }, [session?.user?.image_link]);

  const formik = useFormik<FormikValues>({
    initialValues: {
      firstName: session?.user?.firstName || "",
      lastName: session?.user?.lastName || "",
      country: session?.user?.country || "",
      timezone: session?.user?.timezone || "",
      photo: null,
    },
    onSubmit: async (values) => {
      const formData = new FormData();
      formData.append("firstName", values.firstName);
      formData.append("lastName", values.lastName);
      formData.append("country", values.country);
      formData.append("timezone", values.timezone);

      // Only append photo if a file exists
      if (values.photo) {
        formData.append("photo", values.photo);
      }

      setLoading(true);

      updateProfile.mutate(formData, {
        onSuccess: async (res) => {
          setLoading(false);
          await update({
            ...session,
            user: {
              ...session.user,
              firstName: values.firstName,
              lastName: values.lastName,
              name: `${values.firstName || ""} ${values.lastName || ""}`.trim(),
              country: values.country,
              timezone: values.timezone,
              ...(res?.data?.photo && { image_link: res?.data?.photo }),
            },
          });

          formik.resetForm({ values }); // optional: reset form with current values
        },
        onError: (err: any) => {
          setLoading(false);
          // optionally show toast or error message here
        },
      });
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      formik.setFieldValue("photo", file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <section className="w-full space-y-5">
      {/* Header */}
      <div className="border-b border-gray-200">
        <h1 className="text-xl font-semibold">Account Details</h1>
        <p className="text-gray-600 text-sm font-normal mb-4">
          Update your photo and personal details here.
        </p>
      </div>

      <form onSubmit={formik.handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <Label
            htmlFor="fullName"
            className="text-sm font-medium text-gray-700 md:col-span-1"
          >
            Name
          </Label>

          {/* First + Last Name inline */}
          <div className="md:col-span-2 grid grid-cols-2 gap-2">
            <Input
              id="firstName"
              placeholder="Oliva"
              className="w-full"
              value={formik.values.firstName}
              onChange={formik.handleChange}
            />
            <Input
              id="lastName"
              placeholder="Smith"
              className="w-full"
              value={formik.values.lastName}
              onChange={formik.handleChange}
            />
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Email */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <label className="block text-sm font-medium text-gray-700 md:col-span-1">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 mt-0.5 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="you@company.com"
              className="pl-10 bg-white w-full"
              type="email"
              value={session?.user?.email}
              onChange={(e) => e.preventDefault()}
              disabled
            />
          </div>
        </div>
        <hr className="border-gray-200" />
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <label className="block text-sm font-medium text-gray-700 md:col-span-1">
            Your photo
            <br />
            <span className="text-xs text-gray-500">
              This will be displayed on your profile.
            </span>
          </label>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-300">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <User className="w-5 h-" />
                </div>
              )}
            </div>

            {/* Upload Box */}
            <label className="flex-1 cursor-pointer relative border-2 border-primary rounded-lg p-4 flex flex-col items-center justify-center text-start hover:border-primary/80 hover:bg-primary/10 transition">
              <UploadCloud className="w-6 h-6 text-gray-400 mb-2" />
              <span className="text-sm text-gray-700">
                <span className="text-sm text-primary">Click to upload </span>or
                drag and drop
              </span>
              <span className="text-xs text-gray-400">
                SVG, PNG, JPG or GIF (max. 800×400px)
              </span>
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleImageChange}
              />
            </label>
          </div>
        </div>

        <hr className="border-gray-200" />
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <label className="block text-sm font-medium text-gray-700 md:col-span-1">
            Role
          </label>
          <div className="relative">
            <Input
              placeholder="Super Admin"
              className="bg-white w-full"
              type="text"
              value={session?.user?.role_id}
              onChange={(e) => e.preventDefault()}
              disabled
            />
          </div>
        </div>
        <hr className="border-gray-200" />
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <label className="block text-sm font-medium text-gray-700 md:col-span-1">
            Country
          </label>
          <Select
            defaultValue=""
            value={formik.values.country}
            onValueChange={(value) => formik.setFieldValue("country", value)}
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us">United States</SelectItem>
              <SelectItem value="ca">Canada</SelectItem>
              <SelectItem value="gb">United Kingdom</SelectItem>
              <SelectItem value="au">Australia</SelectItem>
              <SelectItem value="in">India</SelectItem>
              {/* Add more countries as needed */}
            </SelectContent>
          </Select>
        </div>
        <hr className="border-gray-200" />
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <label className="block text-sm font-medium text-gray-700 md:col-span-1">
            Timezone
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Select
              defaultValue=""
              value={formik.values.timezone}
              onValueChange={(value) => formik.setFieldValue("timezone", value)}
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
                {/* Add more timezones as needed */}
              </SelectContent>
            </Select>
          </div>
        </div>
        <hr className="border-gray-200" />

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => {}}>
            {"Cancel"}
          </Button>
          <Button disabled={loading} type="submit">
            {" "}
            {loading && <Loader className="animate-spin w-5 h-5" />}Update
            profile
          </Button>
        </div>
      </form>
    </section>
  );
};

export const AccountDetailsTab = memo(AccountDetailsComponentTab);
