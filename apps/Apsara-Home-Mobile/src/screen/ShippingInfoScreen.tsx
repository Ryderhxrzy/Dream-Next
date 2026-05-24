import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface ShippingInfoScreenProps {
  onBack: () => void;
  isDarkMode: boolean;
}

export default function ShippingInfoScreen({ onBack, isDarkMode }: ShippingInfoScreenProps) {
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
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Shipping Info</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={[styles.scroll, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tagline */}
          <View style={[styles.taglineContainer, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.tagline, { color: colors.text }]}>Shipping Info</Text>
            <Text style={[styles.subtitle, { color: colors.textSec }]}>Everything you need to know about how we deliver your order.</Text>
          </View>

          {/* Intro */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Delivery coverage, fees, processing time, tracking, and what to do if something goes wrong.
            </Text>
          </View>

          {/* Delivery Coverage */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Delivery Coverage</Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginBottom: 8 }]}>
              AF Home delivers nationwide across the Philippines. Delivery timeframes vary by location:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Metro Manila — 3 to 5 business days</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Luzon (outside Metro Manila) — 5 to 7 business days</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Visayas & Mindanao — 7 to 14 business days</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Remote areas — may take longer; our team will contact you to confirm</Text>
              </View>
            </View>
            <Text style={[styles.bodyText, { color: colors.textSec, marginTop: 8 }]}>
              Business days are Monday through Saturday, excluding public holidays.
            </Text>
          </View>

          {/* Shipping Fees */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Shipping Fees</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Shipping fees are calculated at checkout based on the delivery address and the total weight or dimensions of your order. We partner with trusted couriers to ensure your items arrive safely and on time.
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginTop: 8 }]}>
              Free shipping promotions may be available during special sale events. Watch our announcements for updates.
            </Text>
          </View>

          {/* Order Processing */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Order Processing</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Orders are processed within 1 to 2 business days after payment confirmation. You will receive a confirmation email with your order details once processing begins.
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginTop: 8 }]}>
              Orders placed on weekends or public holidays will be processed on the next business day.
            </Text>
          </View>

          {/* Tracking Your Order */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Tracking Your Order</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Once your order has been shipped, you will receive a tracking number via email or SMS. You can use this number to monitor your delivery status through our Track Order page or directly on the courier's website.
            </Text>
          </View>

          {/* Large Item Delivery */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Large Item Delivery</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              For bulky furniture and appliances, delivery is handled by our in-house logistics team or specialized freight partners. Our team will coordinate a delivery schedule with you after your order is confirmed.
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginTop: 8 }]}>
              Please ensure someone is available at the delivery address to receive and inspect the items upon arrival.
            </Text>
          </View>

          {/* Damaged or Lost Shipments */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Damaged or Lost Shipments</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              If your order arrives damaged or does not arrive within the expected timeframe, please contact us immediately at info@afhome.biz or call 02-840 0290. We will coordinate with the courier and resolve the issue as quickly as possible.
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
