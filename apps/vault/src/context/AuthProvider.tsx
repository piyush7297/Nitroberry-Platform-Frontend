"use client";
import React from "react";
import type { NextPage } from "next";
import { SessionProvider } from "next-auth/react";

interface Props {
  children: React.ReactNode;
  session: any;
}
const AuthProvider: NextPage<Props> = ({ children, session }) => {
  return (
    <SessionProvider
      session={session}
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  );
};

export default AuthProvider;
