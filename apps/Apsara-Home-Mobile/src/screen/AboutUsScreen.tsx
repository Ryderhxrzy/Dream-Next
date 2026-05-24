import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface AboutUsScreenProps {
  onBack: () => void;
  isDarkMode: boolean;
}

export default function AboutUsScreen({ onBack, isDarkMode }: AboutUsScreenProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = React.useRef(new Animated.Value(100)).current;

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
    cardBg: isDarkMode ? '#1e293b' : '#f8fafc',
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
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>About Us</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={[styles.scroll, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Main Tagline */}
          <View style={[styles.taglineContainer, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.tagline, { color: colors.text }]}>
              Crafted living – modern design, timeless quality.
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSec }]}>
              AF Home • Crafted living
            </Text>
          </View>

          {/* Main Description */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Designing Spaces for Everyday Joy</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Furniture and home essentials built for comfort, honest materials, and lasting quality—so your home stays beautiful for years!
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginTop: 12 }]}>
              We create furniture and home essentials that balance form, comfort, and lasting quality. Thoughtful details, reliable construction, and a service mindset you can feel.
            </Text>
          </View>

          {/* About AF Home */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>About AF Home</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Welcome to AF Home—your destination for quality furniture made in the Philippines. Our mission is simple: deliver comfort and style to every living space.
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginTop: 12 }]}>
              Your home is a sanctuary. We curate a diverse range of pieces—from cozy sofas to sturdy dining tables—to match every taste and lifestyle.
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSec, marginTop: 12 }]}>
              Each item is crafted with precision using premium materials, ensuring durability and a timeless look that becomes part of your story.
            </Text>
          </View>

          {/* Beyond Furniture */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Beyond Furniture</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              We also offer a curated selection of home appliances to simplify daily life. Our team is always ready to help you find the perfect fit for your vision.
            </Text>

            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.sky} />
                <Text style={[styles.featureText, { color: colors.text }]}>Curated selection</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.sky} />
                <Text style={[styles.featureText, { color: colors.text }]}>Trusted materials</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.sky} />
                <Text style={[styles.featureText, { color: colors.text }]}>Friendly support</Text>
              </View>
            </View>

            <Text style={[styles.bodyText, { color: colors.textSec, marginTop: 12, fontStyle: 'italic' }]}>
              Join the AF Home family and transform your house into a place you'll love coming home to.
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: Colors.sky }]}>12+</Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>Years</Text>
              <Text style={[styles.statDesc, { color: colors.textSec }]}>Designing homes with purpose</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: Colors.sky }]}>100k+</Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>Customers</Text>
              <Text style={[styles.statDesc, { color: colors.textSec }]}>Happy customers nationwide</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: Colors.sky }]}>4.9/5</Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>Satisfaction</Text>
              <Text style={[styles.statDesc, { color: colors.textSec }]}>Average customer satisfaction</Text>
            </View>
          </View>

          {/* Values */}
          <View>
            <Text style={[styles.valuesTitle, { color: colors.text }]}>Our Values</Text>
            <Text style={[styles.valuesSubtitle, { color: colors.textSec }]}>The principles behind every product we design, craft, and deliver.</Text>

            <View style={[styles.valueCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
              <View style={styles.valueHeader}>
                <View style={[styles.valueIcon, { backgroundColor: isDarkMode ? '#1e293b' : '#f0f9ff' }]}>
                  <Ionicons name="star" size={24} color={Colors.sky} />
                </View>
                <Text style={[styles.valueTitle, { color: colors.text }]}>QUALITY</Text>
              </View>
              <Text style={[styles.valueSubtitle, { color: colors.textSec }]}>Materials that last</Text>
              <Text style={[styles.valueDesc, { color: colors.textSec }]}>
                Solid construction, reliable finishes, and testing standards that keep your home looking great over time.
              </Text>
            </View>

            <View style={[styles.valueCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
              <View style={styles.valueHeader}>
                <View style={[styles.valueIcon, { backgroundColor: isDarkMode ? '#1e293b' : '#f0f9ff' }]}>
                  <Ionicons name="color-palette" size={24} color={Colors.sky} />
                </View>
                <Text style={[styles.valueTitle, { color: colors.text }]}>DESIGN</Text>
              </View>
              <Text style={[styles.valueSubtitle, { color: colors.textSec }]}>Modern, warm, livable</Text>
              <Text style={[styles.valueDesc, { color: colors.textSec }]}>
                Balanced silhouettes and curated tones that elevate the space without overwhelming it.
              </Text>
            </View>

            <View style={[styles.valueCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
              <View style={styles.valueHeader}>
                <View style={[styles.valueIcon, { backgroundColor: isDarkMode ? '#1e293b' : '#f0f9ff' }]}>
                  <Ionicons name="heart" size={24} color={Colors.sky} />
                </View>
                <Text style={[styles.valueTitle, { color: colors.text }]}>CARE</Text>
              </View>
              <Text style={[styles.valueSubtitle, { color: colors.textSec }]}>People‑first service</Text>
              <Text style={[styles.valueDesc, { color: colors.textSec }]}>
                From choosing the right piece to post‑delivery support, we're here to help you feel at home.
              </Text>
            </View>
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
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  tagline: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
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
    gap: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  featureList: {
    marginTop: 12,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsContainer: {
    gap: 12,
  },
  statCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  statDesc: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  valuesTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  valuesSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    paddingHorizontal: 8,
    lineHeight: 18,
  },
  valueCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  valueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  valueIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  valueSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  valueDesc: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },
});
