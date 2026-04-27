"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Award,
  BarChart3,
  Bold,
  Check,
  ChevronDown,
  Code,
  HelpCircle,
  Italic,
  CalendarDays,
  Link2,
  List,
  ListOrdered,
  Loader2,
  MessageCircle,
  Plus,
  Smile,
  X,
  UserPlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { SocialPostPayload } from "@/api/social-posts";
import {
  useCreateSocialPostMutation,
  useSocialMedalsListQuery,
} from "@/hooks/use-social-posts";
import { SocialDraftsDialog } from "@/components/social/social-drafts-dialog";
import { useCommunityMembersQuery, useJoinedCommunitiesQuery } from "@/hooks/use-social-communities";
import { useSocialCurrentUser } from "@/hooks/use-social-current-user";
import { PostSCOPE, PostType } from "@/lib/enums/social.enum";
import { socialPraiseFlairs } from "@/lib/social-dummy-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type PostKind = "discussion" | "question" | "praise" | "poll";
type MentionField =
  | "discussion"
  | "questionTitle"
  | "questionDetail"
  | "praiseWho"
  | "praiseWhat"
  | "pollQuestion"
  | "pollAnswer";

const KIND_OPTIONS: {
  id: PostKind;
  label: string;
  icon: typeof MessageCircle;
  iconClass: string;
}[] = [
    {
      id: "discussion",
      label: "Discussion",
      icon: MessageCircle,
      iconClass: "text-orange-500",
    },
    {
      id: "question",
      label: "Question",
      icon: HelpCircle,
      iconClass: "text-blue-600",
    },
    { id: "praise", label: "Praise", icon: Award, iconClass: "text-pink-500" },
    {
      id: "poll",
      label: "Poll",
      icon: BarChart3,
      iconClass: "text-emerald-600",
    },
  ];

/** Maps UI post kinds to API `postType` (align with backend enums). */
const POST_TYPE: Record<PostKind, number> = {
  discussion: PostType.DISCUSSION,
  question: PostType.QUESTION,
  praise: PostType.PRAISE,
  poll: PostType.POLL,
};

const PRAISE_EMOJIS = ["🥇", "🏆", "👏", "✨", "💡", "🚀", "🙌", "🎉", "🔥", "⭐"];
const EMOJI_LIBRARY = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🙂", "🙃", "😉", "😊", "😇",
  "🥰", "😍", "🤩", "🤗", "😎", "🤔", "🤝", "👏", "🙏", "💪", "✨", "🔥",
  "🎉", "🚀", "⭐", "🌟", "💡", "🧩", "📌", "✅", "⚙️", "🛠️", "📣", "📈",
  "💬", "📝", "📎", "🖼️", "🎯", "🌱", "🏅", "🥇", "🏆", "💻", "📱", "📊",
  "❤️", "💙", "💜", "💛", "🧡", "💚", "🖤", "🤍", "😺", "🐱", "🐶", "🍀",
];
const FALLBACK_GIFS: Array<{ id: string; previewUrl: string; gifUrl: string; title: string }> = [
  {
    id: "fallback-1",
    previewUrl: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
    gifUrl: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
    title: "Celebration",
  },
  {
    id: "fallback-2",
    previewUrl: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    gifUrl: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    title: "Great job",
  },
  {
    id: "fallback-3",
    previewUrl: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    gifUrl: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    title: "Thumbs up",
  },
  {
    id: "fallback-4",
    previewUrl: "https://media.giphy.com/media/26gsjCZpPolPr3sBy/giphy.gif",
    gifUrl: "https://media.giphy.com/media/26gsjCZpPolPr3sBy/giphy.gif",
    title: "Awesome",
  },
  {
    id: "fallback-5",
    previewUrl: "https://media.giphy.com/media/fxsqOYnIMEefC/giphy.gif",
    gifUrl: "https://media.giphy.com/media/fxsqOYnIMEefC/giphy.gif",
    title: "Excited",
  },
  {
    id: "fallback-6",
    previewUrl: "https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif",
    gifUrl: "https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif",
    title: "Success",
  },
];

function getDefaultPollExpireAt() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function toIsoFromDateTimeLocal(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Keep local datetime selected by user (avoid timezone shift).
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)
    ? `${trimmed}:00`
    : null;
}

const EMPTY_DISCUSSION_FORMATS = {
  bold: false,
  italic: false,
  unorderedList: false,
  orderedList: false,
  codeBlock: false,
};

export type SocialPostComposerProps = {
  /** When set, posting is locked to this community. */
  communityId?: string | null;
  defaultExpanded?: boolean;
  initialKind?: PostKind;
  defaultCommunityId?: string | null;
};

function ToolbarIconButton({
  label,
  children,
  onMouseDown,
  active,
}: {
  label: string;
  children: ReactNode;
  onMouseDown?: (e: React.MouseEvent) => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={onMouseDown}
      aria-pressed={active}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded border transition-all",
        active
          ? "border-primary/20 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20"
          : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function TypePills({
  kind,
  onSelect,
}: {
  kind: PostKind | null;
  onSelect: (id: PostKind) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {KIND_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = kind !== null && kind === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("size-3.5", opt.iconClass)} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMentionHighlightedText(text: string, mentions: string[]) {
  if (!text) return null;
  if (mentions.length === 0) return text;

  const pattern = new RegExp(
    `@(?:${mentions
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegex)
      .join("|")})`,
    "g",
  );

  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    parts.push(
      <span key={`${start}-${match[0]}`} className="font-medium text-primary">
        {match[0]}
      </span>,
    );

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function SocialPostComposer({
  communityId,
  defaultExpanded = false,
  initialKind = "discussion",
  defaultCommunityId = null,
}: SocialPostComposerProps = {}) {
  const socialCurrentUser = useSocialCurrentUser();
  const hasFixedCommunityId = communityId !== undefined;
  const createMut = useCreateSocialPostMutation();
  const { data: medals = [] } = useSocialMedalsListQuery();
  const { data: joinedCommunities = [] } = useJoinedCommunitiesQuery({
    enabled: !hasFixedCommunityId,
  });
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [submitKind, setSubmitKind] = useState<"draft" | "publish" | null>(
    null,
  );
  const [kind, setKind] = useState<PostKind | null>(
    defaultExpanded ? initialKind : null,
  );
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    hasFixedCommunityId ? (communityId ?? null) : defaultCommunityId,
  );
  const [discussionBody, setDiscussionBody] = useState("");
  const [questionTitle, setQuestionTitle] = useState("");
  const [questionDetail, setQuestionDetail] = useState("");
  const [praiseWho, setPraiseWho] = useState("");
  const [praiseWhat, setPraiseWhat] = useState("");
  const [selectedPraiseFlairIds, setSelectedPraiseFlairIds] = useState<string[]>([]);
  const [selectedPraiseRecipients, setSelectedPraiseRecipients] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedMentions, setSelectedMentions] = useState<Array<{ id: string; label: string }>>([]);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollAnswers, setPollAnswers] = useState(["", "", ""]);
  const [pollExpireAt, setPollExpireAt] = useState(() => getDefaultPollExpireAt());
  const questionTitleRef = useRef<HTMLInputElement>(null);
  const questionDetailRef = useRef<HTMLTextAreaElement>(null);
  const praiseWhoRef = useRef<HTMLInputElement>(null);
  const praiseWhatRef = useRef<HTMLTextAreaElement>(null);
  const pollQuestionRef = useRef<HTMLInputElement>(null);
  const pollAnswerRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionRange, setMentionRange] = useState<{
    start: number;
    end: number;
    field: MentionField;
    pollIndex?: number;
  } | null>(null);
  const [discussionFormats, setDiscussionFormats] = useState(EMPTY_DISCUSSION_FORMATS);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<
    Array<{ id: string; previewUrl: string; gifUrl: string; title: string }>
  >([]);
  const praiseFlairs = medals.length > 0 ? medals : socialPraiseFlairs;
  const resolvedComposerCommunityId = hasFixedCommunityId
    ? (communityId ?? null)
    : selectedCommunityId;
  const filteredEmojiLibrary = useMemo(() => {
    const query = emojiSearch.trim();
    if (!query) return EMOJI_LIBRARY;
    return EMOJI_LIBRARY.filter((emoji) => emoji.includes(query));
  }, [emojiSearch]);

  const selectedPraiseFlairs = useMemo(
    () => praiseFlairs.filter((f) => selectedPraiseFlairIds.includes(f.id)),
    [praiseFlairs, selectedPraiseFlairIds],
  );
  const totalPraisePoints = useMemo(
    () => selectedPraiseFlairs.reduce((sum, f) => sum + f.points, 0),
    [selectedPraiseFlairs],
  );

  const discussionEditorRef = useRef<HTMLDivElement>(null);
  const prevKindRef = useRef<PostKind | null>(null);

  const refreshDiscussionFormats = useCallback(() => {
    const editor = discussionEditorRef.current;
    if (!editor) {
      setDiscussionFormats(EMPTY_DISCUSSION_FORMATS);
      return;
    }

    const selection = window.getSelection();
    const selectionNode = selection?.anchorNode ?? null;
    const selectionElement =
      selectionNode?.nodeType === Node.ELEMENT_NODE
        ? (selectionNode as HTMLElement)
        : selectionNode?.parentElement ?? null;

    if (
      !selection ||
      selection.rangeCount === 0 ||
      !selectionElement ||
      (!editor.contains(selectionElement) && !editor.contains(selection.focusNode))
    ) {
      setDiscussionFormats(EMPTY_DISCUSSION_FORMATS);
      return;
    }

    setDiscussionFormats({
      bold:
        Boolean(selectionElement.closest("strong, b")) ||
        document.queryCommandState("bold"),
      italic:
        Boolean(selectionElement.closest("em, i")) ||
        document.queryCommandState("italic"),
      unorderedList:
        Boolean(selectionElement.closest("ul li")) ||
        document.queryCommandState("insertUnorderedList"),
      orderedList:
        Boolean(selectionElement.closest("ol li")) ||
        document.queryCommandState("insertOrderedList"),
      codeBlock: Boolean(selectionElement.closest("pre, code")),
    });
  }, []);

  useEffect(() => {
    if (!hasFixedCommunityId) return;
    setSelectedCommunityId(communityId ?? null);
  }, [hasFixedCommunityId, communityId]);

  useEffect(() => {
    if (hasFixedCommunityId) return;
    if (!defaultCommunityId) return;
    setSelectedCommunityId(defaultCommunityId);
  }, [hasFixedCommunityId, defaultCommunityId]);

  useEffect(() => {
    if (hasFixedCommunityId) return;
    if (selectedCommunityId) return;
    if (joinedCommunities.length === 0) return;
    setSelectedCommunityId(joinedCommunities[0]?.id ?? null);
  }, [hasFixedCommunityId, joinedCommunities, selectedCommunityId]);

  useEffect(() => {
    if (kind !== "discussion") {
      setDiscussionFormats(EMPTY_DISCUSSION_FORMATS);
      prevKindRef.current = kind;
      return;
    }
    if (
      prevKindRef.current !== "discussion" &&
      discussionEditorRef.current
    ) {
      discussionEditorRef.current.innerHTML = discussionBody || "";
    }
    prevKindRef.current = kind;
  }, [kind, discussionBody]);

  useEffect(() => {
    setSelectedPraiseRecipients((prev) =>
      prev.filter((recipient) => praiseWhat.includes(`@${recipient.label}`)),
    );
  }, [praiseWhat]);

  const selectedMentionLabels = useMemo(
    () => selectedMentions.map((mention) => mention.label),
    [selectedMentions],
  );

  const selectedPraiseUserIds = useMemo(
    () => selectedPraiseRecipients.map((recipient) => recipient.id),
    [selectedPraiseRecipients],
  );

  const selectedMentionUserIds = useMemo(
    () => Array.from(new Set(selectedMentions.map((mention) => mention.id))),
    [selectedMentions],
  );

  const selectedMentionUserIdSet = useMemo(
    () => new Set(selectedMentionUserIds),
    [selectedMentionUserIds],
  );

  useEffect(() => {
    const validIds = new Set(praiseFlairs.map((flair) => flair.id));
    setSelectedPraiseFlairIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [praiseFlairs]);

  useEffect(() => {
    if (kind !== "discussion") return;

    const syncFormats = () => refreshDiscussionFormats();
    document.addEventListener("selectionchange", syncFormats);
    window.addEventListener("mouseup", syncFormats);
    window.addEventListener("keyup", syncFormats);
    syncFormats();

    return () => {
      document.removeEventListener("selectionchange", syncFormats);
      window.removeEventListener("mouseup", syncFormats);
      window.removeEventListener("keyup", syncFormats);
    };
  }, [kind, refreshDiscussionFormats]);

  const runDiscussionFormat = (command: string, value?: string) => {
    if (kind !== "discussion") {
      toast({
        title: "Rich text",
        description: "Switch to Discussion to use the formatting toolbar.",
      });
      return;
    }
    const el = discussionEditorRef.current;
    if (!el) return;
    el.focus();

    if (command === "formatBlock" && value === "pre") {
      const selection = window.getSelection();
      const selectionNode = selection?.anchorNode ?? null;
      const selectionElement =
        selectionNode?.nodeType === Node.ELEMENT_NODE
          ? (selectionNode as HTMLElement)
          : selectionNode?.parentElement ?? null;
      const inCodeBlock = Boolean(selectionElement?.closest("pre"));
      document.execCommand("formatBlock", false, inCodeBlock ? "p" : "pre");
      setDiscussionBody(el.innerHTML);
      window.requestAnimationFrame(() => refreshDiscussionFormats());
      return;
    }

    document.execCommand(command, false, value);
    setDiscussionBody(el.innerHTML);
    window.requestAnimationFrame(() => refreshDiscussionFormats());
  };

  const insertDiscussionText = useCallback((text: string) => {
    const editor = discussionEditorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand("insertText", false, text);
    setDiscussionBody(editor.innerHTML);
    window.requestAnimationFrame(() => {
      refreshDiscussionFormats();
      updateDiscussionMentionState();
    });
  }, [refreshDiscussionFormats]);

  const insertDiscussionGif = useCallback((gifUrl: string) => {
    const editor = discussionEditorRef.current;
    if (!editor) return;
    editor.focus();
    const safeUrl = gifUrl.replace(/"/g, "&quot;");
    const html = `<img src="${safeUrl}" alt="GIF" style="max-width:100%;border-radius:8px;" />`;
    document.execCommand("insertHTML", false, html);
    setDiscussionBody(editor.innerHTML);
    window.requestAnimationFrame(() => refreshDiscussionFormats());
  }, [refreshDiscussionFormats]);

  useEffect(() => {
    if (!gifPickerOpen || kind !== "discussion") {
      return;
    }

    let isCancelled = false;
    const timerId = window.setTimeout(async () => {
      try {
        const query = gifQuery.trim().toLowerCase();
        const results = query
          ? FALLBACK_GIFS.filter((gif) =>
            gif.title.toLowerCase().includes(query) ||
            gif.id.toLowerCase().includes(query),
          )
          : FALLBACK_GIFS;

        if (!isCancelled) {
          setGifResults(results);
        }
      } catch {
        if (!isCancelled) {
          setGifResults(FALLBACK_GIFS);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timerId);
    };
  }, [gifPickerOpen, gifQuery, kind]);

  const expanded = kind !== null;
  const currentKind = kind
    ? KIND_OPTIONS.find((k) => k.id === kind)!
    : null;
  const TypeIcon = currentKind?.icon ?? MessageCircle;
  const typeIconClass = currentKind?.iconClass ?? "text-muted-foreground";

  const collapse = () => {
    setKind(null);
  };

  const resetForm = () => {
    setDiscussionBody("");
    setQuestionTitle("");
    setQuestionDetail("");
    setPraiseWho("");
    setPraiseWhat("");
    setSelectedPraiseRecipients([]);
    setSelectedPraiseFlairIds([]);
    setPollQuestion("");
    setPollAnswers(["", "", ""]);
    setPollExpireAt(getDefaultPollExpireAt());
    setSelectedMentions([]);
    if (discussionEditorRef.current) {
      discussionEditorRef.current.innerHTML = "";
    }
  };

  const buildContentForSubmit = (): string | null => {
    if (!kind) return null;

    const encodeMentionsInText = (rawText: string) => {
      const mentionPairs = selectedMentions
        .filter((mention) => mention.label.trim() && mention.id.trim())
        .sort((a, b) => b.label.length - a.label.length);

      if (mentionPairs.length === 0) {
        return escapeHtml(rawText).replace(/\n/g, "<br />");
      }

      const labelToId = new Map<string, string>();
      for (const mention of mentionPairs) {
        if (!labelToId.has(mention.label)) {
          labelToId.set(mention.label, mention.id);
        }
      }

      const pattern = new RegExp(
        `@(?:${mentionPairs.map((m) => escapeRegex(m.label)).join("|")})`,
        "g",
      );

      const parts: string[] = [];
      let lastIndex = 0;

      for (const match of rawText.matchAll(pattern)) {
        const start = match.index ?? 0;
        const end = start + match[0].length;
        if (start > lastIndex) {
          parts.push(escapeHtml(rawText.slice(lastIndex, start)));
        }

        const label = match[0].slice(1);
        const mentionId = labelToId.get(label);
        if (mentionId) {
          parts.push(
            `<span class="social-mention font-semibold text-primary" data-mention-id="${escapeHtml(
              mentionId,
            )}" data-mention-label="${escapeHtml(label)}">@${escapeHtml(label)}</span>`,
          );
        } else {
          parts.push(escapeHtml(match[0]));
        }

        lastIndex = end;
      }

      if (lastIndex < rawText.length) {
        parts.push(escapeHtml(rawText.slice(lastIndex)));
      }

      return parts.join("").replace(/\n/g, "<br />");
    };

    switch (kind) {
      case "discussion": {
        const el = discussionEditorRef.current;
        const html = (el?.innerHTML ?? discussionBody).trim();
        const plain = html.replace(/<[^>]+>/g, "").trim();
        if (!plain) return null;
        return html;
      }
      case "question": {
        if (!questionTitle.trim()) return null;
        const titleHtml = encodeMentionsInText(questionTitle.trim());
        const detail = questionDetail.trim();
        const detailHtml = detail ? encodeMentionsInText(detail) : "";
        return detailHtml
          ? `<p>${titleHtml}</p><p>${detailHtml}</p>`
          : `<p>${titleHtml}</p>`;
      }
      case "praise": {
        if (selectedPraiseUserIds.length === 0) return null;
        if (selectedPraiseFlairIds.length < 2) return null;
        const praiseWhoText = praiseWho.trim();
        const praiseWhatText = praiseWhat.trim();
        const block = [praiseWhoText, praiseWhatText].filter(Boolean);
        if (block.length === 0) return null;
        return block.map((line) => `<p>${encodeMentionsInText(line)}</p>`).join("");
      }
      case "poll": {
        if (!pollQuestion.trim()) return null;
        const opts = pollAnswers.map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) return null;
        return `<p>${encodeMentionsInText(pollQuestion.trim())}</p>`;
      }
      default:
        return null;
    }
  };

  const buildPayload = (isDraft: boolean): SocialPostPayload | null => {
    if (!kind) {
      toast({
        title: "Choose a post type",
        description: "Pick Discussion, Question, Praise, or Poll first.",
        variant: "destructive",
      });
      return null;
    }
    if (kind === "praise" && selectedPraiseFlairIds.length < 2) {
      toast({
        title: "Select achievements",
        description: "Choose at least 2 flairs for a praise post.",
        variant: "destructive",
      });
      return null;
    }
    if (kind === "praise" && selectedPraiseUserIds.length === 0) {
      toast({
        title: "Select recipients",
        description: "Use the people menu to pick at least one person for praise.",
        variant: "destructive",
      });
      return null;
    }
    if (!resolvedComposerCommunityId) {
      toast({
        title: "Select community",
        description: "Posts can only be created inside communities.",
        variant: "destructive",
      });
      return null;
    }
    const content = buildContentForSubmit();
    if (!content) {
      toast({
        title: "Add content",
        description: "Write something before posting or saving a draft.",
        variant: "destructive",
      });
      return null;
    }
    return {
      postType: POST_TYPE[kind],
      postScope: PostSCOPE.COMMUNITY,
      content,
      imageUrl: [],
      communityId: resolvedComposerCommunityId,
      taggedUserIds: selectedMentionUserIds,
      isDraft,
      praise:
        kind === "praise"
          ? {
            userIds: selectedPraiseUserIds,
            medalIds: selectedPraiseFlairIds,
          }
          : undefined,
      pollOptions:
        kind === "poll"
          ? pollAnswers
            .map((optionText) => optionText.trim())
            .filter(Boolean)
            .map((optionText) => ({ optionText }))
          : undefined,
      pollExpireAt: kind === "poll" ? toIsoFromDateTimeLocal(pollExpireAt) : undefined,
    };
  };

  const submitPost = (isDraft: boolean) => {
    const payload = buildPayload(isDraft);
    if (!payload) return;
    setSubmitKind(isDraft ? "draft" : "publish");
    createMut.mutate(payload, {
      onSuccess: () => {
        resetForm();
        collapse();
      },
      onSettled: () => setSubmitKind(null),
    });
  };

  const onOpenDrafts = () => setDraftsOpen(true);

  const addPollOption = () => {
    if (pollAnswers.length >= 8) return;
    setPollAnswers((a) => [...a, ""]);
  };

  const trimmedMentionSearch = mentionSearch.trim();
  const mentionCommunityId = resolvedComposerCommunityId;
  const { data: communityMentionData, isLoading: isCommunityMentionLoading } =
    useCommunityMembersQuery(mentionCommunityId ?? "", {
      enabled: showMentionDropdown && Boolean(mentionCommunityId),
    });
  const communityMentionMembers = communityMentionData?.members ?? [];
  const mentionUsers = communityMentionMembers.filter((member: { name: string; id: string }) => {
    if (!trimmedMentionSearch) return true;
    const search = trimmedMentionSearch.toLowerCase();
    return member.name.toLowerCase().includes(search);
  });

  const getUserDisplayName = (user: any) => {
    const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    return (
      fullName ||
      user?.name ||
      user?.userName ||
      user?.fullname ||
      user?.fullName ||
      user?.email ||
      "Unknown User"
    );
  };

  const updateMentionState = (
    value: string,
    field: MentionField,
    cursorPosition?: number,
    pollIndex?: number,
  ) => {
    const selectionEnd = cursorPosition ?? value.length;
    const beforeCursor = value.slice(0, selectionEnd);
    const triggerMatch = beforeCursor.match(/(^|\s)@([\w.-]*)$/);

    if (!triggerMatch) {
      setMentionSearch("");
      setShowMentionDropdown(false);
      setMentionRange(null);
      return;
    }

    setMentionSearch(triggerMatch[2] ?? "");
    setShowMentionDropdown(true);
    setMentionRange({
      start: selectionEnd - (triggerMatch[2]?.length ?? 0) - 1,
      end: selectionEnd,
      field,
      pollIndex,
    });
  };

  const updateDiscussionMentionState = () => {
    const editor = discussionEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.endContainer)) {
      return;
    }

    const preRange = range.cloneRange();
    preRange.selectNodeContents(editor);
    preRange.setEnd(range.endContainer, range.endOffset);

    const beforeCursor = preRange.toString();
    const selectionEnd = beforeCursor.length;
    updateMentionState(beforeCursor, "discussion", selectionEnd);
  };

  const insertDiscussionMention = (userLabel: string, userId: string) => {
    const editor = discussionEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      return false;
    }

    const currentRange = selection.getRangeAt(0);
    if (!editor.contains(currentRange.endContainer)) {
      return false;
    }

    const workingRange = currentRange.cloneRange();
    const endContainer = workingRange.endContainer;
    const endOffset = workingRange.endOffset;

    const replaceLength =
      mentionRange?.field === "discussion"
        ? Math.max(0, mentionSearch.length + 1)
        : 0;

    if (
      replaceLength > 0 &&
      endContainer.nodeType === Node.TEXT_NODE &&
      endOffset >= replaceLength
    ) {
      const textNode = endContainer as Text;
      const typedToken = textNode.data.slice(endOffset - replaceLength, endOffset);
      if (typedToken.startsWith("@")) {
        workingRange.setStart(textNode, endOffset - replaceLength);
        workingRange.setEnd(textNode, endOffset);
        workingRange.deleteContents();
      }
    }

    const mentionNode = document.createElement("span");
    mentionNode.className = "font-semibold text-primary";
    mentionNode.setAttribute("contenteditable", "false");
    mentionNode.dataset.mentionId = userId;
    mentionNode.dataset.mentionLabel = userLabel;
    mentionNode.textContent = `@${userLabel}`;

    const trailingSpace = document.createTextNode(" ");
    const typingAnchor = document.createTextNode("");
    workingRange.insertNode(typingAnchor);
    workingRange.insertNode(trailingSpace);
    workingRange.insertNode(mentionNode);

    const caretRange = document.createRange();
    caretRange.setStart(typingAnchor, 0);
    caretRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caretRange);

    setDiscussionBody(editor.innerHTML);
    return true;
  };

  const insertMention = (user: any) => {
    const userLabel = getUserDisplayName(user);
    const userId = String(user?.userId ?? user?.id ?? "");
    const mentionText = `@${userLabel} `;

    const applyMentionInsert = (
      currentValue: string,
      fieldStart: number,
      fieldEnd: number,
      setter: (value: string) => void,
    ) => {
      const nextValue =
        currentValue.slice(0, fieldStart) + mentionText + currentValue.slice(fieldEnd);
      setter(nextValue);
      return fieldStart + mentionText.length;
    };

    const addMention = () => {
      setSelectedMentions((prev) =>
        prev.some((mention) => mention.id === userId)
          ? prev
          : [...prev, { id: userId, label: userLabel }],
      );
      setSelectedPraiseRecipients((prev) =>
        prev.some((recipient) => recipient.id === userId)
          ? prev
          : [...prev, { id: userId, label: userLabel }],
      );
    };

    if (!mentionRange) {
      if (kind === "question") {
        setQuestionDetail((current) => `${current}${mentionText}`);
      } else if (kind === "poll") {
        setPollQuestion((current) => `${current}${mentionText}`);
      } else if (kind === "praise") {
        setPraiseWhat((current) => `${current}${mentionText}`);
      } else {
        const inserted = insertDiscussionMention(userLabel, userId);
        if (!inserted) {
          const editor = discussionEditorRef.current;
          if (editor) {
            editor.focus();
            document.execCommand("insertText", false, mentionText);
            setDiscussionBody(editor.innerHTML);
          }
        }
      }
      addMention();
      setShowMentionDropdown(false);
      setMentionSearch("");
      setMentionRange(null);
      return;
    }

    let nextCursor = mentionRange.start + mentionText.length;
    if (mentionRange.field === "praiseWhat") {
      nextCursor = applyMentionInsert(
        praiseWhat,
        mentionRange.start,
        mentionRange.end,
        setPraiseWhat,
      );
    } else if (mentionRange.field === "praiseWho") {
      nextCursor = applyMentionInsert(
        praiseWho,
        mentionRange.start,
        mentionRange.end,
        setPraiseWho,
      );
    } else if (mentionRange.field === "questionTitle") {
      nextCursor = applyMentionInsert(
        questionTitle,
        mentionRange.start,
        mentionRange.end,
        setQuestionTitle,
      );
    } else if (mentionRange.field === "questionDetail") {
      nextCursor = applyMentionInsert(
        questionDetail,
        mentionRange.start,
        mentionRange.end,
        setQuestionDetail,
      );
    } else if (mentionRange.field === "pollQuestion") {
      nextCursor = applyMentionInsert(
        pollQuestion,
        mentionRange.start,
        mentionRange.end,
        setPollQuestion,
      );
    } else if (mentionRange.field === "pollAnswer") {
      const index = mentionRange.pollIndex ?? 0;
      const currentValue = pollAnswers[index] ?? "";
      const nextValue =
        currentValue.slice(0, mentionRange.start) +
        mentionText +
        currentValue.slice(mentionRange.end);
      nextCursor = mentionRange.start + mentionText.length;
      setPollAnswers((prev) => {
        const next = [...prev];
        next[index] = nextValue;
        return next;
      });
    } else if (mentionRange.field === "discussion") {
      const inserted = insertDiscussionMention(userLabel, userId);
      if (!inserted) {
        const editor = discussionEditorRef.current;
        if (editor) {
          editor.focus();
          document.execCommand("insertText", false, mentionText);
          setDiscussionBody(editor.innerHTML);
        }
      }
    }

    addMention();
    setShowMentionDropdown(false);
    setMentionSearch("");
    setMentionRange(null);

    window.requestAnimationFrame(() => {
      if (mentionRange.field === "praiseWhat") {
        const el = praiseWhatRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(nextCursor, nextCursor);
        }
      } else if (mentionRange.field === "praiseWho") {
        const el = praiseWhoRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(nextCursor, nextCursor);
        }
      } else if (mentionRange.field === "questionTitle") {
        const el = questionTitleRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(nextCursor, nextCursor);
        }
      } else if (mentionRange.field === "questionDetail") {
        const el = questionDetailRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(nextCursor, nextCursor);
        }
      } else if (mentionRange.field === "pollQuestion") {
        const el = pollQuestionRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(nextCursor, nextCursor);
        }
      } else if (mentionRange.field === "pollAnswer") {
        const el = pollAnswerRefs.current[mentionRange.pollIndex ?? 0];
        if (el) {
          el.focus();
          el.setSelectionRange(nextCursor, nextCursor);
        }
      }
    });
  };

  const openAddPeoplePicker = () => {
    if (kind !== "praise") {
      if (!mentionRange) {
        const activeElement = document.activeElement;
        if (kind === "question") {
          if (activeElement === questionTitleRef.current) {
            const cursor = questionTitleRef.current?.selectionEnd ?? questionTitle.length;
            setMentionRange({ start: cursor, end: cursor, field: "questionTitle" });
          } else {
            const cursor = questionDetailRef.current?.selectionEnd ?? questionDetail.length;
            setMentionRange({ start: cursor, end: cursor, field: "questionDetail" });
          }
        } else if (kind === "poll") {
          const focusedPollIndex = pollAnswerRefs.current.findIndex((el) => el === activeElement);
          if (focusedPollIndex >= 0) {
            const inputEl = pollAnswerRefs.current[focusedPollIndex];
            const cursor = inputEl?.selectionEnd ?? (pollAnswers[focusedPollIndex]?.length ?? 0);
            setMentionRange({
              start: cursor,
              end: cursor,
              field: "pollAnswer",
              pollIndex: focusedPollIndex,
            });
          } else {
            const cursor = pollQuestionRef.current?.selectionEnd ?? pollQuestion.length;
            setMentionRange({ start: cursor, end: cursor, field: "pollQuestion" });
          }
        } else {
          setMentionRange({ start: 0, end: 0, field: "discussion" });
        }
      }
      setMentionSearch("");
      setShowMentionDropdown((prev) => !prev);
      return;
    }

    window.requestAnimationFrame(() => {
      const textarea = praiseWhatRef.current;
      if (!textarea) {
        setShowMentionDropdown(true);
        return;
      }

      textarea.focus();
      const cursor = textarea.selectionEnd ?? praiseWhat.length;
      setMentionRange({ start: cursor, end: cursor, field: "praiseWhat" });
      setMentionSearch("");
      setShowMentionDropdown(true);
    });
  };

  const insertPraiseEmoji = (emoji: string) => {
    const textarea = praiseWhatRef.current;
    if (!textarea) {
      setPraiseWhat((current) => `${current}${emoji}`);
      return;
    }

    const start = textarea.selectionStart ?? praiseWhat.length;
    const end = textarea.selectionEnd ?? praiseWhat.length;
    const nextValue =
      praiseWhat.slice(0, start) + emoji + praiseWhat.slice(end);

    setPraiseWhat(nextValue);

    window.requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = start + emoji.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const togglePraiseFlair = (id: string) => {
    setSelectedPraiseFlairIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        toast({
          title: "Maximum 3 flairs",
          description: "A praise post can include up to 3 achievements.",
        });
        return prev;
      }
      return [...prev, id];
    });
  };

  const renderMentionDropdown = () => {
    if (!showMentionDropdown) return null;

    return (
      <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="border-b border-border bg-gradient-to-r from-primary/5 via-background to-background px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            People
          </p>
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {isCommunityMentionLoading ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              Loading community members...
            </div>
          ) : !mentionCommunityId ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Select a community to mention members.
            </div>
          ) : mentionUsers.length > 0 ? (
            mentionUsers.map((user: any) => {
              const userId = String(user?.userId ?? user?.id ?? "");
              if (!userId) return null;
              const selected = selectedMentionUserIdSet.has(userId);

              return (
                <button
                  key={userId}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertMention(user)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all hover:bg-primary/5 hover:shadow-sm",
                    selected && "bg-primary/10 ring-1 ring-primary/20",
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-xs font-semibold text-primary ring-1 ring-primary/10">
                    {getUserDisplayName(user).slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">
                      {getUserDisplayName(user)}
                    </span>
                    {user?.email || user?.username ? (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {user?.email || user?.username}
                      </span>
                    ) : null}
                  </span>
                  {selected ? <Check className="size-4 text-primary" /> : null}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No members found
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {!expanded ? (
          <div className="p-4">
            <div className="flex gap-3">
              <Avatar className="size-10 shrink-0">
                <AvatarImage src={socialCurrentUser.avatarUrl} alt="" />
                <AvatarFallback>{socialCurrentUser.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="pt-1.5 text-sm text-muted-foreground">
                  Share thoughts, ideas, or updates
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <TypePills kind={null} onSelect={setKind} />
                  <button
                    type="button"
                    onClick={onOpenDrafts}
                    className="self-start text-xs font-medium text-muted-foreground hover:text-foreground sm:self-center"
                  >
                    Drafts
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4">
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  onClick={collapse}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Collapse
                </button>
              </div>
              <div className="flex gap-3">
                <Avatar className="size-10 shrink-0">
                  <AvatarImage src={socialCurrentUser.avatarUrl} alt="" />
                  <AvatarFallback>
                    {socialCurrentUser.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-3">
                  <TypePills kind={kind} onSelect={setKind} />

                  {kind === "discussion" && (
                    <div className="relative space-y-1">
                      <div
                        ref={discussionEditorRef}
                        role="textbox"
                        aria-multiline
                        aria-placeholder="Share thoughts, ideas, or updates"
                        contentEditable
                        suppressContentEditableWarning
                        onInput={(e) => {
                          setDiscussionBody(
                            (e.currentTarget as HTMLDivElement).innerHTML,
                          );
                          updateDiscussionMentionState();
                        }
                        }
                        onMouseUp={() => {
                          refreshDiscussionFormats();
                          updateDiscussionMentionState();
                        }}
                        onKeyUp={() => {
                          refreshDiscussionFormats();
                          updateDiscussionMentionState();
                        }}
                        onFocus={() => {
                          refreshDiscussionFormats();
                          updateDiscussionMentionState();
                        }}
                        onBlur={() => {
                          window.setTimeout(() => {
                            setShowMentionDropdown(false);
                          }, 150);
                        }}
                        className="min-h-[80px] w-full resize-y rounded-md border border-transparent bg-background px-2 py-2 text-sm leading-6 outline-none focus-visible:border-input focus-visible:ring-1 focus-visible:ring-ring [&_p]:my-0 [&_ul]:my-2 [&_ol]:my-2 [&_ul]:ml-5 [&_ol]:ml-5 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:my-0 [&_li]:pl-1 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted [&_pre]:px-3 [&_pre]:py-2 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-5 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]"
                      />
                      {mentionRange?.field === "discussion" ? renderMentionDropdown() : null}
                      <p className="text-[11px] text-muted-foreground">
                        Use the toolbar below for bold, lists, links, and more.
                      </p>
                    </div>
                  )}

                  {kind === "question" && (
                    <div className="space-y-3">
                      <div className="relative">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Ask a question (required)
                          </label>
                          <span className="text-[10px] text-muted-foreground">
                            {questionTitle.length}/150
                          </span>
                        </div>
                        {questionTitle ? (
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex h-10 items-center rounded-md px-3 text-sm text-foreground">
                            <span className="truncate">
                              {renderMentionHighlightedText(
                                questionTitle,
                                selectedMentionLabels,
                              )}
                            </span>
                          </div>
                        ) : null}
                        <Input
                          ref={questionTitleRef}
                          maxLength={150}
                          value={questionTitle}
                          onChange={(e) => {
                            setQuestionTitle(e.target.value);
                            updateMentionState(
                              e.target.value,
                              "questionTitle",
                              e.target.selectionEnd ?? e.target.value.length,
                            );
                          }}
                          onClick={(e) =>
                            updateMentionState(
                              e.currentTarget.value,
                              "questionTitle",
                              e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                            )
                          }
                          onKeyUp={(e) =>
                            updateMentionState(
                              e.currentTarget.value,
                              "questionTitle",
                              e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                            )
                          }
                          onFocus={(e) =>
                            updateMentionState(
                              e.currentTarget.value,
                              "questionTitle",
                              e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                            )
                          }
                          onBlur={() => {
                            window.setTimeout(() => {
                              setShowMentionDropdown(false);
                            }, 150);
                          }}
                          placeholder="Ask a question (required)"
                          className={cn(
                            "text-sm",
                            questionTitle && "text-transparent caret-foreground",
                          )}
                          autoFocus
                        />
                        {mentionRange?.field === "questionTitle" ? renderMentionDropdown() : null}
                      </div>
                      <div className="relative">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          (Optional) provide additional details
                        </label>
                        {questionDetail ? (
                          <div className="pointer-events-none absolute inset-x-0 top-6 z-0 overflow-hidden whitespace-pre-wrap break-words rounded-md px-3 py-2 text-sm text-foreground">
                            {renderMentionHighlightedText(
                              questionDetail,
                              selectedMentionLabels,
                            )}
                          </div>
                        ) : null}
                        <textarea
                          ref={questionDetailRef}
                          value={questionDetail}
                          onChange={(e) => {
                            setQuestionDetail(e.target.value);
                            updateMentionState(
                              e.target.value,
                              "questionDetail",
                              e.target.selectionEnd ?? e.target.value.length,
                            );
                          }}
                          onClick={(e) =>
                            updateMentionState(
                              e.currentTarget.value,
                              "questionDetail",
                              e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                            )
                          }
                          onKeyUp={(e) =>
                            updateMentionState(
                              e.currentTarget.value,
                              "questionDetail",
                              e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                            )
                          }
                          onFocus={(e) =>
                            updateMentionState(
                              e.currentTarget.value,
                              "questionDetail",
                              e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                            )
                          }
                          onBlur={() => {
                            window.setTimeout(() => {
                              setShowMentionDropdown(false);
                            }, 150);
                          }}
                          placeholder="(Optional) provide additional details to help clarify your question"
                          className={cn(
                            "min-h-[72px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground",
                            questionDetail && "text-transparent caret-foreground",
                          )}
                          rows={3}
                        />
                        {mentionRange?.field === "questionDetail" ? renderMentionDropdown() : null}
                      </div>
                    </div>
                  )}

                  {kind === "praise" && (
                    <div className="space-y-3">
                      <div className="relative">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Who do you want to praise?
                        </label>
                        <Input
                          ref={praiseWhoRef}
                          value={praiseWho}
                          onChange={(e) => {
                            setPraiseWho(e.target.value);
                            updateMentionState(
                              e.target.value,
                              "praiseWho",
                              e.target.selectionEnd ?? e.target.value.length,
                            );
                          }}
                          onClick={(e) =>
                            updateMentionState(
                              e.currentTarget.value,
                              "praiseWho",
                              e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                            )
                          }
                          onKeyUp={(e) =>
                            updateMentionState(
                              e.currentTarget.value,
                              "praiseWho",
                              e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                            )
                          }
                          onFocus={(e) =>
                            updateMentionState(
                              e.currentTarget.value,
                              "praiseWho",
                              e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                            )
                          }
                          onBlur={() => {
                            window.setTimeout(() => {
                              setShowMentionDropdown(false);
                            }, 150);
                          }}
                          placeholder="Who do you want to praise?"
                          className="text-sm"
                          autoFocus
                        />
                        {mentionRange?.field === "praiseWho" ? renderMentionDropdown() : null}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Share what they&apos;ve done
                        </label>
                        <div className="relative">
                          {praiseWhat ? (
                            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden whitespace-pre-wrap break-words px-3 py-2 text-sm text-foreground">
                              {renderMentionHighlightedText(
                                praiseWhat,
                                selectedMentionLabels,
                              )}
                            </div>
                          ) : null}
                          <textarea
                            ref={praiseWhatRef}
                            value={praiseWhat}
                            onChange={(e) => {
                              setPraiseWhat(e.target.value);
                              updateMentionState(e.target.value, "praiseWhat", e.target.selectionEnd ?? e.target.value.length);
                            }}
                            onClick={(e) => {
                              const target = e.currentTarget;
                              updateMentionState(target.value, "praiseWhat", target.selectionEnd ?? target.value.length);
                            }}
                            onKeyUp={(e) => {
                              const target = e.currentTarget;
                              updateMentionState(target.value, "praiseWhat", target.selectionEnd ?? target.value.length);
                            }}
                            onFocus={(e) => {
                              updateMentionState(e.currentTarget.value, "praiseWhat", e.currentTarget.selectionEnd ?? e.currentTarget.value.length);
                            }}
                            onBlur={() => {
                              window.setTimeout(() => {
                                setShowMentionDropdown(false);
                              }, 150);
                            }}
                            placeholder="Share what they have done"
                            className="relative z-10 min-h-[72px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm text-transparent caret-foreground outline-none placeholder:text-muted-foreground"
                            rows={3}
                          />
                          {mentionRange?.field === "praiseWhat" ? renderMentionDropdown() : null}
                        </div>
                        {selectedMentionLabels.length > 0 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">Mentioned:</span>
                            {selectedMentionLabels.map((label) => (
                              <span
                                key={label}
                                className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
                              >
                                @{label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 rounded-full px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <Smile className="size-4" />
                                Add emoji
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              className="w-[320px] border-border bg-card p-3 shadow-xl"
                            >
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Quick emoji
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    Inserts at your cursor in the praise note.
                                  </p>
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                  {PRAISE_EMOJIS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => insertPraiseEmoji(emoji)}
                                      className="flex h-10 items-center justify-center rounded-xl border border-border bg-background text-lg transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
                                      aria-label={`Insert ${emoji}`}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <p className="text-[11px] text-muted-foreground">
                            Tip: use emojis to make praise more expressive.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Choose achievements (2-3)
                          </label>
                          <span className="text-xs font-semibold text-primary">
                            +{totalPraisePoints} points
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {praiseFlairs.map((flair) => {
                            const selected = selectedPraiseFlairIds.includes(flair.id);
                            return (
                              <button
                                key={flair.id}
                                type="button"
                                onClick={() => togglePraiseFlair(flair.id)}
                                className={cn(
                                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                                  selected
                                    ? `${flair.toneClass} ring-1 ring-primary/30`
                                    : "border-border bg-background text-foreground hover:bg-muted",
                                )}
                                aria-pressed={selected}
                              >
                                {flair.emoji} {flair.name} (+{flair.points})
                              </button>
                            );
                          })}
                        </div>
                        {selectedPraiseFlairs.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 p-2">
                            <span className="text-[11px] font-medium text-muted-foreground">
                              Selected:
                            </span>
                            {selectedPraiseFlairs.map((flair) => (
                              <span
                                key={flair.id}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                  flair.toneClass,
                                )}
                              >
                                {flair.emoji} {flair.name}
                                <button
                                  type="button"
                                  onClick={() => togglePraiseFlair(flair.id)}
                                  className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full bg-background/70 text-[10px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                                  aria-label={`Remove ${flair.name}`}
                                >
                                  <X className="size-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {selectedPraiseFlairIds.length < 2 ? (
                          <p className="text-[11px] text-amber-600">
                            Select at least 2 flairs to post praise.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {kind === "poll" && (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <CalendarDays className="size-4" />
                          </span>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Poll ends at
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Pick the closing time for responses (local time).
                            </p>
                          </div>
                        </div>
                        <Input
                          type="datetime-local"
                          value={pollExpireAt}
                          onChange={(e) => setPollExpireAt(e.target.value)}
                          min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                            .toISOString()
                            .slice(0, 16)}
                          className="h-10 border-border bg-background text-sm"
                        />
                      </div>
                      <div className="relative">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          What is your question?
                        </label>
                        {pollQuestion ? (
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex h-10 items-center rounded-md px-3 text-sm text-foreground">
                            <span className="truncate">
                              {renderMentionHighlightedText(
                                pollQuestion,
                                selectedMentionLabels,
                              )}
                            </span>
                          </div>
                        ) : null}
                        <Input
                          ref={pollQuestionRef}
                          value={pollQuestion}
                          onChange={(e) => {
                            setPollQuestion(e.target.value);
                            updateMentionState(
                              e.target.value,
                              "pollQuestion",
                              e.target.selectionEnd ?? e.target.value.length,
                            );
                          }}
                          onClick={(e) =>
                            updateMentionState(
                              e.currentTarget.value,
                              "pollQuestion",
                              e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                            )
                          }
                          onKeyUp={(e) =>
                            updateMentionState(
                              e.currentTarget.value,
                              "pollQuestion",
                              e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                            )
                          }
                          onFocus={(e) =>
                            updateMentionState(
                              e.currentTarget.value,
                              "pollQuestion",
                              e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                            )
                          }
                          onBlur={() => {
                            window.setTimeout(() => {
                              setShowMentionDropdown(false);
                            }, 150);
                          }}
                          placeholder="What is your question?"
                          className={cn(
                            "text-sm",
                            pollQuestion && "text-transparent caret-foreground",
                          )}
                          autoFocus
                        />
                        {mentionRange?.field === "pollQuestion" ? renderMentionDropdown() : null}
                      </div>
                      <div className="space-y-2">
                        {pollAnswers.map((ans, i) => (
                          <div key={i} className="relative flex items-center gap-2">
                            <span className="w-6 text-xs text-muted-foreground">
                              {i + 1}.
                            </span>
                            {ans ? (
                              <div className="pointer-events-none absolute left-8 right-0 z-0 flex h-10 items-center rounded-md px-3 text-sm text-foreground">
                                <span className="truncate">
                                  {renderMentionHighlightedText(ans, selectedMentionLabels)}
                                </span>
                              </div>
                            ) : null}
                            <Input
                              ref={(el) => {
                                pollAnswerRefs.current[i] = el;
                              }}
                              value={ans}
                              onChange={(e) => {
                                const next = [...pollAnswers];
                                next[i] = e.target.value;
                                setPollAnswers(next);
                                updateMentionState(
                                  e.target.value,
                                  "pollAnswer",
                                  e.target.selectionEnd ?? e.target.value.length,
                                  i,
                                );
                              }}
                              onClick={(e) =>
                                updateMentionState(
                                  e.currentTarget.value,
                                  "pollAnswer",
                                  e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                                  i,
                                )
                              }
                              onKeyUp={(e) =>
                                updateMentionState(
                                  e.currentTarget.value,
                                  "pollAnswer",
                                  e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                                  i,
                                )
                              }
                              onFocus={(e) =>
                                updateMentionState(
                                  e.currentTarget.value,
                                  "pollAnswer",
                                  e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
                                  i,
                                )
                              }
                              onBlur={() => {
                                window.setTimeout(() => {
                                  setShowMentionDropdown(false);
                                }, 150);
                              }}
                              placeholder={`Answer ${i + 1}`}
                              className={cn(
                                "text-sm",
                                ans && "text-transparent caret-foreground",
                              )}
                            />
                            {mentionRange?.field === "pollAnswer" && mentionRange.pollIndex === i
                              ? renderMentionDropdown()
                              : null}
                          </div>
                        ))}
                        {pollAnswers.length < 8 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-primary"
                            onClick={addPollOption}
                          >
                            <Plus className="size-4" />
                            Add option
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                    <Avatar className="size-6">
                      <AvatarImage src={socialCurrentUser.avatarUrl} alt="" />
                      <AvatarFallback className="text-[9px]">
                        {socialCurrentUser.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {hasFixedCommunityId ? (
                      <span className="font-medium text-foreground">
                        This community
                      </span>
                    ) : (
                      <Select
                        value={selectedCommunityId ?? ""}
                        onValueChange={(value) =>
                          setSelectedCommunityId(value || null)
                        }
                      >
                        <SelectTrigger className="h-7 min-w-[154px] border-none px-1.5 text-xs font-medium text-foreground shadow-none focus:ring-0">
                          <SelectValue placeholder="Choose community" />
                        </SelectTrigger>
                        <SelectContent>
                          {joinedCommunities.map((community) => (
                            <SelectItem key={community.id} value={community.id}>
                              {community.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <div className="relative">
                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 font-medium text-primary hover:bg-primary/5 hover:no-underline"
                        onClick={openAddPeoplePicker}
                      >
                        <UserPlus className="size-3.5" />
                        Add people
                      </button>
                      {null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border px-2 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 gap-1.5 px-2 font-normal"
                      >
                        <TypeIcon
                          className={cn("size-4 shrink-0", typeIconClass)}
                        />
                        <span className="hidden text-xs sm:inline">
                          {currentKind!.label}
                        </span>
                        <ChevronDown className="size-3.5 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      <DropdownMenuLabel>Post type</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={kind!}
                        onValueChange={(v) => setKind(v as PostKind)}
                      >
                        {KIND_OPTIONS.map((opt) => (
                          <DropdownMenuRadioItem
                            key={opt.id}
                            value={opt.id}
                            className="gap-2"
                          >
                            <opt.icon className={cn("size-4", opt.iconClass)} />
                            {opt.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Separator orientation="vertical" className="mx-1 h-6" />

                  {kind === "discussion" ? (
                    <>
                      <ToolbarIconButton
                        label="Bold"
                        active={discussionFormats.bold}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          runDiscussionFormat("bold");
                        }}
                      >
                        <Bold className="size-4" />
                      </ToolbarIconButton>
                      <ToolbarIconButton
                        label="Italic"
                        active={discussionFormats.italic}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          runDiscussionFormat("italic");
                        }}
                      >
                        <Italic className="size-4" />
                      </ToolbarIconButton>
                      <ToolbarIconButton
                        label="Link"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const url = window.prompt("Enter URL");
                          if (url) runDiscussionFormat("createLink", url);
                        }}
                      >
                        <Link2 className="size-4" />
                      </ToolbarIconButton>
                      <ToolbarIconButton
                        label="Bulleted list"
                        active={discussionFormats.unorderedList}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          runDiscussionFormat("insertUnorderedList");
                        }}
                      >
                        <List className="size-4" />
                      </ToolbarIconButton>
                      <ToolbarIconButton
                        label="Numbered list"
                        active={discussionFormats.orderedList}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          runDiscussionFormat("insertOrderedList");
                        }}
                      >
                        <ListOrdered className="size-4" />
                      </ToolbarIconButton>
                      <ToolbarIconButton
                        label="Code block"
                        active={discussionFormats.codeBlock}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          runDiscussionFormat("formatBlock", "pre");
                        }}
                      >
                        <Code className="size-4" />
                      </ToolbarIconButton>

                      <Separator orientation="vertical" className="mx-1 h-6" />

                      <ToolbarIconButton
                        label="Emoji"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <Popover
                          open={emojiPickerOpen}
                          onOpenChange={setEmojiPickerOpen}
                        >
                          <PopoverTrigger asChild>
                            <span className="inline-flex items-center">
                              <Smile className="size-4" />
                            </span>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-[360px] p-3">
                            <div className="space-y-3">
                              <Input
                                value={emojiSearch}
                                onChange={(e) => setEmojiSearch(e.target.value)}
                                placeholder="Search emojis"
                                className="h-8 text-xs"
                              />
                              <div className="grid max-h-72 grid-cols-8 gap-1 overflow-y-auto rounded-md border border-border p-2">
                                {filteredEmojiLibrary.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      insertDiscussionText(emoji);
                                      setEmojiPickerOpen(false);
                                    }}
                                    className="flex h-9 items-center justify-center rounded-md text-lg transition-colors hover:bg-primary/10"
                                    aria-label={`Insert ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </ToolbarIconButton>
                      <ToolbarIconButton
                        label="GIF"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <Popover open={gifPickerOpen} onOpenChange={setGifPickerOpen}>
                          <PopoverTrigger asChild>
                            <span className="text-[10px] font-bold">GIF</span>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-[360px] space-y-2 p-2">
                            <Input
                              value={gifQuery}
                              onChange={(e) => setGifQuery(e.target.value)}
                              placeholder="Search GIFs"
                              className="h-8 text-xs"
                            />
                            <div className="max-h-64 overflow-y-auto rounded-md border border-border p-1">
                              {gifResults.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                  {gifResults.map((gif) => (
                                    <button
                                      key={gif.id}
                                      type="button"
                                      className="overflow-hidden rounded-md border border-border bg-background"
                                      onClick={() => {
                                        insertDiscussionGif(gif.gifUrl);
                                        setGifPickerOpen(false);
                                      }}
                                    >
                                      <img
                                        src={gif.previewUrl}
                                        alt={gif.title}
                                        className="h-24 w-full object-cover"
                                      />
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                                  No GIFs found. Try another keyword or pick a fallback GIF.
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </ToolbarIconButton>
                    </>
                  ) : (
                    <span className="px-1 text-[11px] text-muted-foreground">
                      Choose <span className="font-medium">Discussion</span> for
                      rich text formatting.
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onOpenDrafts}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Drafts
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => submitPost(true)}
                    disabled={createMut.isPending}
                  >
                    {createMut.isPending && submitKind === "draft" ? (
                      <>
                        <Loader2 className="mr-1 size-3.5 animate-spin" />
                        Saving
                      </>
                    ) : (
                      "Save draft"
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-0.5 rounded-md"
                    onClick={() => submitPost(false)}
                    disabled={createMut.isPending}
                  >
                    {createMut.isPending && submitKind === "publish" ? (
                      <>
                        <Loader2 className="mr-1 size-3.5 animate-spin" />
                        Posting
                      </>
                    ) : (
                      <>
                        {kind === "question" ? "Ask" : "Post"}
                        <ChevronDown className="size-3.5 opacity-70" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <SocialDraftsDialog open={draftsOpen} onOpenChange={setDraftsOpen} />
    </>
  );
}
