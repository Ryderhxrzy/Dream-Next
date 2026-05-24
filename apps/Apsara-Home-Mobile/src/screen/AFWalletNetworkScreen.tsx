import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, BackHandler, ActivityIndicator, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Colors } from '../constants/colors';
import { API_CONFIG } from '../config/api';

interface AFWalletNetworkScreenProps {
  isDarkMode?: boolean;
  onClose?: () => void;
  token?: string | null;
}

const peso = (value: number) => {
  return `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const numberFmt = (value: number) => {
  return Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return '-';
  }
};

interface NetworkCardProps {
  label: string;
  value: string;
  icon: string;
  isDarkMode: boolean;
}

function NetworkCard({ label, value, icon, isDarkMode }: NetworkCardProps) {
  const colors = {
    bg: isDarkMode ? '#1e293b' : '#f8fafc',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
  };

  return (
    <View style={[styles.networkCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardIcon]}>{icon}</Text>
        <Text style={[styles.cardLabel, { color: colors.textSec }]}>{label}</Text>
      </View>
      <Text style={[styles.cardValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

interface AwardRowProps {
  sourceName: string;
  sourceUsername: string;
  level: number;
  amount: number;
  earnedPv: number;
  awardedAt: string;
  isDarkMode: boolean;
}

function AwardRow({ sourceName, sourceUsername, level, amount, earnedPv, awardedAt, isDarkMode }: AwardRowProps) {
  const colors = {
    bg: isDarkMode ? '#1e293b' : '#f8fafc',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
  };

  return (
    <View style={[styles.awardRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.awardLeft}>
        <View style={styles.awardHeader}>
          <Text style={[styles.awardSource, { color: colors.text }]}>{sourceName || sourceUsername || '-'}</Text>
          <View style={[styles.levelBadge, { backgroundColor: isDarkMode ? '#1f2937' : '#e5e7eb' }]}>
            <Text style={[styles.levelText, { color: colors.textSec }]}>Level {level}</Text>
          </View>
        </View>
        <Text style={[styles.awardDate, { color: colors.textSec }]}>{formatDate(awardedAt)}</Text>
      </View>
      <View style={styles.awardRight}>
        <Text style={[styles.awardAmount, { color: colors.text }]}>{peso(amount)}</Text>
        <Text style={[styles.awardPv, { color: colors.textSec }]}>{numberFmt(earnedPv)} PV</Text>
      </View>
    </View>
  );
}

export default function AFWalletNetworkScreen({ isDarkMode = false, onClose, token }: AFWalletNetworkScreenProps) {
  const insets = useSafeAreaInsets();
  const [walletData, setWalletData] = useState<any>(null);
  const [awards, setAwards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose?.();
      return true;
    });
    return () => backHandler.remove();
  }, [onClose]);

  useEffect(() => {
    fetchWalletData();
  }, [token]);

  const fetchWalletData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/encashment/wallet`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data?.data || response.data;
      const summary = data?.summary || data;
      setWalletData(summary);
      setAwards(data?.unilevel_awards || []);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
    cardBg: isDarkMode ? '#1e293b' : '#f8fafc',
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['rgba(59,130,246,0.15)', 'rgba(31,41,55,0)'] : ['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#1f2937' : Colors.white, borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="chevron-back-outline" size={24} color={isDarkMode ? '#e5e7eb' : Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerGreeting, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>
              Network Earnings
            </Text>
            <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#9ca3af' : Colors.textSecondary }]}>
              Commission & Bonus
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDarkMode ? '#38bdf8' : '#0ea5e9'} />
          </View>
        ) : (
          <>
            {/* Network Statistics */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Network Statistics</Text>
              <View style={styles.cardsGrid}>
                <NetworkCard
                  label="Total Referrals"
                  value={String(walletData?.referrals?.total || 0)}
                  icon="👥"
                  isDarkMode={isDarkMode}
                />
                <NetworkCard
                  label="Verified Referrals"
                  value={String(walletData?.referrals?.verified || 0)}
                  icon="✓"
                  isDarkMode={isDarkMode}
                />
                <NetworkCard
                  label="Active Referrals"
                  value={String(walletData?.referrals?.active || 0)}
                  icon="🟢"
                  isDarkMode={isDarkMode}
                />
                <NetworkCard
                  label="Direct Referral PV"
                  value={numberFmt(walletData?.direct_referral_total_pv || 0)}
                  icon="📊"
                  isDarkMode={isDarkMode}
                />
              </View>
            </View>

            {/* Network Earnings */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Network Earnings</Text>
              <View style={styles.cardsGrid}>
                <NetworkCard
                  label="Affiliate Retail Profit"
                  value={peso(walletData?.affiliate_retail_profit || 0)}
                  icon="💰"
                  isDarkMode={isDarkMode}
                />
                <NetworkCard
                  label="Affiliate Performance Bonus"
                  value={peso(walletData?.affiliate_performance_bonus || 0)}
                  icon="⭐"
                  isDarkMode={isDarkMode}
                />
                <NetworkCard
                  label="Group Purchase Bonus"
                  value={peso(walletData?.group_purchase_bonus || 0)}
                  icon="🎁"
                  isDarkMode={isDarkMode}
                />
                <NetworkCard
                  label="Global Purchase Bonus"
                  value={peso(walletData?.global_purchase_bonus || 0)}
                  icon="🌍"
                  isDarkMode={isDarkMode}
                />
              </View>
            </View>

            {/* Monthly Activation */}
            {walletData?.monthly_activation && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Activation</Text>
                <View style={[styles.activationBox, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
                  <View style={styles.activationRow}>
                    <Text style={[styles.activationLabel, { color: colors.textSec }]}>Current Month PV</Text>
                    <Text style={[styles.activationValue, { color: colors.text }]}>
                      {numberFmt(walletData.monthly_activation.current_month_pv || 0)}
                    </Text>
                  </View>
                  <View style={[styles.activationDivider, { borderBottomColor: colors.border }]} />
                  <View style={styles.activationRow}>
                    <Text style={[styles.activationLabel, { color: colors.textSec }]}>Required PV for Activation</Text>
                    <Text style={[styles.activationValue, { color: colors.text }]}>
                      {numberFmt(walletData.monthly_activation.required_pv || 0)}
                    </Text>
                  </View>
                  <View style={[styles.activationDivider, { borderBottomColor: colors.border }]} />
                  <View style={styles.activationRow}>
                    <Text style={[styles.activationLabel, { color: colors.textSec }]}>Activation Status</Text>
                    <Text style={[styles.activationValue, { color: walletData.monthly_activation.is_active ? '#22c55e' : '#ef4444' }]}>
                      {walletData.monthly_activation.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Unilevel Awards */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recent Unilevel Awards ({awards.length})
              </Text>
              {awards.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
                  <Ionicons name="gift-outline" size={48} color={colors.textSec} />
                  <Text style={[styles.emptyStateText, { color: colors.text }]}>No awards yet</Text>
                  <Text style={[styles.emptyStateSubtext, { color: colors.textSec }]}>
                    Awards from your network will appear here
                  </Text>
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={awards}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <AwardRow
                      sourceName={item.source_name}
                      sourceUsername={item.source_username}
                      level={item.level_no}
                      amount={item.bonus_amount}
                      earnedPv={item.earned_pv}
                      awardedAt={item.awarded_at}
                      isDarkMode={isDarkMode}
                    />
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: -10,
    marginRight: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerGreeting: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 12,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardsGrid: {
    gap: 10,
  },
  networkCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardLabel: {
    fontSize: 11,
    flex: 1,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  activationBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  activationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  activationLabel: {
    fontSize: 12,
  },
  activationValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  activationDivider: {
    borderBottomWidth: 1,
    marginVertical: 6,
  },
  awardRow: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  awardLeft: {
    flex: 1,
  },
  awardRight: {
    alignItems: 'flex-end',
  },
  awardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  awardSource: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  levelBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  awardDate: {
    fontSize: 11,
  },
  awardAmount: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  awardPv: {
    fontSize: 10,
  },
  emptyState: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyStateSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
});
