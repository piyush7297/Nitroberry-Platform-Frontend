"use client";

import type { ReactNode } from "react";
import { ProductProvider } from "@/context/product-context";

/**
 * Groups all client-only providers that wrap the dashboard layout.
 * Kept separate so the dashboard layout can remain a Server Component.
 */
export function ClientProviders({ children }: { children: ReactNode }) {
  return <ProductProvider>{children}</ProductProvider>;
}
