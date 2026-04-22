import React, { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/hooks/useApi";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type SearchType = "fms" | "step" | "referenceCode" | "user";

interface MultiSearchComponentProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "onFocus" | "onBlur" | "type"
> {
  search: string;
  setSearch: (value: string) => void;
  selectedIds?: string[];
  selectedList?: any[];
  onSelect: (item: any) => void;
  onRemove: (itemId: string) => void;
  isFocused: boolean;
  setIsFocused: (value: boolean) => void;
  showDropdown: boolean;
  setShowDropdown?: (value: boolean) => void;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onFocus: React.FocusEventHandler<HTMLInputElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
  label?: string;
  marginTop?: string;
  searchType: SearchType;
  getDisplayName: (item: any) => string;
  getItemId: (item: any) => string;
}

const MultiSearchComponent = ({
  search,
  setSearch,
  selectedIds = [],
  selectedList = [],
  onSelect,
  onRemove,
  isFocused: externalIsFocused,
  setIsFocused: externalSetIsFocused,
  showDropdown: externalShowDropdown,
  setShowDropdown: externalSetShowDropdown,
  placeholder = "Search...",
  onChange: externalOnChange,
  onFocus: externalOnFocus,
  onBlur: externalOnBlur,
  label,
  marginTop,
  searchType,
  getDisplayName,
  getItemId,
  ...inputProps
}: MultiSearchComponentProps) => {
  const [internalIsFocused, setInternalIsFocused] = useState(false);
  const [internalShowDropdown, setInternalShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFocused =
    externalIsFocused !== undefined ? externalIsFocused : internalIsFocused;
  const setIsFocused = externalSetIsFocused || setInternalIsFocused;
  const showDropdown =
    externalShowDropdown !== undefined
      ? externalShowDropdown
      : internalShowDropdown;
  const setShowDropdown = externalSetShowDropdown || setInternalShowDropdown;

  // Determine endpoint based on search type
  const getEndpoint = () => {
    switch (searchType) {
      case "fms":
        return API_ENDPOINTS.FMS_SEARCH;
      case "step":
        return API_ENDPOINTS.STEP_SEARCH;
      case "referenceCode":
        return API_ENDPOINTS.REFERENCE_CODE_SEARCH;
      case "user":
        return `${API_ENDPOINTS.DOER_SEARCH}`;
      default:
        return API_ENDPOINTS.FMS_SEARCH;
    }
  };

  // Determine data path based on search type
  const getDataPath = (data: any) => {
    switch (searchType) {
      case "fms":
        return data?.data?.fms || [];
      case "step":
        return data?.data?.steps || data?.data?.step || [];
      case "referenceCode":
        return data?.data?.indents || data?.data?.codes || data?.data || [];
      case "user":
        return data?.data?.users || [];
      default:
        return [];
    }
  };

  const { data: searchList, isLoading } = useApiQuery(
    [`${searchType}Search`, search, isFocused],
    `${getEndpoint()}?start=1&limit=1000${search ? `&search=${encodeURIComponent(search)}` : ""}`,
    {
      enabled: isFocused || !!search?.trim(),
      refetchOnWindowFocus: false,
      retry: 1,
    } as const,
  );

  const itemsList = getDataPath(searchList) || [];

  return (
    <div className="flex flex-col relative">
      {/* {label && <Label className="mb-1.5 text-sm font-medium">{label}</Label>} */}

      <Input
        {...inputProps}
        ref={inputRef}
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
        className="h-8 px-3 py-2 text-sm"
      />

      {/* Search dropdown */}
      {(isFocused || search) && showDropdown && (
        <>
          {isLoading ? (
            <div
              className={cn(
                "absolute left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-56 overflow-y-auto overscroll-contain text-sm top-[40px] z-50 px-3 py-2 text-gray-500",
                marginTop,
              )}
            >
              Searching...
            </div>
          ) : itemsList.length > 0 ? (
            <ul
              className={cn(
                "absolute left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-56 overflow-y-auto overscroll-contain text-sm top-[40px] z-50",
                marginTop,
              )}
            >
              {itemsList.map((item: any, index: number) => {
                const itemId = getItemId(item);
                const isSelected = selectedIds?.includes?.(itemId);
                return (
                  <li
                    key={index}
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
                      onSelect(item);
                      setShowDropdown(false);
                      setIsFocused(false);
                      setSearch("");
                      // Reset input focus
                      setTimeout(() => {
                        inputRef.current?.blur();
                      }, 0);
                    }}
                  >
                    {getDisplayName(item)}
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
                "absolute left-0 right-0 bg-white border border-gray-200 rounded shadow-lg max-h-56 overflow-y-auto overscroll-contain text-sm top-[40px] z-50 px-3 py-2 text-gray-500",
                marginTop,
              )}
            >
              {searchType === "fms"
                ? "FMS"
                : searchType === "step"
                  ? "Step"
                  : searchType === "user"
                    ? "User"
                    : "Reference code"}{" "}
              not found
            </div>
          )}
        </>
      )}

      {/* Selected items pills */}
      {/* {selectedList.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedList.map((item: any) => {
            const itemId = getItemId(item);
            const displayName = getDisplayName(item);
            return (
              <div
                key={itemId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs max-w-full"
                title={displayName}
              >
                <span className="truncate max-w-[200px]" title={displayName}>
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove(itemId);
                  }}
                  className="ml-0.5 hover:bg-gray-200 rounded-full p-0.5 flex-shrink-0 transition-colors"
                  aria-label={`Remove ${displayName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )} */}
    </div>
  );
};

export const MultiSearch = React.memo(MultiSearchComponent);
