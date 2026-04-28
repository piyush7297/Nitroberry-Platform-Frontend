import React, { useState } from "react";
import { Input } from "@nitroberry/ui";
import { useApiQuery } from "@nitroberry/api-client";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Label } from "@nitroberry/ui";
import { cn } from "@nitroberry/shared";

interface UserSearchComponentProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "onFocus" | "onBlur" | "type"
> {
  search: string;
  setSearch: (value: string) => void;
  selectedUserIds?: string[];
  onSelect: (user: any) => void;
  isFocused: boolean;
  setIsFocused: (value: boolean) => void;
  showDropdown: boolean;
  setShowDropdown?: (value: boolean) => void;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onFocus: React.FocusEventHandler<HTMLInputElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
  label?: string;
  marginTop?: string;
}

const UserSearchComponent = ({
  search,
  setSearch,
  selectedUserIds = [],
  onSelect,
  isFocused: externalIsFocused,
  setIsFocused: externalSetIsFocused,
  showDropdown: externalShowDropdown,
  setShowDropdown: externalSetShowDropdown,
  placeholder = "Search users...",
  onChange: externalOnChange,
  onFocus: externalOnFocus,
  onBlur: externalOnBlur,
  label,
  marginTop,
  ...inputProps
}: UserSearchComponentProps) => {
  const [internalIsFocused, setInternalIsFocused] = useState(false);
  const [internalShowDropdown, setInternalShowDropdown] = useState(false);

  const isFocused =
    externalIsFocused !== undefined ? externalIsFocused : internalIsFocused;
  const setIsFocused = externalSetIsFocused || setInternalIsFocused;
  const showDropdown =
    externalShowDropdown !== undefined
      ? externalShowDropdown
      : internalShowDropdown;
  const setShowDropdown = externalSetShowDropdown || setInternalShowDropdown;

  const { data: userSearchList, isLoading } = useApiQuery(
    ["CommonUserSearch", search, isFocused],
    `${API_ENDPOINTS.USERS_COMMON}/search?start=1&limit=1000${search ? `&search=${encodeURIComponent(search)}` : ""}`,
    {
      enabled: isFocused || !!search?.trim(),
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  const users = userSearchList?.data?.users || [];

  return (
    <div className="flex flex-col space-y-2 relative">
      {label && <Label className="mb-1.5 text-sm font-medium">{label}</Label>}
      <Input
        {...inputProps}
        type="search"
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowDropdown(true);
          externalOnChange?.(e);
        }}
        onFocus={(e) => {
          setIsFocused(true);
          setShowDropdown(true);
          externalOnFocus?.(e);
        }}
        onBlur={(e) => {
          setTimeout(() => {
            setIsFocused(false);
            setShowDropdown(false);
          }, 200);
          externalOnBlur?.(e);
        }}
      />

      {/* Search dropdown */}
      {(isFocused || search) && showDropdown && (
        <>
          {isLoading ? (
            <div
              className={cn(
                "absolute left-0 right-0  bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto text-sm top-[65px] z-[9999] px-3 py-2 text-gray-500",
                marginTop,
              )}
            >
              Searching...
            </div>
          ) : users.length > 0 ? (
            <ul
              className={cn(
                "absolute left-0 right-0  bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto text-sm top-[65px] z-[9999]",
                marginTop,
              )}
            >
              {users.map((u: any) => {
                const isSelected = selectedUserIds?.includes?.(u.id);
                return (
                  <li
                    key={u.id}
                    className={`px-3 py-2 ${
                      isSelected
                        ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                        : "hover:bg-gray-100 cursor-pointer"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={() => {
                      if (isSelected) return;
                      onSelect(u);
                      setShowDropdown(false);
                      setIsFocused(false);
                      setSearch("");
                    }}
                  >
                    {u.firstName} {u.lastName}
                    {isSelected && (
                      <span className="ml-2 text-xs">(Selected)</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div
              className={cn(
                "absolute left-0 right-0  bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto text-sm top-[65px] z-[9999] px-3 py-2 text-gray-500",
                marginTop,
              )}
            >
              User not found
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const UserSearch = React.memo(UserSearchComponent);
