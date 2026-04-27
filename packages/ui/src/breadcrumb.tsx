import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@nitroberry/shared";
import Link from "next/link";

function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({ asChild, className, href, ...props }: any) {
  const Comp = asChild ? Slot : Link;

  return (
    <Comp
      href={href ?? "#"}
      data-slot="breadcrumb-link"
      className={cn(
        "hover:text-foreground transition-colors text-[#475467]",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn(
        "text-foreground font-normal bg-[#F9FAFB] py-2 px-3 rounded-[6px]",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("mx-1 [&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </span>
  );
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>
    </span>
  );
}
import { HomeIcon } from "lucide-react";

interface Crumb {
  name: string | any;
  href: string | null;
  icon?: boolean;
}

interface DynamicBreadcrumbProps {
  breadcrumbs: Crumb[];
}

function DynamicBreadcrumb({ breadcrumbs }: DynamicBreadcrumbProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, idx) => (
          <BreadcrumbItem key={idx}>
            {crumb.href ? (
              <>
                <BreadcrumbLink href={crumb.href}>
                  {crumb.icon && <HomeIcon className="inline w-5 h-5 mr-0" />}
                  {crumb.name}
                </BreadcrumbLink>
                {idx < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </>
            ) : (
              <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  DynamicBreadcrumb,
};
