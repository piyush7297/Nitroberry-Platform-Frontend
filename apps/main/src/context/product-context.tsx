"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { type Product, getProductForPath, PRODUCTS } from "@/config/products";

type ProductContextValue = {
  /** The product matching the current route, or undefined outside any product. */
  activeProduct: Product | undefined;
  /** All registered products (for the launcher). */
  products: Product[];
};

const ProductContext = createContext<ProductContextValue | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const value = useMemo<ProductContextValue>(
    () => ({
      activeProduct: getProductForPath(pathname),
      products: PRODUCTS,
    }),
    [pathname],
  );

  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  );
}

export function useProduct() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error("useProduct must be used within a ProductProvider");
  return ctx;
}
