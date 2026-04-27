import { redirect } from "next/navigation";
import { RoutesEnum } from "@/lib/enums/routes.enum";

export default function SocialIndexPage() {
  redirect(`${RoutesEnum.SOCIAL}/home`);
}
