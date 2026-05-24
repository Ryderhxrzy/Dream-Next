export interface TierRequirement {
  rank: number;
  tier: string;
  pv: number | null;
  referrals: number | null;
  active_members: number | null;
  active_builders: number | null;
  active_leaders: number | null;
  color: string;
  badge: string;
}

export const TIER_REQUIREMENTS: Record<number, TierRequirement> = {
  1: {
    rank: 1,
    tier: 'Home Starter',
    pv: 300,
    referrals: 2,
    active_members: null,
    active_builders: null,
    active_leaders: null,
    color: '#38bdf8',
    badge: 'homeStarter.png',
  },
  2: {
    rank: 2,
    tier: 'Home Builder',
    pv: 1000,
    referrals: 5,
    active_members: 2,
    active_builders: null,
    active_leaders: null,
    color: '#34d399',
    badge: 'homeBuilder.png',
  },
  3: {
    rank: 3,
    tier: 'Home Stylist',
    pv: 3000,
    referrals: 10,
    active_members: null,
    active_builders: 5,
    active_leaders: null,
    color: '#3b82f6',
    badge: 'homeStylist.png',
  },
  4: {
    rank: 4,
    tier: 'Lifestyle Consultant',
    pv: 8000,
    referrals: 20,
    active_members: null,
    active_builders: null,
    active_leaders: 10,
    color: '#8b5cf6',
    badge: 'lifestyleConsultant.png',
  },
  5: {
    rank: 5,
    tier: 'Lifestyle Elite',
    pv: null,
    referrals: null,
    active_members: null,
    active_builders: null,
    active_leaders: null,
    color: '#f59e0b',
    badge: 'lifestyleElite.png',
  },
};

export const getTierByRank = (rank: number): TierRequirement | null => {
  return TIER_REQUIREMENTS[rank] || null;
};

export const getNextTier = (currentRank: number): TierRequirement | null => {
  const nextRank = Math.min(5, currentRank + 1);
  return TIER_REQUIREMENTS[nextRank] || null;
};

export const getTierColor = (tier: string): string => {
  for (const tierReq of Object.values(TIER_REQUIREMENTS)) {
    if (tierReq.tier === tier) {
      return tierReq.color;
    }
  }
  return '#38bdf8';
};

export const getBadgeImage = (rank: number | null | undefined): string | undefined => {
  if (!rank) return undefined;

  const badgeMap: Record<number, string> = {
    1: 'homeStarter',
    2: 'homeBuilder',
    3: 'homeStylist',
    4: 'lifestyleConsultant',
    5: 'lifestyleElite',
  };

  const badgeName = badgeMap[rank];
  if (!badgeName) return undefined;

  // Return a reference that can be resolved at render time
  return `badge_${badgeName}`;
};

export const getBadgeImageSource = (badgeReference: string | undefined): any => {
  if (!badgeReference) return undefined;

  const sourceMap: Record<string, any> = {
    'badge_homeStarter': require('../../assets/Badge/homeStarter.png'),
    'badge_homeBuilder': require('../../assets/Badge/homeBuilder.png'),
    'badge_homeStylist': require('../../assets/Badge/homeStylist.png'),
    'badge_lifestyleConsultant': require('../../assets/Badge/lifestyleConsultant.png'),
    'badge_lifestyleElite': require('../../assets/Badge/lifestyleElite.png'),
  };

  return sourceMap[badgeReference] || undefined;
};
