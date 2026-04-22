import { Button } from "@/components/ui/button";
import Image from "next/image";
import React, { memo } from "react";

interface EmptyStateProps {
  onClick: () => void;
  buttonTitle: string;
  title: string;
  description: string;
}

function EmptyStateComponent({
  onClick,
  description,
  buttonTitle,
  title,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-16">
      <div className="flex flex-col items-center justify-center min-h-[50vh] sm:h-[40vh] text-center bg-[url('/images/background-empty.png')] bg-center bg-no-repeat bg-cover px-4">
        <div className="mx-auto mb-4 rounded-full flex items-center justify-center">
          <Image
            alt=""
            src="/images/empty-icon.svg"
            height={60}
            width={60}
            className="sm:h-20 sm:w-20"
          />
        </div>

        {/* Heading */}
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-gray-500 text-xs sm:text-sm mb-6 max-w-xs">
          {description}
        </p>

        {/* CTA Button */}
        {buttonTitle && (
          <Button onClick={onClick} variant={"default"}>
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              {buttonTitle}
            </div>
          </Button>
        )}
      </div>
    </div>
  );
}

export const EmptyState = memo(EmptyStateComponent);
