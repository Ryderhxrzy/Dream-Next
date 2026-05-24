import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Platform, Linking, Share, Clipboard, Modal, ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { Colors } from '../constants/colors';
import { API_CONFIG } from '../config/api';
import PrimaryButton from '../components/Button/PrimaryButton';
import OutlineButton from '../components/Button/OutlineButton';
import { referralService, ReferralTree } from '../services/referralService';
import { getBadgeImageSource } from '../constants/tierConfig';
import { accountService } from '../services/accountService';
import { orderService } from '../services/orderService';
import LevelProgress from '../components/LevelProgress/LevelProgress';
import ReferralNetworkScreen from './ReferralNetworkScreen';
import ProfileDetailsScreen from './ProfileDetailsScreen';
import LevelProgressDetailsScreen from './LevelProgressDetailsScreen';
import { ChatBotIcon } from '../components/ChatBot';

interface User {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  avatar_original_url?: string;
  badge_name?: string;
  badge_image?: string | any;
  rank?: number;
  badge?: number;
  account_status?: number;
  profile_complete?: boolean;
  profile_completion_percentage?: number;
  monthly_activation?: {
    current_month_pv?: number;
    threshold_pv?: number;
    remaining_pv?: number;
  };
  [key: string]: any;
}

interface ProfileScreenProps {
  user?: User | null;
  onLogout?: () => void;
  onNavigateSettings?: () => void;
  onCartPress?: () => void;
  cartCount?: number;
  token?: string | null;
  onShowProfileDetails?: (show: boolean) => void;
  onShowReferralNetwork?: (show: boolean, tree?: ReferralTree | null) => void;
  closeReferralNetwork?: boolean;
  isDarkMode?: boolean;
  onPurchaseItemClick?: (status: 'pending' | 'paid' | 'processing' | 'shipped' | 'to_receive' | 'delivered' | 'cancelled' | 'return') => void;
  linkedAccountsRefreshTrigger?: number;
  onSecuritySettingsPress?: () => void;
  onShowAFWalletOverview?: () => void;
  onShowAFWalletVoucher?: () => void;
  onShowAFWalletRewards?: () => void;
  onShowAFWalletNetwork?: () => void;
}

const REFERRAL_STATS = [
  { label: 'Total', value: '5', icon: 'people-outline' as const },
  { label: 'Pending', value: '₱1,200', icon: 'time-outline' as const },
  { label: 'Earned', value: '₱4,500', icon: 'cash-outline' as const },
];

const PURCHASE_ITEMS = [
  { icon: 'time-outline' as const, label: 'Pending', key: 'pending' as const },
  { icon: 'checkmark' as const, label: 'Paid', key: 'paid' as const },
  { icon: 'hourglass-outline' as const, label: 'Processing', key: 'processing' as const },
  { icon: 'cube-outline' as const, label: 'To Ship', key: 'shipped' as const },
];

const PURCHASE_BOTTOM_ITEMS = [
  { icon: 'car-outline' as const, label: 'To Receive', key: 'to_receive' as const },
  { icon: 'checkmark-circle-outline' as const, label: 'Delivered', key: 'delivered' as const },
  { icon: 'close-circle-outline' as const, label: 'Cancelled', key: 'cancelled' as const },
  { icon: 'return-down-back-outline' as const, label: 'Return', key: 'return' as const },
];

const SOCIAL_ITEMS = [
  { icon: 'logo-facebook' as const, label: 'Facebook', url: 'https://facebook.com/afhome.ph', color: '#1877F2' },
  { icon: 'logo-instagram' as const, label: 'Instagram', url: 'https://instagram.com/afhome.ph', color: '#E4405F' },
  { icon: 'logo-tiktok' as const, label: 'TikTok', url: 'https://tiktok.com/@afhome.ph', color: '#000000' },
  { icon: 'globe-outline' as const, label: 'Website', url: 'https://www.afhome.ph', color: Colors.sky },
];

const MENU_ITEMS = [
  { icon: 'settings-outline' as const, label: 'Settings', chevron: true, key: 'settings' },
  { icon: 'log-out-outline' as const, label: 'Log Out', chevron: false, danger: true, key: 'logout' },
];

export default function ProfileScreen({ user, onLogout, onNavigateSettings, onCartPress, cartCount = 0, token, onShowProfileDetails, onShowReferralNetwork, closeReferralNetwork, isDarkMode = false, onPurchaseItemClick, linkedAccountsRefreshTrigger, onSecuritySettingsPress, onShowAFWalletOverview, onShowAFWalletVoucher, onShowAFWalletRewards, onShowAFWalletNetwork }: ProfileScreenProps) {
  console.log('[ProfileScreen] Component mounted/updated', {
    userEmail: user?.email,
    hasToken: !!token,
    linkedAccountsRefreshTrigger,
  });
  console.log('[ProfileScreen] User object received:', { name: user?.name, badge_name: user?.badge_name, badge_image: user?.badge_image, avatar_url: user?.avatar_url });
  const insets = useSafeAreaInsets();

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
    borderLight: isDarkMode ? '#475569' : '#f1f5f9',
    cardBg: isDarkMode ? '#1e293b' : '#f8fafc',
    headerBg: isDarkMode ? '#1f2937' : Colors.white,
    socialIconBg: isDarkMode ? '#334155' : '#f8fafc',
    purchaseIconBg: isDarkMode ? '#334155' : '#f8fafc',
  };
  const [enlargedQR, setEnlargedQR] = useState<'signup' | 'shopping' | null>(null);
  const [referralTree, setReferralTree] = useState<ReferralTree | null>(null);
  const [showReferralNetwork, setShowReferralNetwork] = useState(false);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState<any>(null);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [showLevelProgressDetails, setShowLevelProgressDetails] = useState(false);
  const [orderCounts, setOrderCounts] = useState<any>(null);
  const [showSecurityBanner, setShowSecurityBanner] = useState(true);
  const [walletData, setWalletData] = useState<any>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const photoUrl = user?.avatar_url ?? null;
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : '?';
  const firstName = user?.name?.split(' ')[0] ?? 'User';
  const username = user?.username || 'guest';
  const signupUrl = `https://afhome.ph/ref/${username}`;
  const shoppingUrl = `https://afhome.ph/shop?ref=${username}`;

  const handleCopy = (url: string) => {
    Clipboard.setString(url);
    Toast.show({
      type: 'success',
      text1: 'Link Copied',
      text2: 'Referral link copied to clipboard',
    });
  };

  const handlePurchaseItemClick = (label: string, key: 'pending' | 'paid' | 'processing' | 'shipped' | 'to_receive' | 'delivered' | 'cancelled' | 'return') => {
    onPurchaseItemClick?.(key);
  };

  const getPurchaseCount = (key: 'pending' | 'paid' | 'processing' | 'shipped' | 'to_receive' | 'delivered' | 'cancelled' | 'return') => {
    if (!orderCounts) return 0;
    const aliases: Record<string, string[]> = {
      pending: ['pending'],
      paid: ['paid'],
      processing: ['processing'],
      shipped: ['shipped', 'to_ship', 'toship'],
      to_receive: ['to_receive', 'out_for_delivery', 'outfordelivery', 'toReceive'],
      delivered: ['delivered'],
      cancelled: ['cancelled', 'canceled'],
      return: ['return', 'returned', 'returns'],
    };

    for (const alias of aliases[key] || [key]) {
      const value = Number(orderCounts?.[alias]);
      if (Number.isFinite(value) && value > 0) return value;
    }

    return 0;
  };


  useEffect(() => {
    onShowProfileDetails?.(showProfileDetails);
  }, [showProfileDetails, onShowProfileDetails]);

  useEffect(() => {
    onShowReferralNetwork?.(showReferralNetwork, referralTree);
  }, [showReferralNetwork, referralTree, onShowReferralNetwork]);

  useEffect(() => {
    if (closeReferralNetwork) {
      setShowReferralNetwork(false);
    }
  }, [closeReferralNetwork]);

  useEffect(() => {
    console.log('[ProfileScreen] useEffect token changed:', { token: !!token });
    if (token) {
      console.log('[ProfileScreen] Token available, fetching data');
      fetchLoyaltyData();
      fetchOrderCounts();
      fetchReferralTree();
      fetchLinkedAccounts();
      fetchSecuritySettings();
      fetchWalletData();
    }
  }, [token]);

  useEffect(() => {
    console.log('[ProfileScreen] linkedAccountsRefreshTrigger changed:', linkedAccountsRefreshTrigger);
    if (linkedAccountsRefreshTrigger && linkedAccountsRefreshTrigger > 0) {
      console.log('[ProfileScreen] Trigger detected, refetching linked accounts');
      fetchLinkedAccounts();
    }
  }, [linkedAccountsRefreshTrigger]);

  const fetchReferralTree = async () => {
    if (!token) return;
    try {
      const data = await referralService.getReferralTree(token);
      setReferralTree(data);
    } catch (error: any) {
      console.error('Error fetching referral tree:', error);
    }
  };

  const fetchLoyaltyData = async () => {
    if (!token) return;
    setLoadingLoyalty(true);
    try {
      const snapshot = await accountService.getAccountSnapshot(token);
      setLoyaltyData(snapshot.loyalty);
    } catch (error: any) {
      console.error('Error fetching loyalty data:', error);
    } finally {
      setLoadingLoyalty(false);
    }
  };

  const fetchOrderCounts = async () => {
    if (!token) return;
    try {
      const data = await orderService.getOrderCounts(token);
      console.log('[ProfileScreen] orderCounts payload:', JSON.stringify(data));
      setOrderCounts({
        ...data,
        to_receive: Number(data?.to_receive ?? data?.out_for_delivery ?? data?.outfordelivery ?? data?.toReceive ?? 0),
        delivered: Number(data?.delivered ?? 0),
        shipped: Number(data?.shipped ?? data?.to_ship ?? data?.toship ?? 0),
        cancelled: Number(data?.cancelled ?? data?.canceled ?? 0),
        return: Number(data?.return ?? data?.returned ?? data?.returns ?? 0),
      });
    } catch (error: any) {
      console.error('Error fetching order counts:', error);
    }
  };

  const fetchLinkedAccounts = async () => {
    if (!token) {
      console.log('[ProfileScreen] No token available for fetching linked accounts');
      return;
    }

    try {
      console.log('[ProfileScreen] Fetching Google linked status from endpoint');
      const endpoint = `${require('../config/api').API_CONFIG.BASE_URL}/auth/mobile/check-google-linked`;
      console.log('[ProfileScreen] Endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[ProfileScreen] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ProfileScreen] API Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[ProfileScreen] Full API response:', JSON.stringify(data));
      console.log('[ProfileScreen] data.linked:', data.linked);

      const isLinked = data.linked === true;
      console.log('[ProfileScreen] Setting googleLinked to:', isLinked);
      setGoogleLinked(isLinked);
    } catch (error: any) {
      console.error('[ProfileScreen] Error fetching Google linked status:', {
        message: error.message,
        stack: error.stack,
      });
    }
  };

  const fetchSecuritySettings = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_CONFIG.BASE_URL}/user/security-settings`, { headers });
      const securityData = res?.data?.data;
      setBiometricEnabled(securityData?.biometric_enabled ?? false);
    } catch (error) {
      console.log('Error fetching security settings:', error);
    }
  };

  const fetchWalletData = async () => {
    if (!token) return;
    setLoadingWallet(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_CONFIG.BASE_URL}/encashment/wallet?wallet_type=all`, { headers });
      const walletSummary = res?.data?.data?.summary || res?.data?.summary;
      setWalletData(walletSummary);
      console.log('[ProfileScreen] Wallet data fetched:', walletSummary);
    } catch (error) {
      console.log('Error fetching wallet data:', error);
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleViewNetwork = async () => {
    if (!token) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Missing authentication token',
      });
      return;
    }

    setLoadingReferral(true);
    try {
      const data = await referralService.getReferralTree(token);
      setReferralTree(data);
      setShowReferralNetwork(true);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to load referral network',
      });
    } finally {
      setLoadingReferral(false);
    }
  };

  const handleShare = async (url: string, type?: 'signup' | 'shopping') => {
    try {
      let message = `Check out AF Home! ${url}`;
      if (type === 'signup') {
        message = `Join me as an AF Home member and start earning rewards! Register here: ${url}`;
      } else if (type === 'shopping') {
        message = `Shop with me on AF Home and enjoy amazing products! Use my link: ${url}`;
      }
      await Share.share({
        message: message,
        url: url,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  return (
    <View style={{ flex: 1, position: 'relative' }}>
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={isDarkMode ? ['rgba(59,130,246,0.15)', 'rgba(31,41,55,0)'] : ['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}
      >
        <TouchableOpacity style={styles.headerLeft} onPress={() => setShowProfileDetails(true)} activeOpacity={0.7}>
          <View style={styles.headerAvatar}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.headerAvatarImg} />
            ) : (
              <Text style={styles.headerAvatarInitial}>{initial}</Text>
            )}
          </View>
          <View style={styles.headerNameContainer}>
            <View style={styles.headerNameRow}>
              <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>{user?.name ?? 'Guest'}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textSec} style={styles.profileIcon} />
            </View>
            {user?.username && (
              <View style={styles.usernameRow}>
                <Text style={[styles.usernameText, { color: Colors.sky }]}>@{user.username}</Text>
                {user?.badge_name && (
                  <>
                    <View style={styles.usernameDot} />
                    <View style={styles.userBadge}>
                      <Ionicons name="shield-checkmark" size={10} color={Colors.white} />
                      <Text style={styles.userBadgeText}>{user.badge_name}</Text>
                    </View>
                  </>
                )}
                <View style={styles.usernameDot} />
                <Text style={styles.usernamePvText}>{user.monthly_activation?.remaining_pv ?? 0} PV</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]} activeOpacity={0.7} onPress={onCartPress}>
            <Ionicons name="cart-outline" size={20} color={colors.text} />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]} activeOpacity={0.7} onPress={onNavigateSettings}>
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Scrollable body ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Security Settings Banner */}
        {showSecurityBanner && (!biometricEnabled || !googleLinked) && (
          <View style={[styles.securityBannerNew, { backgroundColor: isDarkMode ? '#1e3a8a' : '#dbeafe', borderColor: Colors.sky }]}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.securityBannerCloseNew}
              onPress={() => setShowSecurityBanner(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={Colors.sky} />
            </TouchableOpacity>

            {/* Main Content */}
            <View style={styles.securityBannerMainContent}>
              <View style={styles.securityBannerIconTitleWrap}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.sky} />
                <Text style={[styles.securityBannerTitleNew, { color: isDarkMode ? '#e0e7ff' : '#1e40af' }]}>
                  Secure Your Account
                </Text>
              </View>
              <Text style={[styles.securityBannerSubtitleNew, { color: isDarkMode ? '#bfdbfe' : '#1e3a8a' }]}>
                Add biometric or link Google for faster login
              </Text>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.securityBannerActionBtn, { backgroundColor: Colors.sky }]}
              onPress={onSecuritySettingsPress}
              activeOpacity={0.7}
            >
              <Text style={styles.securityBannerActionBtnText}>Setup</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Level Progress */}
        {loyaltyData && (
          <LevelProgress
            currentTier={loyaltyData.tier}
            currentRank={loyaltyData.rank}
            personalPv={loyaltyData.personal_pv}
            referralCount={loyaltyData.referral_count}
            activeMembers={loyaltyData.active_members_count}
            activeBuilders={loyaltyData.active_builders_count}
            activeLeaders={loyaltyData.active_leaders_count}
            username={user?.username}
            loading={loadingLoyalty}
            isDarkMode={isDarkMode}
            onViewDetails={() => {
              setShowLevelProgressDetails(true);
            }}
          />
        )}


        {/* My Purchases */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
          <View style={[styles.purchasesHeader, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.purchasesTitle, { color: colors.text }]}>My Purchases</Text>
            <TouchableOpacity
              style={styles.purchasesViewAll}
              onPress={() => handlePurchaseItemClick('View Purchase History', 'delivered')}
            >
              <View style={styles.purchasesViewAllContainer}>
                <Text style={[styles.purchasesViewAllText, { color: colors.textSec }]}>View Purchase History</Text>
                {orderCounts?.delivered !== undefined && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{orderCounts.delivered}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.purchasesWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={styles.purchasesGrid}
              scrollEnabled={true}
            >
              {PURCHASE_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.purchaseItem}
                  activeOpacity={0.7}
                  onPress={() => handlePurchaseItemClick(item.label, item.key)}
                >
                    <View style={[styles.purchaseIconContainer, { backgroundColor: colors.purchaseIconBg }]}>
                    <Ionicons name={item.icon} size={24} color={Colors.sky} />
                    {item.key && getPurchaseCount(item.key) > 0 && (
                      <View style={[styles.itemCountBadge, { borderColor: isDarkMode ? colors.containerBg : Colors.white }]}>
                        <Text style={styles.itemCountBadgeText}>
                          {getPurchaseCount(item.key) > 99 ? '99+' : getPurchaseCount(item.key)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.purchaseLabel, { color: colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.bottomPurchaseRow}>
              {PURCHASE_BOTTOM_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.purchaseItemBottom}
                  activeOpacity={0.7}
                  onPress={() => handlePurchaseItemClick(item.label, item.key)}
                >
                  <View style={[styles.purchaseIconContainer, { backgroundColor: colors.purchaseIconBg }]}>
                    <Ionicons name={item.icon} size={24} color={Colors.sky} />
                    {item.key && getPurchaseCount(item.key) > 0 && (
                      <View style={[styles.itemCountBadge, { borderColor: isDarkMode ? colors.containerBg : Colors.white }]}>
                        <Text style={styles.itemCountBadgeText}>
                          {getPurchaseCount(item.key) > 99 ? '99+' : getPurchaseCount(item.key)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.purchaseLabel, { color: colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* My Referrals */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
          <View style={[styles.purchasesHeader, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.purchasesTitle, { color: colors.text }]}>My Referrals</Text>
            <TouchableOpacity
              style={styles.purchasesViewAll}
              onPress={handleViewNetwork}
              disabled={loadingReferral}
            >
              {loadingReferral ? (
                <ActivityIndicator size="small" color={colors.textSec} />
              ) : (
                <>
                  <Text style={[styles.purchasesViewAllText, { color: colors.textSec }]}>View Network</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textSec} />
                </>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.referralsGrid}>
            {referralTree ? (
              <>
                <TouchableOpacity
                  style={styles.referralItem}
                  activeOpacity={0.7}
                  onPress={handleViewNetwork}
                >
                  <View style={[styles.referralIconContainer, { backgroundColor: '#e0f2fe' }]}>
                    <Ionicons name="people-outline" size={28} color={Colors.sky} />
                  </View>
                  <Text style={[styles.referralItemValue, { color: colors.text }]}>{referralTree.summary.total_network}</Text>
                  <Text style={[styles.referralItemLabel, { color: colors.textSec }]}>Total</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.referralItem}
                  activeOpacity={0.7}
                  onPress={handleViewNetwork}
                >
                  <View style={[styles.referralIconContainer, { backgroundColor: '#fef3c7' }]}>
                    <Ionicons name="person-outline" size={28} color="#f59e0b" />
                  </View>
                  <Text style={[styles.referralItemValue, { color: colors.text }]}>{referralTree.summary.direct_count}</Text>
                  <Text style={[styles.referralItemLabel, { color: colors.textSec }]}>Direct</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.referralItem}
                  activeOpacity={0.7}
                  onPress={handleViewNetwork}
                >
                  <View style={[styles.referralIconContainer, { backgroundColor: '#fed7aa' }]}>
                    <Ionicons name="cash-outline" size={28} color="#f97316" />
                  </View>
                  <Text style={[styles.referralItemValue, { color: colors.text }]}>₱{referralTree.root.total_earnings}</Text>
                  <Text style={[styles.referralItemLabel, { color: colors.textSec }]}>Earned</Text>
                </TouchableOpacity>
              </>
            ) : (
              <ActivityIndicator size="large" color={Colors.sky} />
            )}
          </View>
        </View>

        {/* Affiliate Referral QR */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
          <View style={[styles.purchasesHeader, { borderBottomColor: colors.borderLight }]}>
            <View>
              <Text style={[styles.purchasesTitle, { color: colors.text }]}>Affiliate Referral QR</Text>
              <Text style={[styles.qrSubtitle, { color: Colors.sky }]}>Ready to Share</Text>
            </View>
          </View>

          <View style={styles.qrContainer}>
            {/* Signup QR Section */}
            <View style={[styles.qrCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.qrCardHeader}>
                <View style={[styles.qrIconBox, { backgroundColor: isDarkMode ? '#0c2340' : '#e0f2fe' }]}>
                  <Ionicons name="person-add" size={16} color={Colors.sky} />
                </View>
                <Text style={[styles.qrCardTitle, { color: colors.text }]}>Invite Members</Text>
              </View>
              <Text style={[styles.qrCardDescription, { color: colors.textSec }]}>
                Use this link when someone wants to register as your referral.
              </Text>

              <Text style={[styles.qrTopLabel, { color: Colors.sky }]}>Signup referral QR code</Text>

              <View style={styles.qrMain}>
                <TouchableOpacity
                  style={[styles.qrImageWrapper, { backgroundColor: colors.containerBg, borderColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => setEnlargedQR('signup')}
                >
                  <Image
                    source={{ uri: `https://quickchart.io/qr?text=${encodeURIComponent(signupUrl)}&size=200` }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <View style={styles.qrImageTag}>
                    <Text style={styles.qrImageTagText}>Signup</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.qrInfo}>
                  <Text style={[styles.qrLabel, { color: colors.textSec }]}>Member signup link</Text>
                  <View style={[styles.qrLinkBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <Text style={[styles.qrLinkText, { color: Colors.sky }]} numberOfLines={2}>{signupUrl}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.qrActions}>
                <PrimaryButton
                  title="Share"
                  icon="share-social"
                  onPress={() => handleShare(signupUrl, 'signup')}
                  size="small"
                  style={{ flex: 1 }}
                />
                <OutlineButton
                  title="Copy Link"
                  icon="copy-outline"
                  onPress={() => handleCopy(signupUrl)}
                  color={Colors.sky}
                  size="small"
                  style={{ flex: 1 }}
                />
              </View>
            </View>

            <View style={[styles.qrSeparator, { backgroundColor: colors.border }]} />

            {/* Shopping QR Section */}
            <View style={[styles.qrCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.qrCardHeader}>
                <View style={[styles.qrIconBox, { backgroundColor: '#fed7aa' }]}>
                  <Ionicons name="cart" size={16} color="#f97316" />
                </View>
                <Text style={[styles.qrCardTitle, { color: colors.text }]}>Share Shopping Link</Text>
              </View>
              <Text style={[styles.qrCardDescription, { color: colors.textSec }]}>
                Use this link for non-members who only want to shop. Their checkout will carry your referral automatically.
              </Text>

              <Text style={[styles.qrTopLabel, { color: '#f97316' }]}>Shopping referral QR code</Text>

              <View style={styles.qrMain}>
                <TouchableOpacity
                  style={[styles.qrImageWrapper, { backgroundColor: colors.containerBg, borderColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => setEnlargedQR('shopping')}
                >
                  <Image
                    source={{ uri: `https://quickchart.io/qr?text=${encodeURIComponent(shoppingUrl)}&size=200` }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <View style={[styles.qrImageTag, { backgroundColor: '#f97316' }]}>
                    <Text style={styles.qrImageTagText}>Shopping</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.qrInfo}>
                  <Text style={[styles.qrLabel, { color: colors.textSec }]}>Shopping referral link</Text>
                  <View style={[styles.qrLinkBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <Text style={[styles.qrLinkText, { color: Colors.sky }]} numberOfLines={2}>{shoppingUrl}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.qrActions}>
                <PrimaryButton
                  title="Share"
                  icon="share-social"
                  onPress={() => handleShare(shoppingUrl, 'shopping')}
                  size="small"
                  style={{ backgroundColor: '#f97316', flex: 1 }}
                />
                <OutlineButton
                  title="Copy Link"
                  icon="copy-outline"
                  onPress={() => handleCopy(shoppingUrl)}
                  color="#f97316"
                  size="small"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* AF Wallet Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
          <View style={[styles.purchasesHeader, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.purchasesTitle, { color: colors.text }]}>AF Wallet</Text>
          </View>

          {loadingWallet ? (
            <ActivityIndicator size="large" color={Colors.sky} style={{ paddingVertical: 20 }} />
          ) : walletData ? (
            <View style={styles.walletCardsContainer}>
              {/* Overview Card */}
              <TouchableOpacity
                style={[styles.walletCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                onPress={() => onShowAFWalletOverview?.()}
                activeOpacity={0.7}
              >
                <View style={styles.walletCardTitle}>
                  <Ionicons name="wallet-outline" size={18} color={Colors.sky} />
                  <Text style={[styles.walletCardTitleText, { color: colors.text }]}>Overview</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSec} />
              </TouchableOpacity>

              {/* AF Voucher Card */}
              <TouchableOpacity
                style={[styles.walletCard, { backgroundColor: colors.cardBg, borderColor: colors.border, marginTop: 12 }]}
                onPress={() => onShowAFWalletVoucher?.()}
                activeOpacity={0.7}
              >
                <View style={styles.walletCardTitle}>
                  <Ionicons name="ticket-outline" size={18} color="#f97316" />
                  <Text style={[styles.walletCardTitleText, { color: colors.text }]}>AF Voucher</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSec} />
              </TouchableOpacity>

              {/* Rewards Card */}
              <TouchableOpacity
                style={[styles.walletCard, { backgroundColor: colors.cardBg, borderColor: colors.border, marginTop: 12 }]}
                onPress={() => onShowAFWalletRewards?.()}
                activeOpacity={0.7}
              >
                <View style={styles.walletCardTitle}>
                  <Ionicons name="gift-outline" size={18} color="#f59e0b" />
                  <Text style={[styles.walletCardTitleText, { color: colors.text }]}>Rewards & Cashback</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSec} />
              </TouchableOpacity>

              {/* Network Earnings Card */}
              <TouchableOpacity
                style={[styles.walletCard, { backgroundColor: colors.cardBg, borderColor: colors.border, marginTop: 12 }]}
                onPress={() => onShowAFWalletNetwork?.()}
                activeOpacity={0.7}
              >
                <View style={styles.walletCardTitle}>
                  <Ionicons name="git-network-outline" size={18} color="#8b5cf6" />
                  <Text style={[styles.walletCardTitleText, { color: colors.text }]}>Network Earnings</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSec} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Menu */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuRow,
                index < MENU_ITEMS.length - 1 && [styles.menuRowBorder, { borderBottomColor: colors.borderLight }],
              ]}
              activeOpacity={0.7}
              onPress={() => {
                if (item.key === 'logout') onLogout?.();
                if (item.key === 'settings') onNavigateSettings?.();
              }}
            >
              <View style={[styles.menuIcon, item.danger && styles.menuIconDanger, { backgroundColor: isDarkMode ? (item.danger ? '#7f1d1d' : '#0c2340') : (item.danger ? '#fee2e2' : '#e0f2fe') }]}>
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={item.danger ? Colors.error : Colors.sky}
                />
              </View>
              <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger, { color: item.danger ? Colors.error : colors.text }]}>
                {item.label}
              </Text>
              {item.chevron && (
                <Ionicons name="chevron-forward" size={16} color={colors.textSec} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Connect with Us */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
          <View style={[styles.purchasesHeader, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.purchasesTitle, { color: colors.text }]}>Connect with Us</Text>
          </View>
          <View style={styles.purchasesGrid}>
            {SOCIAL_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.purchaseItem}
                activeOpacity={0.7}
                onPress={() => item.url && Linking.openURL(item.url)}
              >
                <View style={[styles.purchaseIconContainer, { backgroundColor: colors.socialIconBg }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={[styles.purchaseLabel, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Enlarged QR Modal */}
      <Modal
        visible={enlargedQR !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEnlargedQR(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.containerBg }]}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setEnlargedQR(null)}
            >
              <Ionicons name="close" size={24} color={Colors.white} />
            </TouchableOpacity>

            <Image
              source={{
                uri: enlargedQR === 'signup'
                  ? `https://quickchart.io/qr?text=${encodeURIComponent(signupUrl)}&size=400`
                  : `https://quickchart.io/qr?text=${encodeURIComponent(shoppingUrl)}&size=400`,
              }}
              style={styles.modalQrImage}
              resizeMode="contain"
            />

            <Text style={[styles.modalQrUrl, { color: colors.textSec }]}>
              {enlargedQR === 'signup' ? signupUrl : shoppingUrl}
            </Text>

            <PrimaryButton
              title={enlargedQR === 'signup' ? 'Share Signup Link' : 'Share Shopping Link'}
              icon="share-social"
              onPress={() => {
                const url = enlargedQR === 'signup' ? signupUrl : shoppingUrl;
                handleShare(url, enlargedQR);
              }}
              style={{ marginTop: 20, width: '80%' }}
            />
          </View>
        </View>
      </Modal>

      {/* Referral Network Screen */}
      {showReferralNetwork && (
        <View style={styles.referralNetworkOverlay}>
          <ReferralNetworkScreen
            token={token}
            tree={referralTree}
            onBack={() => setShowReferralNetwork(false)}
          />
        </View>
      )}

      {/* Profile Details Screen */}
      {showProfileDetails && (
        <View style={styles.profileDetailsOverlay}>
          <ProfileDetailsScreen
            token={token}
            cartCount={cartCount}
            onClose={() => setShowProfileDetails(false)}
            onCartPress={onCartPress}
          />
        </View>
      )}
      {showLevelProgressDetails && loyaltyData && (
        <View style={styles.profileDetailsOverlay}>
          <LevelProgressDetailsScreen
            currentRank={loyaltyData.rank}
            personalPv={loyaltyData.personal_pv}
            referralCount={loyaltyData.referral_count}
            activeMembers={loyaltyData.active_members_count}
            activeBuilders={loyaltyData.active_builders_count}
            activeLeaders={loyaltyData.active_leaders_count}
            isDarkMode={isDarkMode}
            onBack={() => setShowLevelProgressDetails(false)}
          />
        </View>
      )}

    </View>

    {/* Chat Bot Icon */}
    <ChatBotIcon position="bottom-right" visible={true} isDarkMode={isDarkMode} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0f2fe',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.sky,
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  headerAvatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.sky,
  },
  headerNameContainer: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    flexShrink: 1,
  },
  profileIcon: {
    marginLeft: 4,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    height: 18,
  },
  badgeImageSmall: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  userBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.white,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  usernameText: {
    fontSize: 12,
    color: Colors.sky,
    fontWeight: '600',
  },
  usernameDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#cbd5e1',
  },
  usernamePvText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 11,
  },

  // ── Body ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 8,
    gap: 16,
    paddingBottom: 32,
  },

  // ── Hero ──
  hero: {
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 6,
  },
  heroBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    marginBottom: 4,
  },
  heroBubbleImg: {
    width: '100%',
    height: '100%',
  },
  heroBubbleInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
  },
  heroEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: '700',
  },

  // ── My Purchases ──
  purchasesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  purchasesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  purchasesViewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  purchasesViewAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  purchasesViewAllText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  countBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: '700',
  },
  purchasesGrid: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 12,
    gap: 10,
    justifyContent: 'center',
  },
  purchasesWrap: {
    gap: 12,
  },
  purchaseItem: {
    alignItems: 'center',
    gap: 8,
    width: 80,
  },
  purchaseItemBottom: {
    alignItems: 'center',
    gap: 8,
    width: 80,
  },
  bottomPurchaseRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  purchaseIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCountBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.error,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  itemCountBadgeText: {
    fontSize: 9,
    color: Colors.white,
    fontWeight: '700',
    lineHeight: 11,
  },
  purchaseLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text,
  },
  referralValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
    marginTop: -2,
  },

  // ── My Referrals ──
  referralsGrid: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  referralItem: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  referralIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralItemValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  referralItemLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  // ── QR Section ──
  qrSubtitle: {
    fontSize: 12,
    color: Colors.sky,
    fontWeight: '600',
    marginTop: 2,
  },
  qrContainer: {
    padding: 16,
    gap: 20,
  },
  qrCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  qrCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  qrIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  qrCardDescription: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 16,
  },
  qrTopLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.sky,
    marginBottom: 12,
    marginLeft: 16,
    marginRight: 16,
  },
  qrMain: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  qrImageWrapper: {
    width: 100,
    height: 100,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 80,
    height: 80,
  },
  qrImageTag: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: Colors.sky,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qrImageTagText: {
    color: Colors.white,
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  qrInfo: {
    flex: 1,
    gap: 4,
  },
  qrLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  qrLinkBox: {
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  qrLinkText: {
    fontSize: 10,
    color: Colors.sky,
    fontWeight: '600',
  },
  qrActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  qrSeparator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },

  // ── Menu ──
  section: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDanger: {
    backgroundColor: '#fee2e2',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  menuLabelDanger: {
    color: Colors.error,
  },

  // ── Modal ──
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
  modalQrImage: {
    width: 280,
    height: 280,
    marginTop: 16,
    marginBottom: 20,
  },
  modalQrUrl: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },

  // ── Profile Details Overlay ──
  profileDetailsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: Colors.white,
  },

  // ── Referral Network Overlay ──
  referralNetworkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: Colors.white,
  },

  // ── Google Link Banner ──
  googleLinkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.sky,
    gap: 10,
  },
  googleLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  googleLinkText: {
    flex: 1,
    gap: 0,
  },
  googleLinkTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  googleLinkSubtitle: {
    fontSize: 10,
    fontWeight: '400',
    color: '#1e3a8a',
    opacity: 0.8,
  },
  googleLinkBtn: {
    backgroundColor: Colors.sky,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLinkBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
  },

  // ── Security Banner ──
  securityBannerNew: {
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  securityBannerCloseNew: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityBannerMainContent: {
    flex: 1,
    gap: 4,
    marginRight: 24,
  },
  securityBannerIconTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityBannerTitleNew: {
    fontSize: 13,
    fontWeight: '700',
  },
  securityBannerSubtitleNew: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
  },
  securityBannerActionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityBannerActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },

  // ── Wallet Section ──
  walletCardsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 0,
  },
  walletSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  walletSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  walletCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  walletCardTitleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  walletCardContent: {
    marginTop: 12,
    gap: 10,
  },
  walletStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletStatLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  walletStatValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  walletCardFooterText: {
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
  },

});
