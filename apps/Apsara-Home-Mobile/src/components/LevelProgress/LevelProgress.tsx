import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Share,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { TIER_REQUIREMENTS, TierRequirement, getTierColor } from '../../constants/tierConfig';

const BADGE_IMAGES: Record<number, any> = {
  1: require('../../../assets/Badge/homeStarter.png'),
  2: require('../../../assets/Badge/homeBuilder.png'),
  3: require('../../../assets/Badge/homeStylist.png'),
  4: require('../../../assets/Badge/lifestyleConsultant.png'),
  5: require('../../../assets/Badge/lifestyleElite.png'),
};

interface LevelProgressProps {
  currentTier: string;
  currentRank: number;
  personalPv: number;
  referralCount: number;
  activeMembers: number;
  activeBuilders: number;
  activeLeaders: number;
  username?: string;
  onViewDetails?: () => void;
  loading?: boolean;
  isDarkMode?: boolean;
}

export default function LevelProgress({
  currentTier,
  currentRank,
  personalPv,
  referralCount,
  activeMembers,
  activeBuilders,
  activeLeaders,
  username,
  onViewDetails,
  loading = false,
  isDarkMode = false,
}: LevelProgressProps) {
  const colors = {
    bg: isDarkMode ? '#1e293b' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#334155' : '#e5e7eb',
    borderLight: isDarkMode ? '#475569' : '#f1f5f9',
    progressBg: isDarkMode ? '#334155' : '#f1f5f9',
  };
  const [enlargedBadge, setEnlargedBadge] = useState<number | null>(null);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        const { dx } = gestureState;
        const threshold = 50;

        if (enlargedBadge !== null) {
          if (dx > threshold && enlargedBadge > 1) {
            setEnlargedBadge(enlargedBadge - 1);
          } else if (dx < -threshold && enlargedBadge < 5) {
            setEnlargedBadge(enlargedBadge + 1);
          }
        }
      },
    })
  ).current;

  const currentTierReq = TIER_REQUIREMENTS[currentRank];
  const nextRank = Math.min(5, currentRank + 1);
  const nextTierReq = TIER_REQUIREMENTS[nextRank];
  const isMaxRank = currentRank === 5;
  const tierColor = getTierColor(currentTier);

  const getTierDescription = (tier: string, isCurrentTier: boolean): string => {
    const currentDescriptions: Record<string, string> = {
      'Home Starter': 'Welcome to the AF Home family! You\'re building your foundation.',
      'Home Builder': 'Great progress! You\'re actively building your network.',
      'Home Stylist': 'You\'re creating amazing style! Your influence is growing.',
      'Lifestyle Consultant': 'You\'re a trusted advisor in the lifestyle space.',
      'Lifestyle Elite': 'You\'ve achieved the highest level. You\'re a true leader!',
    };

    const futureDescriptions: Record<string, string> = {
      'Home Starter': 'Ready to become a Home Starter? Start earning PV and inviting referrals!',
      'Home Builder': 'Level up to Home Builder! Increase your PV to 1,000 and recruit 5 referrals.',
      'Home Stylist': 'Become a Home Stylist! Reach 3,000 PV and build 5 active builders in your team.',
      'Lifestyle Consultant': 'Achieve Lifestyle Consultant status! Get 8,000 PV and develop 10 active leaders.',
      'Lifestyle Elite': 'Reach the top! Become a Lifestyle Elite and join our most prestigious members.',
    };

    if (isCurrentTier) {
      return currentDescriptions[tier] || 'Keep growing with AF Home!';
    } else {
      return futureDescriptions[tier] || 'Keep growing with AF Home!';
    }
  };

  const handleShareBadge = async (tier: string, rank: number, isCurrentTier: boolean) => {
    try {
      const referralLink = username ? `https://afhome.ph/ref/${username}` : 'https://www.afhome.ph';
      const shoppingLink = username ? `https://afhome.ph/shop?ref=${username}` : 'https://www.afhome.ph/shop';

      let message = '';
      let title = '';

      if (isCurrentTier) {
        // Message for achieved tier
        message = username
          ? `🏆 I just achieved Rank ${rank} - ${tier} on AF Home! 🎉\n\nJoin me and build your own success story!\n\n👥 Register as my referral:\n${referralLink}\n\n🛍️ Shop with me:\n${shoppingLink}\n\nLet's grow together on AF Home! 💪`
          : `🏆 I just achieved Rank ${rank} - ${tier} on AF Home! 🎉\n\nJoin me and build your own success story! Visit https://www.afhome.ph to get started.`;
        title = `I'm now a ${tier}!`;
      } else {
        // Message for future tier (not yet achieved)
        message = username
          ? `🎯 Help me achieve Rank ${rank} - ${tier} on AF Home! 🚀\n\nI'm working hard to reach this level. Support me by:\n\n👥 Joining as my referral:\n${referralLink}\n\n🛍️ Shopping through my link:\n${shoppingLink}\n\nTogether we can reach ${tier}! Let's do this! 💪`
          : `🎯 Help me achieve Rank ${rank} - ${tier} on AF Home! 🚀\n\nI'm working hard to reach this level. Visit https://www.afhome.ph to support me!`;
        title = `Help me achieve ${tier}!`;
      }

      await Share.share({
        message,
        url: referralLink,
        title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const calculateProgress = (): number => {
    if (isMaxRank) return 100;

    const requirements: Array<{ current: number; target: number | null }> = [];

    if (nextTierReq.pv !== null) {
      requirements.push({ current: personalPv, target: nextTierReq.pv });
    }
    if (nextTierReq.referrals !== null) {
      requirements.push({ current: referralCount, target: nextTierReq.referrals });
    }
    if (nextTierReq.active_members !== null) {
      requirements.push({ current: activeMembers, target: nextTierReq.active_members });
    }
    if (nextTierReq.active_builders !== null) {
      requirements.push({ current: activeBuilders, target: nextTierReq.active_builders });
    }
    if (nextTierReq.active_leaders !== null) {
      requirements.push({ current: activeLeaders, target: nextTierReq.active_leaders });
    }

    if (requirements.length === 0) return 100;

    const totalPct = requirements.reduce((acc, req) => {
      const pct = Math.min(100, (req.current / req.target!) * 100);
      return acc + pct;
    }, 0);

    return Math.round(totalPct / requirements.length);
  };

  const progressPct = calculateProgress();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.sky} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: tierColor }]}>
        <Ionicons name="trophy-outline" size={16} color={Colors.white} />
        <Text style={styles.headerText}>LEVEL PROGRESS</Text>
      </View>

      {/* Title with View Details Link */}
      <View style={[styles.titleSection, { borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Level Path</Text>
        <TouchableOpacity
          style={styles.viewDetailsLink}
          onPress={onViewDetails}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewDetailsText, { color: colors.textSec }]}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textSec} />
        </TouchableOpacity>
      </View>

      {/* Badges Section - One Row */}
      <View style={styles.badgesTableContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesRow}
        >
          {Array.from({ length: 5 }, (_, i) => i + 1).map((rank) => {
            const tierReq = TIER_REQUIREMENTS[rank];
            const isCurrentRank = rank === currentRank;
            const isLocked = rank > currentRank;
            const tierCol = getTierColor(tierReq.tier);

            return (
              <TouchableOpacity
                key={rank}
                style={[styles.badgeCard, { borderColor: colors.borderLight, backgroundColor: colors.bg }]}
                onPress={() => setEnlargedBadge(rank)}
                activeOpacity={0.85}
              >
                <View style={styles.badgeWrapper}>
                  <Image
                    source={BADGE_IMAGES[rank]}
                    style={styles.badgeImage}
                    resizeMode="contain"
                  />
                  {isCurrentRank && (
                    <View style={[styles.activeBadge, { backgroundColor: tierCol }]}>
                      <Ionicons name="checkmark" size={12} color={Colors.white} />
                    </View>
                  )}
                  {isLocked && (
                    <View style={[styles.lockedOverlay, { backgroundColor: isDarkMode ? 'rgba(2, 6, 23, 0.45)' : 'rgba(255, 255, 255, 0.5)' }]}>
                      <View style={[styles.lockIconBubble, { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.75)' : 'rgba(30, 41, 59, 0.7)' }]}>
                        <Ionicons name="lock-closed" size={12} color={Colors.white} />
                      </View>
                    </View>
                  )}
                </View>
                <Text style={[styles.rankLabel, { color: colors.textSec }]}>Rank {rank}</Text>
                <Text style={[styles.tierLabel, { color: colors.text }]}>{tierReq.tier}</Text>
                {isCurrentRank ? (
                  <View style={[styles.activeLabel, { backgroundColor: tierCol }]}>
                    <Text style={styles.activeLabelText}>CURRENT</Text>
                  </View>
                ) : rank < currentRank ? (
                  <View style={styles.completedLabel}>
                    <Text style={styles.completedLabelText}>ACHIEVED</Text>
                  </View>
                ) : (
                  <View style={styles.nextLabel}>
                    <Text style={styles.nextLabelText}>LOCKED</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.textSec }]}>Overall Progress</Text>
          <Text style={[styles.progressPercentage, { color: colors.text }]}>{progressPct}%</Text>
        </View>

        <View style={[styles.progressBarContainer, { backgroundColor: colors.progressBg }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${progressPct}%`,
                backgroundColor: tierColor,
              },
            ]}
          />
        </View>
      </View>

      {/* Badge Detail Modal */}
      {enlargedBadge !== null && (
        <Modal
          visible={enlargedBadge !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setEnlargedBadge(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setEnlargedBadge(null)}
          >
            <TouchableOpacity
              style={[styles.modalContent, { backgroundColor: colors.bg }]}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              {...panResponder.panHandlers}
            >
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setEnlargedBadge(null)}
              >
                <Ionicons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>

              {/* Badge and Navigation Container */}
              <View style={styles.modalBadgeContainer}>
                {/* Navigation - Left Side */}
                <TouchableOpacity
                  style={[
                    styles.modalSideNavBtn,
                    enlargedBadge === 1 && styles.modalNavBtnDisabled,
                  ]}
                  onPress={() => {
                    if (enlargedBadge && enlargedBadge > 1) {
                      setEnlargedBadge(enlargedBadge - 1);
                    }
                  }}
                  disabled={enlargedBadge === 1}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chevron-back"
                    size={28}
                    color={enlargedBadge === 1 ? '#cbd5e1' : Colors.white}
                  />
                </TouchableOpacity>

                {/* Badge Image */}
                <Image
                  source={BADGE_IMAGES[enlargedBadge]}
                  style={styles.modalBadgeImage}
                  resizeMode="contain"
                />

                {/* Navigation - Right Side */}
                <TouchableOpacity
                  style={[
                    styles.modalSideNavBtn,
                    enlargedBadge === 5 && styles.modalNavBtnDisabled,
                  ]}
                  onPress={() => {
                    if (enlargedBadge && enlargedBadge < 5) {
                      setEnlargedBadge(enlargedBadge + 1);
                    }
                  }}
                  disabled={enlargedBadge === 5}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={28}
                    color={enlargedBadge === 5 ? '#cbd5e1' : Colors.white}
                  />
                </TouchableOpacity>
              </View>

              {/* Achievement Info */}
              <View style={styles.achievementInfo}>
                <Text style={[styles.achievementRank, { color: colors.textSec }]}>
                  Rank {enlargedBadge}
                </Text>
                <Text style={[styles.achievementTier, { color: colors.text }]}>
                  {TIER_REQUIREMENTS[enlargedBadge].tier}
                </Text>
                {enlargedBadge > currentRank && (
                  <View style={[styles.modalLockBadge, { backgroundColor: isDarkMode ? 'rgba(148,163,184,0.2)' : 'rgba(30,41,59,0.08)' }]}>
                    <Ionicons name="lock-closed" size={12} color={isDarkMode ? '#cbd5e1' : '#334155'} />
                    <Text style={[styles.modalLockText, { color: isDarkMode ? '#cbd5e1' : '#334155' }]}>Locked Tier</Text>
                  </View>
                )}
                <Text style={[styles.achievementDescription, { color: colors.textSec }]}>
                  {getTierDescription(
                    TIER_REQUIREMENTS[enlargedBadge].tier,
                    enlargedBadge === currentRank
                  )}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.shareButton, { borderColor: getTierColor(TIER_REQUIREMENTS[enlargedBadge].tier) }]}
                  onPress={() => {
                    handleShareBadge(
                      TIER_REQUIREMENTS[enlargedBadge].tier,
                      enlargedBadge,
                      enlargedBadge === currentRank
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-social" size={18} color={getTierColor(TIER_REQUIREMENTS[enlargedBadge].tier)} />
                  <Text style={[styles.shareButtonText, { color: getTierColor(TIER_REQUIREMENTS[enlargedBadge].tier) }]}>
                    {enlargedBadge === currentRank ? 'Share Achievement' : 'Share Goal'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.visitButton, { backgroundColor: getTierColor(TIER_REQUIREMENTS[enlargedBadge].tier) }]}
                  onPress={() => Linking.openURL('https://www.afhome.ph')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="globe" size={18} color={Colors.white} />
                  <Text style={styles.visitButtonText}>Visit AF Home Website</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  viewDetailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  badgesTableContainer: {
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    paddingRight: 8,
  },
  badgeCard: {
    alignItems: 'center',
    gap: 6,
    width: 110,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  badgeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeImage: {
    width: 70,
    height: 70,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  rankLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tierLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  activeLabel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
  },
  activeLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  completedLabel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
    backgroundColor: '#d1fae5',
  },
  completedLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  nextLabel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
    backgroundColor: '#f1f5f9',
  },
  nextLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  modalLockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 2,
  },
  modalLockText: {
    fontSize: 11,
    fontWeight: '700',
  },
  arrowColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8,
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 12,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 16,
    gap: 12,
  },
  modalSideNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalNavBtnDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalBadgeImage: {
    width: 200,
    height: 200,
    marginTop: 16,
    marginBottom: 24,
  },
  achievementInfo: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  achievementRank: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  achievementTier: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  achievementDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  modalActions: {
    width: '100%',
    gap: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  visitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  visitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
});
