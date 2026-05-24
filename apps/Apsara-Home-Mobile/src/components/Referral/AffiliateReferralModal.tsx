import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Linking,
  Clipboard,
  Dimensions,
  BackHandler,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/colors';
import PrimaryButton from '../Button/PrimaryButton';
import OutlineButton from '../Button/OutlineButton';
import { ReferralTree } from '../../services/referralService';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface AffiliateReferralModalProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
  username?: string;
  referralTree?: ReferralTree | null;
  isDarkMode?: boolean;
  onViewNetwork?: () => void;
}

export default function AffiliateReferralModal({
  visible,
  onClose,
  userName,
  username,
  referralTree,
  isDarkMode = false,
  onViewNetwork,
}: AffiliateReferralModalProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const scrollY = useRef(0);
  const safeUsername = username || 'guest';
  const signupUrl = `https://afhome.ph/ref/${safeUsername}`;
  const shoppingUrl = `https://afhome.ph/shop?ref=${safeUsername}`;
  const totalNetwork = referralTree?.summary?.total_network ?? 0;
  const directCount = referralTree?.summary?.direct_count ?? 0;
  const earned = referralTree?.root?.total_earnings ?? 0;

  const colors = {
    bg: isDarkMode ? '#111827' : Colors.white,
    card: isDarkMode ? '#1f2937' : '#f9fafb',
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
    borderLight: isDarkMode ? '#1f2937' : '#f1f5f9',
    dragHandle: isDarkMode ? '#4b5563' : '#cbd5e1',
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => scrollY.current === 0,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (scrollY.current > 0) return false;
        return gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (scrollY.current === 0 && gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (scrollY.current === 0 && gestureState.dy > 100) {
          handleClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    onClose();
  };

  useEffect(() => {
    if (!visible) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => sub.remove();
  }, [visible, onClose]);

  const handleCopy = (url: string) => {
    Clipboard.setString(url);
    Toast.show({
      type: 'success',
      text1: 'Link Copied',
      text2: 'Referral link copied to clipboard',
    });
  };

  const handleShare = async (url: string, type: 'signup' | 'shopping') => {
    const message =
      type === 'signup'
        ? `Join AF Home as my referral and start earning rewards: ${url}`
        : `Shop on AF Home using my affiliate link: ${url}`;

    await Share.share({ message, url });
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={handleClose}
      />
      <Animated.View
        style={[
          styles.affiliateModal,
          { backgroundColor: colors.bg, transform: [{ translateY: slideAnim }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandleContainer}>
          <View style={[styles.dragHandle, { backgroundColor: colors.dragHandle }]} />
        </View>

        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.borderLight }]}>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: colors.text }]}>Affiliate Referral</Text>
            <Text style={[styles.subtitle, { color: colors.textSec }]}>Share your links and grow your network</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { backgroundColor: colors.bg }]}
          onScroll={(event) => { scrollY.current = event.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
        >

          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: isDarkMode ? '#0c2340' : '#e0f2fe' }]}>
                <Ionicons name="person-add" size={16} color={Colors.sky} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Invite Members</Text>
                <Text style={[styles.sectionText, { color: colors.textSec }]}>Use this link when someone wants to register as your referral.</Text>
              </View>
            </View>

            <View style={styles.qrBlock}>
              <TouchableOpacity
                style={[styles.qrBox, { backgroundColor: colors.bg, borderColor: colors.border }]}
                onPress={() => Linking.openURL(signupUrl)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: `https://quickchart.io/qr?text=${encodeURIComponent(signupUrl)}&size=220` }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                <Text style={styles.qrTag}>Signup</Text>
              </TouchableOpacity>
              <View style={styles.qrInfo}>
                <Text style={[styles.linkLabel, { color: colors.textSec }]}>Member signup link</Text>
                <View style={[styles.linkBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.linkText, { color: Colors.sky }]} numberOfLines={2}>{signupUrl}</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              <PrimaryButton title="Share" icon="share-social" onPress={() => handleShare(signupUrl, 'signup')} style={{ flex: 1 }} />
              <OutlineButton title="Copy Link" icon="copy-outline" onPress={() => handleCopy(signupUrl)} color={Colors.sky} style={{ flex: 1 }} />
            </View>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#fed7aa' }]}>
                <Ionicons name="cart" size={16} color="#f97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Share Shopping Link</Text>
                <Text style={[styles.sectionText, { color: colors.textSec }]}>Customers can shop right away and your referral stays attached.</Text>
              </View>
            </View>

            <View style={styles.qrBlock}>
              <TouchableOpacity
                style={[styles.qrBox, { backgroundColor: colors.bg, borderColor: colors.border }]}
                onPress={() => Linking.openURL(shoppingUrl)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: `https://quickchart.io/qr?text=${encodeURIComponent(shoppingUrl)}&size=220` }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                <Text style={[styles.qrTag, { backgroundColor: '#f97316' }]}>Shopping</Text>
              </TouchableOpacity>
              <View style={styles.qrInfo}>
                <Text style={[styles.linkLabel, { color: colors.textSec }]}>Shopping referral link</Text>
                <View style={[styles.linkBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.linkText, { color: Colors.sky }]} numberOfLines={2}>{shoppingUrl}</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              <PrimaryButton title="Share" icon="share-social" onPress={() => handleShare(shoppingUrl, 'shopping')} style={{ backgroundColor: '#f97316', flex: 1 }} />
              <OutlineButton title="Copy Link" icon="copy-outline" onPress={() => handleCopy(shoppingUrl)} color="#f97316" style={{ flex: 1 }} />
            </View>
          </View>

        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  affiliateModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  qrBlock: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  qrBox: {
    width: 110,
    minHeight: 132,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  qrImage: {
    width: 88,
    height: 88,
  },
  qrTag: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '800',
    color: Colors.white,
    backgroundColor: Colors.sky,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  qrInfo: {
    flex: 1,
    gap: 8,
  },
  linkLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  linkBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  networkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  networkBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
});
