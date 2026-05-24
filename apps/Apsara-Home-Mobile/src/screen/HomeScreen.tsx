
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Animated,
  Dimensions, NativeSyntheticEvent, NativeScrollEvent, FlatList, Pressable, RefreshControl, Platform, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Colors } from '../constants/colors';
import { authService, BrandItem, CategoryItem } from '../services/authService';
import { productService } from '../services/productService';
import { getBadgeImageSource } from '../constants/tierConfig';
import type { ProductCard } from '../services/productService';
import { API_CONFIG } from '../config/api';
import ItemCard from '../components/Items/ItemCard';
import Toast from 'react-native-toast-message';
import {
  HomeScreenSkeleton,
  BannerSkeleton,
  SectionHeaderSkeleton,
  RoomGridSkeleton,
  CategoryRowSkeleton,
  BrandCardSkeleton
} from '../components/SkeletonLoader/SkeletonLoader';
import { usePrefetchProducts } from '../hooks/usePrefetchProducts';
import { useRecommendations } from '../hooks/useRecommendations';
import { ChatBotIcon } from '../components/ChatBot';

interface HomeScreenProps {
  token?: string | null;
  user?: {
    name?: string;
    avatar_url?: string;
    badge_name?: string;
    badge_image?: string | any;
    monthly_activation?: {
      remaining_pv: number;
    };
  } | null;
  isDarkMode?: boolean;
  onProductPress?: (id: number) => void;
  onCartPress?: () => void;
  onReferralPress?: () => void;
  categories?: CategoryItem[];
  setCategories?: (categories: CategoryItem[]) => void;
  brands?: BrandItem[];
  setBrands?: (brands: BrandItem[]) => void;
  featuredProducts?: ProductCard[];
  setFeaturedProducts?: (products: ProductCard[]) => void;
  roomTypes?: RoomType[];
  setRoomTypes?: (rooms: RoomType[]) => void;
  loadingFeatured?: boolean;
  setLoadingFeatured?: (loading: boolean) => void;
  dataFetchedRef?: React.MutableRefObject<boolean>;
  wishlistItems?: any[];
  onWishlistChange?: () => void;
  onShopByRoomPress?: (roomId: number) => void;
  onShopByCategoryPress?: (categoryId: number) => void;
  onShopByBrandPress?: (brandId: number) => void;
}

interface RoomType {
  room_id: number;
  room_name: string;
  images: string[];
  count: number;
}

const FALLBACK_ROOMS: RoomType[] = [
  { room_id: 1, room_name: 'Bedroom',           images: [], count: 0 },
  { room_id: 2, room_name: 'Kitchen',            images: [], count: 0 },
  { room_id: 3, room_name: 'Living Room',        images: [], count: 0 },
  { room_id: 4, room_name: 'Outdoor',            images: [], count: 0 },
  { room_id: 5, room_name: 'Study & Office',     images: [], count: 0 },
  { room_id: 6, room_name: 'Dining Room',        images: [], count: 0 },
  { room_id: 7, room_name: 'Laundry Room',       images: [], count: 0 },
  { room_id: 8, room_name: 'Bath Room',          images: [], count: 0 },
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_HEIGHT = 190;

function sortByOrder(items: CategoryItem[]) {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getCategoryImage(category: CategoryItem) {
  if (category.image) return category.image;
  const seed = encodeURIComponent(category.url || category.name);
  return `https://picsum.photos/seed/${seed}/240/240`;
}

function getCategoryImages(category: CategoryItem) {
  const images = (category.images ?? []).filter(Boolean);
  if (images.length > 0) return images;
  return [getCategoryImage(category)];
}

function getBrandImage(brand: BrandItem) {
  if (brand.logo) return brand.logo;
  if (brand.image) return brand.image;
  const seed = encodeURIComponent(brand.name);
  return `https://picsum.photos/seed/${seed}/320/180`;
}

function getBrandInitial(brand: BrandItem) {
  return brand.name?.trim()?.charAt(0)?.toUpperCase() || '?';
}

function getBrandImageLayout(imageCount: number) {
  switch (imageCount) {
    case 1:
      return { flex: 1, height: '100%' as any };
    case 2:
      return { flex: 1, height: '100%' as any };
    case 3:
      return { flex: 1, height: '100%' as any };
    case 4:
      return { width: '50%' as any, height: '50%' as any };
    case 5:
    case 6:
    default:
      return { width: '33.33%' as any, height: '50%' as any };
  }
}

function getBrandLogo(brand: BrandItem) {
  if (brand.logo) return brand.logo;
  if (brand.brand_image) return brand.brand_image;
  if (brand.image) return brand.image;
  return null;
}

function CategoryCircle({ category, index, onPress, isDarkMode, colors }: { category: CategoryItem, index: number, onPress?: (categoryId: number) => void, isDarkMode?: boolean, colors?: any }) {
  const image = useMemo(() => getCategoryImages(category)[0], [category]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const badgeType = index === 0 ? 'Hot' : index === 2 ? 'New' : null;

  useEffect(() => {
    if (!badgeType) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [badgeType, pulseAnim]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.categoryCircleItem, { transform: [{ scale }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress?.(category.id)}
      >
        <View style={[styles.circleImageWrap, styles.categoryCircle, { backgroundColor: isDarkMode ? colors?.card : Colors.white }]}>
          <Image
            source={{ uri: image }}
            style={styles.circleImage}
          />
          {badgeType && (
            <Animated.View style={[
              styles.categoryBadge,
              isDarkMode && styles.categoryBadgeDark,
              badgeType === 'Hot' ? { backgroundColor: '#ef4444' } : { backgroundColor: '#3b82f6' },
              { transform: [{ scale: pulseAnim }] }
            ]}>
              <Text style={styles.categoryBadgeText}>{badgeType}</Text>
            </Animated.View>
          )}
        </View>
        <Text style={[styles.circleLabel, { color: colors?.text || Colors.text }]} numberOfLines={2}>{category.name}</Text>
      </Pressable>
    </Animated.View>
  );
}

function VideoBanner({ banner }: { banner: any }) {
  const player = useVideoPlayer(banner.videoSource, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.bannerVideo}
      contentFit="cover"
    />
  );
}

function SampleAdCard({ title, subtitle }: { title: string, subtitle: string }) {
  return (
    <View style={styles.sampleAdCard}>
      <LinearGradient colors={['#38bdf8', '#0284c7']} style={styles.sampleAdGradient}>
        <Ionicons name="sparkles" size={28} color={Colors.white} />
        <Text style={styles.sampleAdTitle}>{title}</Text>
        <Text style={styles.sampleAdSubtitle}>{subtitle}</Text>
        <View style={styles.sampleAdBadge}>
          <Text style={styles.sampleAdBadgeText}>Ad</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function RoomItemComponent({ item, onPress, isDarkMode, colors }: { item: RoomType; onPress?: (roomId: number) => void, isDarkMode?: boolean, colors?: any }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const badge = item.room_id === 1 ? 'New' : item.room_id === 3 ? 'Hot' : null;

  return (
    <Animated.View style={[styles.roomItem, { transform: [{ scale }], borderColor: isDarkMode ? colors?.border : '#e5e7eb' }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress?.(item.room_id)}
        style={{ alignItems: 'center', width: '100%', gap: 6 }}
      >
        <View style={styles.roomCircleContainer}>
          <View style={[styles.roomCircleWrap, { borderColor: isDarkMode ? colors?.border : '#e0f2fe' }]}>
            {item.images && item.images.length > 0 ? (
              <Image
                source={{ uri: item.images[0] }}
                style={styles.roomImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.roomCircleFallback, { backgroundColor: isDarkMode ? colors?.sectionEven : '#eff6ff' }]}>
                <Ionicons name="home-outline" size={24} color={Colors.sky} />
              </View>
            )}
          </View>
          {badge && (
            <View style={[styles.roomBadge, isDarkMode && styles.roomBadgeDark, badge === 'Hot' ? { backgroundColor: '#ef4444' } : {}]}>
              <Text style={styles.roomBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.circleLabel, { color: colors?.text || Colors.text }]} numberOfLines={2}>{item.room_name}</Text>
      </Pressable>
    </Animated.View>
  );
}

function HomeScreen({
  token,
  user,
  isDarkMode = false,
  onProductPress,
  onCartPress = () => {},
  onReferralPress = () => {},
  categories = [],
  setCategories = () => {},
  brands = [],
  setBrands = () => {},
  featuredProducts = [],
  setFeaturedProducts = () => {},
  roomTypes = [],
  setRoomTypes = () => {},
  loadingFeatured = false,
  setLoadingFeatured = () => {},
  dataFetchedRef,
  wishlistItems = [],
  onWishlistChange = () => {},
  onShopByRoomPress = () => {},
  onShopByCategoryPress = () => {},
  onShopByBrandPress = () => {},
}: HomeScreenProps) {
  console.log('📱 HomeScreen MOUNTED - Categories:', categories.length, 'Brands:', brands.length, 'Rooms:', roomTypes.length);
  console.log('[HomeScreen] User object on mount:', { name: user?.name, badge_name: user?.badge_name, badge_image: user?.badge_image, avatar_url: user?.avatar_url, fullUser: JSON.stringify(user) });

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fbff',
    card: isDarkMode ? '#1e293b' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#334155' : '#e2e8f0',
    sectionEven: isDarkMode ? '#1e293b' : '#f0f9ff',
    statsBg: isDarkMode ? '#1e293b' : '#f0f9ff',
  };

  const [refreshing, setRefreshing] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalCart, setTotalCart] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const bannerRef = useRef<ScrollView>(null);

  // Prefetch products in background for instant Shop screen load
  usePrefetchProducts(token);

  // Fetch personalized recommendations
  const { recommendations, loading: recommendationsLoading } = useRecommendations({
    token,
    limit: 20,
    enabled: !!token,
  });

  const fetchHomeData = async (isRefreshing = false) => {
    if (!token) return;

    if (isRefreshing) {
      setRefreshing(true);
    } else if (!dataFetchedRef.current) {
      setLoadingFeatured(true);
    }

    try {
      const [categoryData, brandData, productData, roomData] = await Promise.all([
        authService.getCategories(token),
        authService.getBrandsWithProducts(token, 6),
        productService.getProductCards(token),
        axios.get(`${API_CONFIG.BASE_URL}/room-types`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => res.data?.data || []).catch(() => []),
      ]);

      setCategories(sortByOrder(categoryData));
      setBrands(brandData);


      setRoomTypes(roomData);
    } catch (error: any) {
      console.error('Home data fetch error:', error);
      Toast.show({
        type: 'error',
        text1: 'Sync failed',
        text2: error.message || 'Unable to update home data.',
      });
    } finally {
      setLoadingFeatured(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchHomeData(true);
  };

  // Fetch stats from API
  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;
      try {
        const { orderService } = require('../services/orderService');
        const { referralService } = require('../services/referralService');
        const headers = { Authorization: `Bearer ${token}` };

        const [orderCounts, referralData, cartRes] = await Promise.all([
          orderService.getOrderCounts(token),
          referralService.getReferralTree(token),
          axios.get(`${API_CONFIG.BASE_URL}/cart`, { headers }),
        ]);

        setTotalOrders(orderCounts?.all || 0);
        setTotalReferrals(referralData?.summary?.direct_count || 0);
        setTotalCart(cartRes?.data?.cart_items?.length || 0);
      } catch (error) {
        console.log('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [token]);

  // Data fetching is handled by parent (AppNavigator)
  // HomeScreen only handles pull-to-refresh

  const greeting = useMemo(() => {
    const firstName = user?.name?.split(' ')[0] ?? 'there';
    return `Discover home essentials for ${firstName}`;
  }, [user?.name]);

  // Distribute products into two columns for masonry layout
  const masonryColumns = useMemo(() => {
    const leftColumn: any[] = [];
    const rightColumn: any[] = [];

    console.log('📊 Masonry Layout Debug:', {
      featuredProductsCount: featuredProducts.length,
      featuredProducts: featuredProducts.map(p => ({ id: p.id, name: p.name })),
    });

    featuredProducts.forEach((product, index) => {
      if (index % 2 === 0) {
        leftColumn.push(product);
      } else {
        rightColumn.push(product);
      }
    });

    // Add sample ads
    if (leftColumn.length > 0) {
      leftColumn.splice(1, 0, { id: 'sample-ad-1', isAd: true, title: 'Summer Sale', subtitle: 'Up to 50% off' });
    }
    if (rightColumn.length > 0) {
      rightColumn.splice(2, 0, { id: 'sample-ad-2', isAd: true, title: 'New Arrivals', subtitle: 'Explore now' });
    }

    console.log('📦 Masonry Columns Result:', {
      leftColumnCount: leftColumn.length,
      rightColumnCount: rightColumn.length,
      leftColumnItems: leftColumn.map(item => ({ id: item.id, isAd: item.isAd })),
      rightColumnItems: rightColumn.map(item => ({ id: item.id, isAd: item.isAd })),
    });

    return { leftColumn, rightColumn };
  }, [featuredProducts]);

  const banners = useMemo(() => {
    const categoryName = categories[0]?.name ?? 'Categories';
    const brandName = brands[0]?.name ?? 'Brands';
    return [
      {
        type: 'video' as const,
        videoSource: require('../../assets/login/home-login.mp4'),
        eyebrow: 'Welcome',
        title: 'Discover Your Dream Home',
        subtitle: 'Explore our curated collection of premium home essentials.',
        accent: Colors.sky,
        icon: 'play-circle-outline' as const,
      },
      {
        type: 'content' as const,
        eyebrow: 'Browse',
        title: 'Shop by category',
        subtitle: `Explore ${categories.length} curated categories with image tiles.`,
        accent: Colors.sky,
        icon: 'grid-outline' as const,
      },
      {
        type: 'content' as const,
        eyebrow: 'Discover',
        title: 'Find top brands',
        subtitle: `Swipe to see brand collections like ${brandName}.`,
        accent: Colors.forest,
        icon: 'pricetag-outline' as const,
      },
      {
        type: 'content' as const,
        eyebrow: 'Featured',
        title: 'Fresh picks for you',
        subtitle: `Start with ${categoryName} and move across the collection.`,
        accent: Colors.brass,
        icon: 'sparkles-outline' as const,
      },
    ];
  }, [categories, brands]);

  function handleBannerScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / (SCREEN_WIDTH - 16));
    setActiveBanner(index);
  }

  console.log('🎨 HomeScreen RENDERING...');

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]} 
      contentContainerStyle={styles.content} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={[Colors.sky]} 
          tintColor={isDarkMode ? '#fff' : Colors.sky}
        />
      }
    >
      {/* Ranking Badge */}
      {user?.badge_name && (
        <View style={[styles.rankingBadgeSection, { borderBottomColor: colors.border, width: SCREEN_WIDTH, marginHorizontal: -8 }]}>
          <View style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.rankingBadgeWrapper}>
              {user.badge_image ? (() => {
                const badgeSource = getBadgeImageSource(user.badge_image);
                return badgeSource ? (
                  <Image
                    source={badgeSource}
                    style={styles.rankingBadgeImage}
                  />
                ) : (
                  <Ionicons name="shield-checkmark" size={24} color={Colors.white} />
                );
              })() : (
                <Ionicons name="shield-checkmark" size={24} color={Colors.white} />
              )}
            </View>

            <View style={styles.memberInfo}>
              <Text style={[styles.memberLabel, { color: colors.textSec }]}>Your Badge Level</Text>
              <Text style={[styles.rankingBadgeName, { color: colors.text }]}>{user.badge_name}</Text>
              <Text style={[styles.rankingBadgeSubtext, { color: colors.textSec }]}>Grow your team and earn more per order.</Text>
            </View>

            <View style={styles.badgeLogoContainer}>
              <Image
                source={require('../../assets/af_home_logo.png')}
                style={styles.badgeLogo}
                resizeMode="contain"
              />
            </View>
          </View>

          <View style={[styles.quickActionRow, { width: SCREEN_WIDTH, marginHorizontal: -8 }]}>
            <TouchableOpacity
              style={[styles.quickActionCard, { borderColor: colors.border }]}
              activeOpacity={0.85}
              onPress={onReferralPress}
            >
              <LinearGradient colors={['#f97316', '#fb923c']} style={styles.quickActionGradient}>
                <Ionicons name="people" size={16} color={Colors.white} />
                <Text style={styles.quickActionTitle}>Invite Friends</Text>
                <Text style={styles.quickActionSubtitle}>Turn Invites and Orders into Earnings</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionCard, { borderColor: colors.border }]}
              activeOpacity={0.85}
              onPress={onCartPress}
            >
              <LinearGradient colors={['#0284c7', '#0ea5e9']} style={styles.quickActionGradient}>
                <Ionicons name="bag-check" size={16} color={Colors.white} />
                <Text style={styles.quickActionTitle}>Order Now</Text>
                <Text style={styles.quickActionSubtitle}>Earn Performance Value (PV) Faster</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={[styles.statsBar, { backgroundColor: colors.statsBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.statsItem, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.7}>
          <View style={styles.statsMain}>
            <Ionicons name="receipt-outline" size={18} color="#f97316" />
            <Text style={[styles.statsValue, { color: colors.text }]}>{totalOrders}</Text>
          </View>
          <Text style={[styles.statsLabel, { color: colors.textSec }]}>Total Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={onCartPress}
        >
          <View style={styles.statsMain}>
            <Ionicons name="cart-outline" size={18} color="#0ea5e9" />
            <Text style={[styles.statsValue, { color: colors.text }]}>{totalCart}</Text>
          </View>
          <Text style={[styles.statsLabel, { color: colors.textSec }]}>Total Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statsItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={onReferralPress}
        >
          <View style={styles.statsMain}>
            <Ionicons name="people-outline" size={18} color="#22c55e" />
            <Text style={[styles.statsValue, { color: colors.text }]}>{totalReferrals}</Text>
          </View>
          <Text style={[styles.statsLabel, { color: colors.textSec }]}>Total Referrals</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statsItem, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.7}>
          <View style={styles.statsMain}>
            <Ionicons name="trending-up-outline" size={18} color="#ef4444" />
            <Text style={[styles.statsValue, { color: colors.text }]}>{user?.monthly_activation?.remaining_pv ?? 0}</Text>
          </View>
          <Text style={[styles.statsLabel, { color: colors.textSec }]}>Perf. Value</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bannerShell}>
        <ScrollView
          ref={bannerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleBannerScroll}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH - 16}
          snapToAlignment="start"
          bounces={true}
        >
          {banners.map((banner, index) => (
            <View key={`banner-${index}`} style={[styles.banner, { width: SCREEN_WIDTH - 16 }]}>
              {banner.type === 'video' ? (
                <>
                  <VideoBanner banner={banner} />
                  <View style={styles.videoOverlay} />
                  <View style={[styles.bannerGlow, { backgroundColor: banner.accent }]} />
                  <View style={styles.bannerTextWrap}>
                    <Text style={styles.bannerEyebrow}>{banner.eyebrow}</Text>
                    <Text style={styles.bannerTitle}>{banner.title}</Text>
                    <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                  </View>
                  <View style={styles.bannerIcon}>
                    <Ionicons name={banner.icon} size={30} color={banner.accent} />
                  </View>
                </>
              ) : (
                <>
                  <View style={[styles.bannerGlow, { backgroundColor: banner.accent }]} />
                  <View style={styles.bannerTextWrap}>
                    <Text style={styles.bannerEyebrow}>{banner.eyebrow}</Text>
                    <Text style={styles.bannerTitle}>{banner.title}</Text>
                    <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                  </View>
                  <View style={styles.bannerIcon}>
                    <Ionicons name={banner.icon} size={30} color={banner.accent} />
                  </View>
                </>
              )}
            </View>
          ))}
        </ScrollView>
        <View style={styles.pagination}>
          {banners.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[
                styles.dot,
                { backgroundColor: isDarkMode ? '#475569' : '#cbd5e1' },
                activeBanner === index && [styles.dotActive, { backgroundColor: Colors.sky }]
              ]}
            />
          ))}
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.bg }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Shop by Rooms</Text>
          <View style={styles.sectionAction}>
            <Text style={[styles.sectionMeta, { color: colors.textSec }]}>{(roomTypes.length || FALLBACK_ROOMS.length)} total</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSec} />
          </View>
        </View>
        <FlatList
          data={roomTypes.length > 0 ? roomTypes : FALLBACK_ROOMS}
          renderItem={({ item }) => <RoomItemComponent item={item} onPress={onShopByRoomPress} isDarkMode={isDarkMode} colors={colors} />}
          keyExtractor={item => `room-${item.room_id}`}
          numColumns={4}
          contentContainerStyle={styles.roomGrid}
          scrollEnabled={false}
        />
      </View>

      <View style={[styles.sectionEven, { backgroundColor: colors.sectionEven }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Shop by Categories</Text>
          <View style={styles.sectionAction}>
            <Text style={[styles.sectionMeta, { color: colors.textSec }]}>{categories.length} total</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSec} />
          </View>
        </View>
        {loadingFeatured && categories.length === 0 ? (
          <CategoryRowSkeleton />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circleRow}>
            {categories.map((category, index) => (
              <CategoryCircle key={`category-${category.id}`} category={category} index={index} onPress={onShopByCategoryPress} isDarkMode={isDarkMode} colors={colors} />
            ))}
          </ScrollView>
        )}
      </View>

      <View style={[styles.sectionOdd, { backgroundColor: colors.bg }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Shop by Brand</Text>
          <View style={styles.sectionAction}>
            <Text style={[styles.sectionMeta, { color: colors.textSec }]}>{brands.length} total</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSec} />
          </View>
        </View>
        {loadingFeatured && brands.length === 0 ? (
          <BrandCardSkeleton />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandRowHorizontal}>
            {brands.map(item => {
              const logo = getBrandLogo(item);

              return (
                <Pressable key={`brand-${item.id}`} onPress={() => onShopByBrandPress?.(item.id)}>
                  <View style={[styles.brandCard, { backgroundColor: colors.card }]}>
                    <View style={styles.brandLogoContainer}>
                      {logo ? (
                        <Image source={{ uri: logo }} style={styles.brandLogoImage} />
                      ) : (
                        <View style={[styles.brandLogoFallback, { backgroundColor: Colors.sky }]}>
                          <Text style={styles.brandFallbackInitialLarge}>{getBrandInitial(item)}</Text>
                        </View>
                      )}
                      <View style={[styles.brandLogoOverlay, { backgroundColor: 'rgba(14, 165, 233, 0.85)' }]}>
                        <Text style={[styles.brandCardNameOverlay, { color: Colors.white }]} numberOfLines={2}>
                          {item.name}
                        </Text>
                        {item.total_products !== undefined && (
                          <Text style={[styles.brandProductCountOverlay, { color: 'rgba(255,255,255,0.95)' }]}>
                            {item.total_products} products
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* For You - Personalized Recommendations */}
      {token && (
        <View style={[styles.section, { backgroundColor: colors.bg }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>For You</Text>
            <View style={styles.sectionAction}>
              <Text style={[styles.sectionMeta, { color: colors.textSec }]}>Personalized</Text>
              <Ionicons name="sparkles" size={16} color={colors.textSec} />
            </View>
          </View>
          {recommendationsLoading ? (
            <View style={styles.recommendationsLoading}>
              <ActivityIndicator size="small" color={Colors.sky} />
              <Text style={[styles.loadingText, { color: colors.textSec }]}>Loading personalized items...</Text>
            </View>
          ) : recommendations.length > 0 ? (
            <FlatList
              data={recommendations}
              renderItem={({ item }) => (
                <ItemCard
                  product={{
                    id: item.id,
                    name: item.name,
                    image: item.image,
                    soldCount: 0,
                    originalPrice: item.priceSrp,
                    memberPrice: item.priceMember,
                    pv: 0,
                    brandName: '',
                    variantCount: 0,
                    badges: {
                      musthave: false,
                      bestseller: false,
                      salespromo: false,
                    },
                  }}
                  isDarkMode={isDarkMode}
                  onPress={() => onProductPress?.(item.id)}
                  onWishlistChange={onWishlistChange}
                  isWishlisted={wishlistItems?.some(w => w.product_id === item.id) || false}
                  colors={colors}
                />
              )}
              keyExtractor={item => `rec-${item.id}`}
              numColumns={2}
              contentContainerStyle={styles.productGrid}
              scrollEnabled={false}
            />
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Ionicons name="bag-outline" size={32} color={colors.textSec} />
              <Text style={[styles.emptyStateText, { color: colors.text }]}>No personalized items yet</Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.textSec }]}>
                Browse products to get personalized recommendations
              </Text>
            </View>
          )}
        </View>
      )}

      </ScrollView>

      {/* Chat Bot Icon */}
      <ChatBotIcon position="bottom-right" visible={true} isDarkMode={isDarkMode} />
    </View>
  );
}

export default React.memo(HomeScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fbff' },
  content: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 28, gap: 16 },
  loadingWrap: { paddingVertical: 42, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: Colors.textSecondary },
  bannerShell: {
    gap: 10,
  },
  banner: {
    height: BANNER_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    padding: 18,
    marginRight: 12,
    justifyContent: 'space-between',
    position: 'relative',
  },
  bannerGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -80,
    right: -70,
    opacity: 0.22,
  },
  bannerTextWrap: {
    zIndex: 2,
    flex: 1,
    justifyContent: 'center',
    paddingRight: 90,
  },
  bannerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bannerTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    color: Colors.white,
    marginTop: 8,
  },
  bannerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.84)',
    marginTop: 8,
  },
  bannerVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 24,
  },
  bannerIcon: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#cbd5e1',
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.sky,
  },
  section: { gap: 0, paddingHorizontal: 4 },
  rankingBadgeSection: {
    flexDirection: 'column',
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 0,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  memberCard: {
    width: '100%',
    maxWidth: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankingBadgeWrapper: {
    width: 70,
    height: 70,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rankingBadgeImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    resizeMode: 'contain' as any,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rankingBadgeName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  rankingBadgeSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  badgeLogoContainer: {
    position: 'absolute',
    right: -26,
    top: '50%',
    marginTop: -59,
    opacity: 0.15,
  },
  badgeLogo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  quickActionRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  quickActionCard: {
    flex: 1,
    maxWidth: '100%',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  quickActionGradient: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  quickActionTitle: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  quickActionSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    marginHorizontal: -8,
    marginBottom: 0,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0f2fe',
  },
  statsItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 4,
    borderWidth: 0.25,
    borderColor: '#e5e7eb',
    backgroundColor: Colors.white,
  },
  statsMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  statsLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionEven: {
    backgroundColor: '#f0f9ff',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 18,
    gap: 0,
  },
  sectionOdd: {
    backgroundColor: '#f8fbff',
    paddingHorizontal: 8,
    paddingVertical: 18,
    gap: 0,
  },
  sectionFeatured: {
    backgroundColor: '#f0f9ff',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 44,
    marginBottom: -28,
    gap: 10,
  },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  sectionMeta: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleRow: {
    gap: 12,
    paddingRight: 4,
  },
  categoryGrid: {
    gap: 16,
  },
  roomGrid: {
    gap: 0,
  },
  circleItem: {
    width: 88,
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  categoryCircleItem: {
    width: 88,
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  categoryBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    zIndex: 10,
  },
  categoryBadgeDark: {
    borderColor: '#111827',
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  categoryGrid: {
    paddingHorizontal: 12,
  },
  roomItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  roomCircleContainer: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  roomBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    zIndex: 10,
  },
  roomBadgeDark: {
    borderColor: '#111827',
  },
  roomBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  circleImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    backgroundColor: Colors.white,
  },
  roomCircleWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e0f2fe',
  },
  roomImage: {
    width: '100%',
    height: '100%',
  },
  roomCircleFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  categoryCircle: {
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  circleLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: Colors.text,
    fontWeight: '700',
    lineHeight: 16,
  },
  brandRowHorizontal: {
    gap: 12,
    paddingRight: 4,
  },
  brandCard: {
    width: 190,
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
  },
  brandLogoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  brandLogoImage: {
    width: '100%',
    height: '100%',
  },
  brandLogoFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandFallbackInitialLarge: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '900',
    color: Colors.white,
  },
  brandLogoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  brandCardNameOverlay: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  brandProductCountOverlay: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  brandCardImage: {
    width: '100%',
    height: '100%',
  },
  brandFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },
  brandFallbackInitial: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    color: Colors.sky,
  },
  brandCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.34)',
  },
  brandCardName: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  brandProductCount: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  brandImagesGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  brandMiniImageContainer: {
    width: '33.33%',
    height: '50%',
    overflow: 'hidden',
    borderWidth: 0.25,
  },
  brandMiniImage: {
    width: '100%',
    height: '100%',
  },
  brandMiniFallback: {
    backgroundColor: '#f1f5f9',
  },
  brandNamePlate: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  featuredProductsContainer: {
    gap: 8,
  },
  masonryGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  masonryColumn: {
    flex: 1,
    gap: 8,
  },
  featuredProductItem: {
    width: '100%',
  },
  sampleAdCard: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sampleAdGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 6,
  },
  sampleAdTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
  },
  sampleAdSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  sampleAdBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sampleAdBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.white,
    textTransform: 'uppercase',
  },
  featuredProductSkeleton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    height: 280,
    overflow: 'hidden',
  },
  noProductsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  marketingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 0.5,
    minWidth: 110,
    flexShrink: 0,
  },
  marketingContent: {
    flex: 1,
    gap: 2,
  },
  marketingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  marketingSubtitle: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  recommendationsLoading: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  productGrid: {
    gap: 8,
  },
  emptyState: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },

});
