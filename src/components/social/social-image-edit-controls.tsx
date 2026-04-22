"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

/** Keeps one blob preview URL and revokes it on replace or unmount. */
export function useSocialImagePreview() {
  const ref = useRef<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const setFromFile = useCallback((file: File) => {
    const next = URL.createObjectURL(file);
    if (ref.current?.startsWith("blob:")) URL.revokeObjectURL(ref.current);
    ref.current = next;
    setUrl(next);
  }, []);

  useEffect(
    () => () => {
      if (ref.current?.startsWith("blob:")) URL.revokeObjectURL(ref.current);
    },
    [],
  );

  return { previewUrl: url, setFromFile };
}

function pickImageFile(onFile: (file: File) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith("image/")) onFile(f);
    e.target.value = "";
  };
}

function normalizeImageUrl(url: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const unwrapped = trimmed.replace(/^['\"]+|['\"]+$/g, "");
  return unwrapped || null;
}

const toastPreviewOnly = () =>
  toast({
    title: "Image preview",
    description:
      "Shown locally until Social media upload is connected to your backend.",
  });

type SocialCoverImageEditProps = {
  /** Local blob URL or remote URL to show as cover */
  previewUrl: string | null;
  /** Shown when `previewUrl` is null (e.g. gradient Tailwind classes) */
  fallbackClassName: string;
  /** Extra layers on top of fallback (e.g. radial highlights) */
  fallbackOverlay?: ReactNode;
  onFileSelect: (file: File) => void;
  heightClassName?: string;
  editLabel?: string;
};

export function SocialCoverImageEdit({
  previewUrl,
  fallbackClassName,
  fallbackOverlay,
  onFileSelect,
  heightClassName = "h-36 md:h-44",
  editLabel = "Edit cover",
}: SocialCoverImageEditProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mergedOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    pickImageFile((file) => {
      onFileSelect(file);
      toastPreviewOnly();
    })(e);
  };

  return (
    <div
      className={cn(
        "group/cover relative overflow-hidden rounded-t-lg",
        heightClassName,
      )}
    >
      {previewUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${previewUrl})` }}
          role="img"
          aria-label="Cover photo preview"
        />
      ) : (
        <div className={cn("absolute inset-0", fallbackClassName)}>
          {fallbackOverlay}
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover/cover:bg-black/25 md:bg-black/0"
        aria-hidden
      />
      <div className="absolute bottom-2 right-2 z-10 flex gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover/cover:opacity-100">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="pointer-events-auto h-8 gap-1.5 shadow-md"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-3.5" />
          {editLabel}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={mergedOnChange}
      />
    </div>
  );
}

type SocialAvatarImageEditProps = {
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  /** Rendered when there is no local preview (e.g. Avatar or initials block) */
  children: ReactNode;
  wrapperClassName?: string;
  editLabel?: string;
};

export function SocialAvatarImageEdit({
  previewUrl,
  onFileSelect,
  children,
  wrapperClassName,
  editLabel = "Edit photo",
}: SocialAvatarImageEditProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resolvedPreviewUrl = normalizeImageUrl(previewUrl);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [resolvedPreviewUrl]);

  const mergedOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    pickImageFile((file) => {
      onFileSelect(file);
      toastPreviewOnly();
    })(e);
  };

  return (
    <div className={cn("group/avatar relative inline-flex", wrapperClassName)}>
      {resolvedPreviewUrl && !hasImageError ? (
        <div className="relative overflow-hidden rounded-full border-4 border-card shadow-md ring-1 ring-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- user-selected blob preview */}
          <img
            src={resolvedPreviewUrl}
            alt=""
            className="size-24 object-cover md:size-28"
            onError={() => setHasImageError(true)}
          />
        </div>
      ) : (
        children
      )}
      <div className="absolute -bottom-0.5 -right-0.5 z-10 flex md:opacity-0 md:transition-opacity md:group-hover/avatar:opacity-100">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="size-9 rounded-full border border-border shadow-md"
          aria-label={editLabel}
          title={editLabel}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-4" />
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={mergedOnChange}
      />
    </div>
  );
}

type SocialCommunityIconEditProps = {
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  /** Square logo: initials + color */
  fallback: ReactNode;
  className?: string;
  editLabel?: string;
};

/** Square community logo with optional uploaded image and edit control */
export function SocialCommunityIconEdit({
  previewUrl,
  onFileSelect,
  fallback,
  className,
  editLabel = "Edit community icon",
}: SocialCommunityIconEditProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resolvedPreviewUrl = normalizeImageUrl(previewUrl);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [resolvedPreviewUrl]);

  const mergedOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    pickImageFile((file) => {
      onFileSelect(file);
      toastPreviewOnly();
    })(e);
  };

  return (
    <div
      className={cn(
        "group/comm-icon relative inline-flex md:opacity-100",
        className,
      )}
    >
      {resolvedPreviewUrl && !hasImageError ? (
        <div
          className={cn(
            "relative flex size-14 overflow-hidden rounded-lg shadow-lg ring-4 ring-card md:size-16",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedPreviewUrl}
            alt=""
            className="size-full object-cover"
            onError={() => setHasImageError(true)}
          />
        </div>
      ) : (
        fallback
      )}
      <div className="absolute -bottom-1 -right-1 z-10 md:opacity-0 md:transition-opacity md:group-hover/comm-icon:opacity-100">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="size-8 rounded-full border border-border shadow-md"
          aria-label={editLabel}
          title={editLabel}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-3.5" />
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={mergedOnChange}
      />
    </div>
  );
}

type SocialCommunityCoverEditProps = {
  previewUrl: string | null;
  fallbackClassName: string;
  fallbackOverlay?: ReactNode;
  onFileSelect: (file: File) => void;
  heightClassName?: string;
  editLabel?: string;
};

/** Community banner: same pattern as profile cover, rounded-xl top matches card */
export function SocialCommunityCoverEdit({
  previewUrl,
  fallbackClassName,
  fallbackOverlay,
  onFileSelect,
  heightClassName = "h-40 md:h-48",
  editLabel = "Edit cover",
}: SocialCommunityCoverEditProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resolvedPreviewUrl = normalizeImageUrl(previewUrl);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [resolvedPreviewUrl]);

  useEffect(() => {
    if (!resolvedPreviewUrl || resolvedPreviewUrl.startsWith("blob:")) return;
    let isMounted = true;
    const image = new window.Image();
    image.onload = () => {
      if (isMounted) setHasImageError(false);
    };
    image.onerror = () => {
      if (isMounted) setHasImageError(true);
    };
    image.src = resolvedPreviewUrl;
    return () => {
      isMounted = false;
    };
  }, [resolvedPreviewUrl]);

  const mergedOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    pickImageFile((file) => {
      onFileSelect(file);
      toastPreviewOnly();
    })(e);
  };

  return (
    <div
      className={cn(
        "group/comm-cover relative overflow-hidden rounded-t-xl",
        heightClassName,
      )}
    >
      {resolvedPreviewUrl && !hasImageError ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${resolvedPreviewUrl})` }}
          role="img"
          aria-label="Community cover preview"
        />
      ) : (
        <div className={cn("absolute inset-0", fallbackClassName)}>
          {fallbackOverlay}
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover/comm-cover:bg-black/25 md:bg-black/0"
        aria-hidden
      />
      <div className="absolute bottom-2 right-2 z-10 flex opacity-100 transition-opacity md:opacity-0 md:group-hover/comm-cover:opacity-100">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="pointer-events-auto h-8 gap-1.5 shadow-md"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-3.5" />
          {editLabel}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={mergedOnChange}
      />
    </div>
  );
}
