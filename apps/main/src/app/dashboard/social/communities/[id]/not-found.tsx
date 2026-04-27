import Link from "next/link";
import { SOCIAL_ROUTES } from "@/app/dashboard/social/social-nav";

export default function CommunityNotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-lg font-semibold">Community not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This community does not exist or you do not have access.
      </p>
      <Link
        href={SOCIAL_ROUTES.communities}
        className="mt-6 inline-block text-sm font-medium text-primary underline"
      >
        Back to communities
      </Link>
    </div>
  );
}
