import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface TermsAndConditionsScreenProps {
  onBack: () => void;
  isDarkMode: boolean;
}

export default function TermsAndConditionsScreen({ onBack, isDarkMode }: TermsAndConditionsScreenProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = React.useRef(new Animated.Value(100)).current;

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
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
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Terms and Conditions</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={[styles.scroll, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tagline */}
          <View style={[styles.taglineContainer, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.tagline, { color: colors.text }]}>Terms and Conditions</Text>
            <Text style={[styles.subtitle, { color: colors.textSec }]}>Clear terms help everyone. Please review the guidelines that apply when using our website and services.</Text>
          </View>

          {/* Introduction */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.introHeading, { color: colors.text }]}>Latest Terms and Conditions of AF Home</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>The following are the latest Terms and Conditions of AF Home.</Text>
          </View>

          {/* Section 1 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>1. Independent Distributor Agreement</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              By becoming a distributor of our company, you agree to be bound by the terms and conditions outlined in this agreement. You acknowledge that you are an independent contractor and not an employee, partner, or agent of the company.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>2. Distributor Obligations</Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginBottom: 8 }]}>As a distributor, you agree to perform the following obligations:</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Adhere to all applicable laws, regulations, and ethical guidelines in promoting and selling our products/services.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Represent the company and its products/services honestly and accurately.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Maintain a positive and professional image and avoid any activities that may damage the reputation of the company.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Attend and participate in training and development programs provided by the company.</Text>
              </View>
            </View>
          </View>

          {/* Section 3 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>3. Compensation Plan</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Our company uses a compensation plan that rewards distributors for sales and building a network. The details of the compensation plan, including commission structure, bonus eligibility, and qualification criteria, are outlined in a separate document, which is an integral part of these terms and conditions.
            </Text>
          </View>

          {/* Section 4 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>4. Product Purchase Requirements</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              To remain an active distributor and qualify for commissions and bonuses, you are required to meet monthly or quarterly product purchase requirements. These requirements may include personal consumption and/or retail sales requirements. Failure to meet these requirements may result in the loss of commissions and bonuses.
            </Text>
          </View>

          {/* Section 5 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>5. Downline Structure</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              You may build and manage a network of distributors, commonly referred to as your "downline." You understand that your commissions and bonuses may be based on the sales performance and activities of your downline. However, you are responsible for training, supporting, and motivating your downline members.
            </Text>
          </View>

          {/* Section 6 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>6. Termination and Resignation</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Either party may terminate this agreement at any time with written notice. You understand that in the event of termination or resignation, you will no longer be eligible to receive commissions, bonuses, or other benefits associated with the MLM business.
            </Text>
          </View>

          {/* Section 7 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>7. Intellectual Property</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              All trademarks, logos, copyrighted materials, and other intellectual property owned by the company are protected and may not be used without written permission. Any unauthorized use of company intellectual property may result in legal action.
            </Text>
          </View>

          {/* Section 8 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>8. Non-Disparagement</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              During and after the term of this agreement, you agree not to make any disparaging or defamatory statements about the company, its products, or other distributors. Violation of this clause may result in termination and legal consequences.
            </Text>
          </View>

          {/* Section 9 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>9. Product Returns and Refunds</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Our company has a product return policy that allows customers to request refunds or exchanges within a specified time frame. You understand that you are responsible for handling customer returns and refunds, and any costs associated with the process.
            </Text>
          </View>

          {/* Section 10 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>10. Governing Law and Jurisdiction</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              This agreement shall be governed by and construed in accordance with the laws of the Philippines. Any disputes arising from this agreement shall be subject to the exclusive jurisdiction of the courts of the Philippines.
            </Text>
          </View>

          {/* Acknowledgment */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              By signing below or by accepting these terms and conditions electronically, you acknowledge that you have read, understood, and agreed to abide by the terms and conditions of AF Home.
            </Text>
          </View>

          {/* Contact */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.contactHeading, { color: colors.text }]}>Need clarification?</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Reach us anytime through the Contact Us page.
            </Text>
          </View>
        </ScrollView>
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
  taglineContainer: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  section: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  introHeading: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
  },
  contactHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  bulletList: {
    gap: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    gap: 8,
  },
  bullet: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -2,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
    flex: 1,
  },
});
