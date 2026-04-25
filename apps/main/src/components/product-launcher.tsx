"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useProduct } from "@/context/product-context";
import { usePermissions } from "@/hooks/usePermissions";
import type { Product } from "@/config/products";

function ProductTile({
  product,
  isActive,
  onSelect,
}: {
  product: Product;
  isActive: boolean;
  onSelect: () => void;
}) {
  const Icon = product.icon;
  const isExternal = product.homeHref.startsWith("http");

  const tileClass = cn(
    "group relative flex flex-col items-center gap-2 rounded-xl p-3 transition-all duration-150 cursor-pointer select-none outline-none",
    isActive
      ? "bg-white shadow-sm ring-1 ring-border"
      : "hover:bg-white/70 hover:shadow-sm",
  );

  const inner = (
    <>
      {/* Icon container — soft tinted bg + colored icon */}
      <div className="relative">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-150 group-hover:scale-105",
            product.tileBg,
          )}
        >
          <Icon className={cn("h-5 w-5", product.iconColor)} strokeWidth={1.75} />
        </div>
        {/* Active checkmark badge */}
        {isActive && (
          <div className={cn(
            "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white",
            product.color,
          )}>
            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          </div>
        )}
      </div>

      <span className={cn(
        "text-center text-[11px] font-semibold leading-tight",
        isActive ? product.textColor : "text-muted-foreground group-hover:text-foreground",
      )}>
        {product.name}
      </span>
    </>
  );

  if (isExternal) {
    return <a href={product.homeHref} onClick={onSelect} className={tileClass}>{inner}</a>;
  }
  return (
    <Link href={product.homeHref} onClick={onSelect} className={tileClass}>
      {inner}
    </Link>
  );
}

export function ProductLauncher() {
  const [open, setOpen] = useState(false);
  const { activeProduct, products } = useProduct();
  const { canAccessMenu } = usePermissions();

  const visibleProducts = products.filter((p) => {
    const path = p.homeHref.startsWith("http") ? p.homeHref : p.homeHref.split("?")[0];
    return canAccessMenu(path);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Switch product"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150",
            open
              ? "bg-primary/10 text-primary ring-1 ring-primary/20"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={10}
        className="w-[270px] p-0 overflow-hidden shadow-lg border border-border/70"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-2.5 bg-muted/30">
          <span className="text-sm font-bold text-foreground">NitroBerry</span>
          <span className="text-xs text-muted-foreground font-medium">· Products</span>
        </div>

        {/* Tile grid */}
        <div className="bg-muted/10 p-2">
          <div className="grid grid-cols-3 gap-1">
            {visibleProducts.map((p) => (
              <ProductTile
                key={p.id}
                product={p}
                isActive={activeProduct?.id === p.id}
                onSelect={() => setOpen(false)}
              />
            ))}
          </div>
        </div>

        {/* Active product footer */}
        {activeProduct && (
          <div className="flex items-center gap-2 border-t px-4 py-2 bg-muted/20">
            <div className={cn("flex h-4 w-4 items-center justify-center rounded-md", activeProduct.tileBg)}>
              <activeProduct.icon className={cn("h-2.5 w-2.5", activeProduct.iconColor)} strokeWidth={2} />
            </div>
            <span className="text-[11px] text-muted-foreground">
              You're in{" "}
              <span className={cn("font-semibold", activeProduct.textColor)}>
                {activeProduct.name}
              </span>
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
