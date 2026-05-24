import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, BackHandler, ActivityIndicator, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Colors } from '../constants/colors';
import { API_CONFIG } from '../config/api';

interface AFWalletOverviewScreenProps {
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

interface BalanceCardProps {
  label: string;
  value: string;
  sub: string;
  icon: string;
  isDarkMode: boolean;
}

function BalanceCard({ label, value, sub, icon, isDarkMode }: BalanceCardProps) {
  const colors = {
    bg: isDarkMode ? '#1e293b' : '#f8fafc',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
  };

  return (
    <View style={[styles.balanceCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardIcon]}>{icon}</Text>
        <Text style={[styles.cardLabel, { color: colors.textSec }]}>{label}</Text>
      </View>
      <Text style={[styles.cardValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.cardSub, { color: colors.textSec }]}>{sub}</Text>
    </View>
  );
}

export default function AFWalletOverviewScreen({ isDarkMode = false, onClose, token }: AFWalletOverviewScreenProps) {
  const insets = useSafeAreaInsets();
  const [walletData, setWalletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState<any[]>([]);

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
        `${API_CONFIG.BASE_URL}/encashment/wallet?wallet_type=all`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data?.data || response.data;
      const summary = data?.summary || data;
      setWalletData(summary);
      setLedger(data?.ledger || []);
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

  const utilizationPct = walletData
    ? Math.min(100, Math.max(0, (walletData.encashment_locked / (walletData.encashment_locked + walletData.encashment_available)) * 100))
    : 0;

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
              Overview
            </Text>
            <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#9ca3af' : Colors.textSecondary }]}>
              Cash & Balance
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
            <ActivityIndicator size="large" color={Colors.sky} />
          </View>
        ) : walletData ? (
          <>
            {/* Cash Wallet Section */}
            <View style={styles.section}>
              <View style={styles.sectionLabel}>
                <Text style={[styles.sectionIcon, { color: colors.text }]}>₱</Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Cash Wallet</Text>
              </View>

              <View style={styles.cardsGrid}>
                <BalanceCard
                  label="Cash Balance"
                  value={peso(walletData.cash_balance || 0)}
                  sub="Available for encashment"
                  icon="💰"
                  isDarkMode={isDarkMode}
                />
                <BalanceCard
                  label="Locked Encashment"
                  value={peso(walletData.encashment_locked || 0)}
                  sub="Pending / ready-for-release"
                  icon="🔒"
                  isDarkMode={isDarkMode}
                />
                <BalanceCard
                  label="Available to Encash"
                  value={peso(walletData.encashment_available || 0)}
                  sub="Can be requested now"
                  icon="✓"
                  isDarkMode={isDarkMode}
                />
              </View>

              {/* Encashment Capacity Bar */}
              <View style={[styles.capacityBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={styles.capacityHeader}>
                  <Text style={[styles.capacityTitle, { color: colors.text }]}>Encashment Capacity</Text>
                  <Text style={[styles.capacityPercent, { color: utilizationPct > 70 ? '#dc2626' : utilizationPct > 40 ? '#f59e0b' : '#059669' }]}>
                    {utilizationPct.toFixed(0)}% locked
                  </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressBar, { width: `${utilizationPct}%` }]} />
                </View>
                <View style={styles.capacityDetails}>
                  <Text style={[styles.capacityDetail, { color: colors.textSec }]}>
                    Locked: <Text style={{ color: colors.text, fontWeight: 'bold' }}>{peso(walletData.encashment_locked || 0)}</Text>
                  </Text>
                  <Text style={[styles.capacityDetail, { color: colors.textSec }]}>
                    Available: <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{peso(walletData.encashment_available || 0)}</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* AF Voucher Section */}
            <View style={styles.section}>
              <View style={styles.sectionLabel}>
                <Text style={[styles.sectionIcon, { color: colors.text }]}>◆</Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>AF Voucher (PV)</Text>
              </View>

              <View style={styles.cardsGrid}>
                <BalanceCard
                  label="PV Balance"
                  value={`${numberFmt(walletData.pv_balance || 0)} PV`}
                  sub="Credits after delivery"
                  icon="◆"
                  isDarkMode={isDarkMode}
                />
                <BalanceCard
                  label="Pending PV"
                  value={`${numberFmt(walletData.pending_pv || 0)} PV`}
                  sub="Awaiting confirmation"
                  icon="⏳"
                  isDarkMode={isDarkMode}
                />
              </View>
            </View>

            {/* Rewards Section */}
            <View style={styles.section}>
              <View style={styles.sectionLabel}>
                <Text style={[styles.sectionIcon, { color: colors.text }]}>✦</Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Rewards</Text>
              </View>

              <View style={styles.cardsGrid}>
                <BalanceCard
                  label="AF Voucher Balance"
                  value={peso(walletData.af_voucher_balance || 0)}
                  sub="Redeemable on checkout"
                  icon="🎟"
                  isDarkMode={isDarkMode}
                />
                <BalanceCard
                  label="Cashback Balance"
                  value={peso(walletData.cashback_balance || 0)}
                  sub={`${walletData.cashback_rate || 0}% rate`}
                  icon="💸"
                  isDarkMode={isDarkMode}
                />
                <BalanceCard
                  label="EGC Balance"
                  value={peso(walletData.available_egc_balance || 0)}
                  sub="Digital gift credit"
                  icon="🎁"
                  isDarkMode={isDarkMode}
                />
              </View>
            </View>

            {/* Wallet Ledger */}
            {ledger.length > 0 && (
              <View style={[styles.ledgerSection, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
                <View style={styles.ledgerHeader}>
                  <View>
                    <Text style={[styles.ledgerTitle, { color: colors.text }]}>Wallet Ledger</Text>
                    <Text style={[styles.ledgerSubtitle, { color: colors.textSec }]}>Transaction history</Text>
                  </View>
                  <View style={styles.ledgerBadge}>
                    <Text style={[styles.ledgerCount, { color: colors.textSec }]}>{ledger.length} entries</Text>
                  </View>
                </View>

                <View style={styles.ledgerTable}>
                  {ledger.slice(0, 10).map((item: any, idx: number) => (
                    <View key={idx} style={[styles.ledgerRow, { borderBottomColor: colors.border }]}>
                      <View style={styles.ledgerCell}>
                        <Text style={[styles.ledgerDate, { color: colors.textSec }]}>
                          {formatDate(item.created_at)}
                        </Text>
                      </View>
                      <View style={styles.ledgerCell}>
                        <View style={[styles.ledgerBadgeSmall, { backgroundColor: item.wallet_type === 'cash' ? '#10b981' : '#3b82f6' }]}>
                          <Text style={styles.ledgerBadgeText}>
                            {item.wallet_type === 'cash' ? 'CASH' : 'PV'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.ledgerCell}>
                        <Text style={[styles.ledgerSource, { color: colors.textSec }]}>
                          {item.source_type || 'wallet'}
                        </Text>
                      </View>
                      <View style={styles.ledgerCell}>
                        <Text style={[
                          styles.ledgerAmount,
                          { color: item.entry_type === 'credit' ? '#10b981' : '#ef4444' },
                        ]}>
                          {item.entry_type === 'credit' ? '+' : '-'}
                          {item.wallet_type === 'pv'
                            ? numberFmt(Math.abs(item.amount))
                            : peso(Math.abs(item.amount))
                          }
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {ledger.length > 10 && (
                  <Text style={[styles.ledgerMore, { color: colors.textSec }]}>
                    +{ledger.length - 10} more transactions
                  </Text>
                )}
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSec }]}>No wallet data available</Text>
          </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardsGrid: {
    gap: 10,
  },
  balanceCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIcon: {
    fontSize: 16,
  },
  cardLabel: {
    fontSize: 12,
    flex: 1,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 11,
  },
  capacityBar: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  capacityPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 3,
  },
  capacityDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  capacityDetail: {
    fontSize: 11,
  },
  ledgerSection: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  ledgerTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  ledgerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  ledgerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ledgerCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  ledgerTable: {
    paddingHorizontal: 12,
  },
  ledgerRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  ledgerCell: {
    flex: 1,
  },
  ledgerDate: {
    fontSize: 11,
  },
  ledgerBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  ledgerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
  },
  ledgerSource: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  ledgerAmount: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  ledgerMore: {
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 10,
  },
});
