import { redirect } from "next/navigation";
import { RoutesEnum } from "@/lib/enums/routes.enum";

/** Bookmarks removed from Social; keep route for old links. */
export default function SocialBookmarksRedirectPage() {
  redirect(`${RoutesEnum.SOCIAL}/communities`);
}
