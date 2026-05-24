import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface PrivacyPolicyScreenProps {
  onBack: () => void;
  isDarkMode: boolean;
}

export default function PrivacyPolicyScreen({ onBack, isDarkMode }: PrivacyPolicyScreenProps) {
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
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Privacy Policy</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={[styles.scroll, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tagline */}
          <View style={[styles.taglineContainer, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.tagline, { color: colors.text }]}>Privacy Policy</Text>
            <Text style={[styles.subtitle, { color: colors.textSec }]}>Data privacy, made clear.</Text>
          </View>

          {/* Introduction */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              We care about how your data is handled. This policy explains what we collect, why we collect it, and how you can manage your information.
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginTop: 12 }]}>
              We, AF HOME, value the privacy and security of our customers and distributors. This privacy policy explains how we collect, use, and safeguard personal data in the course of our Business.
            </Text>
          </View>

          {/* Section 1 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>1. Personal Information We Collect</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>We may collect the following types of personal information:</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Name, contact information (address, email address, phone number)</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Date of birth, gender, and other demographic information</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Payment and financial information</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Social media profiles and online presence information</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Information related to product purchases and order history</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Information you provide during the enrollment or registration process</Text>
              </View>
            </View>
          </View>

          {/* Section 2 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>2. How We Use Personal Information</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>We use personal information for the following purposes:</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>To process product orders, enrollments, and registrations</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>To communicate with customers and distributors regarding product updates, promotions, and business-related matters</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>To provide customer support and assistance</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>To fulfill contractual obligations and administer the compensation plan</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>To conduct market research and improve our products and services</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>For legal and regulatory compliance purposes</Text>
              </View>
            </View>
          </View>

          {/* Section 3 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>3. Sharing Personal Information</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>We may share personal information with third parties in the following circumstances:</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>With service providers, contractors, and vendors who assist us in delivering our products and services. These third parties are bound by confidentiality obligations and are not permitted to use personal information for any other purposes.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>With our affiliates, subsidiaries, or parent company for business and administrative purposes.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>With regulatory authorities, law enforcement agencies, or other governmental bodies to comply with legal obligations, and court orders, or enforce our rights and protect the safety, rights, and property of our customers and distributors.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>In the event of a merger, acquisition, or sale of all or a portion of our business, personal information may be transferred to the acquiring entity as part of the transaction.</Text>
              </View>
            </View>
          </View>

          {/* Section 4 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>4. Data Security and Retention</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              We implement reasonable security measures to protect personal information from unauthorized access, use, or disclosure. However, please be aware that no data transmission over the Internet or electronic storage system is completely secure. We retain personal information as long as necessary to fulfill the purposes outlined in this privacy policy, or as required by applicable laws and regulations.
            </Text>
          </View>

          {/* Section 5 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>5. Your Privacy Rights</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              You have the right to access, correct, and update your personal information held by us. You may also request the deletion or restriction of your personal information, subject to legal obligations and our legitimate business interests. To exercise your privacy rights or for any privacy-related inquiries, please contact us using the contact information provided below.
            </Text>
          </View>

          {/* Section 6 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>6. Changes to the Privacy Policy</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              We reserve the right to update and modify this privacy policy at any time. Any changes will be posted on our website, and we encourage you to review this policy regularly.
            </Text>
          </View>

          {/* Section 7 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>7. Contact Us</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              If you have any questions, concerns, or requests regarding this privacy policy or our data practices, please contact us at
            </Text>
            <Text style={[styles.contactEmail, { color: Colors.sky }]}>info@afhome.biz</Text>
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
  },
  section: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  bulletList: {
    gap: 8,
    marginTop: 4,
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
  contactEmail: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
});
