"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { socialCurrentUser as fallbackUser } from "@/lib/social-dummy-data";

type SessionUserLike = {
    id?: string | number | null;
    name?: string | null;
    email?: string | null;
    image_link?: string | null;
    firstName?: string | null;
    lastName?: string | null;
};

export function useSocialCurrentUser() {
    const { data: session } = useSession();
    const user = session?.user as SessionUserLike | undefined;

    return useMemo(() => {
        const first = (user?.firstName ?? "").trim();
        const last = (user?.lastName ?? "").trim();
        const fullNameFromParts = `${first} ${last}`.trim();

        return {
            ...fallbackUser,
            id:
                user?.id != null && String(user.id).trim()
                    ? String(user.id)
                    : fallbackUser.id,
            name:
                (user?.name ?? "").trim() ||
                fullNameFromParts ||
                fallbackUser.name,
            email: (user?.email ?? "").trim() || fallbackUser.email,
            avatarUrl: (user?.image_link ?? "").trim() || fallbackUser.avatarUrl,
        };
    }, [user]);
}
