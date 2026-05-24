import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface CookiePolicyScreenProps {
  onBack: () => void;
  isDarkMode: boolean;
}

export default function CookiePolicyScreen({ onBack, isDarkMode }: CookiePolicyScreenProps) {
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
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Cookie Policy</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={[styles.scroll, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tagline */}
          <View style={[styles.taglineContainer, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.tagline, { color: colors.text }]}>Cookie Policy</Text>
            <Text style={[styles.subtitle, { color: colors.textSec }]}>This policy explains how cookies help improve your browsing experience and how you can control them.</Text>
          </View>

          {/* Introduction */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              This policy explains how cookies are used on AF Home and how you can control them.
            </Text>
          </View>

          {/* Section 1 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>1. What Are Cookies?</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Cookies are small text files that are used to store small pieces of information. They are stored on your device when the website is loaded on your browser. These cookies help us make the website function properly, make it more secure, provide better user experience, and understand how the website performs and to analyze what works and where it needs improvement.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>2. How AF Home Uses Cookies</Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginBottom: 8 }]}>
              When you use and access the Service, we may place a number of cookies files in your web browser.
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginBottom: 8 }]}>
              We use cookies for the following purposes:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Essential Cookies: We use cookies to remember information that changes the way the Service behaves or looks, such as a user's language preference on the Service.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Account-Related Cookies: We use cookies to manage the signup process and general administration. These cookies will usually be deleted when you log out; however, in some cases, they may remain afterward to remember your site preferences when logged out.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Analytics Cookies: We use cookies to help us analyze how our visitors use the website and to monitor website performance. This helps us provide a high-quality experience by customizing our offering and quickly identifying and fixing any issues that arise.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Advertising Cookies: We may use cookies to deliver advertisements that are relevant to you and your interests.</Text>
              </View>
            </View>
          </View>

          {/* Section 3 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>3. Third-Party Cookies</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the Service and deliver advertisements on and through the Service. These third-party cookies are governed by the respective privacy policies of these third parties.
            </Text>
          </View>

          {/* Section 4 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>4. Your Choices Regarding Cookies</Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginBottom: 8 }]}>
              If you prefer to avoid the use of cookies on the website, you must first disable the use of cookies in your browser and then delete the cookies saved in your browser associated with this website. You may use this option for preventing the use of cookies at any time.
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Browser Settings: Most web browsers allow you to control cookies through their settings preferences. To find out more about cookies, including how to see what cookies have been set and how to manage and delete them, visit www.allaboutcookies.org or www.youronlinechoices.com.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Opt-Out: You can opt-out of targeted advertising by visiting the following links: Network Advertising Initiative and Digital Advertising Alliance.</Text>
              </View>
            </View>
          </View>

          {/* Section 5 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>5. Changes to This Cookie Policy</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              We may update our Cookie Policy from time to time. We will notify you of any changes by posting the new Cookie Policy on this page. You are advised to review this Cookie Policy periodically for any changes. Changes to this Cookie Policy are effective when they are posted on this page.
            </Text>
          </View>

          {/* Section 6 */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>6. Contact Us</Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginBottom: 8 }]}>
              If you have any questions about our Cookie Policy, please contact us:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Email: info@afhome.biz</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Address: AF Home Head Office, Meycauayan, Bulacan</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.bodyText, { color: colors.textSec, textAlign: 'center', fontStyle: 'italic' }]}>
              Thank you for visiting AF Home!
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSec, textAlign: 'center' }]}>
              You can update cookie preferences anytime using your browser settings.
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
