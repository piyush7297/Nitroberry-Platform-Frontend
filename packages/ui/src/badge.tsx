import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@nitroberry/shared";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 [&>span]:w-2 [&>span]:h-2 [&>span]:rounded-full capitalize",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border border-gray-200 bg-secondary text-secondary-foreground [&>span]:bg-gray-400",
        destructive:
          "border border-destructive bg-destructive/10 text-destructive [&>span]:bg-destructive",
        outline: "text-foreground",
        role: "border border-[#D0D5DD] rounded-[6px]",
        active:
          "border border-[#ABEFC6] bg-green-100 text-green-800 [&>span]:bg-green-500",
        disabled:
          "border border-[#FECDCA] bg-red-100 text-red-800 [&>span]:bg-red-500",
        high: "rounded-[6px] border border-[#FECDCA] bg-red-100 text-red-800",
        medium:
          "rounded-[6px] border border-[#FEDF89] bg-orange-100 text-orange-800",
        low: "rounded-[6px] border border-[#B2DDFF] bg-blue-100 text-blue-800",
        primary:
          "border border-[#C7D7FE] bg-indigo-100 text-indigo-800 [&>span]:bg-indigo-500",
        info: "border border-[#B2DDFF] bg-blue-100 text-blue-800 [&>span]:bg-blue-500",
        warning:
          "border border-[#FEDF89] bg-yellow-100 text-yellow-800 [&>span]:bg-yellow-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

interface BadgeProps
  extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  asChild = false,
  ...props
}) => {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {(variant === "active" ||
        variant === "disabled" ||
        variant === "info" ||
        variant === "warning" ||
        variant === "primary" ||
        variant === "secondary" ||
        variant === "destructive") && (
        <span className="w-2 h-2 rounded-full"></span>
      )}
      {props.children}
    </Comp>
  );
};

export { Badge, badgeVariants };
