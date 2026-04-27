/** Vault-specific API endpoints */
export const API_ENDPOINTS = {
  VAULT_SECURITY_SETUP: "vault/security/setup",
  VAULT_SECURITY_STATUS: "vault/security/status",
  VAULT_VERIFY_KEY: "vault/verify-key",
  VAULT: "vault",
  VAULT_USERS: "vault/users/list",
  VAULT_SHARE: "vault/share",
  VAULT_DETAIL: (id: string) => `vault/${id}`,
  VAULT_RESET_SECURITY: "vault/reset-security",
  /** Needed for the permissions sidebar in vault header */
  NOTIFICATION_COUNT: "notifications/count",
  ROLE_PERMISSIONS: "roles/permissions",
  COMMON_ROLES_PERMISSIONS: "common/role-permmsion-list",
} as const;
