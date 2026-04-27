/** Placeholder data until Social API is available */

export const socialCurrentUser = {
  id: "u1",
  name: "Piyush Sharma",
  email: "piyush.sharma@company.com",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Piyush",
  posts: 0,
  followers: 0,
  following: 0,
};

export type SocialPraiseFlair = {
  id: string;
  name: string;
  points: number;
  emoji: string;
  toneClass: string;
};

export const socialPraiseFlairs: SocialPraiseFlair[] = [
  {
    id: "top-performer",
    name: "Top Performer",
    points: 50,
    emoji: "🏆",
    toneClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    id: "team-player",
    name: "Team Player",
    points: 30,
    emoji: "🤝",
    toneClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    id: "quick-learner",
    name: "Quick Learner",
    points: 20,
    emoji: "🌱",
    toneClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    id: "problem-solver",
    name: "Problem Solver",
    points: 40,
    emoji: "🧩",
    toneClass: "border-violet-200 bg-violet-50 text-violet-700",
  },
  {
    id: "go-beyond",
    name: "Goes Beyond",
    points: 35,
    emoji: "🚀",
    toneClass: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  },
];

export const socialProfileGamificationMock = {
  totalPoints: 420,
  earnedFlairs: [
    { flairId: "top-performer", count: 4 },
    { flairId: "team-player", count: 6 },
    { flairId: "quick-learner", count: 3 },
  ],
};

export const socialProfileLeaderboardMock = [
  {
    id: "u1",
    name: "Rahul Kankariya",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
    points: 420,
    rank: 1,
    highlight: "Leading the praise board this week",
    badge: "Current user",
  },
  {
    id: "u2",
    name: "Piyush Sharma",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Piyush",
    points: 380,
    rank: 2,
    highlight: "Consistently recognized by peers",
    badge: "Close competitor",
  },
  {
    id: "u3",
    name: "Aarav Mehta",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav",
    points: 355,
    rank: 3,
    highlight: "Strong team support and delivery",
    badge: "Rising star",
  },
  {
    id: "u4",
    name: "Neha Verma",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Neha",
    points: 312,
    rank: 4,
    highlight: "Great collaborator on cross-team work",
    badge: "Team player",
  },
];

export const socialCommunities = [
  {
    id: "c1",
    name: "All Company",
    initials: "AC",
    color: "bg-violet-500",
    /** Tailwind classes for card banner (gradient) */
    bannerClass: "bg-gradient-to-br from-blue-600 via-sky-500 to-indigo-600",
    memberCount: 19,
    description: "Organization-wide announcements and discussion.",
    networkDescription:
      "This is the default group for everyone in the network.",
  },
  {
    id: "c2",
    name: "Engineering",
    initials: "EN",
    color: "bg-blue-500",
    bannerClass: "bg-gradient-to-br from-slate-700 via-blue-600 to-cyan-500",
    memberCount: 42,
    description: "Product and engineering updates.",
    networkDescription:
      "Discuss builds, incidents, and technical decisions with your product and platform teams.",
  },
  {
    id: "c3",
    name: "People & Culture",
    initials: "PC",
    color: "bg-pink-500",
    bannerClass: "bg-gradient-to-br from-fuchsia-600 via-pink-500 to-rose-400",
    memberCount: 12,
    description: "HR, events, and culture.",
    networkDescription:
      "Share culture moments, policies, and people programs.",
  },
];

export type SocialCommunity = (typeof socialCommunities)[number];

export function getCommunityById(id: string) {
  return socialCommunities.find((c) => c.id === id);
}

export const socialStorylines = [
  {
    id: "s1",
    ownerName: "Piyush Sharma",
    ownerId: "u1",
    title: "My storyline",
    lastActivity: "2025-03-20T10:00:00Z",
  },
  {
    id: "s2",
    ownerName: "Rahul Kankariya",
    ownerId: "u2",
    title: "Rahul's storyline",
    lastActivity: "2025-03-19T14:30:00Z",
  },
];

export const socialFeedPosts: {
  id: string;
  author: string;
  body: string;
  community: string;
  createdAt: string;
}[] = [];
