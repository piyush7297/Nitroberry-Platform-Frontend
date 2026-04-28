"use client";

import React, { useMemo, useState } from "react";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Button } from "@nitroberry/ui";
import { Input } from "@nitroberry/ui";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@nitroberry/ui";
import { Check, ChevronsUpDown } from "lucide-react";

interface SearchableUserDropdownProps {
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    emptyOptionLabel?: string;
    selectedLabel?: string;
    excludeUserIds?: string[];
    queryKey?: string;
    disabled?: boolean;
}

const toStringValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return "";
};

const getUserLabel = (user: any): string => {
    const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    if (fullName) return fullName;
    return (
        user?.fullname ||
        user?.fullName ||
        user?.email ||
        toStringValue(user?.id ?? user?.userId) ||
        "Unknown User"
    );
};

export const SearchableUserDropdown: React.FC<SearchableUserDropdownProps> = ({
    value = "",
    onValueChange,
    placeholder = "Select user",
    emptyOptionLabel = "No Manager",
    selectedLabel,
    excludeUserIds = [],
    queryKey = "SEARCHABLE_USER_DROPDOWN",
    disabled = false,
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const normalizedValue = toStringValue(value);
    const trimmedSearch = search.trim();
    const excluded = useMemo(() => new Set(excludeUserIds.filter(Boolean)), [excludeUserIds]);

    const userListUrl = useMemo(
        () =>
            `${API_ENDPOINTS.USERS_COMMON}/search?start=1&limit=10${trimmedSearch ? `&search=${encodeURIComponent(trimmedSearch)}` : ""
            }`,
        [trimmedSearch],
    );

    const { data: userListData, isLoading } = useApiQuery(
        [queryKey, open, trimmedSearch],
        userListUrl,
        {
            enabled: open,
            refetchOnWindowFocus: false,
            staleTime: 0,
            retry: 1,
        } as const,
    );

    const userOptions = useMemo(() => {
        const users =
            userListData?.data?.users ||
            userListData?.data?.data ||
            (Array.isArray(userListData?.data) ? userListData?.data : []);

        if (!Array.isArray(users)) return [];

        const seen = new Set<string>();
        return users.filter((user: any) => {
            const userId = toStringValue(user?.id ?? user?.userId);
            if (!userId || seen.has(userId) || excluded.has(userId)) {
                return false;
            }
            seen.add(userId);
            return true;
        });
    }, [userListData, excluded]);

    const selectedOption = useMemo(
        () =>
            userOptions.find(
                (user: any) => toStringValue(user?.id ?? user?.userId) === normalizedValue,
            ) || null,
        [userOptions, normalizedValue],
    );

    const triggerLabel = normalizedValue
        ? selectedOption
            ? getUserLabel(selectedOption)
            : selectedLabel || "Selected Manager"
        : emptyOptionLabel || placeholder;

    const handleSelect = (nextValue: string) => {
        onValueChange(nextValue);
        setOpen(false);
    };

    return (
        <Popover
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) {
                    setSearch("");
                }
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between font-normal"
                    disabled={disabled}
                >
                    <span className="truncate text-left">{triggerLabel}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent align="start" className="w-[360px] max-w-[calc(100vw-5rem)] p-0">
                <div className="border-b p-2">
                    <Input
                        type="search"
                        placeholder="Search users..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        onKeyDown={(event) => event.stopPropagation()}
                    />
                </div>

                <div className="max-h-56 overflow-y-auto p-1">
                    <button
                        type="button"
                        onClick={() => handleSelect("")}
                        className="flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm hover:bg-gray-100"
                    >
                        <span>{emptyOptionLabel}</span>
                        <Check
                            className={`h-4 w-4 ${normalizedValue ? "opacity-0" : "opacity-100"}`}
                        />
                    </button>

                    {isLoading ? (
                        <div className="px-2 py-3 text-sm text-gray-500">Loading users...</div>
                    ) : userOptions.length > 0 ? (
                        userOptions.map((user: any) => {
                            const userId = toStringValue(user?.id ?? user?.userId);
                            if (!userId) return null;

                            const userLabel = getUserLabel(user);

                            return (
                                <button
                                    key={userId}
                                    type="button"
                                    onClick={() => handleSelect(userId)}
                                    className="flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm hover:bg-gray-100"
                                >
                                    <span className="truncate">{userLabel}</span>
                                    <Check
                                        className={`h-4 w-4 ${normalizedValue === userId ? "opacity-100" : "opacity-0"}`}
                                    />
                                </button>
                            );
                        })
                    ) : (
                        <div className="px-2 py-3 text-sm text-gray-500">No users found</div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};
