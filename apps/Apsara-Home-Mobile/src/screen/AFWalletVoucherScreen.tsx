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

interface AFWalletVoucherScreenProps {
  isDarkMode?: boolean;
  onClose?: () => void;
  token?: string | null;
}

const peso = (value: number) => {
  return `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

interface VoucherCardProps {
  code: string;
  amount: number;
  status: string;
  expiresAt?: string | null;
  usedCount?: number | null;
  maxUses?: number | null;
  isDarkMode: boolean;
}

function VoucherCard({ code, amount, status, expiresAt, usedCount, maxUses, isDarkMode }: VoucherCardProps) {
  const colors = {
    bg: isDarkMode ? '#1e293b' : '#f8fafc',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    statusBg: status === 'redeemed'
      ? (isDarkMode ? '#7f1d1d' : '#fee2e2')
      : status === 'expired'
      ? (isDarkMode ? '#4b5563' : '#f3f4f6')
      : (isDarkMode ? '#064e3b' : '#ecfdf5'),
    statusText: status === 'redeemed'
      ? (isDarkMode ? '#fca5a5' : '#dc2626')
      : status === 'expired'
      ? (isDarkMode ? '#d1d5db' : '#6b7280')
      : (isDarkMode ? '#6ee7b7' : '#059669'),
  };

  return (
    <View style={[styles.voucherCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.voucherHeader}>
        <View style={styles.voucherCodeSection}>
          <Text style={[styles.voucherCode, { color: colors.text }]}>{code}</Text>
          <Text style={[styles.voucherAmount, { color: colors.text }]}>{peso(amount)}</Text>
        </View>
        <View style={[styles.voucherStatus, { backgroundColor: colors.statusBg }]}>
          <Text style={[styles.voucherStatusText, { color: colors.statusText }]}>
            {status === 'redeemed' ? 'Redeemed' : status === 'expired' ? 'Expired' : 'Available'}
          </Text>
        </View>
      </View>

      <View style={[styles.voucherDivider, { borderBottomColor: colors.border }]} />

      <View style={styles.voucherDetails}>
        {expiresAt && (
          <View style={styles.voucherDetailRow}>
            <Text style={[styles.voucherDetailLabel, { color: colors.textSec }]}>Expires:</Text>
            <Text style={[styles.voucherDetailValue, { color: colors.text }]}>{formatDate(expiresAt)}</Text>
          </View>
        )}
        {maxUses !== null && maxUses !== undefined && (
          <View style={styles.voucherDetailRow}>
            <Text style={[styles.voucherDetailLabel, { color: colors.textSec }]}>Usage:</Text>
            <Text style={[styles.voucherDetailValue, { color: colors.text }]}>
              {usedCount || 0} of {maxUses}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function AFWalletVoucherScreen({ isDarkMode = false, onClose, token }: AFWalletVoucherScreenProps) {
  const insets = useSafeAreaInsets();
  const [walletData, setWalletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState<any[]>([]);

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
      setVouchers(data?.affiliate_vouchers || []);
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
              AF Voucher
            </Text>
            <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#9ca3af' : Colors.textSecondary }]}>
              Voucher & Balance
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
            {/* Balance Section */}
            {walletData && (
              <View style={[styles.balanceSection, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Balance Overview</Text>

                <View style={styles.balanceGrid}>
                  <View style={[styles.balanceBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.balanceLabel, { color: colors.textSec }]}>AF Voucher Balance</Text>
                    <Text style={[styles.balanceValue, { color: colors.text }]}>
                      {peso(walletData.af_voucher_balance || 0)}
                    </Text>
                  </View>

                  <View style={[styles.balanceBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.balanceLabel, { color: colors.textSec }]}>Reserved/Pending</Text>
                    <Text style={[styles.balanceValue, { color: colors.text }]}>
                      {peso(walletData.af_voucher_reserved_balance || 0)}
                    </Text>
                  </View>

                  <View style={[styles.balanceBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.balanceLabel, { color: colors.textSec }]}>Available Balance</Text>
                    <Text style={[styles.balanceValue, { color: colors.text }]}>
                      {peso(walletData.af_voucher_source_balance || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Vouchers List */}
            <View style={styles.vouchersSection}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
                Your Vouchers ({vouchers.length})
              </Text>

              {vouchers.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
                  <Ionicons name="ticket-outline" size={48} color={colors.textSec} />
                  <Text style={[styles.emptyStateText, { color: colors.text }]}>No vouchers yet</Text>
                  <Text style={[styles.emptyStateSubtext, { color: colors.textSec }]}>
                    Create a voucher to share with customers
                  </Text>
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={vouchers}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <VoucherCard
                      code={item.code}
                      amount={item.amount}
                      status={item.status}
                      expiresAt={item.expires_at}
                      usedCount={item.used_count}
                      maxUses={item.max_uses}
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
  balanceSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  balanceGrid: {
    gap: 10,
  },
  balanceBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  balanceLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  vouchersSection: {
    gap: 12,
  },
  voucherCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  voucherCodeSection: {
    flex: 1,
  },
  voucherCode: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  voucherAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  voucherStatus: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  voucherStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  voucherDivider: {
    borderBottomWidth: 1,
    marginVertical: 10,
  },
  voucherDetails: {
    gap: 8,
  },
  voucherDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voucherDetailLabel: {
    fontSize: 11,
  },
  voucherDetailValue: {
    fontSize: 11,
    fontWeight: '600',
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
