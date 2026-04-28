"use client";

import { ProductLauncherPopover } from "@/components/ui/product-launcher";
import { useProduct } from "@/context/product-context";
import { usePermissions } from "@/hooks/usePermissions";

export function ProductLauncher() {
  const { activeProduct, products } = useProduct();
  const { canAccessMenu } = usePermissions();

  const visibleProducts = products.filter((p) => {
    const path = p.homeHref.startsWith("http") ? p.homeHref : p.homeHref.split("?")[0];
    return canAccessMenu(path);
  });

  return (
    <ProductLauncherPopover
      products={visibleProducts}
      activeProductId={activeProduct?.id}
    />
  );
}
