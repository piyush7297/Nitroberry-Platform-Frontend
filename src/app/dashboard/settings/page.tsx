"use client";

import { useState } from "react";
import {
  pageTabBadgeClassName,
  pageTabButtonClassName,
  pageTabsTrackClassName,
} from "@/components/ui/page-tabs";
import { cn } from "@/lib/utils";
import { AccountDetailsTab } from "./tabs/accountDetailsTab";
import { PasswordTab } from "./tabs/passwordTab";
import { Notification } from "./tabs/notificationTab";
import { AuditLogsTab } from "./tabs/auditLogsTab";
import Permissions from "./tabs/permissionsTab";
const Tabs = [
  { label: "Account Details", value: "account" },
  { label: "Password", value: "password" },
  { label: "Notifications", value: "notifications" },
  { label: "Audit Logs", value: "auditLogs" },
  { label: "Permissions", value: "permissions" },
];
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("account");

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-gray-600">
          Manage your account, preferences, and app experience all in one place.
        </p>
      </div>

      <div className="mb-6">
        <nav
          className={cn(pageTabsTrackClassName, "flex flex-wrap overflow-x-auto")}
          aria-label="Tabs"
        >
          {Tabs.map((item, index) => (
            <button
              key={index}
              type="button"
              className={pageTabButtonClassName(activeTab === item.value)}
              onClick={() => setActiveTab(item.value)}
            >
              {item.label}
              {item.value === "plan" && (
                <span className={pageTabBadgeClassName(activeTab === item.value)}>
                  2
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
      {/* Tab Content */}
      <div className="bg-white">
        {activeTab === "account" && <AccountDetailsTab />}
        {activeTab === "password" && <PasswordTab />}
        {activeTab === "notifications" && <Notification />}
        {activeTab === "auditLogs" && <AuditLogsTab />}
        {activeTab === "permissions" && <Permissions />}
      </div>
    </div>
  );
}
