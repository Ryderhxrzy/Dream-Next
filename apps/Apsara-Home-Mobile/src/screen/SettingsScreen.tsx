import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, BackHandler, Animated, Modal, Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Image } from 'react-native';

interface User {
  name?: string;
  avatar_url?: string;
  email?: string;
}

interface SettingsScreenProps {
  user?: User | null;
  onBack: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
  onNavigateSecurity: () => void;
  onEditProfile?: () => void;
  onNavigateAboutUs?: () => void;
  onNavigatePrivacyPolicy?: () => void;
  onNavigateTermsAndConditions?: () => void;
  onNavigateIncomeDisclaimer?: () => void;
  onNavigateCookiePolicy?: () => void;
  onNavigateRewardsAndCommissions?: () => void;
  onNavigateContactUs?: () => void;
  onNavigateOurBranches?: () => void;
  onNavigateFAQs?: () => void;
  onNavigateShippingInfo?: () => void;
  onNavigateReturns?: () => void;
  onLogout?: () => void;
}

export default function SettingsScreen({ user, onBack, isDarkMode, setIsDarkMode, onNavigateSecurity, onEditProfile, onNavigateAboutUs, onNavigatePrivacyPolicy, onNavigateTermsAndConditions, onNavigateIncomeDisclaimer, onNavigateCookiePolicy, onNavigateRewardsAndCommissions, onNavigateContactUs, onNavigateOurBranches, onNavigateFAQs, onNavigateShippingInfo, onNavigateReturns, onLogout }: SettingsScreenProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(100)).current;

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
    cardBg: isDarkMode ? '#1e293b' : '#f8fafc',
    borderLight: isDarkMode ? '#475569' : '#f1f5f9',
  };

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => backHandler.remove();
  }, [onBack]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          transform: [
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 100],
                outputRange: [0, 100],
              }),
            },
          ],
        },
      ]}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={[]}>
        <LinearGradient
        colors={isDarkMode ? ['rgba(59,130,246,0.15)', 'rgba(31,41,55,0)'] : ['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#1f2937' : Colors.white, borderBottomColor: colors.border }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#f8fafc' : Colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={[styles.scroll, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.profileCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatarContainer}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.profileAvatar} />
              ) : (
                <View style={[styles.profileAvatarPlaceholder, { backgroundColor: colors.cardBg }]}>
                  <Text style={[styles.profileAvatarInitial, { color: Colors.sky }]}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
                {user?.name || 'User'}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textSec }]} numberOfLines={1}>
                {user?.email || 'No email'}
              </Text>
            </View>
            {onEditProfile && (
              <TouchableOpacity onPress={onEditProfile} style={styles.editButton}>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#64748b' : '#94a3b8'} />
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.profileDivider, { backgroundColor: colors.border }]} />
          <View style={styles.profileActions}>
            {onLogout && (
              <TouchableOpacity style={styles.profileActionButton} onPress={() => setShowLogoutConfirm(true)}>
                <Ionicons name="log-out-outline" size={18} color={Colors.error} />
                <Text style={[styles.profileActionText, { color: Colors.error }]}>Logout</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.profileActionButton}>
              <Ionicons name="add-outline" size={18} color={Colors.sky} />
              <Text style={[styles.profileActionText, { color: Colors.sky }]}>Add Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
          <View style={styles.sectionTitle}>
            <Text style={[styles.sectionTitleText, { color: colors.textSec }]}>APPEARANCE</Text>
          </View>
          <View style={[styles.settingRow, styles.settingRowWithBorder, { borderBottomColor: colors.border }]}>
            <View style={[styles.settingIcon, { backgroundColor: colors.cardBg }]}>
              <Ionicons name="moon-outline" size={20} color={Colors.sky} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={setIsDarkMode}
              trackColor={{ false: '#e2e8f0', true: Colors.sky }}
              thumbColor="#fff"
            />
          </View>
          <TouchableOpacity style={[styles.settingRow]}>
            <View style={[styles.settingIcon, { backgroundColor: colors.cardBg }]}>
              <Ionicons name="globe-outline" size={20} color={Colors.sky} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Language</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.languageValue, { color: colors.textSec }]}>English</Text>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#64748b' : '#94a3b8'} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
          <View style={styles.sectionTitle}>
            <Text style={[styles.sectionTitleText, { color: colors.textSec }]}>ACCOUNT</Text>
          </View>
          {onEditProfile && (
            <TouchableOpacity style={[styles.settingRow, styles.settingRowWithBorder, { borderBottomColor: colors.border }]} onPress={onEditProfile}>
              <View style={[styles.settingIcon, { backgroundColor: colors.cardBg }]}>
                <Ionicons name="person-outline" size={20} color={Colors.sky} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Profile</Text>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#64748b' : '#94a3b8'} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.settingRow, styles.settingRowWithBorder, { borderBottomColor: colors.border }]} onPress={onNavigateSecurity}>
            <View style={[styles.settingIcon, { backgroundColor: colors.cardBg }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.sky} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Security</Text>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow]}>
            <View style={[styles.settingIcon, { backgroundColor: colors.cardBg }]}>
              <Ionicons name="people-outline" size={20} color={Colors.sky} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Community</Text>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
        </View>

        {/* Information Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
          <View style={styles.sectionTitle}>
            <Text style={[styles.sectionTitleText, { color: colors.textSec }]}>INFORMATION</Text>
          </View>
          <TouchableOpacity style={[styles.linkRow, styles.linkRowWithBorder, { borderBottomColor: colors.border }]} onPress={onNavigateAboutUs}>
            <Text style={[styles.linkLabel, { color: Colors.sky }]}>About us</Text>
            <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow, styles.linkRowWithBorder, { borderBottomColor: colors.border }]} onPress={onNavigatePrivacyPolicy}>
            <Text style={[styles.linkLabel, { color: Colors.sky }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow, styles.linkRowWithBorder, { borderBottomColor: colors.border }]} onPress={onNavigateTermsAndConditions}>
            <Text style={[styles.linkLabel, { color: Colors.sky }]}>Terms and Conditions</Text>
            <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow, styles.linkRowWithBorder, { borderBottomColor: colors.border }]} onPress={onNavigateIncomeDisclaimer}>
            <Text style={[styles.linkLabel, { color: Colors.sky }]}>Income Disclaimer</Text>
            <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow, styles.linkRowWithBorder, { borderBottomColor: colors.border }]} onPress={onNavigateCookiePolicy}>
            <Text style={[styles.linkLabel, { color: Colors.sky }]}>Cookie Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow]} onPress={onNavigateRewardsAndCommissions}>
            <Text style={[styles.linkLabel, { color: Colors.sky }]}>Rewards and Commissions</Text>
            <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
          <View style={styles.sectionTitle}>
            <Text style={[styles.sectionTitleText, { color: colors.textSec }]}>SUPPORT</Text>
          </View>
          <TouchableOpacity style={[styles.linkRow, styles.linkRowWithBorder, { borderBottomColor: colors.border }]} onPress={onNavigateContactUs}>
            <Text style={[styles.linkLabel, { color: Colors.sky }]}>Contact Us</Text>
            <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow, styles.linkRowWithBorder, { borderBottomColor: colors.border }]} onPress={onNavigateOurBranches}>
            <Text style={[styles.linkLabel, { color: Colors.sky }]}>Our Branches</Text>
            <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow, styles.linkRowWithBorder, { borderBottomColor: colors.border }]} onPress={onNavigateFAQs}>
            <Text style={[styles.linkLabel, { color: Colors.sky }]}>FAQs</Text>
            <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow, styles.linkRowWithBorder, { borderBottomColor: colors.border }]} onPress={onNavigateShippingInfo}>
            <Text style={[styles.linkLabel, { color: Colors.sky }]}>Shipping Info</Text>
            <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow]} onPress={onNavigateReturns}>
            <Text style={[styles.linkLabel, { color: Colors.sky }]}>Returns</Text>
            <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
        </View>

        {/* Payments Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
          <View style={styles.sectionTitle}>
            <Text style={[styles.sectionTitleText, { color: colors.textSec }]}>PAYMENTS</Text>
          </View>
          <View style={styles.paymentContent}>
            <Text style={[styles.paymentLabel, { color: colors.text }]}>We Accept:</Text>
            <Text style={[styles.paymentMethods, { color: colors.textSec }]}>
              Credit/Debit Cards • E-Wallets • Bank Transfers • GCash • PayMaya • and more
            </Text>
          </View>
        </View>

        {/* Version Footer */}
        <View style={styles.versionFooter}>
          <Text style={[styles.versionText, { color: colors.textSec }]}>AF Home v1.0.0</Text>
        </View>

      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutConfirm} transparent animationType="fade" onRequestClose={() => setShowLogoutConfirm(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowLogoutConfirm(false)} activeOpacity={1}>
          <View style={[styles.modalContent, { backgroundColor: colors.containerBg }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2' }]}>
              <Ionicons name="log-out-outline" size={32} color={Colors.error} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Logout</Text>
            <Text style={[styles.modalMessage, { color: colors.textSec }]}>Are you sure you want to logout from your account?</Text>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>

              <Pressable style={[styles.modalButton, styles.logoutConfirmButton]} onPress={() => {
                setShowLogoutConfirm(false);
                onLogout?.();
              }}>
                <Text style={styles.logoutConfirmText}>Logout</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  headerTitleDark: {
    color: '#f8fafc',
  },
  content: {
    padding: 8,
    gap: 16,
    paddingBottom: 32,
  },
  section: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTitleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  settingRowWithBorder: {
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  languageValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  logoutIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  linkRowWithBorder: {
    borderBottomWidth: 1,
  },
  linkLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  paymentContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentMethods: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    width: '100%',
    gap: 10,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  logoutConfirmButton: {
    backgroundColor: Colors.error,
  },
  logoutConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  versionFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  profileCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  profileAvatarContainer: {
    marginRight: 4,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profileAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarInitial: {
    fontSize: 22,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    fontWeight: '400',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDivider: {
    height: 1,
  },
  profileActions: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  profileActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  profileActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
