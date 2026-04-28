"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";

interface Props {
  children: React.ReactNode;
  session: any;
}

const AuthProvider = ({ children, session }: Props) => {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false} refetchWhenOffline={false}>
      {children}
    </SessionProvider>
  );
};

export default AuthProvider;
