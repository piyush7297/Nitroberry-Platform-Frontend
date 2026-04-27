import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import React, { memo, useState } from "react";

interface NotificationOption {
  id: string;
  label: string;
  description?: string;
}

interface NotificationSection {
  title: string;
  description: string;
  options: NotificationOption[];
  type?: "radio" | "checkbox";
}

const sections: NotificationSection[] = [
  {
    title: "Notifications from us",
    description:
      "Receive the latest news, updates and industry tutorials from us.",
    type: "checkbox",
    options: [
      {
        id: "news_updates",
        label: "News and updates",
        description: "News about product and feature updates.",
      },
      {
        id: "tips_tutorials",
        label: "Tips and tutorials",
        description: "Tips on getting more out of Untitled.",
      },
      {
        id: "user_research",
        label: "User research",
        description:
          "Get involved in our beta testing program or participate in paid product user research.",
      },
    ],
  },
  {
    title: "Comments",
    description:
      "These are notifications for comments on your posts and replies to your comments.",
    type: "radio",
    options: [
      {
        id: "dont_notify_comments",
        label: "Do not notify me",
        description: "",
      },
      {
        id: "mentions_only",
        label: "Mentions only",
        description: "Only notify me if I’m mentioned in a comment.",
      },
      {
        id: "all_comments",
        label: "All comments",
        description: "Notify me for all comments on my posts.",
      },
    ],
  },
  {
    title: "Reminders",
    description:
      "These are notifications to remind you of updates you might have missed.",
    type: "radio",
    options: [
      {
        id: "dont_notify_reminders",
        label: "Do not notify me",
        description: "",
      },
      {
        id: "important_reminders",
        label: "Important reminders only",
        description: "Only notify me if the reminder is tagged as important.",
      },
      {
        id: "all_reminders",
        label: "All reminders",
        description: "Notify me for all reminders.",
      },
    ],
  },
  {
    title: "More activity about you",
    description:
      "These are notifications for posts on your profile, likes and other reactions to your posts, and more.",
    type: "radio",
    options: [
      {
        id: "dont_notify_activity",
        label: "Do not notify me",
        description: "",
      },
      {
        id: "all_activity",
        label: "All activity",
        description: "Notify me for all other activity.",
      },
    ],
  },
];

const NotificationTab = () => {
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [checkedOptions, setCheckedOptions] = useState<Record<string, boolean>>(
    {},
  );

  const handleRadioChange = (sectionIndex: number, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [sectionIndex]: value }));
  };

  const handleCheckboxChange = (optionId: string) => {
    setCheckedOptions((prev) => ({ ...prev, [optionId]: !prev[optionId] }));
  };

  return (
    <section className="w-full space-y-5">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-xl font-semibold">Email Notifications</h1>
        <p className="text-gray-600 text-sm font-normal">
          Get emails to find out what’s going on when you’re not online. You can
          turn them off anytime.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((section, idx) => (
          <div key={idx}>
            <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
              <label className="block text-sm font-medium text-gray-700 md:col-span-1">
                {section.title}
                <br />
                <span className="text-xs text-gray-500">
                  {section.description}
                </span>
              </label>

              <div>
                {section.type === "checkbox" ? (
                  <div className="space-y-2">
                    {section.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-start space-x-3"
                      >
                        <Checkbox
                          id={option.id}
                          checked={!!checkedOptions[option.id]}
                          onCheckedChange={() =>
                            handleCheckboxChange(option.id)
                          }
                          className="mt-1"
                        />
                        <div className="flex flex-col w-full">
                          <Label
                            htmlFor={option.id}
                            className="text-sm text-gray-700 cursor-pointer"
                          >
                            {option.label}
                          </Label>
                          {option.description && (
                            <p className="text-xs text-gray-500 mt-1">
                              {option.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedOptions[idx] || section.options[0].id}
                    onValueChange={(value) => handleRadioChange(idx, value)}
                    className="space-y-2"
                  >
                    {section.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-start space-x-3"
                      >
                        <RadioGroupItem
                          value={option.id}
                          id={option.id}
                          className="mt-0.5"
                        />
                        <div className="flex flex-col w-full">
                          <Label
                            htmlFor={option.id}
                            className="text-sm text-gray-700 cursor-pointer"
                          >
                            {option.label}
                          </Label>
                          {option.description && (
                            <p className="text-xs text-gray-500 mt-1">
                              {option.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            </div>

            {idx !== sections.length - 1 && (
              <hr className="border-gray-200 mt-4" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export const Notification = memo(NotificationTab);
