"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PenLine, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SocialPostComposer } from "@/components/social/social-post-composer";
import { MultiSearch } from "@/components/multi-search";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useCreateCommunityMutation } from "@/hooks/use-social-communities";

type SocialCreateNewMenuProps = {
  triggerClassName?: string;
  /** Wider trigger for mobile sheet */
  fullWidthTrigger?: boolean;
};

type CommunityVisibility = "private" | "public";

export function SocialCreateNewMenu({
  triggerClassName,
  fullWidthTrigger,
}: SocialCreateNewMenuProps) {
  const pathname = usePathname();
  const createCommunityMut = useCreateCommunityMutation();
  const [postOpen, setPostOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [communityName, setCommunityName] = useState("");
  const [communityDescription, setCommunityDescription] = useState("");
  const [communityVisibility, setCommunityVisibility] =
    useState<CommunityVisibility>("private");
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const communityFormScrollRef = useRef<HTMLDivElement | null>(null);

  const communityRouteMatch = pathname.match(/\/dashboard\/social\/communities\/([^/]+)/);
  const defaultCommunityId = communityRouteMatch?.[1] ?? null;

  const getMemberDisplayName = (user: any) =>
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.fullname ||
    `User-${user?.id ?? ""}`;

  const getMemberInitials = (user: any) => {
    const name = getMemberDisplayName(user);
    const parts = name.split(/\s+/).filter(Boolean);
    return (
      `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? parts[0]?.[1] ?? ""}`.toUpperCase() ||
      "U"
    );
  };

  const resetCommunityForm = () => {
    setCommunityName("");
    setCommunityDescription("");
    setCommunityVisibility("private");
    setSelectedMembers([]);
    setMemberSearch("");
    setShowMemberDropdown(false);
  };

  const handleCommunityOpenChange = (open: boolean) => {
    setCommunityOpen(open);
    if (!open) resetCommunityForm();
  };

  const handleCreateCommunity = () => {
    if (!communityName.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Enter a name for your community.",
      });
      return;
    }
    const isPrivate = communityVisibility === "private";
    const members =
      isPrivate && selectedMembers.length > 0
        ? selectedMembers
          .map((u) => String(u?.id ?? ""))
          .filter(Boolean)
          .map((userId) => ({
            userId,
            // permissions: {
            //   canPost: true,
            //   canAcceptRequests: true,
            //   canDeletePosts: true,
            // },
          }))
        : undefined;

    createCommunityMut.mutate(
      {
        name: communityName.trim(),
        description: communityDescription.trim(),
        isPrivate,
        ...(members ? { members } : {}),
      },
      {
        onSuccess: () => {
          setCommunityOpen(false);
          resetCommunityForm();
        },
      },
    );
  };

  useEffect(() => {
    if (!communityOpen) return;
    communityFormScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [communityOpen]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className={cn(
              "h-8 gap-1 rounded-full px-3 text-xs font-semibold",
              fullWidthTrigger && "w-full justify-center",
              triggerClassName,
            )}
          >
            <Plus className="size-3.5" />
            Create new
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Create new</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onSelect={() => setPostOpen(true)}
          >
            <PenLine className="size-4 text-orange-500" />
            Post
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onSelect={() => setCommunityOpen(true)}
          >
            <Users className="size-4 text-blue-600" />
            New community
          </DropdownMenuItem>
          {/* <DropdownMenuItem asChild>
            <Link
              href={SOCIAL_ROUTES.amaNew}
              className="flex cursor-pointer items-center gap-2"
            >
              <Calendar className="size-4 text-sky-600" />
              AMA event
            </Link>
          </DropdownMenuItem> */}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>Create post</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto p-4">
            <SocialPostComposer
              defaultExpanded
              initialKind="discussion"
              defaultCommunityId={defaultCommunityId}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={communityOpen} onOpenChange={handleCommunityOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-6 py-4 text-left">
            <DialogTitle className="text-xl">Create a new community</DialogTitle>
            <DialogDescription>
              Set up the basics now. You can edit details and permissions later.
            </DialogDescription>
          </DialogHeader>
          <div
            ref={communityFormScrollRef}
            className="grid max-h-[62vh] min-h-0 gap-5 overflow-y-auto px-6 py-5"
          >
            <div className="grid gap-2">
              <Label htmlFor="social-community-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="social-community-name"
                placeholder="Name your community"
                value={communityName}
                onChange={(e) => setCommunityName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="social-community-desc">Description</Label>
              <Textarea
                id="social-community-desc"
                placeholder="Describe this community to others"
                rows={4}
                value={communityDescription}
                onChange={(e) => setCommunityDescription(e.target.value)}
                className="resize-none"
                maxLength={150}
              />
              <p className="text-xs text-muted-foreground">
                {Math.max(0, 150 - communityDescription.length)} characters
                remaining
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Visibility</Label>
              <RadioGroup
                value={communityVisibility}
                onValueChange={(v) =>
                  setCommunityVisibility(v as CommunityVisibility)
                }
                className="gap-3"
              >
                <div
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors hover:border-primary/40",
                    communityVisibility === "private"
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-background",
                  )}
                  role="button"
                  tabIndex={0}
                  onClick={() => setCommunityVisibility("private")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setCommunityVisibility("private");
                    }
                  }}
                >
                  <RadioGroupItem
                    value="private"
                    id="social-comm-private"
                    className="mt-0.5"
                  />
                  <div className="grid gap-0.5">
                    <Label
                      htmlFor="social-comm-private"
                      className="cursor-pointer font-medium leading-none"
                    >
                      Private
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Only people you add can see posts and membership.
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors hover:border-primary/40",
                    communityVisibility === "public"
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-background",
                  )}
                  role="button"
                  tabIndex={0}
                  onClick={() => setCommunityVisibility("public")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setCommunityVisibility("public");
                    }
                  }}
                >
                  <RadioGroupItem
                    value="public"
                    id="social-comm-public"
                    className="mt-0.5"
                  />
                  <div className="grid gap-0.5">
                    <Label
                      htmlFor="social-comm-public"
                      className="cursor-pointer font-medium leading-none"
                    >
                      Public
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Anyone in your network can discover this community.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {communityVisibility === "private" && (
              <div className="relative space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                <Label>Members</Label>
                <p className="text-xs text-muted-foreground">
                  Search users and add them (same pattern as company audit
                  filters).
                </p>
                <MultiSearch
                  search={memberSearch}
                  setSearch={setMemberSearch}
                  selectedList={selectedMembers}
                  onSelect={(user) => {
                    const id = String(user?.id ?? "");
                    if (!id || selectedMembers.some((u) => String(u.id) === id))
                      return;
                    setSelectedMembers((prev) => [...prev, user]);
                  }}
                  onRemove={(userId) => {
                    setSelectedMembers((prev) =>
                      prev.filter((u) => String(u.id) !== userId),
                    );
                  }}
                  isFocused={showMemberDropdown}
                  setIsFocused={setShowMemberDropdown}
                  showDropdown={showMemberDropdown}
                  setShowDropdown={setShowMemberDropdown}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  onFocus={() => setShowMemberDropdown(true)}
                  onBlur={() => setShowMemberDropdown(false)}
                  marginTop="mt-0"
                  placeholder="Search users..."
                  selectedIds={selectedMembers.map((u) => String(u.id))}
                  searchType="user"
                  getDisplayName={getMemberDisplayName}
                  getItemId={(user) => String(user.id)}
                />
                {selectedMembers.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium text-foreground">
                      Selected members ({selectedMembers.length})
                    </p>
                    <div className="max-h-24 overflow-y-auto rounded-md border border-border/60 bg-background/70 p-2">
                      <div className="flex flex-wrap gap-2">
                        {selectedMembers.map((item) => {
                          const id = String(item.id);
                          const name = getMemberDisplayName(item);
                          return (
                            <div
                              key={id}
                              className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 text-xs text-foreground"
                            >
                              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                                {getMemberInitials(item)}
                              </span>
                              <span className="truncate">{name}</span>
                              <button
                                type="button"
                                className="cursor-pointer rounded-full p-0.5 hover:bg-muted-foreground/20"
                                onClick={() =>
                                  setSelectedMembers((prev) =>
                                    prev.filter((u) => String(u.id) !== id),
                                  )
                                }
                                aria-label={`Remove ${name}`}
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-border bg-card px-6 py-4 sm:justify-end sm:gap-2">
            <Button
              variant="outline"
              onClick={() => handleCommunityOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCommunity}
              disabled={createCommunityMut.isPending}
            >
              {createCommunityMut.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
