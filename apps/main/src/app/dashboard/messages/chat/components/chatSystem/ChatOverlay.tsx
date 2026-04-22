"use client";

import { SocketProvider } from "../../context/SocketContext";
import { ChatContent } from "./ChatContent";

export function ChatOverlay() {
  return (
    <SocketProvider>
      <ChatContent />
    </SocketProvider>
  );
}
