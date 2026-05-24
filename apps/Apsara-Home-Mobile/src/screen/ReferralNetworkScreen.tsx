import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../constants/colors';
import { ReferralTree, ReferralUser } from '../services/referralService';

interface ReferralNetworkScreenProps {
  token?: string | null;
  onBack?: () => void;
  tree?: ReferralTree | null;
}

export default function ReferralNetworkScreen({ token, onBack, tree }: ReferralNetworkScreenProps) {
  const insets = useSafeAreaInsets();
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [expandedStats, setExpandedStats] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (tree) {
      // Attach children to root user
      if (!tree.root.children && tree.children) {
        (tree.root as any).children = tree.children;
        (tree.root as any).children_count = tree.children.length;
      }
    }
  }, [tree]);

  useEffect(() => {
    if (tree?.root && expandedNodes.size === 0) {
      setExpandedNodes(new Set([tree.root.id]));
    }
  }, [tree?.root?.id]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack?.();
      return true;
    });

    return () => sub.remove();
  }, [onBack]);

  const toggleNode = (userId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedNodes(newExpanded);
  };

  const toggleStats = (userId: number) => {
    const newExpanded = new Set(expandedStats);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedStats(newExpanded);
  };

  const renderUserCard = (user: ReferralUser, level: number = 0, isLast: boolean = true) => {
    const hasChildren = user.children && user.children.length > 0;
    const isExpanded = expandedNodes.has(user.id);
    const isRoot = level === 0;
    const statsExpanded = isRoot || expandedStats.has(user.id);

    return (
      <View key={user.id}>
        <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
          {level > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: level * 16 - 8, marginRight: 12 }}>
              <View style={[styles.treeLine, { alignSelf: 'stretch' }]} />
              <View style={styles.horizontalConnector} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={[
                styles.userCard,
                level === 0 && styles.rootCard,
              ]}
              onPress={hasChildren ? () => toggleNode(user.id) : undefined}
              activeOpacity={hasChildren ? 0.7 : 1}
            >
              <View style={styles.userCardContent}>
                <View style={styles.userCardHeader}>
                  <View style={styles.userAvatar}>
                    {user.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarInitial}>
                        {user.name.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>

                  <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                      <View style={styles.badgesContainer}>
                        {isRoot && (
                          <View style={styles.rootBadge}>
                            <Ionicons name="star" size={10} color={Colors.white} />
                            <Text style={styles.rootBadgeText}>You</Text>
                          </View>
                        )}
                        {hasChildren && (
                          <View style={styles.expandIcon}>
                            <Ionicons
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color={Colors.sky}
                            />
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.userUsername}>@{user.username}</Text>
                    <Text style={styles.joinDate}>{new Date(user.joined_at).toLocaleDateString()}</Text>
                  </View>
                </View>

                {statsExpanded ? (
                  <View style={styles.userStats}>
                    <View style={styles.statItem}>
                      <View style={styles.statContent}>
                        <Ionicons name="people" size={13} color={Colors.sky} />
                        <Text style={styles.statValue}>{user.children_count || 0}</Text>
                      </View>
                      <Text style={styles.statLabel}>Direct</Text>
                    </View>
                    <View style={styles.statItem}>
                      <View style={styles.statContent}>
                        <Ionicons name="cash" size={13} color="#10b981" />
                        <Text style={[styles.statValue, { color: '#10b981' }]}>₱{user.total_earnings}</Text>
                      </View>
                      <Text style={styles.statLabel}>Earnings</Text>
                    </View>
                    <View style={styles.statItem}>
                      <View style={styles.statContent}>
                        <Ionicons name="trending-up" size={13} color="#f59e0b" />
                        <Text style={[styles.statValue, { color: '#f59e0b' }]}>{user.total_pv}</Text>
                      </View>
                      <Text style={styles.statLabel}>PV</Text>
                    </View>
                  </View>
                ) : !isRoot ? (
                  <TouchableOpacity
                    style={styles.statsPlaceholder}
                    onPress={() => toggleStats(user.id)}
                  >
                    <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.statsPlaceholderText}>Tap to view stats</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </TouchableOpacity>

            {hasChildren && isExpanded && (
              <View style={styles.childrenContainer}>
                {user.children!.map((child, index) =>
                  renderUserCard(child, level + 1, index === user.children!.length - 1)
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!tree) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={40} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>No referral network data</Text>
          <Text style={styles.emptyText}>Unable to load your referral tree right now.</Text>
          <TouchableOpacity style={styles.emptyBackBtn} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.emptyBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header with Gradient extending to top */}
      <LinearGradient
        colors={['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Referral Network</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Stats Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Network Overview</Text>
          </View>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{tree.summary.total_network}</Text>
              <Text style={styles.summaryLabel}>Total Referrals</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{tree.summary.direct_count}</Text>
              <Text style={styles.summaryLabel}>Direct</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>₱{tree.root.total_earnings}</Text>
              <Text style={styles.summaryLabel}>Earned</Text>
            </View>
          </View>
        </View>

        {/* Referral Tree Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Network</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            scrollEventThrottle={16}
            style={styles.treeScrollView}
          >
            <View style={styles.treeContainer}>
              {renderUserCard(tree.root)}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },

  headerGradient: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },

  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },

  section: {
    backgroundColor: Colors.white,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginHorizontal: 0,
    marginBottom: 12,
    width: '100%',
  },

  sectionHeader: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },

  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sky,
    marginBottom: 4,
  },

  summaryLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 0,
    gap: 0,
    paddingBottom: 20,
  },

  treeScrollView: {
    minHeight: 'auto',
  },

  treeContainer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    minWidth: '100%',
  },

  treeLine: {
    width: 1.5,
    backgroundColor: '#e2e8f0',
    marginRight: 0,
    position: 'relative',
  },

  horizontalConnector: {
    width: 12,
    height: 1.5,
    backgroundColor: '#e2e8f0',
  },

  userCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 8,
  },

  rootCard: {
    backgroundColor: '#e0f2fe',
    borderColor: Colors.sky,
    borderWidth: 2,
  },

  rootBadge: {
    backgroundColor: Colors.sky,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  rootBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.white,
  },

  userCardContent: {
    padding: 12,
  },

  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.sky,
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.sky,
  },

  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },

  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },

  userUsername: {
    fontSize: 11,
    color: Colors.sky,
    fontWeight: '500',
  },

  joinDate: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },

  expandIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  userStats: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },

  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.sky,
  },

  statLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  statsPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    justifyContent: 'center',
  },

  statsPlaceholderText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  childrenContainer: {
    marginTop: 4,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyBackBtn: {
    marginTop: 6,
    backgroundColor: Colors.sky,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyBackBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
