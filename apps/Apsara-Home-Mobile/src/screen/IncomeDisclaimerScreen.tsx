import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface IncomeDisclaimerScreenProps {
  onBack: () => void;
  isDarkMode: boolean;
}

export default function IncomeDisclaimerScreen({ onBack, isDarkMode }: IncomeDisclaimerScreenProps) {
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
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Income Disclaimer</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={[styles.scroll, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tagline */}
          <View style={[styles.taglineContainer, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.tagline, { color: colors.text }]}>Income Disclaimer</Text>
            <Text style={[styles.subtitle, { color: colors.textSec }]}>Know what to expect. Transparent expectations before you commit.</Text>
          </View>

          {/* Overview */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Overview</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              We provide the following income disclaimer to ensure transparency and set realistic expectations for individuals considering joining our multi-level marketing opportunity.
            </Text>
          </View>

          {/* Section 1 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Earning Potential Varies</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Earning potential in this business is highly individual and can vary greatly based on factors including, but not limited to, effort, dedication, skills, market conditions, and the amount of time invested.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>No Typical or Guaranteed Results</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              While some individuals may achieve significant financial success in our Income opportunity, it is important to note that these results are not typical or guaranteed. Most participants in MLM businesses do not earn substantial incomes and may even experience financial losses.
            </Text>
          </View>

          {/* Section 3 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Success Requires Work</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              It is essential to understand that success in this business requires hard work, persistence, and building a strong network of customers and recruits. It is unrealistic to expect immediate or effortless financial gains.
            </Text>
          </View>

          {/* Section 4 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Evaluate Risks and Rewards</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              We strongly advise individuals to carefully evaluate the risks, expenses, and potential rewards associated with MLM businesses before making any financial commitments. Seek advice from reputable financial professionals to assess whether an MLM opportunity aligns with your personal goals and circumstances.
            </Text>
          </View>

          {/* Section 5 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>No Unofficial Income Claims</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Lastly, we do not endorse any income claims made by our distributors or representatives that deviate from our official sales and compensation materials. Such claims are not representative of what the majority of participants can expect to achieve.
            </Text>
          </View>

          {/* Section 6 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Your Responsibility</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              By joining our AF Home you acknowledge that your results may vary, and you assume full responsibility for your financial success or lack thereof.
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
