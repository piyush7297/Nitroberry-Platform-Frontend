import { redirect } from "next/navigation";

/**
 * Vault is a standalone app. Redirect to it using its absolute URL.
 * NEXT_PUBLIC_VAULT_APP_URL defaults to the same origin + /vault for production
 * (when both apps are served behind a reverse proxy on the same domain).
 */
export default function VaultRedirect() {
  const vaultUrl = process.env.NEXT_PUBLIC_VAULT_APP_URL
    ? `${process.env.NEXT_PUBLIC_VAULT_APP_URL}/vault`
    : "/vault";
  redirect(vaultUrl);
}
