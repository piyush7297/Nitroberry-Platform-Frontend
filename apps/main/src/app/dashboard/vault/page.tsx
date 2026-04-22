"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useApiQuery, usePaginatedApiQuery } from "@/hooks/useApi";
import { useMutation } from "@tanstack/react-query";
import { apiCall } from "@/api/apiFunction";
import { API_ENDPOINTS } from "@/api/endpoints";
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LockKeyhole,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PermissionDeniedState, useModulePermissions } from "@/components/PermissionGuard";
import { EmptyState } from "@/components/not-found";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "../users/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type VaultEntry = {
  id: string;
  title: string;
  website: string;
  username: string;
  password: string;
  expireAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type EncryptedVaultPayload = {
  v: 1;
  salt: string;
  iv: string;
  data: string;
};

type ShareRecord = {
  id: string;
  createdAt: string;
  recipients: string[];
  scope: "vault" | "selected";
  permission: "view";
  note: string;
  entryIds: string[];
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const STATIC_TEAMMATES = [
  { id: "user-1", name: "Rahul Kankariya", email: "rahul@kankariya.com" },
  { id: "user-2", name: "Piyush Sharma", email: "piyush@company.com" },
  { id: "user-3", name: "Garima Trivedi", email: "garima@company.com" },
  { id: "user-4", name: "Shoeb Kamal", email: "shoeb@company.com" },
];

const DEMO_ENTRIES: Omit<VaultEntry, "id" | "createdAt" | "updatedAt">[] = [
  { title: "GitHub Org", website: "https://github.com", username: "engineering@company.com", password: "Gh!ub-Admin#7821" },
  { title: "AWS Console", website: "https://aws.amazon.com", username: "devops@company.com", password: "Aws#Prod!2026" },
  { title: "Database Admin", website: "", username: "db-admin", password: "DbAdmin@123" },
];

const initialForm: Omit<VaultEntry, "id" | "createdAt" | "updatedAt"> = {
  title: "",
  website: "",
  username: "",
  password: "",
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (base64Value: string): Uint8Array => {
  const binary = atob(base64Value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const deriveKey = async (masterPassword: string, salt: Uint8Array) => {
  const normalizedSalt = new Uint8Array(salt) as Uint8Array<ArrayBuffer>;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(masterPassword) as any,
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: normalizedSalt.buffer as ArrayBuffer,
      iterations: 250000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const encryptVault = async (entries: VaultEntry[], masterPassword: string): Promise<EncryptedVaultPayload> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(masterPassword, salt);
  const plain = textEncoder.encode(JSON.stringify(entries));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);

  return {
    v: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted)),
  };
};

const decryptVault = async (payload: EncryptedVaultPayload, masterPassword: string): Promise<VaultEntry[]> => {
  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const cipherBytes = fromBase64(payload.data);
  const key = await deriveKey(masterPassword, salt);
  const normalizedCipherBytes = new Uint8Array(cipherBytes) as Uint8Array<ArrayBuffer>;

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, key, normalizedCipherBytes.buffer as ArrayBuffer);
  const parsed = JSON.parse(textDecoder.decode(new Uint8Array(decrypted)));
  return Array.isArray(parsed) ? parsed : [];
};

const getPasswordStrength = (password?: string): "Weak" | "Medium" | "Strong" => {
  if (!password) return "Weak";
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 3) return "Weak";
  if (score <= 5) return "Medium";
  return "Strong";
};

const generateStrongPassword = (length = 16): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+-=[]{}";
  const random = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(random).map((value) => chars[value % chars.length]).join("");
};

const extractPrivateKeyFromResponse = (res: any): string => {
  const value = res?.data?.privateKey;
  return typeof value === "string" ? value.trim() : "";
};

const extractRecoveryCodeFromResponse = (res: any): string => {
  const value = res?.data?.recoveryCode;
  return typeof value === "string" ? value.trim() : "";
};

const parseBooleanStatus = (value: any): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
};

const mapVaultEntry = (raw: any): VaultEntry => ({
  id: String(raw?.id || ""),
  title: String(raw?.title || ""),
  website: String(raw?.website ?? raw?.websiteUrl ?? ""),
  username: String(raw?.username ?? raw?.userName ?? ""),
  password: String(raw?.password ?? raw?.decryptedData ?? raw?.encryptedData ?? ""),
  expireAt: raw?.expireAt ?? null,
  createdAt: String(raw?.createdAt || ""),
  updatedAt: String(raw?.updatedAt || ""),
});

const extractVaultPassword = (raw: any): string => {
  const candidates = [raw?.password, raw?.decryptedData, raw?.encryptedData];
  const found = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
  return typeof found === "string" ? found.trim() : "";
};

export default function VaultPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStart = Number(searchParams.get("start")) || 1;
  const currentLimit = Number(searchParams.get("limit")) || 10;

  const { hasAccess: canRead } = useModulePermissions(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [start, setStart] = useState(currentStart);
  const [limit, setLimit] = useState(currentLimit);
  const [isSearching, setIsSearching] = useState(false);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [vaultTotal, setVaultTotal] = useState(0);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [privateKey, setPrivateKey] = useState<string>("");
  const [generatedSecrets, setGeneratedSecrets] = useState<{ privateKey: string; recoveryCode: string } | null>(null);
  const [generatedSecretCopied, setGeneratedSecretCopied] = useState({ privateKey: false, recoveryCode: false });
  const [showGeneratedPrivateKey, setShowGeneratedPrivateKey] = useState(false);
  const [showGeneratedRecoveryCode, setShowGeneratedRecoveryCode] = useState(false);
  const [isFocusDismissed, setIsFocusDismissed] = useState(false);
  const [hasPrivateKeyOnServer, setHasPrivateKeyOnServer] = useState<boolean | null>(null);
  const [showEntryPasswords, setShowEntryPasswords] = useState<Record<string, boolean>>({});
  const [selectedEntries, setSelectedEntries] = useState<Record<string, boolean>>({});
  const [openEditor, setOpenEditor] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState(initialForm);
  const [entryPrivateKey, setEntryPrivateKey] = useState("");
  const [openEditKeyDialog, setOpenEditKeyDialog] = useState(false);
  const [pendingEditEntry, setPendingEditEntry] = useState<VaultEntry | null>(null);
  const [editDialogPrivateKey, setEditDialogPrivateKey] = useState("");
  const [isLoadingEditEntry, setIsLoadingEditEntry] = useState(false);
  const [openShareDrawer, setOpenShareDrawer] = useState(false);
  const [shareEntryIds, setShareEntryIds] = useState<string[]>([]);
  const [shareRecipients, setShareRecipients] = useState<string[]>([]);

  const [shareExpiryValue, setShareExpiryValue] = useState("7");
  const [shareExpiryUnit, setShareExpiryUnit] = useState<"days" | "hours" | "minutes">("days");
  const [shareNote, setShareNote] = useState("");
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [deletePrivateKey, setDeletePrivateKey] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [passwordDialogAction, setPasswordDialogAction] = useState<"view" | "copy">("view");
  const [sharePrivateKey, setSharePrivateKey] = useState("");
  const [shareHistory, setShareHistory] = useState<ShareRecord[]>([]);
  const [shareRecipientSearch, setShareRecipientSearch] = useState("");
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [passwordDialogPrivateKey, setPasswordDialogPrivateKey] = useState("");
  const [passwordDialogEntryId, setPasswordDialogEntryId] = useState<string | null>(null);
  const [isPasswordFetching, setIsPasswordFetching] = useState(false);
  const [resolvedPasswords, setResolvedPasswords] = useState<Record<string, string>>({});
  const [openRecoveryDialog, setOpenRecoveryDialog] = useState(false);
  const [openDestructDialog, setOpenDestructDialog] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [recoveredPrivateKey, setRecoveredPrivateKey] = useState("");
  const [showRecoveredPrivateKey, setShowRecoveredPrivateKey] = useState(false);
  const [isRecoveredPrivateKeyCopied, setIsRecoveredPrivateKeyCopied] = useState(false);
  const [destructConfirmText, setDestructConfirmText] = useState("");
  const [isRecoveringKey, setIsRecoveringKey] = useState(false);
  const [isDestructingVault, setIsDestructingVault] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const sharePrivateKeyInputRef = useRef<HTMLInputElement | null>(null);
  const secretsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (generatedSecrets) {
      setTimeout(() => {
        secretsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [generatedSecrets]);

  const persistPrivateKey = (key: string) => {
    const normalizedKey = key.trim();

    if (!normalizedKey) {
      setPrivateKey("");
      return "";
    }

    setPrivateKey(normalizedKey);
    return normalizedKey;
  };

  const teammateSearchUrl = useMemo(() => {
    const trimmed = shareRecipientSearch.trim();
    return `${API_ENDPOINTS.VAULT_USERS}${trimmed ? `?search=${encodeURIComponent(trimmed)}` : ""}`;
  }, [shareRecipientSearch]);

  const { data: teammateData, isLoading: isTeammatesLoading } = useApiQuery(
    ["VAULT_TEAMMATE_SEARCH", shareRecipientSearch],
    teammateSearchUrl,
    {
      enabled: openShareDrawer,
      refetchOnWindowFocus: false,
    } as const,
  );

  const liveTeammates = useMemo(() => {
    const raw = teammateData?.data?.users || teammateData?.data?.data || (Array.isArray(teammateData?.data) ? teammateData?.data : []);
    return Array.isArray(raw) ? raw : [];
  }, [teammateData]);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  // Sync pagination state with URL when page loads or URL changes.
  useEffect(() => {
    setStart(Number(searchParams.get("start")) || 1);
    setLimit(Number(searchParams.get("limit")) || 10);
  }, [searchParams]);

  // Clear stale `q` query param so vault search never auto-prefills from old URLs.
  useEffect(() => {
    if (!searchParams.has("q")) return;

    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete("q");
    const nextQuery = newParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [pathname, router, searchParams]);

  const updateUrl = (params: { start?: number; limit?: number }) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (params.start !== undefined) newParams.set("start", String(params.start));
    if (params.limit !== undefined) newParams.set("limit", String(params.limit));
    newParams.delete("q");

    setIsSearching(true);
    router.push(`${pathname}?${newParams.toString()}`);

    // Simulate server response time
    setTimeout(() => setIsSearching(false), 300);
  };

  const handleSearchChange = (value: string) => {
    if (openShareDrawer) {
      return;
    }

    setSearchTerm(value);
    setStart(1);
    setIsSearching(true);
    updateUrl({ start: 1 });
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const vaultListParams = useMemo(() => ({
    start: Math.max(1, start),
    limit,
    ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
  }), [debouncedSearchTerm, limit, start]);

  const { data: vaultListData, refetch: refetchVault, isLoading: isVaultFetching, error: vaultError } = usePaginatedApiQuery(
    ["VAULT_LIST"],
    API_ENDPOINTS.VAULT,
    vaultListParams,
    {
      enabled: isUnlocked,
      refetchOnWindowFocus: false,
      retry: false,
    } as any,
  );

  useEffect(() => {
    if (vaultListData) {
      console.log("Vault List Response (GET /vault):", vaultListData);
      // The backend returns data in res.data.data
      const rawEntries = vaultListData.data?.data || vaultListData.data || [];
      setEntries(Array.isArray(rawEntries) ? rawEntries.map(mapVaultEntry) : []);
      const totalCount = Number(
        vaultListData.data?.total ??
        vaultListData.data?.meta?.total ??
        vaultListData.total ??
        (Array.isArray(rawEntries) ? rawEntries.length : 0),
      );
      setVaultTotal(Number.isFinite(totalCount) && totalCount >= 0 ? totalCount : Array.isArray(rawEntries) ? rawEntries.length : 0);
      setIsSearching(false);
    }
  }, [vaultListData]);


  const { refetch: fetchSecuritySetup } = useApiQuery(
    ["VAULT_SECURITY_SETUP"],
    API_ENDPOINTS.VAULT_SECURITY_SETUP,
    {
      enabled: false,
      retry: false,
    } as any
  );

  useEffect(() => {
    let isMounted = true;

    const loadSecurityStatus = async () => {
      try {
        const res: any = await apiCall("get", API_ENDPOINTS.VAULT_SECURITY_STATUS);
        const statusKey = res?.data?.key;
        if (isMounted) {
          setHasPrivateKeyOnServer(statusKey === true);
        }
      } catch (err: any) {
        const statusKey = err?.response?.data?.data?.key ?? err?.response?.data?.key;
        if (isMounted && (statusKey === true || statusKey === false)) {
          setHasPrivateKeyOnServer(statusKey);
        }
      }
    };

    loadSecurityStatus();

    return () => {
      isMounted = false;
    };
  }, []);


  const createMutation = useMutation({
    mutationFn: (vars: any) => {
      const { vaultHeaderKey, ...data } = vars;
      const config = vaultHeaderKey ? { headers: { "x-vault-key": vaultHeaderKey } } : undefined;
      return apiCall("post", API_ENDPOINTS.VAULT, data, config);
    }
  });
  const updateMutation = useMutation({
    mutationFn: (vars: any) => {
      const { id, vaultHeaderKey, ...data } = vars;
      const config = vaultHeaderKey ? { headers: { "x-vault-key": vaultHeaderKey } } : undefined;
      return apiCall("put", API_ENDPOINTS.VAULT_DETAIL(id), data, config);
    }
  });
  const deleteMutation = useMutation({
    mutationFn: (vars: any) => {
      const { id, vaultHeaderKey } = vars;
      const config = vaultHeaderKey ? { headers: { "x-vault-key": vaultHeaderKey } } : undefined;
      return apiCall("delete", API_ENDPOINTS.VAULT_DETAIL(id), undefined, config);
    }
  });
  const shareMutation = useMutation({
    mutationFn: (vars: any) => {
      const { vaultHeaderKey, ...data } = vars;
      const config = vaultHeaderKey ? { headers: { "x-vault-key": vaultHeaderKey } } : undefined;
      return apiCall("post", API_ENDPOINTS.VAULT_SHARE, data, config);
    }
  });

  const handleLockVault = () => {
    setIsUnlocked(false);
    setEntries([]);
    setUnlockPassword("");
    setShowEntryPasswords({});
    setSelectedEntries({});
  };

  const handleUnlockVault = () => {
    const normalizedUnlockKey = unlockPassword.trim();
    if (!normalizedUnlockKey) {
      toast({ title: "Private key required", description: "Please paste your private key to unlock vault.", variant: "destructive" });
      return;
    }

    if (generatedSecrets) {
      const privateKeyCopied = generatedSecretCopied.privateKey;
      const recoveryCodeCopied = generatedSecretCopied.recoveryCode;

      if (!privateKeyCopied || !recoveryCodeCopied) {
        toast({
          title: "Copy your keys first",
          description: "Please copy both the private key and recovery code before continuing.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsBusy(true);
    persistPrivateKey(normalizedUnlockKey);
    setIsUnlocked(true);
    setGeneratedSecrets(null);
    toast({ title: "Vault unlocked", description: "Private key verified for request header usage.", variant: "default" });
    setIsBusy(false);
  };

  const handleRequestSecurityKey = async () => {
    setIsBusy(true);
    try {
      const result: any = await fetchSecuritySetup();
      const res = result?.data;

      console.log("Security Setup Response (GET /vault/security/setup):", res);

      if (!res) {
        const msg =
          result?.error?.response?.data?.message ||
          result?.error?.message ||
          "Could not request security key. Please try again.";
        toast({
          title: "Security setup failed",
          description: msg,
          variant: "destructive",
        });
        return;
      }

      const generatedKey = extractPrivateKeyFromResponse(res);
      const generatedRecoveryCode = extractRecoveryCodeFromResponse(res);

      if (!generatedKey || !generatedRecoveryCode) {
        toast({
          title: "Security setup failed",
          description: "Server did not return both privateKey and recoveryCode.",
          variant: "destructive",
        });
        return;
      }

      persistPrivateKey(generatedKey);
      setUnlockPassword(generatedKey);
      setGeneratedSecrets({ privateKey: generatedKey, recoveryCode: generatedRecoveryCode });
      setGeneratedSecretCopied({ privateKey: false, recoveryCode: false });
      setShowGeneratedRecoveryCode(false);
      setIsFocusDismissed(false);
      setHasPrivateKeyOnServer(true);
      setIsUnlocked(false);
      toast({
        title: "Security keys generated",
        description:
          res?.message ||
          "Copy and securely save your private key and recovery code now. They may not be shown again.",
        variant: "default",
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || "";
      if (msg.includes("Already Key Generate")) {
        setHasPrivateKeyOnServer(true);
      }
      toast({
        title: "Security setup failed",
        description: msg || "Could not request security key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRecoverPrivateKey = async () => {
    const normalizedRecoveryKey = recoveryKey.trim();
    if (!normalizedRecoveryKey) {
      toast({ title: "Recovery key required", description: "Enter your recovery key to restore private key.", variant: "destructive" });
      return;
    }

    setIsRecoveringKey(true);
    try {
      const res = await apiCall("post", "vault/recover-security", { recoveryCode: normalizedRecoveryKey });
      const recoveredPrivateKey = extractPrivateKeyFromResponse(res);

      if (!recoveredPrivateKey) {
        toast({ title: "Recovery failed", description: "Private key was not returned by server.", variant: "destructive" });
        return;
      }

      persistPrivateKey(recoveredPrivateKey);
      setUnlockPassword(recoveredPrivateKey);
      setRecoveredPrivateKey(recoveredPrivateKey);
      setShowRecoveredPrivateKey(false);
      setIsRecoveredPrivateKeyCopied(false);
      setIsUnlocked(false);
      setHasPrivateKeyOnServer(true);
      setRecoveryKey("");
      toast({ title: "Private key recovered", description: "Copy your recovered private key and store it safely.", variant: "default" });
    } catch {
      // Failure toast is handled centrally in apiCall for project-wide consistency.
    } finally {
      setIsRecoveringKey(false);
    }
  };

  const handleRecoveryDialogChange = (open: boolean) => {
    setOpenRecoveryDialog(open);
    if (!open) {
      setRecoveryKey("");
      setRecoveredPrivateKey("");
      setShowRecoveredPrivateKey(false);
      setIsRecoveredPrivateKeyCopied(false);
    }
  };

  const handleDestructVault = async () => {
    if (destructConfirmText.trim().toUpperCase() !== "DESTRUCT") {
      toast({ title: "Confirmation required", description: "Type DESTRUCT to continue.", variant: "destructive" });
      return;
    }

    setIsDestructingVault(true);
    try {
      const res: any = await apiCall("get", API_ENDPOINTS.VAULT_RESET_SECURITY);

      const generatedKey = extractPrivateKeyFromResponse(res);
      const generatedRecoveryCode = extractRecoveryCodeFromResponse(res);

      persistPrivateKey("");
      setUnlockPassword("");
      setEntries([]);
      setIsUnlocked(false);
      setOpenDestructDialog(false);
      setOpenRecoveryDialog(false);
      setRecoveryKey("");
      setRecoveredPrivateKey("");
      setShowRecoveredPrivateKey(false);
      setIsRecoveredPrivateKeyCopied(false);
      setDestructConfirmText("");

      if (generatedKey && generatedRecoveryCode) {
        setGeneratedSecrets({ privateKey: generatedKey, recoveryCode: generatedRecoveryCode });
        setGeneratedSecretCopied({ privateKey: false, recoveryCode: false });
        setShowGeneratedRecoveryCode(false);
        setIsFocusDismissed(false);
        setHasPrivateKeyOnServer(true);
      } else {
        setHasPrivateKeyOnServer(false);
      }

      toast({
        title: "Vault reset",
        description: res?.message || "Security has been fully reset. All old data was deleted.",
        variant: "default",
      });
    } catch {
      // Failure toast is handled centrally in apiCall for project-wide consistency.
    } finally {
      setIsDestructingVault(false);
    }
  };

  const total = vaultTotal || entries.length;
  const paginatedEntries = entries;

  const selectedEntryIds = useMemo(() => Object.keys(selectedEntries).filter((entryId) => selectedEntries[entryId]), [selectedEntries]);
  const weakCount = useMemo(() => entries.filter((entry) => getPasswordStrength(entry.password) === "Weak").length, [entries]);
  const reusedCount = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((entry) => {
      const p = entry.password || "";
      if (p) map.set(p, (map.get(p) || 0) + 1);
    });
    return entries.filter((entry) => entry.password && (map.get(entry.password) || 0) > 1).length;
  }, [entries]);

  const healthScore = useMemo(() => {
    if (entries.length === 0) return 100;
    return Math.max(0, 100 - weakCount * 15 - reusedCount * 10);
  }, [entries.length, weakCount, reusedCount]);

  const healthTone = healthScore >= 90 ? "text-emerald-600" : healthScore >= 70 ? "text-amber-600" : "text-rose-600";
  const securityTip = entries.length === 0
    ? "Add a demo set or your own credentials to begin building your vault."
    : weakCount > 0
      ? "A few passwords are weak. Use Generate to replace them with stronger ones."
      : "Your vault looks healthy. Keep using unique passwords and share only what is needed.";

  const openCreateDialog = () => {
    setEditingEntryId(null);
    setEntryForm(initialForm);
    setEntryPrivateKey("");
    setOpenEditor(true);
  };

  const openEditDialog = (entry: VaultEntry) => {
    setPendingEditEntry(entry);
    setEditDialogPrivateKey("");
    setOpenEditKeyDialog(true);
  };

  const handleContinueEditWithPrivateKey = async () => {
    if (!pendingEditEntry) return;

    const normalizedPrivateKey = editDialogPrivateKey.trim();
    if (!normalizedPrivateKey) {
      toast({ title: "Private key required", description: "Please enter a private key before editing.", variant: "destructive" });
      return;
    }

    setIsLoadingEditEntry(true);
    try {
      const response = await apiCall("get", API_ENDPOINTS.VAULT_DETAIL(pendingEditEntry.id), undefined, {
        headers: { "x-vault-key": normalizedPrivateKey },
      });

      const rawEntry = response?.data?.data ?? response?.data ?? response;
      const resolvedPassword = extractVaultPassword(rawEntry);
      const loadedEntry = mapVaultEntry({
        ...pendingEditEntry,
        ...(rawEntry && typeof rawEntry === "object" ? rawEntry : {}),
      });

      setEditingEntryId(pendingEditEntry.id);
      setEntryForm({
        title: loadedEntry.title,
        website: loadedEntry.website,
        username: loadedEntry.username,
        password: resolvedPassword || loadedEntry.password || pendingEditEntry.password || "",
      });
      setEntryPrivateKey("");
      persistPrivateKey(normalizedPrivateKey);
      setOpenEditKeyDialog(false);
      setPendingEditEntry(null);
      setOpenEditor(true);
    } catch {
      // Failure toast is handled centrally in apiCall for project-wide consistency.
    } finally {
      setIsLoadingEditEntry(false);
    }
  };

  const handleSaveEntry = async () => {
    if (!entryForm.title || !entryForm.password) {
      toast({ title: "Missing required fields", description: "Title and password are required.", variant: "destructive" });
      return;
    }

    try {
      if (editingEntryId) {
        const requestPrivateKey = entryPrivateKey.trim() || privateKey.trim();
        if (!requestPrivateKey) {
          toast({ title: "Private key required", description: "Please enter a private key before updating.", variant: "destructive" });
          return;
        }

        persistPrivateKey(requestPrivateKey);

        await updateMutation.mutateAsync({
          id: editingEntryId,
          vaultHeaderKey: requestPrivateKey,
          title: entryForm.title,
          encryptedData: entryForm.password,
          userName: entryForm.username,
          websiteUrl: entryForm.website,
        });
      } else {
        const requestPrivateKey = privateKey.trim();
        if (!requestPrivateKey) {
          toast({ title: "Private key required", description: "Please enter a private key before creating.", variant: "destructive" });
          return;
        }

        await createMutation.mutateAsync({
          vaultHeaderKey: requestPrivateKey,
          title: entryForm.title,
          encryptedData: entryForm.password,
          userName: entryForm.username,
          websiteUrl: entryForm.website,
        });
      }
      refetchVault();
      setOpenEditor(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || "";
      if (msg.includes("Security not initialized")) {
        setIsUnlocked(false);
        setOpenEditor(false);
        toast({ title: "Initialization required", description: "Please get your private key first.", variant: "destructive" });
      }
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    setDeleteEntryId(entryId);
    setDeletePrivateKey("");
    setOpenDeleteDialog(true);
  };

  const confirmDeleteEntry = async () => {
    if (!deleteEntryId) return;
    const normalizedKey = deletePrivateKey.trim();
    if (!normalizedKey) {
      toast({ title: "Private key required", description: "Please enter your private key to authorize deletion.", variant: "destructive" });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ id: deleteEntryId, vaultHeaderKey: normalizedKey });
      refetchVault();
      setOpenDeleteDialog(false);
      setDeleteEntryId(null);
      setDeletePrivateKey("");
      toast({ title: "Entry deleted", variant: "default" });
    } catch {
      // Failure toast is handled centrally in apiCall for project-wide consistency.
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied`, variant: "default" });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard access was denied.", variant: "destructive" });
    }
  };

  const handleCopyGeneratedSecret = async (value: string, type: "privateKey" | "recoveryCode") => {
    const normalized = value.trim();
    if (!normalized) {
      toast({
        title: "Value unavailable",
        description: type === "privateKey" ? "Private key was not returned." : "Recovery code was not returned.",
        variant: "destructive",
      });
      return;
    }

    await handleCopy(normalized, type === "privateKey" ? "Private key" : "Recovery code");
    const nextCopied = { ...generatedSecretCopied, [type]: true };
    setGeneratedSecretCopied(nextCopied);

    if (nextCopied.privateKey && nextCopied.recoveryCode) {
      setIsFocusDismissed(true);
    }
  };

  const toggleSelectEntry = (entryId: string) => {
    setSelectedEntries((prev) => ({ ...prev, [entryId]: !prev[entryId] }));
  };

  const openShareDrawerForEntries = (entryIds: string[]) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setShareEntryIds(entryIds);
    setShareRecipients([]);
    setShareRecipientSearch("");
    setSearchTerm("");
    setSharePrivateKey("");
    setOpenShareDrawer(true);
  };

  const toggleShareRecipient = (userId: string) => {
    setShareRecipients((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const toggleShareEntry = (entryId: string) => {
    setShareEntryIds((prev) => (prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId]));
  };

  const openPasswordKeyDialog = (entryId: string, action: "view" | "copy" = "view") => {
    setPasswordDialogEntryId(entryId);
    setPasswordDialogPrivateKey("");
    setPasswordDialogAction(action);
    setOpenPasswordDialog(true);
  };

  const fetchPasswordForEntry = async () => {
    const normalizedPrivateKey = passwordDialogPrivateKey.trim();
    if (!passwordDialogEntryId) return;

    if (!normalizedPrivateKey) {
      toast({ title: "Private key required", description: "Enter your private key to view password.", variant: "destructive" });
      return;
    }

    setIsPasswordFetching(true);
    try {
      const response = await apiCall("get", API_ENDPOINTS.VAULT_DETAIL(passwordDialogEntryId), undefined, {
        headers: { "x-vault-key": normalizedPrivateKey },
      });

      const rawEntry = response?.data?.data ?? response?.data ?? response;
      const nextPassword = extractVaultPassword(rawEntry);
      if (!nextPassword) {
        toast({ title: "Password unavailable", description: "No password found in credential details.", variant: "destructive" });
        return;
      }

      persistPrivateKey(normalizedPrivateKey);
      setResolvedPasswords((prev) => ({ ...prev, [passwordDialogEntryId]: nextPassword }));
      
      if (passwordDialogAction === "copy") {
        await handleCopy(nextPassword, "Password");
      } else {
        setShowEntryPasswords((prev) => ({ ...prev, [passwordDialogEntryId]: true }));
      }
      
      setOpenPasswordDialog(false);
    } catch {
      // Failure toast is handled centrally in apiCall for project-wide consistency.
    } finally {
      setIsPasswordFetching(false);
    }
  };

  const handleShare = async () => {
    if (shareRecipients.length === 0) {
      toast({ title: "Select recipients", description: "Choose at least one teammate to share with.", variant: "destructive" });
      return;
    }

    const targetIds = shareEntryIds.length > 0 ? shareEntryIds : entries.map((entry) => entry.id);

    if (targetIds.length === 0) {
      toast({ title: "No credentials available", description: "Add at least one vault item before sharing.", variant: "destructive" });
      return;
    }

    const normalizedSharePrivateKey = sharePrivateKey.trim();
    if (!normalizedSharePrivateKey) {
      toast({ title: "Private key required", description: "Please enter private key to share vault access.", variant: "destructive" });
      return;
    }

    const parsedExpiryValue = Number(shareExpiryValue || "0");
    const expiryMultiplier = shareExpiryUnit === "days" ? 24 * 60 : shareExpiryUnit === "hours" ? 60 : 1;
    const totalExpiryMinutes = parsedExpiryValue * expiryMultiplier;
    if (Number.isNaN(totalExpiryMinutes) || totalExpiryMinutes < 15 || totalExpiryMinutes > 10080) {
      toast({ title: "Invalid destruct time", description: "Destruct window must be between 15 minutes and 7 days.", variant: "destructive" });
      return;
    }

    const payload = {
      userIds: shareRecipients,
      vaultIds: targetIds,
      shareType: 2,
      // Format: "YYYY-MM-DD HH:mm:ssZ" - Removing milliseconds for better backend parsing
      expiresAt: new Date(Date.now() + (totalExpiryMinutes - 5) * 60 * 1000)
        .toISOString()
        .replace("T", " ")
        .split(".")[0] + "Z",
      // note: shareNote || "",
    };

    try {
      await shareMutation.mutateAsync({
        vaultHeaderKey: normalizedSharePrivateKey,
        ...payload,
      });
      setOpenShareDrawer(false);
      setShareEntryIds([]);
      setShareRecipients([]);
      setSharePrivateKey("");
    } catch (err: any) {
      // Failure toast is handled centrally in apiCall for project-wide consistency.
    }
  };

  const setFormField = (field: keyof typeof entryForm, value: string) => {
    setEntryForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectedShareEntries = useMemo(() => {
    return entries.filter((entry) => shareEntryIds.includes(entry.id));
  }, [entries, shareEntryIds]);

  const maxExpiryValue = shareExpiryUnit === "days" ? 7 : shareExpiryUnit === "hours" ? 24 : 10080;
  const minExpiryValue = shareExpiryUnit === "minutes" ? 15 : 1;

  useEffect(() => {
    if (!openShareDrawer) return;

    const frame = requestAnimationFrame(() => {
      sharePrivateKeyInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [openShareDrawer]);

  if (!canRead) {
    return <PermissionDeniedState />;
  }

  return (
    <div className="min-w-0 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">

      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-medium text-violet-700">
              <ShieldCheck className="h-3 w-3" />
              Encrypted credential vault
            </div>
          </div>
          <h1 className="text-2xl font-semibold">Vault</h1>
          <p className="text-gray-600">
            Store credentials in an encrypted local vault, share selected items with teammates, and keep your access profile organized from one place.
          </p>
        </div>
      </div>


      {!isUnlocked && (
        <div className="flex flex-col items-center justify-center py-12 px-4 relative">
          {generatedSecrets && !isFocusDismissed && (
            <div
              className="fixed inset-0 z-[50] bg-black/60 backdrop-blur-md transition-opacity duration-500 cursor-pointer"
              onClick={() => setIsFocusDismissed(true)}
            />
          )}
          <div className="w-full max-w-md space-y-8 transition-all duration-500 relative">
            <div className="text-center space-y-2">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-50 text-violet-600 shadow-inner mb-4">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Unlock Your Vault
              </h2>
              <p className="text-slate-500 text-sm max-w-[280px] mx-auto">
                Enter your private key to access your encrypted credentials.
              </p>
            </div>

            <Card className="border-slate-200/60 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Private Key</Label>
                  <Input
                    type="password"
                    name="vault-unlock-private-key"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    value={unlockPassword}
                    onChange={(event) => setUnlockPassword(event.target.value)}
                    placeholder="Paste your generated private key here"
                    className="h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all pr-12"
                  />
                </div>
                <Button
                  className="w-full h-12 text-sm font-semibold shadow-lg shadow-violet-200 group"
                  onClick={handleUnlockVault}
                  disabled={isBusy}
                >
                  {isBusy ? "Verifying..." : "Access Vault"}
                  {!isBusy && <KeyRound className="ml-2 h-4 w-4 group-hover:scale-110 transition-transform" />}
                </Button>
                {hasPrivateKeyOnServer === true ? (
                  <Button
                    variant="ghost"
                    className="w-full h-11 text-sm font-semibold"
                    onClick={() => setOpenRecoveryDialog(true)}
                    disabled={isBusy}
                  >
                    Forgot private key?
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-11 text-sm font-semibold"
                    onClick={handleRequestSecurityKey}
                    disabled={isBusy}
                  >
                    {isBusy ? "Requesting..." : "Generate Private Key"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {generatedSecrets ? (
              <div ref={secretsRef} className={cn("relative transition-all duration-500 animate-in fade-in slide-in-from-bottom-4", (generatedSecrets && !isFocusDismissed) && "z-[60]")}>
                <Card className="border-amber-200 bg-amber-50/70 shadow-2xl ring-1 ring-amber-500/20">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-2 text-amber-900">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">Save these keys now</p>
                        <p className="text-xs text-amber-800/90">
                          This is a one-time display. Copy and store both values safely before unlocking the vault.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Generated Private Key</Label>
                      <div className="relative">
                        <Input
                          type="password"
                          value={generatedSecrets.privateKey}
                          readOnly
                          className="h-11 bg-white pr-24 font-mono text-xs"
                        />
                        <div className="absolute inset-y-0 right-12 flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleCopyGeneratedSecret(generatedSecrets.privateKey, "privateKey")}
                            aria-label="Copy private key"
                          >
                            {generatedSecretCopied.privateKey ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Recovery Code</Label>
                      <div className="relative">
                        <Input
                          type="password"
                          value={generatedSecrets.recoveryCode}
                          readOnly
                          className="h-11 bg-white pr-24 font-mono text-xs"
                        />
                        <div className="absolute inset-y-0 right-12 flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleCopyGeneratedSecret(generatedSecrets.recoveryCode, "recoveryCode")}
                            aria-label="Copy recovery code"
                          >
                            {generatedSecretCopied.recoveryCode ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-tighter text-slate-400">
              <ShieldCheck className="h-3 w-3" />
              <span>Zero-Knowledge Encryption Active</span>
            </div>
          </div>
        </div>
      )}

      {isUnlocked && (
        <>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-1">
            <Card className="h-[88px] gap-0 border border-slate-200 bg-white py-0 shadow-none transition-colors hover:border-slate-300">
              <CardContent className="flex h-full flex-col gap-1.5 p-2">
                <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-500">Total Credentials</p>
                <p className="truncate text-[22px] font-semibold leading-[1] text-slate-900">{entries.length}</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="search-vault"
                name="vault-query"
                type="search"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search credentials..."
                className="pl-9 text-sm border-0 rounded-md bg-gray-50 focus-visible:bg-white focus-visible:ring-1"
              />
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              {selectedEntryIds.length > 0 && (
                <div className="mr-2 flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">{selectedEntryIds.length} selected</span>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setSelectedEntries({})}>Clear</Button>
                </div>
              )}
              <Button variant="outline" size="sm" className="shadow-sm h-8" onClick={() => openShareDrawerForEntries(selectedEntryIds)}>
                <Users className="mr-1.5 h-3.5 w-3.5" />Share
              </Button>
              <Button variant="default" size="sm" className="shadow-sm h-8" onClick={openCreateDialog}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Create Credential
              </Button>
              <Button variant="outline" size="icon-sm" className="h-8 w-8" onClick={handleLockVault} aria-label="Lock vault">
                <Lock className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
              <CardContent className="p-0">
                {entries.length === 0 ? (
                  <div className="space-y-4 px-6 py-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
                      <ShieldCheck className="h-6 w-6 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">No credentials found</h3>
                      <p className="mt-1 text-sm text-slate-500">Your secure vault is currently empty.</p>
                    </div>
                    <Button onClick={openCreateDialog} className="mt-4">
                      Add credential
                    </Button>
                  </div>
                ) : (isVaultFetching || isSearching) ? (
                  <div className="p-8 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-4 w-[40px]" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-4 w-[100px]" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow>
                          <TableHead className="w-[40px] px-6">Select</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Website</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Password</TableHead>
                          <TableHead>Strength</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedEntries.map((entry) => {
                          const showPassword = !!showEntryPasswords[entry.id];
                          const resolvedPassword = resolvedPasswords[entry.id] || entry.password || "";
                          const strength = getPasswordStrength(entry.password);
                          return (
                            <TableRow key={entry.id} className="hover:bg-gray-50 transition-colors">
                              <TableCell className="px-6"><Checkbox checked={!!selectedEntries[entry.id]} onCheckedChange={() => toggleSelectEntry(entry.id)} /></TableCell>
                              <TableCell className="font-medium text-slate-900">{entry.title}</TableCell>
                              <TableCell className="text-slate-500 text-xs">{entry.website || "-"}</TableCell>
                              <TableCell className="text-slate-600 font-medium">{entry.username}</TableCell>

                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm text-slate-700">{showPassword ? resolvedPassword : "************"}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      if (showPassword) {
                                        setShowEntryPasswords((prev) => ({ ...prev, [entry.id]: false }));
                                        return;
                                      }
                                      openPasswordKeyDialog(entry.id, "view");
                                    }}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      if (showPassword && resolvedPassword) {
                                        handleCopy(resolvedPassword, "Password");
                                        return;
                                      }
                                      openPasswordKeyDialog(entry.id, "copy");
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${strength === "Strong" ? "bg-emerald-50 text-emerald-700" : strength === "Medium" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{strength}</span></TableCell>
                              <TableCell className="text-slate-600">{new Date(entry.updatedAt).toLocaleDateString()}</TableCell>
                              <TableCell className="text-slate-600">{entry.expireAt ? new Date(entry.expireAt).toLocaleString() : "-"}</TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem onClick={() => openShareDrawerForEntries([entry.id])}>
                                      <Users className="h-4 w-4" />
                                      <span>Share</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCopy(entry.username, "Username")}>
                                      <Copy className="h-4 w-4" />
                                      <span>Copy username</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openEditDialog(entry)}>
                                      <Pencil className="h-4 w-4" />
                                      <span>Edit</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem variant="destructive" onClick={() => handleDeleteEntry(entry.id)}>
                                      <Trash2 className="h-4 w-4" />
                                      <span>Delete</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {!isVaultFetching && !isSearching && paginatedEntries.length > 0 && (
                  <div className="px-4 pb-4 border-t border-slate-100 items-center">
                    <Pagination
                      start={start}
                      limit={limit}
                      total={total}
                      onPageChange={(newStart) => updateUrl({ start: newStart })}
                      onLimitChange={(newLimit) => updateUrl({ limit: newLimit, start: 1 })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Dialog
        open={openEditKeyDialog}
        onOpenChange={(open) => {
          setOpenEditKeyDialog(open);
          if (!open) {
            setPendingEditEntry(null);
            setEditDialogPrivateKey("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Private Key</DialogTitle>
            <DialogDescription>
              Enter your private key before editing this credential. The latest vault detail will be loaded into the edit form.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-private-key">Private Key</Label>
              <Input
                id="edit-private-key"
                type="password"
                name="vault-edit-private-key"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                value={editDialogPrivateKey}
                onChange={(event) => setEditDialogPrivateKey(event.target.value)}
                placeholder="Enter private key"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenEditKeyDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleContinueEditWithPrivateKey} disabled={isLoadingEditEntry}>
                {isLoadingEditEntry ? "Loading..." : "Continue"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={openEditor} onOpenChange={setOpenEditor}>
        <SheetContent className="sm:max-w-xl border-l border-slate-200 bg-white p-0">
          <SheetHeader className="p-10 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-violet-600" />
              </div>
              <Badge variant="outline" className="bg-violet-50/50 text-violet-700 border-violet-200">Vault Secure</Badge>
            </div>
            <SheetTitle className="text-2xl font-bold text-slate-900">{editingEntryId ? "Edit Credential" : "Add Credential"}</SheetTitle>
            <SheetDescription className="text-slate-500">
              Store account details securely in your encrypted vault. All data is protected with industry-standard encryption.
            </SheetDescription>
          </SheetHeader>

          <div className="px-10 pb-4">
            <Separator />
          </div>

          <div className="h-[calc(100vh-280px)] overflow-y-auto px-10 custom-scrollbar pb-10">
            <div className="space-y-6 pb-6">
              <div className="grid gap-2">
                <Label htmlFor="title" className="text-sm font-semibold text-slate-700">Service Title</Label>
                <Input
                  id="title"
                  value={entryForm.title}
                  onChange={(event) => setFormField("title", event.target.value)}
                  placeholder="GitHub, AWS, Database, etc."
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="website" className="text-sm font-semibold text-slate-700">Website URL (Optional)</Label>
                <Input
                  id="website"
                  value={entryForm.website}
                  onChange={(event) => setFormField("website", event.target.value)}
                  placeholder="https://example.com"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username" className="text-sm font-semibold text-slate-700">Username / Email (Optional)</Label>
                <Input
                  id="username"
                  name="vault-entry-username"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={entryForm.username}
                  onChange={(event) => setFormField("username", event.target.value)}
                  placeholder="name@company.com"
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="password"
                    type="password"
                    name="vault-entry-password"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    value={entryForm.password}
                    onChange={(event) => setFormField("password", event.target.value)}
                    placeholder="Enter password"
                    className="h-10 font-mono bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                  />
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setFormField("password", generateStrongPassword(18))}
                    className="h-10 shrink-0 border-slate-200 px-3 hover:bg-slate-50"
                  >
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Generate
                  </Button>
                </div>
              </div>

              {editingEntryId && (
                <div className="grid gap-2">
                  <Label htmlFor="privateKey" className="text-sm font-semibold text-slate-700">Private Key</Label>
                  <Input
                    id="privateKey"
                    type="password"
                    name="vault-update-private-key"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    value={entryPrivateKey}
                    onChange={(event) => setEntryPrivateKey(event.target.value)}
                    placeholder="Enter private key for update"
                    className="font-mono bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="p-10 bg-white border-t border-slate-100">
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setOpenEditor(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-violet-600 hover:bg-violet-700 h-11" onClick={handleSaveEntry}>
                {editingEntryId ? "Update Credential" : "Save Credential"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openShareDrawer} onOpenChange={setOpenShareDrawer}>
        <SheetContent
          side="right"
          className="w-[96vw] gap-0 overflow-hidden p-0 sm:max-w-3xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            sharePrivateKeyInputRef.current?.focus();
          }}
        >
          <SheetHeader className="border-b border-slate-200/80 bg-gradient-to-b from-violet-50 via-white to-white px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700 shadow-sm">
                  <Users className="h-3.5 w-3.5" />
                  Share access
                </div>
                <SheetTitle className="text-2xl font-semibold text-slate-900">Share Vault Items</SheetTitle>
                <SheetDescription className="max-w-xl text-sm text-slate-500">
                  Select the entries you want to share and choose teammates to grant view-only access.
                </SheetDescription>
              </div>
              <Badge variant="secondary" className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">
                {shareRecipients.length} users
              </Badge>
            </div>
          </SheetHeader>

          <div className="h-[calc(100vh-152px)] overflow-y-auto bg-slate-50/50 px-6 py-6">
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Credentials</p>
                    <p className="text-sm text-slate-500">
                      {shareEntryIds.length === 0 ? "Whole vault will be shared unless you choose specific credentials." : `${shareEntryIds.length} credential${shareEntryIds.length === 1 ? "" : "s"} selected`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => setShareEntryIds(entries.map((e) => e.id))}>
                      Select all
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => setShareEntryIds([])}>
                      Clear selection
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setStart(1);
                      }}
                      placeholder="Search credentials by title, username, or website"
                      className="h-11 border-slate-200 bg-slate-50 pl-9 focus:bg-white"
                    />
                  </div>

                  {entries.length > 0 ? (
                    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                      {entries.map((entry) => {
                        const isSelected = shareEntryIds.includes(entry.id);

                        return (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => toggleShareEntry(entry.id)}
                            className={`w-full rounded-2xl border p-4 text-left transition ${isSelected ? "border-violet-200 bg-violet-50/60 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox checked={isSelected} className="mt-1" aria-label={`Select ${entry.title}`} />
                              <div className="min-w-0 flex-1 space-y-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">{entry.title}</p>
                                    <p className="truncate text-xs text-slate-500">{entry.website || "No website"}</p>
                                  </div>
                                </div>

                                <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-1">
                                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Username</p>
                                    <p className="truncate font-medium text-slate-800">{entry.username || "-"}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                      No credentials match your search.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Recipients</p>
                    <p className="text-sm text-slate-500">Search and select as many users as needed</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => setShareRecipients([])}>
                    Clear users
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="search"
                      value={shareRecipientSearch}
                      onChange={(event) => setShareRecipientSearch(event.target.value)}
                      placeholder="Search users by name or email"
                      className="h-11 border-slate-200 bg-slate-50 pl-9 focus:bg-white"
                    />
                  </div>

                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {isTeammatesLoading ? (
                      <div className="space-y-3 py-1">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-1/2" />
                              <Skeleton className="h-3 w-2/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : liveTeammates.length > 0 ? (
                      liveTeammates.map((member: any) => {
                        const memberId = String(member.id || member.userId || "");
                        if (!memberId) return null;

                        const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.fullname || member.email || "Unknown User";
                        const email = String(member.email || "");
                        const isSelected = shareRecipients.includes(memberId);

                        return (
                          <button
                            key={memberId}
                            type="button"
                            onClick={() => toggleShareRecipient(memberId)}
                            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${isSelected ? "border-violet-200 bg-violet-50/60 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                          >
                            <Avatar className="h-10 w-10 border border-slate-200">
                              <AvatarFallback className="bg-gradient-to-br from-violet-100 to-indigo-50 text-[11px] font-bold text-violet-700">
                                {getInitials(fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
                              <p className="truncate text-xs text-slate-500">{email || "No email available"}</p>
                            </div>
                            <Check className={`h-4 w-4 shrink-0 ${isSelected ? "text-violet-600 opacity-100" : "text-slate-300 opacity-100"}`} />
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                        No users found.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-end">
                  <div className="space-y-2 w-full">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Destruct In</Label>
                    <div className="grid gap-2 sm:grid-cols-[120px_140px] sm:items-center">
                      <Input
                        type="number"
                        min={minExpiryValue}
                        max={maxExpiryValue}
                        value={shareExpiryValue}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          if (nextValue === "") {
                            setShareExpiryValue("");
                            return;
                          }

                          const parsed = Number(nextValue);
                          if (parsed >= minExpiryValue && parsed <= maxExpiryValue) {
                            setShareExpiryValue(nextValue);
                          }
                        }}
                        onBlur={() => {
                          if (!shareExpiryValue || Number(shareExpiryValue) < minExpiryValue) setShareExpiryValue(String(minExpiryValue));
                        }}
                        className="h-11 bg-slate-50 border-slate-200 text-sm"
                      />
                      <Select
                        value={shareExpiryUnit}
                        onValueChange={(value: "days" | "hours" | "minutes") => {
                          setShareExpiryUnit(value);
                          setShareExpiryValue((prev) => {
                            const parsed = Number(prev || "0");
                            if (!parsed || parsed < 1) return value === "minutes" ? "15" : "1";
                            if (value === "days") return String(Math.min(parsed, 7));
                            if (value === "hours") return String(Math.min(parsed, 24));
                            return String(Math.max(15, Math.min(parsed, 10080)));
                          });
                        }}
                      >
                        <SelectTrigger className="h-11 w-full bg-slate-50 border-slate-200 text-sm">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Minimum 15 minutes and maximum 7 days. Shared access will self-destruct after this duration.</p>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Security Authorization</Label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="password"
                        value={sharePrivateKey}
                        onChange={(event) => setSharePrivateKey(event.target.value)}
                        placeholder="Enter your private key to authorize share"
                        className="h-11 border-slate-200 bg-slate-50 pl-9 text-sm focus:border-violet-300 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Note</Label>
                    <Textarea
                      rows={3}
                      value={shareNote}
                      onChange={(event) => setShareNote(event.target.value)}
                      placeholder="Add a short reason or context for sharing"
                      className="resize-none border-slate-200 bg-slate-50 text-sm focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="border-t border-slate-200 bg-white px-6 py-4">
            <Button variant="ghost" className="flex-1" onClick={() => setOpenShareDrawer(false)}>
              Cancel
            </Button>
            <Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={handleShare} disabled={shareRecipients.length === 0 || !sharePrivateKey}>
              <Users className="mr-2 h-4 w-4" />
              Share
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={openPasswordDialog} onOpenChange={setOpenPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Private Key</DialogTitle>
            <DialogDescription>
              Enter your private key to fetch credential details and view the password.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="view-password-private-key">Private Key</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="view-password-private-key"
                  type="password"
                  name="vault-view-private-key"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={passwordDialogPrivateKey}
                  onChange={(event) => setPasswordDialogPrivateKey(event.target.value)}
                  placeholder="Enter private key"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenPasswordDialog(false)}>
                Cancel
              </Button>
              <Button onClick={fetchPasswordForEntry} disabled={isPasswordFetching}>
                {isPasswordFetching ? "Verifying..." : passwordDialogAction === "copy" ? "Verify & Copy" : "View Password"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openDeleteDialog}
        onOpenChange={(open) => {
          setOpenDeleteDialog(open);
          if (!open) {
            setDeleteEntryId(null);
            setDeletePrivateKey("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Delete Credential</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. Enter your private key to authorize the deletion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-private-key">Private Key</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="delete-private-key"
                  type="password"
                  name="vault-delete-private-key"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={deletePrivateKey}
                  onChange={(event) => setDeletePrivateKey(event.target.value)}
                  placeholder="Enter private key"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenDeleteDialog(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteEntry}
                disabled={isDeleting || !deletePrivateKey.trim()}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openRecoveryDialog} onOpenChange={handleRecoveryDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recover Private Key</DialogTitle>
            <DialogDescription>
              Enter your recovery key to retrieve your vault private key. If you have lost recovery access, destructing the vault creates a fresh vault and permanently removes old credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-key">Recovery Key</Label>
              <Input
                id="recovery-key"
                type="password"
                name="vault-recovery-key"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                value={recoveryKey}
                onChange={(event) => setRecoveryKey(event.target.value)}
                placeholder="Enter recovery key"
                className="pr-10"
              />
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Use this only if you forgot your private key. Recovery key should be kept secure and offline.
            </div>

            {recoveredPrivateKey ? (
              <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <Label htmlFor="recovered-private-key" className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Recovered Private Key
                </Label>
                <div className="relative">
                  <Input
                    id="recovered-private-key"
                    type={showRecoveredPrivateKey ? "text" : "password"}
                    value={recoveredPrivateKey}
                    readOnly
                    className="pr-32 font-mono text-xs"
                  />
                  <div className="absolute inset-y-0 right-2 flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setShowRecoveredPrivateKey((prev) => !prev)}
                      aria-label={showRecoveredPrivateKey ? "Hide recovered private key" : "Show recovered private key"}
                    >
                      {showRecoveredPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={async () => {
                        await handleCopy(recoveredPrivateKey, "Private key");
                        setIsRecoveredPrivateKeyCopied(true);
                      }}
                      aria-label="Copy recovered private key"
                    >
                      {isRecoveredPrivateKeyCopied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-emerald-800/80">
                  Copy this key now and store it securely before closing this dialog.
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" className="px-0 text-rose-600 hover:bg-transparent hover:text-rose-700" onClick={() => setOpenDestructDialog(true)}>
                Forgot recovery key too? Destruct vault
              </Button>
              <Button onClick={handleRecoverPrivateKey} disabled={isRecoveringKey}>
                {isRecoveringKey ? "Recovering..." : recoveredPrivateKey ? "Recover Again" : "Recover Private Key"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openDestructDialog} onOpenChange={setOpenDestructDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-4 w-4" />
              Destruct Vault
            </DialogTitle>
            <DialogDescription>
              This action permanently deletes existing vault credentials and resets security keys. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destruct-confirm">Type DESTRUCT to confirm</Label>
              <Input
                id="destruct-confirm"
                value={destructConfirmText}
                onChange={(event) => setDestructConfirmText(event.target.value)}
                placeholder="DESTRUCT"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenDestructDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDestructVault} disabled={isDestructingVault}>
                {isDestructingVault ? "Destructing..." : "Destruct Vault"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
