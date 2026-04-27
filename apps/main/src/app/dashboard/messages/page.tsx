"use client";

import { ChatOverlay } from "./chat/components/chatSystem/ChatOverlay";
import { PermissionGuard, useModulePermissions, PermissionDeniedState } from "@/components/PermissionGuard";

export default function Messages() {
  const { hasAccess: canRead } = useModulePermissions(13);

  if (canRead === false) {
    return <div className="p-4 sm:p-3 mt-4 w-full"><PermissionDeniedState /></div>;
  }

  return (
    <section className="h-[calc(100dvh-3rem)] md:h-[calc(100dvh-1rem)] w-full">
      <ChatOverlay />
    </section>
  );
}

