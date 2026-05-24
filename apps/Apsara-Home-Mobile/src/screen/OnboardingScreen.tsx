import React, { useRef, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Slide {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  eyebrow: string;
  titlePlain: string;
  titleAccent: string;
  subtitle: string;
  badge?: string;
  bulletPoints?: string[];
  cards?: {
    number: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
  }[];
}

const SLIDES: Slide[] = [
  {
    key: '1',
    icon: 'home-outline',
    iconColor: Colors.sky,
    iconBg: '#e0f2fe',
    eyebrow: 'Welcome to AF Home',
    titlePlain: 'Earn From Home.\nBuild a Team.\n',
    titleAccent: 'Upgrade Lives.',
    subtitle: 'AF Home is a home and lifestyle affiliate ecosystem where you earn commissions, enjoy lifetime discounts, and grow with a community.',
    badge: 'No inventory. No capital. Just real products, real earnings.',
  },
  {
    key: '2',
    icon: 'home-outline',
    iconColor: Colors.sky,
    iconBg: '#e0f2fe',
    eyebrow: 'SIMPLE PROCESS',
    titlePlain: 'How It ',
    titleAccent: 'Works',
    subtitle: 'Start earning in 3 easy steps - no experience needed.',
    cards: [
      {
        number: '01',
        icon: 'person-add-outline',
        title: 'Register for Free',
        description: 'Sign up as an AF Home affiliate in minutes. No fees, no inventory, no capital required.',
      },
      {
        number: '02',
        icon: 'share-social-outline',
        title: 'Share Products',
        description: 'Get your unique affiliate link. Share AF Home products to your family, friends, and social media followers.',
      },
      {
        number: '03',
        icon: 'wallet-outline',
        title: 'Earn & Enjoy',
        description: 'Collect commissions on every successful sale. Plus, enjoy lifetime discounts on all AF Home products for yourself.',
      },
    ],
  },
  {
    key: '3',
    icon: 'people-outline',
    iconColor: Colors.sky,
    iconBg: '#e0f2fe',
    eyebrow: 'ONE ECOSYSTEM',
    titlePlain: 'One Ecosystem.\nMany Trusted ',
    titleAccent: 'Home Brands.',
    subtitle: 'AF Home brings together furniture, home essentials, and interior solutions under one affiliate-friendly platform, giving you more ways to earn.',
  },
  {
    key: '4',
    icon: 'person-outline',
    iconColor: Colors.sky,
    iconBg: '#e0f2fe',
    eyebrow: 'WHO THIS IS FOR',
    titlePlain: 'This Is for You ',
    titleAccent: 'If...',
    subtitle: 'Whether you\'re looking for a side hustle or a full-time career, AF Home gives you the platform to succeed on your own terms.',
    bulletPoints: [
      'You want to earn without stocking products',
      'You create content on social media',
      'You help people find home solutions',
      'You want extra income or a scalable business',
      'You believe homes should be better, not more expensive'
    ],
  },
];

interface OnboardingScreenProps {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      onDone();
    }
  };

  
  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top image */}
        {item.key === '1' && (
          <Image
            source={require('../../assets/on-boarding/earn_from_home.png')}
            style={styles.slideImage}
            resizeMode="contain"
          />
        )}
        {item.key === '2' && (
          <Image
            source={require('../../assets/on-boarding/how_it_works.png')}
            style={styles.slideImage}
            resizeMode="contain"
          />
        )}
        {item.key === '3' && (
          <Image
            source={require('../../assets/on-boarding/one_eco_system.png')}
            style={styles.slideImage}
            resizeMode="contain"
          />
        )}
        {item.key === '4' && (
          <Image
            source={require('../../assets/on-boarding/this_is_for_you_if.png')}
            style={styles.slideImage}
            resizeMode="contain"
          />
        )}


        {/* Title */}
        <Text style={styles.title}>
          {item.titlePlain}
          <Text style={[styles.titleAccent, { color: item.iconColor }]}>{item.titleAccent}</Text>
        </Text>

        {/* Subtitle for non-fourth pages */}
        {item.key !== '4' && (
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        )}

        {/* Badge */}
        {item.badge && item.key !== '4' && (
          <View style={[styles.badge, { 
            backgroundColor: item.iconBg + '30',
            borderColor: item.iconColor + '60'
          }]}>
            <Text style={[styles.badgeText, { color: item.iconColor }]}>{item.badge}</Text>
          </View>
        )}

        {/* Bullet points for fourth page */}
        {item.bulletPoints && (
          <View style={styles.bulletPointsContainer}>
            {item.bulletPoints.map((point, index) => {
              let iconName: keyof typeof Ionicons.glyphMap = 'checkmark-circle';
              
              // Set icon based on content
              if (point.includes('earn without stocking')) {
                iconName = 'wallet-outline';
              } else if (point.includes('content on social media')) {
                iconName = 'camera-outline';
              } else if (point.includes('help people find home')) {
                iconName = 'home-outline';
              } else if (point.includes('extra income')) {
                iconName = 'trending-up-outline';
              } else if (point.includes('homes should be better')) {
                iconName = 'heart-outline';
              }
              
              return (
                <View key={index} style={styles.bulletPoint}>
                  <View style={[styles.iconContainer, { 
                    backgroundColor: item.iconBg + '20',
                    borderColor: item.iconColor + '30'
                  }]}>
                    <Ionicons 
                      name={iconName} 
                      size={18} 
                      color={item.iconColor} 
                    />
                  </View>
                  <Text style={styles.bulletText}>{point}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Subtitle for fourth page (moved to bottom) */}
        {item.key === '4' && (
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        )}

        
        {/* Trusted by top brands section for third page */}
        {item.key === '3' && (
          <View style={styles.brandsSection}>
            <Text style={styles.brandsTitle}>TRUSTED BY TOP BRANDS</Text>
            <View style={styles.brandsGrid}>
              <View style={styles.brandItem}>
                <Image
                  source={require('../../assets/on-boarding/affordahome.png')}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.brandItem}>
                <Image
                  source={require('../../assets/on-boarding/airpro.png')}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.brandItem}>
                <Image
                  source={require('../../assets/on-boarding/furnigo.png')}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.brandItem}>
                <Image
                  source={require('../../assets/on-boarding/sunnyware.png')}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.brandItem}>
                <Image
                  source={require('../../assets/on-boarding/xiaomi.png')}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.brandItem}>
                <Image
                  source={require('../../assets/on-boarding/zooey.png')}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        )}

        {/* Cards for second slide */}
        {item.cards && (
          <View style={styles.cardsWrapper}>
            {item.cards.map((card, index) => (
              <View key={index} style={styles.stepRow}>
                {/* Step number */}
                <Text style={styles.stepNumber}>{card.number}</Text>
                
                {/* Step content */}
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{card.title}</Text>
                  <Text style={styles.stepDescription}>{card.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Background circle for all slides */}
      {(activeIndex === 0 || activeIndex === 1 || activeIndex === 2 || activeIndex === 3) && (
        <View style={[styles.backgroundCircle, { backgroundColor: SLIDES[activeIndex].iconBg }]} />
      )}
      
      <SafeAreaView style={styles.safeArea}>
        {/* Skip */}
        {!isLast && (
          <TouchableOpacity style={styles.skipBtn} onPress={onDone} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={s => s.key}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.list}
      />
      </SafeAreaView>

      {/* Bottom: dots and next button */}
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                activeIndex === i && styles.dotActive,
                activeIndex === i && { backgroundColor: SLIDES[i].iconColor },
              ]}
            />
          ))}
        </View>
        
        <TouchableOpacity 
          style={[styles.nextBtn, { backgroundColor: SLIDES[activeIndex].iconColor }]} 
          onPress={goNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextBtnText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  backgroundCircle: {
    position: 'absolute',
    width: SCREEN_WIDTH * 2,
    height: SCREEN_WIDTH * 2,
    borderRadius: SCREEN_WIDTH,
    top: -SCREEN_WIDTH * 0.8,
    left: -SCREEN_WIDTH * 0.5,
    opacity: 0.5,
  },
  safeArea: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 32,
    gap: 16,
  },
  imageContainer: {
    width: SCREEN_WIDTH - 56,
    height: 220,
    position: 'relative',
  },
  slideImage: {
    width: SCREEN_WIDTH - 56,
    height: 220,
  },
  titleOverCircle: {
    position: 'absolute',
    bottom: 40,
    left: 28,
    right: 28,
    fontSize: 36,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 42,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  titleAccentOverCircle: {
    fontStyle: 'italic',
  },
  eyebrow: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: Colors.text,
    lineHeight: 44,
    textAlign: 'center',
  },
  titleAccent: {
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 19,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 27,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardsWrapper: {
    width: '100%',
    gap: 16,
    marginTop: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: '#e0f2fe',
    borderRadius: 16,
    padding: SCREEN_WIDTH < 375 ? 12 : 14,
    gap: 12,
  },
  stepNumber: {
    fontSize: SCREEN_WIDTH < 375 ? 18 : 20,
    fontWeight: '900',
    color: Colors.sky,
    alignSelf: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: SCREEN_WIDTH < 375 ? 15 : 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: SCREEN_WIDTH < 375 ? 12 : 13,
    color: Colors.textSecondary,
    lineHeight: SCREEN_WIDTH < 375 ? 16 : 18,
  },
  brandsSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  brandsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  brandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
  },
  brandItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '30%',
    aspectRatio: 2,
  },
  brandLogo: {
    width: '100%',
    height: '100%',
    maxWidth: 120,
    maxHeight: 60,
  },
  bulletPointsContainer: {
    width: '100%',
    marginTop: 8,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    maxWidth: 320,
    width: '100%',
  },
  bulletIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  bottom: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    paddingTop: 16,
    gap: 20,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  dotActive: {
    width: 24,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 30,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  nextBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  nextBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  btnText: {
    color: Colors.white,
    fontSize: 19,
    fontWeight: '800',
  },
});
