"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FolderOpen,
  Globe2,
  Heart,
  Lock,
  Link2,
  Loader2,
  MoreHorizontal,
  Shield,
  UserPlus,
  Users,
  CircleX,
  Pencil,
  UserMinus,
  Trash2,
} from "lucide-react";
import { SocialPostComposer } from "@/components/social/social-post-composer";
import { SocialPostFeed } from "@/components/social/social-post-feed";
import {
  SocialCommunityCoverEdit,
  SocialCommunityIconEdit,
  useSocialImagePreview,
} from "@/components/social/social-image-edit-controls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { SOCIAL_ROUTES } from "@/app/dashboard/social/social-nav";
import { cn } from "@/lib/utils";
import {
  pageTabButtonClassName,
  pageTabsTrackClassName,
} from "@/components/ui/page-tabs";
import { useSocialFavorites } from "@/context/social-favorites-context";
import { toast } from "@/hooks/use-toast";
import { useSocialCurrentUser } from "@/hooks/use-social-current-user";
import { uploadFileCommunity } from "@/api/upload";
import { MultiSearch } from "@/components/multi-search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCommunityDetailQuery,
  useCommunityMembersQuery,
  useCommunityRequestsQuery,
  useAddCommunityMemberMutation,
  useDeleteCommunityMutation,
  useJoinedCommunitiesQuery,
  usePatchCommunityPhotosMutation,
  useRemoveCommunityMemberMutation,
  useRequestJoinCommunityMutation,
  useUpdateCommunityMutation,
  useUpdateCommunityRequestStatusMutation,
} from "@/hooks/use-social-communities";

type MemberPermissions = {
  canPost: boolean;
  canAcceptRequests: boolean;
  canDeletePosts: boolean;
};

type SelectedMember = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

const DEFAULT_MEMBER_PERMISSIONS: MemberPermissions = {
  canPost: true,
  canAcceptRequests: false,
  canDeletePosts: false,
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  const out = `${first}${second}`.toUpperCase();
  return out || "MB";
}

const tabs = [
  { id: "conversations", label: "Conversations" },
  { id: "about", label: "About" },
  { id: "files", label: "Files" },
  { id: "events", label: "Events" },
] as const;

// Member list comes from API (/members). No static placeholders.

/* const resources = [
  { label: "SharePoint library", icon: Library },
  { label: "SharePoint site", icon: Globe },
  { label: "OneNote", icon: BookOpen },
  { label: "Planner", icon: LayoutList },
]; */

export default function SocialCommunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const currentUser = useSocialCurrentUser();
  const { isFavorite, toggleFavorite } = useSocialFavorites();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("conversations");
  const coverPreview = useSocialImagePreview();
  const iconPreview = useSocialImagePreview();
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisibility, setEditVisibility] = useState<"private" | "public">("private");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [permissionEditOpen, setPermissionEditOpen] = useState(false);
  const [permissionTarget, setPermissionTarget] = useState<SelectedMember | null>(null);
  const [permissionForm, setPermissionForm] = useState<MemberPermissions>({ ...DEFAULT_MEMBER_PERMISSIONS });
  const [removeMemberConfirmOpen, setRemoveMemberConfirmOpen] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<SelectedMember | null>(null);
  const [leaveCommunityConfirmOpen, setLeaveCommunityConfirmOpen] = useState(false);

  const { data: community, isLoading } = useCommunityDetailQuery(id);
  const { data: joinedCommunities = [], isLoading: isJoinedCommunitiesLoading } = useJoinedCommunitiesQuery();
  const { data: membersRes, isLoading: isMembersLoading } = useCommunityMembersQuery(id, {
    enabled: true,
  });
  const rawMembers = membersRes?.members ?? [];
  const members = rawMembers.filter((member, index, list) => {
    const idValue = String(member.id);
    return list.findIndex((item) => String(item.id) === idValue) === index;
  });
  const membersTotal = membersRes?.total ?? null;
  const { data: requests = [], isFetching: requestsFetching } =
    useCommunityRequestsQuery(id, { enabled: adminPanelOpen && tab === "about" });
  const updateReqStatus = useUpdateCommunityRequestStatusMutation(id);
  const requestJoin = useRequestJoinCommunityMutation();
  const patchPhotos = usePatchCommunityPhotosMutation(id);
  const updateCommunity = useUpdateCommunityMutation(id);
  const addCommunityMember = useAddCommunityMemberMutation(id);
  const removeCommunityMember = useRemoveCommunityMemberMutation(id);
  const deleteCommunity = useDeleteCommunityMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const displayCoverPhoto = coverPreview.previewUrl ?? community?.coverPhoto ?? null;
  const displayProfilePhoto = iconPreview.previewUrl ?? community?.profilePhoto ?? null;

  const canManageCommunity = true;
  const canAddMembers = community?.isPrivate === true;
  const currentUserId = String(currentUser.id ?? "");
  const isCurrentUserMember = members.some((member) => String(member.id) === currentUserId);
  const isJoinedByList = joinedCommunities.some((joined) => joined.id === id);
  const isKnownMember = isCurrentUserMember || community?.isMember === true || isJoinedByList;
  const shouldWaitForPrivateAccessCheck = Boolean(
    community?.isPrivate &&
    !community?.isAdmin &&
    (isMembersLoading || isJoinedCommunitiesLoading),
  );

  const resetEditForm = () => {
    if (!community) return;
    setEditName(community.name);
    setEditDescription(community.description);
    setEditVisibility(community.isPrivate ? "private" : "public");
  };

  const resetAddMembersForm = () => {
    setSelectedMembers([]);
    setMemberSearch("");
    setShowMemberDropdown(false);
  };

  const openEditDialog = () => {
    resetEditForm();
    setEditOpen(true);
  };

  const openAddMembersDialog = () => {
    setSelectedMembers(
      members.map((member) => ({
        id: String(member.id),
        name: member.name,
        avatarUrl: member.avatarUrl,
      })),
    );
    setMemberSearch("");
    setShowMemberDropdown(false);
    setAddMembersOpen(true);
  };

  const getPersonName = (user: any) =>
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.name ||
    user?.userName ||
    user?.fullname ||
    user?.fullName ||
    user?.email ||
    "Member";

  const getPersonInitials = (nameOrUser: any) => {
    const name = typeof nameOrUser === "string" ? nameOrUser : getPersonName(nameOrUser);
    const parts = name.split(/\s+/).filter(Boolean);
    return (
      `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? parts[0]?.[1] ?? ""}`.toUpperCase() ||
      "MB"
    );
  };

  const getPermissionsFromMember = (member: any): MemberPermissions => {
    return {
      canPost: Boolean(member?.permissions?.canPost),
      canAcceptRequests: Boolean(member?.permissions?.canAcceptRequests),
      canDeletePosts: Boolean(member?.permissions?.canDeletePosts),
    };
  };

  const openPermissionDialog = (member: any) => {
    setPermissionTarget({
      id: String(member.id),
      name: member.name,
      avatarUrl: member.avatarUrl,
    });
    setPermissionForm(getPermissionsFromMember(member));
    setPermissionEditOpen(true);
  };

  const handleSaveMemberPermissions = async () => {
    if (!permissionTarget) return;
    try {
      const res: any = await addCommunityMember.mutateAsync({
        userId: permissionTarget.id,
        role: 2,
      });
      setPermissionEditOpen(false);
      setPermissionTarget(null);
      if (!res?.message) {
        toast({
          title: "Success!",
          description: `Updated permissions for ${permissionTarget.name}.`,
        });
      }
    } catch {
      // Failure toast is handled centrally in apiCall for project-wide consistency.
    }
  };

  const promptRemoveMember = (member: SelectedMember) => {
    setRemoveMemberTarget(member);
    setRemoveMemberConfirmOpen(true);
  };

  const handleConfirmRemoveMember = async () => {
    if (!removeMemberTarget) return;

    try {
      const res: any = await removeCommunityMember.mutateAsync(removeMemberTarget.id);
      setRemoveMemberConfirmOpen(false);
      const removedName = removeMemberTarget.name;
      setRemoveMemberTarget(null);

      if (!res?.message) {
        toast({
          title: "Success!",
          description: `${removedName} has been removed from this community.`,
        });
      }
    } catch {
      // Failure toast is handled centrally in apiCall for project-wide consistency.
    }
  };

  const handleLeaveCommunity = async () => {
    if (!currentUserId) return;

    try {
      const res: any = await removeCommunityMember.mutateAsync(currentUserId);
      setLeaveCommunityConfirmOpen(false);
      if (!res?.message) {
        toast({
          title: "Success!",
          description: "You left the community.",
        });
      }
      window.location.href = SOCIAL_ROUTES.communities;
    } catch {
      // Failure toast is handled centrally in apiCall for project-wide consistency.
    }
  };

  const handleSaveMembers = async () => {
    const existingIds = new Set(members.map((member) => String(member.id)));
    const selectedIds = new Set(selectedMembers.map((member) => member.id));
    const membersToAdd = selectedMembers.filter((member) => !existingIds.has(member.id));
    const membersToRemove = Array.from(existingIds).filter((existingId) => !selectedIds.has(existingId));

    if (membersToAdd.length === 0 && membersToRemove.length === 0) {
      setAddMembersOpen(false);
      resetAddMembersForm();
      toast({ title: "No changes", description: "Member list is already up to date." });
      return;
    }

    try {
      await Promise.all([
        ...membersToAdd.map((member) =>
          addCommunityMember.mutateAsync({
            userId: member.id,
            role: 2,
          }),
        ),
        ...membersToRemove.map((userId) => removeCommunityMember.mutateAsync(userId)),
      ]);

      setAddMembersOpen(false);
      resetAddMembersForm();
      toast({
        title: "Members updated",
        description: `Added ${membersToAdd.length} and removed ${membersToRemove.length} member(s).`,
      });
    } catch {
      // Failure toast is handled centrally in apiCall for project-wide consistency.
    }
  };

  if (isLoading || shouldWaitForPrivateAccessCheck) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 pb-8">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <Skeleton className="h-32 w-full md:h-36" />
          <div className="px-4 pb-4 pt-10 md:px-6 md:pt-12">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
            <Skeleton className="mt-2 h-4 w-2/3 max-w-xl" />
          </div>
          <div className="border-t border-b border-border px-4 pb-4 pt-3 md:px-6">
            <div className={cn(pageTabsTrackClassName, "flex flex-wrap")}>
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-16 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <Skeleton className="h-6 w-full" />
            <div className="mt-3 flex gap-3">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="space-y-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!community) notFound();

  if (community.isPrivate && !community.isAdmin && !isKnownMember) {
    notFound();
  }

  const fav = isFavorite(community.id);
  const isJoined =
    community.isMember === true ||
    joinedCommunities.some((joined) => joined.id === community.id);
  const detailDescription = community.description;
  const memberCount =
    membersTotal != null
      ? membersTotal
      : members.length > 0
        ? members.length
        : community.memberCount;

  const copyLink = () => {
    const url =
      typeof window !== "undefined" ? window.location.href : "";
    void navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied" });
    });
  };

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-5 pb-8">
        <div className="min-w-0 space-y-5">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="relative">
              <SocialCommunityCoverEdit
                previewUrl={displayCoverPhoto}
                fallbackClassName={cn("bg-muted", community.bannerClass)}
                fallbackOverlay={
                  <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_15%_30%,white_0,transparent_42%),radial-gradient(circle_at_85%_20%,white_0,transparent_38%)]" />
                }
                onFileSelect={(file) => {
                  coverPreview.setFromFile(file);
                  void uploadFileCommunity(file, id)
                    .then((uploadedUrl) => {
                      patchPhotos.mutate({ coverPhoto: uploadedUrl });
                    })
                    .catch(() => {
                      toast({
                        title: "Upload failed",
                        description: "Could not upload cover photo.",
                        variant: "destructive",
                      });
                    });
                }}
              />
              <div className="absolute -bottom-6 left-4 z-[5] md:left-6">
                <SocialCommunityIconEdit
                  previewUrl={displayProfilePhoto}
                  onFileSelect={(file) => {
                    iconPreview.setFromFile(file);
                    void uploadFileCommunity(file, id)
                      .then((uploadedUrl) => {
                        patchPhotos.mutate({ profilePhoto: uploadedUrl });
                      })
                      .catch(() => {
                        toast({
                          title: "Upload failed",
                          description: "Could not upload community icon.",
                          variant: "destructive",
                        });
                      });
                  }}
                  editLabel="Change community icon"
                  fallback={
                    <span
                      className={cn(
                        "flex size-14 items-center justify-center rounded-lg text-sm font-bold text-white shadow-lg ring-4 ring-card md:size-16",
                        community.colorClass,
                      )}
                    >
                      {community.initials}
                    </span>
                  }
                />
              </div>
              <div className="absolute right-3 top-3 z-[15] flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleFavorite(community.id)}
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-md border bg-card/95 shadow-sm backdrop-blur hover:bg-card",
                    fav && "border-red-200",
                  )}
                  aria-label={
                    fav ? "Remove from favorites" : "Add to favorites"
                  }
                  aria-pressed={fav}
                >
                  <Heart
                    className={cn(
                      "size-5",
                      fav
                        ? "fill-red-500 text-red-500"
                        : "text-muted-foreground",
                    )}
                  />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 bg-card/95 shadow-sm backdrop-blur hover:bg-card"
                      aria-label="More options"
                      title="More options"
                    >
                      <MoreHorizontal className="size-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 p-1">
                    {canManageCommunity ? (
                      <>
                        <DropdownMenuItem onClick={openEditDialog} className="gap-2 rounded-md">
                          <Pencil className="size-4" />
                          Edit community
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    ) : null}
                    <DropdownMenuItem
                      className="gap-2 rounded-md text-destructive focus:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="size-4" />
                      Delete community
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={copyLink} className="gap-2 rounded-md">
                      <Link2 className="size-4" />
                      Copy link
                    </DropdownMenuItem>
                    {isJoined && currentUserId ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 rounded-md text-destructive focus:text-destructive"
                          onClick={() => setLeaveCommunityConfirmOpen(true)}
                        >
                          <UserMinus className="size-4" />
                          Leave community
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="px-4 pb-4 pt-10 md:px-6 md:pt-12">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[28px] md:leading-tight">
                  {community.name}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full border p-1.5",
                    community.isPrivate
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700",
                  )}
                  title={community.isPrivate ? "Private community" : "Public community"}
                  aria-label={community.isPrivate ? "Private community" : "Public community"}
                >
                  {community.isPrivate ? (
                    <Lock className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Globe2 className="size-3.5" aria-hidden="true" />
                  )}
                </span>
              </div>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                {detailDescription}
              </p>
            </div>
            <div className="border-t border-b border-border px-4 pb-4 pt-3 md:px-6">
              <nav
                className={cn(pageTabsTrackClassName, "flex flex-wrap")}
                aria-label="Community sections"
                role="tablist"
              >
                {tabs.map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      id={`community-tab-${t.id}`}
                      onClick={() => setTab(t.id)}
                      className={cn(
                        pageTabButtonClassName(active),
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {tab === "conversations" && (
            <div
              role="tabpanel"
              aria-labelledby="community-tab-conversations"
              className="space-y-5"
            >
              <SocialPostComposer
                communityId={id}
              />
              <SocialPostFeed
                mode="feed"
                communityRouteId={id}
                emptyState={
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-sm">
                    <div className="mb-4 flex items-center justify-center gap-2 text-5xl">
                      <span className="rounded-2xl bg-emerald-50 p-2">💬</span>
                      <CheckCircle2 className="size-12 text-emerald-500" />
                    </div>
                    <p className="max-w-md text-base font-semibold text-foreground">
                      Get the conversation started in your community!
                    </p>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      Be the first to share a learning, question, or anything else
                      on your mind.
                    </p>
                  </div>
                }
              />
            </div>
          )}

          {tab === "about" && (
            <div
              role="tabpanel"
              aria-labelledby="community-tab-about"
              className="space-y-4"
            >
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 text-sm font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground" />
                    Members
                    <span className="font-normal text-muted-foreground">
                      {memberCount}
                    </span>
                  </div>
                  <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
                    {canAddMembers ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={openAddMembersDialog}
                        className="size-8 shrink-0"
                        aria-label="Add members"
                        title="Add members"
                      >
                        <UserPlus className="size-4" />
                      </Button>
                    ) : null}
                    {isJoined ? (
                      <>
                        <span className="inline-flex h-8 shrink-0 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 whitespace-nowrap">
                          Joined
                        </span>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => requestJoin.mutate(community.id)}
                        disabled={requestJoin.isPending}
                        className="shrink-0 whitespace-nowrap"
                      >
                        {requestJoin.isPending ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Sending
                          </>
                        ) : community.isPrivate ? (
                          "Request to join"
                        ) : (
                          "Join"
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setAdminPanelOpen((v) => !v)}
                      className="shrink-0 whitespace-nowrap"
                    >
                      {adminPanelOpen ? "Hide requests" : "View join requests"}
                    </Button>
                  </div>
                </div>
                {members.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {members.slice(0, 8).map((m) => (
                        <Avatar
                          key={m.id}
                          className="size-10 border-2 border-card ring-1 ring-border"
                        >
                          {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt="" /> : null}
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {initialsFromName(m.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>

                    {canManageCommunity ? (
                      <div className="flex flex-wrap gap-2">
                        {members.slice(0, 8).map((m) => (
                          <div
                            key={`remove-${m.id}`}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs"
                          >
                            <span className="max-w-28 truncate">{m.name}</span>
                            <button
                              type="button"
                              onClick={() => openPermissionDialog(m)}
                              className="rounded-full p-0.5 text-muted-foreground hover:bg-muted"
                              aria-label={`Edit permissions for ${m.name}`}
                              title={`Edit permissions for ${m.name}`}
                              disabled={addCommunityMember.isPending}
                            >
                              <Pencil className="size-3" />
                            </button>
                            {String(m.id) !== currentUserId ? (
                              <button
                                type="button"
                                onClick={() => {
                                  promptRemoveMember({
                                    id: String(m.id),
                                    name: m.name,
                                    avatarUrl: m.avatarUrl,
                                  });
                                }}
                                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted"
                                aria-label={`Remove ${m.name}`}
                                title={`Remove ${m.name}`}
                                disabled={removeCommunityMember.isPending}
                              >
                                <CircleX className="size-3" />
                              </button>
                            ) : (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                You
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {adminPanelOpen ? (
                  <div className="mt-4 space-y-2 border-t border-border pt-4">
                    {requestsFetching ? (
                      <p className="text-xs text-muted-foreground">
                        Loading requests…
                      </p>
                    ) : requests.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No requests.</p>
                    ) : (
                      <ul className="space-y-2">
                        {requests.map((r) => (
                          <li
                            key={r.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                          >
                            <span className="min-w-0 truncate">{r.userName}</span>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  updateReqStatus.mutate({
                                    requestId: r.id,
                                    status: 1,
                                  })
                                }
                                disabled={updateReqStatus.isPending}
                              >
                                Approve
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateReqStatus.mutate({
                                    requestId: r.id,
                                    status: 2,
                                  })
                                }
                                disabled={updateReqStatus.isPending}
                              >
                                Reject
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Shield className="size-4 text-muted-foreground" />
                  Admins
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {members.length > 0 ? (
                    members.slice(0, 3).map((m) => (
                      <Avatar
                        key={`admin-${m.id}`}
                        className="size-10 border-2 border-card ring-1 ring-border"
                      >
                        {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initialsFromName(m.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No admins to show.</p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground">Info</h3>
                <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-relaxed text-muted-foreground sm:max-w-[70%]">
                    {detailDescription}
                  </p>
                  <div className="inline-flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">Visibility:</span>
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded-md border p-1.5",
                        community.isPrivate
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700",
                      )}
                      title={community.isPrivate ? "Private" : "Public"}
                      aria-label={community.isPrivate ? "Private" : "Public"}
                    >
                      {community.isPrivate ? (
                        <Lock className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Globe2 className="size-3.5" aria-hidden="true" />
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "files" && (
            <div
              role="tabpanel"
              aria-labelledby="community-tab-files"
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-16 text-center shadow-sm"
            >
              <FolderOpen className="mb-4 size-14 text-muted-foreground/60" />
              <p className="text-base font-semibold text-foreground">
                No documents yet
              </p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Upload files to share with this community. They will appear
                here once your backend is connected.
              </p>
            </div>
          )}

          {tab === "events" && (
            <div
              role="tabpanel"
              aria-labelledby="community-tab-events"
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-16 text-center shadow-sm"
            >
              <CalendarDays className="mb-4 size-14 text-muted-foreground/60" />
              <p className="text-base font-semibold text-foreground">
                No events scheduled yet
              </p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Check back soon for events in your community.
              </p>
            </div>
          )}
        </div>
      </div>
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) resetEditForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit community</DialogTitle>
            <DialogDescription>
              Update the community name, description, and visibility.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">
                Community name
              </label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">
                Visibility
              </label>
              <Select
                value={editVisibility}
                onValueChange={(value) => setEditVisibility(value as "private" | "public")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editName.trim()) {
                  toast({
                    title: "Name required",
                    description: "Enter a community name.",
                    variant: "destructive",
                  });
                  return;
                }

                updateCommunity.mutate(
                  {
                    name: editName.trim(),
                    description: editDescription.trim(),
                    isPrivate: editVisibility === "private",
                  },
                  {
                    onSuccess: () => setEditOpen(false),
                  },
                );
              }}
              disabled={updateCommunity.isPending}
            >
              {updateCommunity.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addMembersOpen}
        onOpenChange={(open) => {
          setAddMembersOpen(open);
          if (!open) resetAddMembersForm();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add members</DialogTitle>
            <DialogDescription>
              Private communities can invite members directly.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <MultiSearch
                search={memberSearch}
                setSearch={setMemberSearch}
                selectedList={selectedMembers}
                selectedIds={selectedMembers.map((u) => String(u.id))}
                onSelect={(user) => {
                  const idValue = String(user?.id ?? user?.userId ?? "");
                  if (!idValue || selectedMembers.some((u) => String(u.id) === idValue)) {
                    return;
                  }
                  setSelectedMembers((prev) => [
                    ...prev,
                    {
                      id: idValue,
                      name: getPersonName(user),
                      avatarUrl: user?.profilePhoto ?? user?.avatarUrl ?? null,
                    },
                  ]);
                }}
                onRemove={(userId) => {
                  setSelectedMembers((prev) => prev.filter((u) => String(u.id) !== userId));
                }}
                isFocused={showMemberDropdown}
                setIsFocused={setShowMemberDropdown}
                showDropdown={showMemberDropdown}
                setShowDropdown={setShowMemberDropdown}
                onChange={(e) => setMemberSearch(e.target.value)}
                onFocus={() => setShowMemberDropdown(true)}
                onBlur={() => setShowMemberDropdown(false)}
                placeholder="Search users to add"
                searchType="user"
                getDisplayName={getPersonName}
                getItemId={(user) => String(user.id)}
              />
            </div>

            {selectedMembers.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Selected members ({selectedMembers.length})
                </p>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {selectedMembers.map((member) => {
                    const memberId = member.id;
                    const memberName = member.name;
                    return (
                      <div
                        key={memberId}
                        className="rounded-md border border-border bg-background px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 text-xs">
                            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                              {getPersonInitials(memberName)}
                            </span>
                            <span>{memberName}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMembersOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleSaveMembers();
              }}
              disabled={addCommunityMember.isPending || removeCommunityMember.isPending}
            >
              {addCommunityMember.isPending || removeCommunityMember.isPending ? "Saving..." : "Save members"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={permissionEditOpen}
        onOpenChange={(open) => {
          setPermissionEditOpen(open);
          if (!open) {
            setPermissionTarget(null);
            setPermissionForm({ ...DEFAULT_MEMBER_PERMISSIONS });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit member permissions</DialogTitle>
            <DialogDescription>
              {permissionTarget ? `Update permissions for ${permissionTarget.name}.` : "Update member permissions."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {permissionTarget ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
                <Avatar className="size-10 border border-border">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {getPersonInitials(permissionTarget.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {permissionTarget.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Adjust member permissions for this community.</p>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3">
              <div className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                <Checkbox
                  checked={permissionForm.canPost}
                  onCheckedChange={(value) =>
                    setPermissionForm((prev) => ({ ...prev, canPost: value === true }))
                  }
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Can post</p>
                  <p className="text-xs text-muted-foreground">Allow this member to create posts inside the community.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                <Checkbox
                  checked={permissionForm.canAcceptRequests}
                  onCheckedChange={(value) =>
                    setPermissionForm((prev) => ({ ...prev, canAcceptRequests: value === true }))
                  }
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Can accept requests</p>
                  <p className="text-xs text-muted-foreground">Allow this member to approve join requests.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                <Checkbox
                  checked={permissionForm.canDeletePosts}
                  onCheckedChange={(value) =>
                    setPermissionForm((prev) => ({ ...prev, canDeletePosts: value === true }))
                  }
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Can delete posts</p>
                  <p className="text-xs text-muted-foreground">Allow this member to moderate and delete community posts.</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleSaveMemberPermissions();
              }}
              disabled={addCommunityMember.isPending || !permissionTarget}
            >
              {addCommunityMember.isPending ? "Saving..." : "Save permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this community?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The community and its posts may no longer
              be accessible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                deleteCommunity.mutate(community.id, {
                  onSuccess: () => {
                    setDeleteOpen(false);
                    window.location.href = SOCIAL_ROUTES.communities;
                  },
                });
              }}
              disabled={deleteCommunity.isPending}
            >
              {deleteCommunity.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={removeMemberConfirmOpen}
        onOpenChange={(open) => {
          setRemoveMemberConfirmOpen(open);
          if (!open) {
            setRemoveMemberTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeMemberTarget
                ? `Are you sure you want to remove ${removeMemberTarget.name} from this community?`
                : "Are you sure you want to remove this member from this community?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmRemoveMember();
              }}
              disabled={removeCommunityMember.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {removeCommunityMember.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveCommunityConfirmOpen} onOpenChange={setLeaveCommunityConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave community?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this community?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleLeaveCommunity();
              }}
              disabled={removeCommunityMember.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {removeCommunityMember.isPending ? "Leaving..." : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
