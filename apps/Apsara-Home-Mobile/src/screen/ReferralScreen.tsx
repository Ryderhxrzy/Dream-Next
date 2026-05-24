import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface ReferralScreenProps {
  referrerUsername: string;
  referrerName?: string;
  referrerAvatarUrl?: string;
  isDarkMode?: boolean;
  onClose: () => void;
  onRegister: () => void;
}

export default function ReferralScreen({
  referrerUsername,
  referrerName,
  referrerAvatarUrl,
  isDarkMode = false,
  onClose,
  onRegister,
}: ReferralScreenProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['rgba(59,130,246,0.15)', 'rgba(31,41,55,0)'] : ['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#1f2937' : Colors.white }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDarkMode ? '#e5e7eb' : Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerGreeting, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>
              AF Home
            </Text>
            <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#9ca3af' : Colors.textSecondary }]}>
              Through referral
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        {/* Welcome Banner */}
        <LinearGradient
          colors={[Colors.sky, Colors.skyDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerContent}>
            <Ionicons name="gift" size={48} color={Colors.white} />
            <Text style={styles.bannerTitle}>You're Invited!</Text>
            <Text style={styles.bannerSubtitle}>
              Join through a special referral link
            </Text>
          </View>
        </LinearGradient>

        {/* Referrer Info Card */}
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <Text style={[styles.cardLabel, isDarkMode && styles.cardLabelDark]}>
            Referred by
          </Text>
          <View style={styles.referrerInfo}>
            {referrerAvatarUrl ? (
              <Image
                source={{ uri: referrerAvatarUrl }}
                style={styles.referrerAvatar}
              />
            ) : (
              <View style={styles.referrerAvatar}>
                <Text style={styles.avatarText}>
                  {referrerName?.charAt(0).toUpperCase() || referrerUsername.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.referrerDetails}>
              <Text style={[styles.referrerName, isDarkMode && styles.referrerNameDark]}>
                {referrerName || referrerUsername}
              </Text>
              <Text style={[styles.referrerUsername, isDarkMode && styles.referrerUsernameDark]}>
                @{referrerUsername}
              </Text>
            </View>
          </View>
        </View>

        {/* Benefits Section */}
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
            Benefits
          </Text>

          <View style={styles.benefitItem}>
            <View style={styles.benefitIcon}>
              <Ionicons name="star" size={20} color={Colors.sky} />
            </View>
            <View style={styles.benefitText}>
              <Text style={[styles.benefitTitle, isDarkMode && styles.benefitTitleDark]}>
                Exclusive Rewards
              </Text>
              <Text style={[styles.benefitDesc, isDarkMode && styles.benefitDescDark]}>
                Earn rewards and commissions from your purchases
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.benefitIcon}>
              <Ionicons name="people" size={20} color={Colors.sky} />
            </View>
            <View style={styles.benefitText}>
              <Text style={[styles.benefitTitle, isDarkMode && styles.benefitTitleDark]}>
                Build Your Network
              </Text>
              <Text style={[styles.benefitDesc, isDarkMode && styles.benefitDescDark]}>
                Grow your affiliate network and earn commission
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.benefitIcon}>
              <Ionicons name="pricetag" size={20} color={Colors.sky} />
            </View>
            <View style={styles.benefitText}>
              <Text style={[styles.benefitTitle, isDarkMode && styles.benefitTitleDark]}>
                Special Offers
              </Text>
              <Text style={[styles.benefitDesc, isDarkMode && styles.benefitDescDark]}>
                Access exclusive deals and promotions
              </Text>
            </View>
          </View>
        </View>

        {/* AF Home & Referral Info Section */}
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
            AF Home & Referral
          </Text>

          {/* Referrer Info */}
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Ionicons name="person" size={20} color={Colors.sky} style={styles.statusIcon} />
              <View style={styles.statusContent}>
                <Text style={[styles.statusLabel, isDarkMode && styles.statusLabelDark]}>
                  Referred by
                </Text>
                <Text style={[styles.statusValue, isDarkMode && styles.statusValueDark]}>
                  {referrerName || referrerUsername}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

          <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
            AF Home is your trusted marketplace for quality products with exclusive rewards and affiliate opportunities.
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.footer, isDarkMode && styles.footerDark]}>
        <View style={styles.footerContent}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onRegister}
          >
            <Text style={styles.primaryButtonText}>
              Register
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, isDarkMode && styles.secondaryButtonDark]}
            onPress={onClose}
          >
            <Text style={[styles.secondaryButtonText, isDarkMode && styles.secondaryButtonTextDark]}>
              Already Referred by Other User
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerGreeting: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    width: '100%',
    paddingHorizontal: 0,
    paddingBottom: 20,
  },
  banner: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 12,
    borderRadius: 0,
    padding: 32,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    width: '100%',
  },
  bannerContent: {
    alignItems: 'center',
    gap: 12,
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
  },
  bannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 0,
    marginVertical: 0,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#e5e7eb',
    width: '100%',
  },
  cardDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  cardLabelDark: {
    color: '#9ca3af',
  },
  referrerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referrerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  referrerDetails: {
    flex: 1,
  },
  referrerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  referrerNameDark: {
    color: Colors.white,
  },
  referrerUsername: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  referrerUsernameDark: {
    color: '#9ca3af',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  sectionTitleDark: {
    color: Colors.white,
  },
  benefitItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    justifyContent: 'center',
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  benefitTitleDark: {
    color: Colors.white,
  },
  benefitDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  benefitDescDark: {
    color: '#9ca3af',
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  infoTextDark: {
    color: '#9ca3af',
  },
  statusContainer: {
    gap: 12,
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  statusIcon: {
    marginTop: 2,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statusLabelDark: {
    color: '#9ca3af',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
  },
  statusValueDark: {
    color: Colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  dividerDark: {
    backgroundColor: '#374151',
  },
  spacer: {
    height: 40,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerDark: {
    backgroundColor: '#1f2937',
    borderTopColor: '#374151',
  },
  footerContent: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  secondaryButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryButtonDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  secondaryButtonTextDark: {
    color: Colors.white,
  },
});
