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

interface AFWalletRewardsScreenProps {
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

interface RewardCardProps {
  label: string;
  value: string;
  icon: string;
  isDarkMode: boolean;
}

function RewardCard({ label, value, icon, isDarkMode }: RewardCardProps) {
  const colors = {
    bg: isDarkMode ? '#1e293b' : '#f8fafc',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
  };

  return (
    <View style={[styles.rewardCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardIcon]}>{icon}</Text>
        <Text style={[styles.cardLabel, { color: colors.textSec }]}>{label}</Text>
      </View>
      <Text style={[styles.cardValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export default function AFWalletRewardsScreen({ isDarkMode = false, onClose, token }: AFWalletRewardsScreenProps) {
  const insets = useSafeAreaInsets();
  const [walletData, setWalletData] = useState<any>(null);
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
              Rewards & Cashback
            </Text>
            <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#9ca3af' : Colors.textSecondary }]}>
              Balance & History
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
            {/* Cashback Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Cashback</Text>
              <View style={styles.cardsGrid}>
                <RewardCard
                  label="Available Balance"
                  value={peso(walletData?.personal_cashback_balance || 0)}
                  icon="💵"
                  isDarkMode={isDarkMode}
                />
                <RewardCard
                  label="Source Balance"
                  value={peso(walletData?.personal_cashback_source_balance || 0)}
                  icon="📊"
                  isDarkMode={isDarkMode}
                />
                <RewardCard
                  label="Reserved Balance"
                  value={peso(walletData?.personal_cashback_reserved_balance || 0)}
                  icon="🔒"
                  isDarkMode={isDarkMode}
                />
                <RewardCard
                  label="Cashback Rate"
                  value={`${walletData?.personal_cashback_rate || 0}%`}
                  icon="📈"
                  isDarkMode={isDarkMode}
                />
              </View>
            </View>

            {/* Rewards & Bonuses Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Rewards & Bonuses</Text>
              <View style={styles.cardsGrid}>
                <RewardCard
                  label="Affiliate Retail Profit"
                  value={peso(walletData?.affiliate_retail_profit || 0)}
                  icon="🎯"
                  isDarkMode={isDarkMode}
                />
                <RewardCard
                  label="Affiliate Performance Bonus"
                  value={peso(walletData?.affiliate_performance_bonus || 0)}
                  icon="⭐"
                  isDarkMode={isDarkMode}
                />
                <RewardCard
                  label="Global Purchase Bonus"
                  value={peso(walletData?.global_purchase_bonus || 0)}
                  icon="🌍"
                  isDarkMode={isDarkMode}
                />
                <RewardCard
                  label="Group Purchase Bonus"
                  value={peso(walletData?.group_purchase_bonus || 0)}
                  icon="👥"
                  isDarkMode={isDarkMode}
                />
              </View>
            </View>

            {/* PV & Points Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Points & Values</Text>
              <View style={styles.cardsGrid}>
                <RewardCard
                  label="Pending Referral Earnings"
                  value={peso(walletData?.pending_referral_earnings || 0)}
                  icon="⏳"
                  isDarkMode={isDarkMode}
                />
                <RewardCard
                  label="Yearly Purchase PV"
                  value={numberFmt(walletData?.yearly_purchase_pv || 0)}
                  icon="📅"
                  isDarkMode={isDarkMode}
                />
                <RewardCard
                  label="Lifetime PV"
                  value={numberFmt(walletData?.lifetime_pv || 0)}
                  icon="🏆"
                  isDarkMode={isDarkMode}
                />
                <RewardCard
                  label="Monthly Points"
                  value={numberFmt(walletData?.monthly_purchase_points || 0)}
                  icon="📍"
                  isDarkMode={isDarkMode}
                />
              </View>
            </View>

            {/* Total Bonus Section */}
            {walletData?.total_bonus > 0 && (
              <View style={[styles.totalBonusSection, { backgroundColor: isDarkMode ? '#1e293b' : '#f0fdf4', borderColor: isDarkMode ? '#374151' : '#86efac' }]}>
                <Ionicons name="star" size={24} color={isDarkMode ? '#86efac' : '#22c55e'} />
                <View style={styles.bonusInfo}>
                  <Text style={[styles.bonusLabel, { color: colors.textSec }]}>Total Bonus Earned</Text>
                  <Text style={[styles.bonusValue, { color: isDarkMode ? '#86efac' : '#22c55e' }]}>
                    {peso(walletData.total_bonus)}
                  </Text>
                </View>
              </View>
            )}
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
  rewardCard: {
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
  totalBonusSection: {
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bonusInfo: {
    flex: 1,
  },
  bonusLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  bonusValue: {
    fontSize: 20,
    fontWeight: '700',
  },
});
