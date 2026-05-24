import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface RewardsAndCommissionsScreenProps {
  onBack: () => void;
  isDarkMode: boolean;
}

export default function RewardsAndCommissionsScreen({ onBack, isDarkMode }: RewardsAndCommissionsScreenProps) {
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
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Rewards and Commissions</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={[styles.scroll, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tagline */}
          <View style={[styles.taglineContainer, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.tagline, { color: colors.text }]}>Rewards and Commissions</Text>
            <Text style={[styles.subtitle, { color: colors.textSec }]}>Learn how rewards are earned, tracked, and distributed. We keep it transparent so you can plan with confidence.</Text>
          </View>

          {/* Introduction */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Transparent Expectations</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              At AF Home, we understand the importance of transparency and clarity when it comes to network marketing rewards and commissions. We want to ensure that all our valued distributors and partners have a comprehensive understanding of how our compensation plan works. Therefore, we have prepared the following disclaimers to provide you with important information:
            </Text>
          </View>

          {/* Section 1 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Earnings Disclaimer</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Any statements or examples of earnings mentioned in our marketing materials or presentations are not guarantees of income. The success and income potential of each individual distributor may vary based on their skills, efforts, and market conditions. We encourage you to set realistic expectations and understand that building a successful network marketing business requires time, dedication, and hard work.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>No Income Guarantee</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              We do not guarantee any level of income or financial success to our distributors. The amount of income you can earn will depend on various factors, including your personal efforts, the size and productivity of your network, and market conditions. It is important to note that success in network marketing is not guaranteed and individual results may vary.
            </Text>
          </View>

          {/* Section 3 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Compliance with Laws and Regulations</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              As a distributor, it is your responsibility to comply with all applicable laws and regulations governing network marketing and direct selling in your country or region. This includes but is not limited to adhering to advertising guidelines, accurately representing our products and business opportunity, and avoiding any misleading or deceptive practices.
            </Text>
          </View>

          {/* Section 4 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Investment Risk</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Participating in network marketing involves certain risks, including the risk of financial loss. It is important to carefully evaluate the opportunity and consider your personal financial situation before making any investment. We recommend consulting with a financial advisor or professional to assess the risks and suitability of network marketing as a business opportunity for you.
            </Text>
          </View>

          {/* Section 5 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Independent Contractor Status</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              As a distributor, you are an independent contractor and not an employee, partner, or franchisee of Value Max. You have the freedom to operate your business according to your own schedule and methods, but you are also responsible for your own expenses, taxes, and legal compliance.
            </Text>
          </View>

          {/* Section 6 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Changes to the Compensation Plan</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              We reserve the right to modify or update our compensation plan at any time to ensure its fairness, sustainability, and compliance with legal requirements. Any changes will be communicated to our distributors in a timely manner.
            </Text>
          </View>

          {/* Section 7 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Support and Clarity</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Please take the time to read and understand these disclaimers. If you have any questions or concerns regarding our network marketing rewards and commissions, please reach out to our support team for further clarification. We are here to support you on your journey to success.
            </Text>
          </View>

          {/* Contact */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.contactHeading, { color: colors.text }]}>Questions about commissions?</Text>
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
});
