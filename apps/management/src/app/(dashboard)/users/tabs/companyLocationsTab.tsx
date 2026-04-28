"use client";

import React, { useMemo, useState } from "react";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { HTTP_METHODS } from "@/api/methods";
import { Loader, MapPin, Plus, RefreshCcw, Search } from "lucide-react";
import { EmptyState } from "@/components/not-found";
import { Button } from "@nitroberry/ui";
import { Input } from "@nitroberry/ui";
import { Label } from "@nitroberry/ui";
import { PermissionGuard, useModulePermissions } from "@/components/PermissionGuard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nitroberry/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@nitroberry/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nitroberry/ui";

type LocationItem = {
  id?: string | number;
  title?: string;
  name?: string;
  addresses?: {
    street?: string;
    city?: string;
    country?: string;
  };
  timeZone?: string;
  createdAt?: string;
  updatedAt?: string;
};

const TIMEZONE_OPTIONS = [
  "PST",
  "MST",
  "CST",
  "EST",
  "GMT",
  "IST",
  "UTC",
];

const toDisplayAddress = (location: LocationItem) => {
  const parts = [
    location?.addresses?.street,
    location?.addresses?.city,
    location?.addresses?.country,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "-";
};

export function CompanyLocationsTab() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    street: "",
    city: "",
    country: "",
    timeZone: "",
  });

  const { update: canUpdate } = useModulePermissions(9);

  const { data, isLoading, isFetching, refetch } = useApiQuery(
    ["CompanyLocations", 1, 1000],
    `${API_ENDPOINTS.COMPANY_LOCATION}?start=1&limit=1000`,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  const createLocation = useApiMutation(HTTP_METHODS.POST, API_ENDPOINTS.COMPANY_LOCATION);

  const locations: LocationItem[] = useMemo(() => {
    const source = data?.data;
    if (Array.isArray(source)) return source;
    if (Array.isArray(source?.locations)) return source.locations;
    return [];
  }, [data]);

  const filteredLocations = useMemo(() => {
    const query = locationSearch.trim().toLowerCase();
    if (!query) return locations;

    return locations.filter((location) => {
      const searchable = [
        location.title || location.name,
        location.addresses?.street,
        location.addresses?.city,
        location.addresses?.country,
        location.timeZone,
      ]
        .map((s) => String(s || "").toLowerCase())
        .join(" ");

      return searchable.includes(query);
    });
  }, [locations, locationSearch]);

  const resetForm = () => {
    setFormData({
      title: "",
      street: "",
      city: "",
      country: "",
      timeZone: "",
    });
  };

  const handleCreateLocation = () => {
    const title = formData.title.trim();
    const street = formData.street.trim();
    const city = formData.city.trim();
    const country = formData.country.trim();

    if (!title) return;

    setIsSubmitting(true);

    createLocation.mutate(
      {
        title,
        addresses: {
          street,
          city,
          country,
        },
        timeZone: formData.timeZone || null,
      },
      {
        onSuccess: () => {
          setIsSubmitting(false);
          setIsDrawerOpen(false);
          resetForm();
          void refetch();
        },
        onError: () => {
          setIsSubmitting(false);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-9 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="ml-auto flex items-center gap-2">
            <div className="h-8 w-28 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>{["Location", "Address", "Timezone", "Created At"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-sm font-medium text-gray-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t animate-pulse">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-3/4" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <EmptyState
          onClick={() => {}}
          buttonTitle=""
          title="No Company Locations Yet"
          description="Add locations from Company Settings. Calendars are automatically created per location."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Sheet
        open={isDrawerOpen}
        onOpenChange={(open) => {
          setIsDrawerOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <SheetContent side="right" className="w-[96vw] gap-0 p-0 sm:max-w-xl">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle>Add Company Location</SheetTitle>
              <SheetDescription>
                Create a location and its calendar will be available in the Location Calendar tab.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="rounded-xl border bg-white p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location-title">Location Name</Label>
                  <Input
                    id="location-title"
                    placeholder="Head Office"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location-street">Street</Label>
                  <Input
                    id="location-street"
                    placeholder="Street"
                    value={formData.street}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, street: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location-city">City</Label>
                  <Input
                    id="location-city"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, city: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location-country">Country</Label>
                  <Input
                    id="location-country"
                    placeholder="Country"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, country: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location-timezone">Timezone</Label>
                  <Select
                    value={formData.timeZone || undefined}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, timeZone: value }))
                    }
                  >
                    <SelectTrigger id="location-timezone" className="w-full">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((timezone) => (
                        <SelectItem key={timezone} value={timezone}>
                          {timezone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4">
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDrawerOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateLocation}
                  disabled={isSubmitting || !formData.title.trim()}
                >
                  {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                  Add Location
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <Input
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search locations..."
              className="pl-9"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <PermissionGuard moduleId={9} action="update">
              <Button
                type="button"
                size="sm"
                onClick={() => setIsDrawerOpen(true)}
                disabled={!canUpdate}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Location
              </Button>
            </PermissionGuard>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => void refetch()}
              aria-label="Refresh locations"
              disabled={isFetching}
            >
              <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {filteredLocations.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-white px-4 py-8 text-center text-sm text-slate-500">
            {locationSearch ? "No locations match your search." : "No locations found."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.map((location) => (
                  <TableRow key={String(location.id || location.name || location.title)}>
                    <TableCell className="font-medium">
                      {location.title || location.name || "-"}
                    </TableCell>
                    <TableCell>{toDisplayAddress(location)}</TableCell>
                    <TableCell>{location.timeZone || "-"}</TableCell>
                    <TableCell>
                      {location.createdAt
                        ? new Date(location.createdAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
