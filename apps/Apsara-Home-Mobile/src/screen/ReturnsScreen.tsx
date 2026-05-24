import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface ReturnsScreenProps {
  onBack: () => void;
  isDarkMode: boolean;
}

export default function ReturnsScreen({ onBack, isDarkMode }: ReturnsScreenProps) {
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
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Return & Refund</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={[styles.scroll, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tagline */}
          <View style={[styles.taglineContainer, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.tagline, { color: colors.text }]}>Return & Refund</Text>
            <Text style={[styles.subtitle, { color: colors.textSec }]}>We want you to feel confident about your purchase.</Text>
          </View>

          {/* Overview */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              At AF Home, we are committed to providing our customers with high-quality products and exceptional service. We understand that sometimes a purchase may not meet your expectations. This Return and Refund Policy outlines the terms and conditions under which returns and refunds are accepted.
            </Text>
          </View>

          {/* Return Eligibility */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Return Eligibility</Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginBottom: 8 }]}>
              To be eligible for a return, the following conditions must be met:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Timeframe: You have 7 days from the date of purchase to initiate a return.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Condition: Items must be unused, in their original packaging, and in the same condition as received. All tags and labels must be intact.</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Proof of Purchase: A receipt or proof of purchase is required to process your return.</Text>
              </View>
            </View>
          </View>

          {/* Return Process */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Return Process</Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginBottom: 8 }]}>
              To initiate a return, please follow these steps:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletNumber, { color: colors.text }]}>1.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bulletNumberLabel, { color: colors.text }]}>Contact Us</Text>
                  <Text style={[styles.bulletText, { color: colors.textSec }]}>Reach out to our customer service team at info@afhome.biz or call 02-840 0290 to request a Return Merchandise Authorization (RMA) number. Please provide your order number and the reason for the return.</Text>
                </View>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletNumber, { color: colors.text }]}>2.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bulletNumberLabel, { color: colors.text }]}>Packaging</Text>
                  <Text style={[styles.bulletText, { color: colors.textSec }]}>Securely package the item(s) you wish to return, including all original packaging materials, accessories, and documentation.</Text>
                </View>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletNumber, { color: colors.text }]}>3.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bulletNumberLabel, { color: colors.text }]}>Shipping</Text>
                  <Text style={[styles.bulletText, { color: colors.textSec }]}>Ship the item(s) to the address provided by our customer service team. You are responsible for the return shipping costs unless the return is due to a defective or incorrect item.</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Refund Process */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Refund Process</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletNumber, { color: colors.text }]}>1.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bulletNumberLabel, { color: colors.text }]}>Inspection</Text>
                  <Text style={[styles.bulletText, { color: colors.textSec }]}>Upon receiving your returned item, we will inspect it to ensure it meets our return criteria.</Text>
                </View>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletNumber, { color: colors.text }]}>2.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bulletNumberLabel, { color: colors.text }]}>Refund Approval</Text>
                  <Text style={[styles.bulletText, { color: colors.textSec }]}>If your return is approved, we will process your refund within 7 to 10 business days. The refund will be issued to the original payment method used at the time of purchase.</Text>
                </View>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletNumber, { color: colors.text }]}>3.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bulletNumberLabel, { color: colors.text }]}>Notification</Text>
                  <Text style={[styles.bulletText, { color: colors.textSec }]}>You will receive an email notification confirming the status of your refund.</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Exchanges */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Exchanges</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              If you wish to exchange an item for a different size, color, or model, please contact our customer service team. Exchanges are subject to availability, and you may need to return the original item before the new item is shipped.
            </Text>
          </View>

          {/* Non-Returnable Items */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Non-Returnable Items</Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginBottom: 8 }]}>
              Certain items are non-returnable, including but not limited to:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Gift cards</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Downloadable software products</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Personal care items (e.g., cosmetics, hygiene products)</Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.textSec }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSec }]}>Items marked as final sale</Text>
              </View>
            </View>
          </View>

          {/* Damaged or Defective Items */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Damaged or Defective Items</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              If you receive a damaged or defective item, please contact us within 7 days of receipt. We will provide instructions for returning the item and will cover the return shipping costs for defective items.
            </Text>
          </View>

          {/* Customer Service */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Customer Service</Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginBottom: 12 }]}>
              For any questions or concerns regarding our Return and Refund Policy, please contact our customer service team at info@afhome.biz or call 02-840 0290. We are here to assist you and ensure your satisfaction.
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Thank you for choosing AF Home. We appreciate your business!
            </Text>
          </View>

          {/* Help Section */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.bodyText, { color: colors.textSec, textAlign: 'center', fontWeight: '500' }]}>
              Need help with a return? Reach us anytime through the Contact Us page.
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
    gap: 12,
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
  bulletNumber: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -2,
    minWidth: 20,
  },
  bulletNumberLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
    flex: 1,
  },
});
