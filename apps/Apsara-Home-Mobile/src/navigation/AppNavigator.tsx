import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity, Pressable,
  StyleSheet, Modal, PanResponder, Animated, BackHandler, Clipboard, Linking, AppState,
} from 'react-native';
import type { AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProvider, NavigationContextType } from '../context/NavigationContext';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '../constants/colors';
import { getBadgeImage, getBadgeImageSource } from '../constants/tierConfig';
import axios from 'axios';
import { API_CONFIG } from '../config/api';
import type { ProductCard } from '../services/productService';
import AppHeader from '../components/AppHeader/AppHeader';
import HomeScreen from '../screen/HomeScreen';
import ProfileScreen from '../screen/ProfileScreen';
import SearchScreen from '../screen/SearchScreen';
import ProductsScreen from '../screen/ProductsScreen';
import SearchResultScreen from '../screen/SearchResultScreen';
import SettingsScreen from '../screen/SettingsScreen';
import SecurityScreen from '../screen/SecurityScreen';
import HistoryScreen from '../screen/HistoryScreen';
import ProductDetailScreen from '../screen/ProductDetailScreen';
import WishlistScreen from '../screen/WishlistScreen';
import CartScreen from '../screen/CartScreen';
import ProfileDetailsScreen from '../screen/ProfileDetailsScreen';
import AffiliateReferralModal from '../components/Referral/AffiliateReferralModal';
import ShopScreen from '../screen/ShopScreen';
import ShopByBrandScreen from '../screen/ShopByBrandScreen';
import NotificationsScreen from '../screen/NotificationsScreen';
import LoadingScreen from '../screen/LoadingScreen';
import ReferralNetworkScreen from '../screen/ReferralNetworkScreen';
import ReferralScreen from '../screen/ReferralScreen';
import ReferralSignupScreen from '../screen/ReferralSignupScreen';
import CheckoutScreen from '../screen/CheckoutScreen';
import OrderSuccessScreen from '../screen/OrderSuccessScreen';
import PaymentWebViewScreen from '../screen/PaymentWebViewScreen';
import PurchasesScreen from '../screen/PurchasesScreen';
import PaymentSuccessScreen from '../screen/PaymentSuccessScreen';
import PaymentCancelScreen from '../screen/PaymentCancelScreen';
import AFWalletOverviewScreen from '../screen/AFWalletOverviewScreen';
import AFWalletVoucherScreen from '../screen/AFWalletVoucherScreen';
import AFWalletRewardsScreen from '../screen/AFWalletRewardsScreen';
import AFWalletNetworkScreen from '../screen/AFWalletNetworkScreen';
import ShippingAddressSelectionScreen from '../screen/ShippingAddressSelectionScreen';
import AboutUsScreen from '../screen/AboutUsScreen';
import PrivacyPolicyScreen from '../screen/PrivacyPolicyScreen';
import TermsAndConditionsScreen from '../screen/TermsAndConditionsScreen';
import IncomeDisclaimerScreen from '../screen/IncomeDisclaimerScreen';
import CookiePolicyScreen from '../screen/CookiePolicyScreen';
import RewardsAndCommissionsScreen from '../screen/RewardsAndCommissionsScreen';
import ContactUsScreen from '../screen/ContactUsScreen';
import OurBranchesScreen from '../screen/OurBranchesScreen';
import FAQsScreen from '../screen/FAQsScreen';
import ShippingInfoScreen from '../screen/ShippingInfoScreen';
import ReturnsScreen from '../screen/ReturnsScreen';
import ProfileEditScreen from '../screen/ProfileEditScreen';
import { orderService } from '../services/orderService';
import Toast from 'react-native-toast-message';
import { useNotifications } from '../hooks/useNotifications';
import { useFirebaseMessaging } from '../hooks/useFirebaseMessaging';
import { NotificationService } from '../services/notificationService';

type TabKey = 'home' | 'wishlist' | 'shop' | 'notification' | 'profile' | 'settings';

const TABS: TabKey[] = ['home', 'wishlist', 'shop', 'notification', 'profile'];
const SLIDE_DISTANCE = 30;
const OUT_DURATION = 0;
const IN_DURATION = 0;

let screenTapTime = 0;

// Cache utilities using expo-file-system
const CACHE_DIR = FileSystem.cacheDirectory + 'apsara_cache/';
const cacheUtils = {
  async init() {
    try {
      const info = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
      console.log('✅ Cache directory ready:', CACHE_DIR);
    } catch (error) {
      console.log('❌ Cache init error:', error);
    }
  },
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const filePath = CACHE_DIR + key;
      const file = await FileSystem.readAsStringAsync(filePath);
      const parsed = JSON.parse(file);
      console.log(`✅ Cache READ SUCCESS [${key}]:`, parsed);
      return parsed;
    } catch (error) {
      console.log(`⚠️ Cache READ FAILED [${key}]:`, error);
      return null;
    }
  },
  async set(key: string, data: any) {
    try {
      const filePath = CACHE_DIR + key;
      const jsonData = JSON.stringify(data);
      await FileSystem.writeAsStringAsync(filePath, jsonData);
      console.log(`✅ Cache WRITE SUCCESS [${key}]:`, data);
      // Verify the write by reading it back
      const verified = await FileSystem.readAsStringAsync(filePath);
      console.log(`✅ Cache WRITE VERIFIED [${key}]:`, JSON.parse(verified));
    } catch (error) {
      console.log(`❌ Cache WRITE FAILED [${key}]:`, error);
    }
  },
};

interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  avatar_url?: string;
  badge_name?: string;
  badge_image?: string | any;
  rank?: number;
  monthly_activation?: {
    current_month_pv: number;
    threshold_pv: number;
    remaining_pv: number;
  };
}

function extractCount(data: any): number {
  // Calculate total quantity (sum of all item quantities)
  if (Array.isArray(data?.cart_items)) {
    return data.cart_items.reduce((sum: number, item: any) => {
      const qty = typeof item?.quantity === 'number' ? item.quantity :
                  typeof item?.qty === 'number' ? item.qty :
                  typeof item?.ci_quantity === 'number' ? item.ci_quantity : 1;
      return sum + qty;
    }, 0);
  }

  // Fallback: Try to use total quantity fields
  if (typeof data?.total_items === 'number') return data.total_items;
  if (typeof data?.total === 'number') return data.total;
  if (typeof data?.count === 'number') return data.count;

  // Last resort: count number of items
  if (Array.isArray(data?.wishlist_items)) return data.wishlist_items.length;
  if (Array.isArray(data?.data)) return data.data.length;
  if (Array.isArray(data?.items)) return data.items.length;
  if (Array.isArray(data)) return data.length;
  return 0;
}

interface CategoryItem {
  id: number;
  name: string;
  image?: string | null;
}

interface BrandItem {
  id: number;
  name: string;
  image?: string | null;
  brand_image?: string;
  total_products?: number;
}


interface RoomType {
  room_id: number;
  room_name: string;
  images: string[];
  count: number;
}

export default function AppNavigator({ user, token, onLogout }: { user?: User | null; token?: string | null; onLogout?: () => void }) {
  console.log('[AppNavigator] User object received:', {
    name: user?.name,
    badge_name: user?.badge_name,
    badge_image: user?.badge_image,
    avatar_url: user?.avatar_url,
    fullUser: user,
  });

  // Enrich user object with badge_image if missing
  const enrichedUser = useMemo(() => {
    if (!user) return null;

    let enriched = { ...user };

    const badgeImageSource = getBadgeImage(user.rank || (user as any).badge);
    if (badgeImageSource) {
      enriched.badge_image = badgeImageSource;
    }

    if (referralCodeFromDeepLink && !enriched.referrer_username) {
      enriched.referrer_username = referralCodeFromDeepLink;
    }

    return enriched;
  }, [user, referralCodeFromDeepLink]);

  // Callback when notification is clicked
  const handleNotificationPressed = useCallback((checkoutId: string, status: string) => {
    console.log('[AppNavigator] Notification pressed:', { checkoutId, status });
    setPurchasesStatus(normalizePurchaseStatus(status));
    setPurchasesInitialOrderId(checkoutId);
    setShowPurchases(true);
  }, []);

  // Initialize Firebase messaging with notification handler
  useFirebaseMessaging(token || '', user?.id || '', handleNotificationPressed);

  // Initialize real-time notifications
  const { notifications, unreadCount } = useNotifications(user?.id || '', token || '');


  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [checkoutOrderData, setCheckoutOrderData] = useState(null);
  const [paymentCheckoutUrl, setPaymentCheckoutUrl] = useState('');
  const [checkoutItem, setCheckoutItem] = useState<any>(null);
  const [checkoutCartItems, setCheckoutCartItems] = useState<any[]>([]);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [profileDetailsFromTab, setProfileDetailsFromTab] = useState(false);
  const [referralNetworkFromTab, setReferralNetworkFromTab] = useState(false);
  const [referralTree, setReferralTree] = useState<any>(null);
  const [closeReferralNetwork, setCloseReferralNetwork] = useState(false);
  const [referralCodeFromDeepLink, setReferralCodeFromDeepLink] = useState<string | null>(null);
  const [referrerProfileData, setReferrerProfileData] = useState<any>(null);
  const [referrerProfileLoading, setReferrerProfileLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [previousTab, setPreviousTab] = useState<TabKey>('home');
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [previousSearchQuery, setPreviousSearchQuery] = useState<string | null>(null);
  const [searchSourceProductId, setSearchSourceProductId] = useState<number | null>(null);
  const [shopSourceProductId, setShopSourceProductId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<BrandItem | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [notificationTotalCount, setNotificationTotalCount] = useState(0);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showPurchases, setShowPurchases] = useState(false);
  const [purchasesStatus, setPurchasesStatus] = useState<'pending' | 'paid' | 'processing' | 'shipped' | 'to_receive' | 'delivered' | 'cancelled' | 'return'>('pending');
  const [purchasesInitialOrderId, setPurchasesInitialOrderId] = useState<string | undefined>(undefined);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showPaymentCancel, setShowPaymentCancel] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [paymentConfirmationData, setPaymentConfirmationData] = useState<any>(null);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [linkedAccountsRefreshTrigger, setLinkedAccountsRefreshTrigger] = useState(0);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsAndConditions, setShowTermsAndConditions] = useState(false);
  const [showIncomeDisclaimer, setShowIncomeDisclaimer] = useState(false);
  const [showCookiePolicy, setShowCookiePolicy] = useState(false);
  const [showRewardsAndCommissions, setShowRewardsAndCommissions] = useState(false);
  const [showContactUs, setShowContactUs] = useState(false);
  const [showOurBranches, setShowOurBranches] = useState(false);
  const [showFAQs, setShowFAQs] = useState(false);
  const [showShippingInfo, setShowShippingInfo] = useState(false);
  const [showReturns, setShowReturns] = useState(false);
  const [paymentSourceScreen, setPaymentSourceScreen] = useState<'checkout' | 'purchases'>('checkout');
  const [showAffiliateReferralModal, setShowAffiliateReferralModal] = useState(false);
  const [showShippingAddressScreen, setShowShippingAddressScreen] = useState(false);
  const [shippingAddressScreenData, setShippingAddressScreenData] = useState<any>(null);
  const [shopSourceIsCart, setShopSourceIsCart] = useState(false);
  const [shopSourceIsCheckout, setShopSourceIsCheckout] = useState(false);
  const [checkoutSource, setCheckoutSource] = useState<'product' | 'cart'>('cart');
  const [showAFWalletOverview, setShowAFWalletOverview] = useState(false);
  const [showAFWalletVoucher, setShowAFWalletVoucher] = useState(false);
  const [showAFWalletRewards, setShowAFWalletRewards] = useState(false);
  const [showAFWalletNetwork, setShowAFWalletNetwork] = useState(false);
  const [showReferralScreen, setShowReferralScreen] = useState(false);
  const [showReferralSignupScreen, setShowReferralSignupScreen] = useState(false);

  // Home screen data - persists across navigation
  const [homeCategories, setHomeCategories] = useState<CategoryItem[]>([]);
  const [homeBrands, setHomeBrands] = useState<BrandItem[]>([]);
  const [homeFeaturedProducts, setHomeFeaturedProducts] = useState<ProductCard[]>([]);
  const [homeRoomTypes, setHomeRoomTypes] = useState<RoomType[]>([]);
  const [homeLoadingFeatured, setHomeLoadingFeatured] = useState(false);
  const [isInitialHomeDataReady, setIsInitialHomeDataReady] = useState(false);
  const homeInitialFetchRef = useRef(false);

  // Wishlist data - persists across navigation
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistRefreshing, setWishlistRefreshing] = useState(false);
  const wishlistInitialFetchRef = useRef(false);

  // Navigation ref for notification handling
  const navigationRef = useRef<any>(null);
  const initialNotificationHandledRef = useRef(false);

  const { authService } = require('../services/authService');
  const { productService } = require('../services/productService');

  // Create navigation handler for notifications
  const handleNotificationNavigation = (screen: string, params?: any) => {
    if (screen === 'Orders') {
      setShowPurchases(true);
      setPurchasesStatus(params?.status || 'pending');
      if (params?.orderId) {
        setPurchasesInitialOrderId(params.orderId);
      }
    } else if (screen === 'Wallet') {
      // Navigate to wallet/payment screen if available
      Toast.show({
        type: 'info',
        text1: 'Payment Received',
        text2: 'Check your wallet for details',
      });
    } else if (screen === 'Profile') {
      // Navigate to profile referrals
      setReferralNetworkFromTab(true);
    }
  };

  // Set navigation ref to use in notification service
  useEffect(() => {
    navigationRef.current = {
      navigate: handleNotificationNavigation,
    };
  }, []);

  const refreshNotificationCount = useCallback(async () => {
    if (!token) return;
    try {
      const data = await orderService.getNotifications(token);
      setNotificationTotalCount(data.total || data.notifications?.length || 0);
    } catch (error) {
      console.error('Error refreshing notification count:', error);
    }
  }, [token]);

  // Initialize cache and preload data on mount
  useEffect(() => {
    const init = async () => {
      console.log('🚀 APP NAVIGATOR MOUNTING - INITIALIZING CACHE...');
      await cacheUtils.init();
      // Preload cached home data and dark mode preference immediately
      try {
        console.log('📂 READING CACHE FILES...');
        const [cachedCats, cachedBrands, cachedRooms, cachedProducts, cachedDarkMode] = await Promise.all([
          cacheUtils.get<CategoryItem[]>('home_categories'),
          cacheUtils.get<BrandItem[]>('home_brands'),
          cacheUtils.get<RoomType[]>('home_rooms'),
          cacheUtils.get<ProductCard[]>('home_featured_products'),
          cacheUtils.get<boolean>('dark_mode_pref'),
        ]);
        console.log('📍 CACHE READ RESULTS:', {
          cachedDarkMode,
          isDarkModeType: typeof cachedDarkMode,
          isNull: cachedDarkMode === null,
          cachedProductsCount: cachedProducts?.length || 0,
        });
        if (cachedCats?.length) setHomeCategories(cachedCats);
        if (cachedBrands?.length) setHomeBrands(cachedBrands);
        if (cachedRooms?.length) setHomeRoomTypes(cachedRooms);
        if (cachedProducts?.length) setHomeFeaturedProducts(cachedProducts);
        if (cachedDarkMode !== null && typeof cachedDarkMode === 'boolean') {
          console.log('✅ LOADING DARK MODE FROM CACHE:', cachedDarkMode);
          setIsDarkMode(cachedDarkMode);
        } else {
          console.log('⚠️ NO VALID CACHED DARK MODE FOUND - USING DEFAULT FALSE');
        }
        console.log('✅ PRELOADED CACHE ON APP START');
      } catch (error) {
        console.log('❌ Preload error:', error);
      }
    };
    init();
  }, []);


  // Handle deep linking for payment redirects and notification orders
  useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      console.log('[AppNavigator] Deep link received:', url);

      if (url.includes('payment/success') || url.includes('/app/checkout/success')) {
        console.log('[AppNavigator] Payment success deep link triggered:', url);
        setShowPaymentWebView(false);

        // Extract checkout_id from URL if present
        const checkoutIdMatch = url.match(/checkout_id=([^&]+)/);
        const checkoutId = checkoutIdMatch?.[1];

        console.log('[AppNavigator] Checkout ID from URL:', checkoutId);

        // Fetch latest order and user info to show in confirmation screen
        if (token) {
          try {
            console.log('[AppNavigator] Fetching latest order and user details for confirmation...');
            const headers = { Authorization: `Bearer ${token}` };

            console.log('[AppNavigator] 🔄 Fetching order history from backend...');
            const [orderRes, userRes] = await Promise.all([
              axios.get(`${API_CONFIG.BASE_URL}/orders/history`, { headers }),
              axios.get(`${API_CONFIG.BASE_URL}/auth/me`, { headers }),
            ]);

            const orders = orderRes.data?.orders || [];
            const userData = userRes.data?.data || userRes.data || {};

            console.log('[AppNavigator] 📦 Orders received:', {
              count: orders.length,
              firstOrder: orders[0],
            });

            if (orders.length > 0) {
              const latestOrder = orders[0]; // Most recent order first
              console.log('[AppNavigator] ✅ Latest order details:', {
                orderId: latestOrder.id,
                orderNumber: latestOrder.order_number,
                status: latestOrder.status,
                paymentStatus: latestOrder.payment_status,
                fulfillmentStatus: latestOrder.fulfillment_status,
                amount: latestOrder.total_amount,
                paymentMethod: latestOrder.payment_method,
                fullOrder: JSON.stringify(latestOrder, null, 2),
              });
              console.log('[AppNavigator] 👤 User data fetched:', {
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
              });

              // Prepare confirmation data with user info from auth/me
              const confirmationData = {
                order_number: latestOrder.order_number,
                transaction_id: latestOrder.transaction_id || latestOrder.id,
                amount: latestOrder.total_amount,
                payment_method: latestOrder.payment_method,
                product_name: latestOrder.items?.[0]?.name || 'Order',
                quantity: latestOrder.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 1,
                customer_name: userData.name || userData.full_name || latestOrder.customer_name || 'Customer',
                customer_email: userData.email || latestOrder.customer_email,
                customer_phone: userData.phone || userData.mobile || latestOrder.customer_phone,
                delivery_address: latestOrder.delivery_address,
                shipping_fee: latestOrder.shipping_fee || 0,
                created_at: latestOrder.created_at,
              };

              setPaymentConfirmationData(confirmationData);
              setShowPaymentConfirmation(true);
            } else {
              console.log('[AppNavigator] No orders found');
              Toast.show({
                type: 'info',
                text1: 'Order Confirmed',
                text2: 'Payment successful',
              });
              setShowPaymentSuccess(true);
            }
          } catch (error: any) {
            console.error('[AppNavigator] Error fetching order or user data:', error);
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Failed to load order details',
            });
            setShowPaymentSuccess(true);
          }
        }
      } else if (url.includes('payment/cancel') || url.includes('/app/checkout/cancel')) {
        console.log('[AppNavigator] Payment cancel deep link triggered:', url);
        setShowPaymentCancel(true);
        setShowPaymentWebView(false);
      } else if (url.includes('purchases://') || url.includes('apsarahome://purchases/')) {
        console.log('[AppNavigator] Order notification deep link triggered:', url);
        // Parse purchases deeplinks:
        // - purchases://status/checkout_id
        // - apsarahome://purchases/status/checkout_id
        const normalized = url.includes('apsarahome://purchases/')
          ? url.replace('apsarahome://purchases/', '')
          : url.replace('purchases://', '');
        const parts = normalized.split('/');
        const status = parts[0];
        const checkoutId = parts[1];

        if (checkoutId) {
          console.log('[AppNavigator] Opening purchases screen with order:', { status, checkoutId });
          // Show the PurchasesScreen modal with the specific order
          setPurchasesStatus(normalizePurchaseStatus(status));
          setPurchasesInitialOrderId(checkoutId);
          setShowPurchases(true);
        }
      } else if (url.includes('/products/') || url.includes('/product/') || url.includes('apsarahome://product') || url.includes('apsarahome://products')) {
        // Parse product link - Formats:
        // - https://afhome.ph/product/nxt-echo-i2834 (slug)
        // - https://www.afhome.ph/product/nxt-echo-i2834 (slug)
        // - apsarahome://product/nxt-echo-i2834 (slug)
        let productSlugOrId: string = '';

        if (url.includes('apsarahome://')) {
          // Extract from app scheme: apsarahome://product/nxt-echo-i2834
          productSlugOrId = url.split('/').pop()?.split('?')[0] || '';
        } else {
          // Extract from web URL: https://afhome.ph/product/nxt-echo-i2834
          const pathMatch = url.match(/\/products?\/([^/?]+)/);
          productSlugOrId = pathMatch?.[1] || '';
        }

        if (productSlugOrId) {
          // Extract product ID from slug format: {name-slug}-i{id}
          const idMatch = productSlugOrId.match(/-i(\d+)$/);
          const productId = idMatch ? parseInt(idMatch[1], 10) : null;

          if (productId) {
            // Set the selected product ID - the detail screen will fetch the product
            setSelectedProductId(productId);
            Toast.show({
              type: 'info',
              text1: 'Opening Product',
              text2: 'Loading product details...',
            });
          } else {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Invalid product link format',
            });
          }
        }
      } else if (url.includes('/ref/')) {
        console.log('[AppNavigator] Referral deep link triggered:', url);
        // Parse referral link - Format: https://www.afhome.ph/ref/username
        const username = url.split('/ref/')[1]?.split('?')[0] || '';
        if (username) {
          console.log('[AppNavigator] Opening referral screen with username:', username);
          setReferralCodeFromDeepLink(username);
          setShowReferralScreen(true);
        }
      } else if (url.includes('/shop')) {
        console.log('[AppNavigator] Shop deep link triggered:', url);
        // Parse shop link - Format: https://www.afhome.ph/shop?ref=username
        const refParam = new URL(url).searchParams.get('ref');
        if (refParam) {
          console.log('[AppNavigator] Opening shop with referral:', refParam);
          setReferralCodeFromDeepLink(refParam);
          Toast.show({
            type: 'info',
            text1: 'Shopping Link',
            text2: `Referred by ${refParam}`,
          });
        }
        // Navigate to shop tab
        setActiveTab('shop');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was launched from deep link
    Linking.getInitialURL().then((url) => {
      if (url != null) {
        console.log('[AppNavigator] Initial deep link:', url);
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [token]);

  // Save dark mode preference to cache whenever it changes
  useEffect(() => {
    const saveDarkMode = async () => {
      console.log('💾 ATTEMPTING TO SAVE DARK MODE:', isDarkMode);
      try {
        await cacheUtils.init();
        await cacheUtils.set('dark_mode_pref', isDarkMode);
        console.log('✅ DARK MODE SAVED SUCCESSFULLY:', isDarkMode);
      } catch (error) {
        console.log('❌ Error saving dark mode:', error);
      }
    };
    saveDarkMode();
  }, [isDarkMode]);

  // Double-check dark mode from cache periodically (helps with hot reload issues)
  useEffect(() => {
    const checkDarkModeCache = async () => {
      try {
        await cacheUtils.init();
        const cachedDarkMode = await cacheUtils.get<boolean>('dark_mode_pref');
        if (cachedDarkMode !== null && typeof cachedDarkMode === 'boolean' && cachedDarkMode !== isDarkMode) {
          console.log('🔄 SYNCING DARK MODE FROM CACHE (hot reload detected):', cachedDarkMode);
          setIsDarkMode(cachedDarkMode);
        }
      } catch (error) {
        console.log('❌ Error checking dark mode cache:', error);
      }
    };

    // Check on mount and every 2 seconds to catch hot reloads
    checkDarkModeCache();
    const interval = setInterval(checkDarkModeCache, 2000);
    return () => clearInterval(interval);
  }, [isDarkMode]);

  useEffect(() => {
    if (screenTapTime) {
      const elapsed = Date.now() - screenTapTime;
      console.log(`✅ [RENDER] ${labelMap[activeTab]} screen displayed in ${elapsed}ms`);
      screenTapTime = 0;
    }
  }, [activeTab]);

  useEffect(() => {
    if (!token) return;

    // Fetch cart count
    const headers = { Authorization: `Bearer ${token}` };
    axios.get(`${API_CONFIG.BASE_URL}/cart`, { headers })
      .then(cartRes => setCartCount(extractCount(cartRes.data)))
      .catch(() => {});

    // Initial notification fetch only - real-time updates come from push notifications
    refreshNotificationCount();

    // Fetch home screen data ONCE when token becomes available
    if (!homeInitialFetchRef.current) {
      homeInitialFetchRef.current = true;
      fetchHomeData();
    }

    // Fetch wishlist data ONCE when token becomes available
    if (!wishlistInitialFetchRef.current) {
      wishlistInitialFetchRef.current = true;
      fetchWishlistData();
    }
  }, [token, refreshNotificationCount]);

  const fetchHomeData = async () => {
    if (!token) return;

    try {
      setHomeLoadingFeatured(true);
      const totalStart = performance.now();
      console.log('🔄 FETCHING INITIAL DATA (FAST)...');

      // STEP 1: Fetch only categories first (fast, ~200ms)
      const categoryStart = performance.now();
      const categoryData = await authService.getCategories(token);
      const sortedCategories = categoryData.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      console.log(`⚡ CATEGORIES FETCHED: ${Math.round(performance.now() - categoryStart)}ms`);

      // Update state immediately with categories
      setHomeCategories(sortedCategories);
      await cacheUtils.set('home_categories', sortedCategories);

      // Ready to show home screen with at least categories
      console.log(`✅ HOME READY FOR DISPLAY: ${Math.round(performance.now() - totalStart)}ms`);
      setIsInitialHomeDataReady(true);

      // STEP 2: Lazy load brands, rooms, and featured products in background
      console.log('🔄 LAZY LOADING OTHER DATA...');
      const lazyStart = performance.now();
      const [brandData, roomData, productData] = await Promise.all([
        authService.getBrandsWithProducts(token, 50),
        axios.get(`${API_CONFIG.BASE_URL}/room-types`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => res.data?.data || []).catch(() => []),
        productService.getProductCards(token).catch(() => []),
      ]);
      console.log(`📡 LAZY LOAD COMPLETE: ${Math.round(performance.now() - lazyStart)}ms`);

      // Filter for affordahome brand products
      const affordahomeProducts = Array.isArray(productData)
        ? productData.filter(p => p.brandName?.toLowerCase() === 'affordahome')
        : [];

      console.log('🏠 AFFORDAHOME PRODUCTS:', affordahomeProducts.length);

      // Update state with lazy-loaded data
      setHomeBrands(brandData || []);
      setHomeRoomTypes(roomData || []);
      setHomeFeaturedProducts(affordahomeProducts.slice(0, 10));

      // Update cache
      await Promise.all([
        cacheUtils.set('home_brands', brandData || []),
        cacheUtils.set('home_rooms', roomData || []),
        cacheUtils.set('home_featured_products', affordahomeProducts.slice(0, 10)),
      ]);

      console.log(`⏱️ ALL DATA READY: ${Math.round(performance.now() - totalStart)}ms`);
    } catch (error: any) {
      console.error('❌ Home data fetch error:', error?.message);
      setIsInitialHomeDataReady(true);
    } finally {
      setHomeLoadingFeatured(false);
    }
  };

  const fetchWishlistData = async (isRefreshing = false) => {
    if (!token) return;

    const setLoading = isRefreshing ? setWishlistRefreshing : setWishlistLoading;

    // Load from cache first if not refreshing
    if (!isRefreshing) {
      try {
        const cachedWishlist = await cacheUtils.get<any[]>('wishlist_items');
        if (cachedWishlist) {
          setWishlistItems(cachedWishlist);
          setWishlistCount(cachedWishlist.length);
          console.log('💾 LOADED CACHED WISHLIST');
        }
      } catch (error) {
        console.log('Wishlist cache load error:', error);
      }
    }

    // Fetch fresh data in background
    try {
      setLoading(true);
      const data = await productService.getWishlist(token);
      setWishlistItems(data);
      setWishlistCount(data.length);

      // Cache the fresh data
      await cacheUtils.set('wishlist_items', data);
    } catch (error: any) {
      console.error('Wishlist fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAffiliateReferralModal = async () => {
    if (!token) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Missing authentication token',
      });
      return;
    }

    if (!referralTree) {
      try {
        const { referralService } = require('../services/referralService');
        const data = await referralService.getReferralTree(token);
        setReferralTree(data);
      } catch (error: any) {
        console.error('Error fetching referral tree:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message || 'Failed to load affiliate referral screen',
        });
        return;
      }
    }

    setShowAffiliateReferralModal(true);
  };

  useEffect(() => {
    if (!searchVisible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSearchVisible(false);
      // If search was opened from ProductDetailScreen, restore it
      if (searchSourceProductId !== null) {
        setSelectedProductId(searchSourceProductId);
        setSearchSourceProductId(null);
      } else {
        // Otherwise restore the previous tab
        setActiveTab(previousTab);
        activeTabRef.current = previousTab;
      }
      return true;
    });
    return () => sub.remove();
  }, [searchVisible, previousTab, searchSourceProductId]);

  useEffect(() => {
    if (selectedProductId === null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedProductId(null);
      // If product was opened from search, restore search query
      if (previousSearchQuery) {
        setSearchQuery(previousSearchQuery);
        setPreviousSearchQuery(null);
      } else {
        // Otherwise restore the previous tab
        setActiveTab(previousTab);
        activeTabRef.current = previousTab;
      }
      return true;
    });
    return () => sub.remove();
  }, [selectedProductId, previousTab, previousSearchQuery]);

  // Global back button handler for exit confirmation on main screens
  useEffect(() => {
    if (selectedProductId !== null || searchVisible || searchQuery) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowExitConfirm(true);
      return true;
    });
    return () => sub.remove();
  }, [selectedProductId, searchVisible, searchQuery]);

  // Update notification count when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        console.log('???? App came to foreground, refreshing notification count');
        refreshNotificationCount();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [token, refreshNotificationCount]);

  // Fetch referrer's public profile when referral code from deep link is set
  useEffect(() => {
    if (!referralCodeFromDeepLink || referrerProfileData) return;

    const fetchReferrerProfile = async () => {
      try {
        setReferrerProfileLoading(true);
        const { referralService } = require('../services/referralService');
        const profile = await referralService.getPublicProfile(referralCodeFromDeepLink);
        setReferrerProfileData(profile);
      } catch (error: any) {
        console.error('Error fetching referrer profile:', error);
        // Silently fail - the screen will still show with username only
      } finally {
        setReferrerProfileLoading(false);
      }
    };

    fetchReferrerProfile();
  }, [referralCodeFromDeepLink]);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const activeTabRef = useRef<TabKey>('home');

  const normalizePurchaseStatus = (status?: string) => {
    const s = String(status || '').trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
    if (s === 'to_ship') return 'shipped' as const;
    if (s === 'out_for_delivery') return 'to_receive' as const;
    if (s === 'to_receive' || s === 'toreceive') return 'to_receive' as const;
    if (s === 'pending' || s === 'paid' || s === 'processing' || s === 'shipped' || s === 'delivered' || s === 'cancelled' || s === 'return') return s;
    return 'pending' as const;
  };

  function navigateTo(key: TabKey) {
    if (key === activeTabRef.current) return;

    screenTapTime = Date.now();
    console.log(`⏱️ [TAP] ${labelMap[key]} screen tapped`);

    setPreviousTab(activeTabRef.current);
    activeTabRef.current = key;
    setActiveTab(key);
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        // Disable swipe navigation on Wishlist screen to allow item swiping
        if (activeTabRef.current === 'wishlist') return false;
        // Disable swipe navigation while Shop By Brand is open
        if (activeTabRef.current === 'shop' && selectedBrandId !== null && selectedBrand !== null) return false;
        return Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 12;
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) {
          const i = TABS.indexOf(activeTabRef.current);
          if (i < TABS.length - 1) navigateTo(TABS[i + 1]);
        } else if (g.dx > 50) {
          const i = TABS.indexOf(activeTabRef.current);
          if (i > 0) navigateTo(TABS[i - 1]);
        }
      },
    })
  ).current;

  const labelMap: Record<TabKey, string> = {
    home: 'Home',
    wishlist: 'Wishlist',
    shop: 'Shop',
    notification: 'Notifications',
    profile: 'Me',
    settings: 'Settings',
  };

  const iconActive: Record<TabKey, keyof typeof Ionicons.glyphMap> = {
    home: 'home',
    wishlist: 'heart',
    shop: 'storefront',
    notification: 'notifications',
    profile: 'person',
    settings: 'settings',
  };

  const iconInactive: Record<TabKey, keyof typeof Ionicons.glyphMap> = {
    home: 'home-outline',
    wishlist: 'heart-outline',
    shop: 'storefront-outline',
    notification: 'notifications-outline',
    profile: 'person-outline',
    settings: 'settings-outline',
  };

  const badgeCount: Partial<Record<TabKey, number>> = {
    notification: unreadCount,
    wishlist: wishlistCount,
  };

  // Navigation context value for notifications to use
  const navigationValue: NavigationContextType = {
    openPurchaseOrder: (checkoutId: string, status?: string) => {
      console.log('[AppNavigator] openPurchaseOrder called:', { checkoutId, status });
      setPurchasesStatus(normalizePurchaseStatus(status));
      setPurchasesInitialOrderId(checkoutId);
      setShowPurchases(true);
    },
  };

  return (
    <NavigationProvider value={navigationValue}>
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <View style={styles.body} {...panResponder.panHandlers}>
          {selectedProductId !== null ? (
            <ProductDetailScreen
              productId={selectedProductId}
              token={token}
              user={enrichedUser}
              cartCount={cartCount}
              wishlistItems={wishlistItems}
              onBack={() => setSelectedProductId(null)}
              onProductPress={(id) => {
                setPreviousSearchQuery(null);
                setSelectedProductId(id);
              }}
              onSearch={() => {
                setSearchSourceProductId(selectedProductId);
                setSelectedProductId(null);
                setPreviousTab(activeTabRef.current);
                setSearchVisible(true);
              }}
              onCartUpdate={async () => {
                const headers = { Authorization: `Bearer ${token}` };
                try {
                  const cartRes = await axios.get(`${API_CONFIG.BASE_URL}/cart`, { headers });
                  setCartCount(extractCount(cartRes.data));
                } catch (error) {
                  console.error('Failed to update cart count:', error);
                }
              }}
              onWishlistToggle={(productId, isWishlisted) => {
                if (isWishlisted) {
                  // Product added to wishlist - add it to the list
                  setWishlistItems(prev => {
                    const exists = prev.some(item => item.product_id === productId);
                    if (exists) return prev;
                    return [...prev, { wishlist_id: Date.now(), product_id: productId, date_added: new Date().toISOString() }];
                  });
                } else {
                  // Product removed from wishlist - remove it from the list
                  setWishlistItems(prev => prev.filter(item => item.product_id !== productId));
                }
              }}
              onShopNavigate={(brandType, shopName) => {
                // Store the current product ID so we can return to it
                setShopSourceProductId(selectedProductId);
                // Clear selected product to allow ShopByBrandScreen to show
                setSelectedProductId(null);
                // Navigate to ShopByBrandScreen
                setSelectedBrandId(brandType);
                // Create brand object from available data
                setSelectedBrand({
                  id: brandType,
                  name: shopName,
                });
                // Store previous tab so we can go back to ProductDetailScreen later
                setPreviousTab(activeTabRef.current);
                // Switch to shop tab to show ShopByBrandScreen
                setActiveTab('shop');
                activeTabRef.current = 'shop';
              }}
              onCheckout={(product, quantity, variant) => {
                // Create item object from product details
                const item = {
                  product_id: product.id,
                  product_name: product.name,
                  product_image: product.image || (product.images?.[0]),
                  product_price_member: variant?.priceMember || product.priceMember || 0,
                  product_price_srp: variant?.priceSrp || product.priceSrp || 0,
                  brand_name: product.brand,
                  brand_id: product.supplier_id || 0,
                  quantity: quantity,
                  variant_color: variant?.color,
                  variant_size: variant?.name,
                  variant_image: variant?.images?.[0],
                };
                setCheckoutItem(item);
                setCheckoutCartItems([]); // Clear cart items when selecting single product
                setPreviousTab(activeTabRef.current);
                setSelectedProductId(null);
                setCheckoutSource('product');
                setShowCheckout(true);
              }}
              isDarkMode={isDarkMode}
            />
          ) : searchQuery ? (
            <SearchResultScreen
              token={token}
              query={searchQuery}
              isDarkMode={isDarkMode}
              onBack={() => {
                setSearchQuery(null);
                setSearchVisible(true);
              }}
              onProductPress={(product) => {
                setPreviousSearchQuery(searchQuery);
                setSelectedProductId(product.id);
              }}
            />
          ) : activeTab === 'notification' ? (
            <>
              <AppHeader
                user={enrichedUser}
                cartCount={cartCount}
                isDarkMode={isDarkMode}
                onCartPress={() => setShowCart(true)}
                onCameraPress={() => {
                  console.log('Camera pressed');
                }}
                onSearchPress={() => {
                  setSearchSourceProductId(null);
                  setPreviousTab(activeTabRef.current);
                  setSearchVisible(true);
                }}
                onProfilePress={() => setShowProfileDetails(true)}
                onLogout={onLogout}
              />
              <NotificationsScreen
                token={token}
                isDarkMode={isDarkMode}
                onNavigateToPurchases={(status, orderId) => {
                  setPurchasesStatus(normalizePurchaseStatus(status));
                  setPurchasesInitialOrderId(orderId);
                  setShowPurchases(true);
                }}
              />
            </>

          ) : activeTab === 'settings' ? (
            <SettingsScreen
              user={enrichedUser}
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
              onBack={() => navigateTo('profile')}
              onEditProfile={() => setShowProfileDetails(true)}
              onNavigateSecurity={() => setShowSecurity(true)}
              onNavigateAboutUs={() => setShowAboutUs(true)}
              onNavigatePrivacyPolicy={() => setShowPrivacyPolicy(true)}
              onNavigateTermsAndConditions={() => setShowTermsAndConditions(true)}
              onNavigateIncomeDisclaimer={() => setShowIncomeDisclaimer(true)}
              onNavigateCookiePolicy={() => setShowCookiePolicy(true)}
              onNavigateRewardsAndCommissions={() => setShowRewardsAndCommissions(true)}
              onNavigateContactUs={() => setShowContactUs(true)}
              onNavigateOurBranches={() => setShowOurBranches(true)}
              onNavigateFAQs={() => setShowFAQs(true)}
              onNavigateShippingInfo={() => setShowShippingInfo(true)}
              onNavigateReturns={() => setShowReturns(true)}
              onLogout={onLogout}
            />
          ) : activeTab === 'wishlist' ? (
            <>
              <AppHeader
                user={enrichedUser}
                cartCount={cartCount}
                isDarkMode={isDarkMode}
                onCartPress={() => setShowCart(true)}
                onCameraPress={() => {
                  console.log('Camera pressed');
                }}
                onSearchPress={() => {
                  setSearchSourceProductId(null);
                  setPreviousTab(activeTabRef.current);
                  setSearchVisible(true);
                }}
                onProfilePress={() => setShowProfileDetails(true)}
                onLogout={onLogout}
              />
              <WishlistScreen
                token={token}
                wishlistItems={wishlistItems}
                loading={wishlistLoading}
                refreshing={wishlistRefreshing}
                isDarkMode={isDarkMode}
                onRefresh={() => fetchWishlistData(true)}
                onProductPress={(id: number) => {
                  setPreviousSearchQuery(null);
                  setPreviousTab(activeTabRef.current);
                  setSelectedProductId(id);
                }}
                onCartUpdate={async () => {
                  const headers = { Authorization: `Bearer ${token}` };
                  try {
                    const cartRes = await axios.get(`${API_CONFIG.BASE_URL}/cart`, { headers });
                    setCartCount(extractCount(cartRes.data));
                  } catch (error) {
                    console.error('Failed to update cart count:', error);
                  }
                }}
                onNavigateToCart={() => setShowCart(true)}
              />
            </>
          ) : activeTab === 'profile' ? (
            <ProfileScreen
              user={enrichedUser}
              token={token}
              onLogout={onLogout}
              onNavigateSettings={() => navigateTo('settings')}
              onCartPress={() => setShowCart(true)}
              cartCount={cartCount}
              isDarkMode={isDarkMode}
              onShowProfileDetails={(show) => setProfileDetailsFromTab(show)}
              onShowReferralNetwork={(show, tree) => {
                setReferralNetworkFromTab(show);
                if (tree) setReferralTree(tree);
                setCloseReferralNetwork(false);
              }}
              closeReferralNetwork={closeReferralNetwork}
              onPurchaseItemClick={(status) => {
                setPurchasesStatus(normalizePurchaseStatus(status));
                setShowPurchases(true);
              }}
              linkedAccountsRefreshTrigger={linkedAccountsRefreshTrigger}
              onSecuritySettingsPress={() => setShowSecurity(true)}
              onShowAFWalletOverview={() => setShowAFWalletOverview(true)}
              onShowAFWalletVoucher={() => setShowAFWalletVoucher(true)}
              onShowAFWalletRewards={() => setShowAFWalletRewards(true)}
              onShowAFWalletNetwork={() => setShowAFWalletNetwork(true)}
            />
          ) : activeTab === 'shop' ? (
            selectedBrandId != null && selectedBrand ? (
              <ShopByBrandScreen
                key={selectedBrandId}
                token={token}
                user={enrichedUser}
                cartCount={cartCount}
                brandId={selectedBrandId}
                brand={selectedBrand}
                categories={homeCategories}
                onBack={() => {
                  setSelectedBrandId(null);
                  setSelectedBrand(null);
                  // If we came from checkout, go back to checkout
                  if (shopSourceIsCheckout) {
                    setShowCheckout(true);
                    setShopSourceIsCheckout(false);
                  } else if (shopSourceIsCart) {
                    // If we came from cart, go back to cart
                    setShowCart(true);
                    setShopSourceIsCart(false);
                  } else if (shopSourceProductId !== null) {
                    // If we came from ProductDetailScreen, restore it
                    setSelectedProductId(shopSourceProductId);
                    setShopSourceProductId(null);
                  } else {
                    // Otherwise go back to the previous tab
                    setActiveTab(previousTab);
                    activeTabRef.current = previousTab;
                  }
                }}
                onProductPress={(id) => {
                  setPreviousSearchQuery(null);
                  setPreviousTab(activeTabRef.current);
                  setSelectedProductId(id);
                }}
                onCartPress={() => setShowCart(true)}
                wishlistItems={wishlistItems}
                isDarkMode={isDarkMode}
                onWishlistChange={() => fetchWishlistData()}
              />
            ) : (
              <ShopScreen
                token={token}
                user={enrichedUser}
                cartCount={cartCount}
                roomId={selectedRoomId}
                categoryId={selectedCategoryId}
                brandId={selectedBrandId}
                categories={homeCategories}
                brands={homeBrands}
                onBack={() => {
                  setSelectedRoomId(null);
                  setSelectedCategoryId(null);
                  setSelectedBrandId(null);
                  navigateTo(previousTab);
                }}
                onProductPress={(id) => {
                  setPreviousSearchQuery(null);
                  setPreviousTab(activeTabRef.current);
                  setSelectedProductId(id);
                }}
                onCartPress={() => setShowCart(true)}
                onOpenSearch={() => {
                  setSearchSourceProductId(null);
                  setPreviousTab(activeTabRef.current);
                  setSearchVisible(true);
                }}
                wishlistItems={wishlistItems}
                isDarkMode={isDarkMode}
                onWishlistChange={() => fetchWishlistData()}
              />
            )
          ) : activeTab === 'home' ? (
            !isInitialHomeDataReady ? (
              <LoadingScreen />
            ) : (
            <>
              <AppHeader
                user={enrichedUser}
                cartCount={cartCount}
                isDarkMode={isDarkMode}
                onCartPress={() => setShowCart(true)}
                onCameraPress={() => {
                  // TODO: Implement camera functionality
                  console.log('Camera pressed');
                }}
                onSearchPress={() => {
                  setSearchSourceProductId(null);
                  setPreviousTab(activeTabRef.current);
                  setSearchVisible(true);
                }}
                onProfilePress={() => setShowProfileDetails(true)}
                onLogout={onLogout}
              />
              <HomeScreen
                token={token}
                user={enrichedUser}
                isDarkMode={isDarkMode}
                onProductPress={(id: number) => {
                  setPreviousSearchQuery(null);
                  setPreviousTab(activeTabRef.current);
                  setSelectedProductId(id);
                }}
                categories={homeCategories}
                setCategories={setHomeCategories}
                brands={homeBrands}
                setBrands={setHomeBrands}
                featuredProducts={homeFeaturedProducts}
                setFeaturedProducts={setHomeFeaturedProducts}
                roomTypes={homeRoomTypes}
                setRoomTypes={setHomeRoomTypes}
                loadingFeatured={homeLoadingFeatured}
                setLoadingFeatured={setHomeLoadingFeatured}
                dataFetchedRef={homeInitialFetchRef}
                wishlistItems={wishlistItems}
                onWishlistChange={() => fetchWishlistData()}
                onShopByRoomPress={(roomId: number) => {
                  setPreviousTab(activeTabRef.current);
                  setSelectedRoomId(roomId);
                  setSelectedCategoryId(null);
                  activeTabRef.current = 'shop';
                  setActiveTab('shop');
                }}
                onShopByCategoryPress={(categoryId: number) => {
                  setPreviousTab(activeTabRef.current);
                  setSelectedCategoryId(categoryId);
                  setSelectedRoomId(null);
                  activeTabRef.current = 'shop';
                  setActiveTab('shop');
                }}
                onShopByBrandPress={(brandId: number) => {
                  const brand = homeBrands.find(b => b.id === brandId);
                  setPreviousTab(activeTabRef.current);
                  setSelectedBrandId(brandId);
                  setSelectedBrand(brand || null);
                  setSelectedRoomId(null);
                  setSelectedCategoryId(null);
                  activeTabRef.current = 'shop';
                  setActiveTab('shop');
                }}
                onCartPress={() => setShowCart(true)}
                onReferralPress={handleOpenAffiliateReferralModal}
              />
            </>
            )
          ) : (
            <>
              <AppHeader
                user={enrichedUser}
                cartCount={cartCount}
                isDarkMode={isDarkMode}
                onCartPress={() => setShowCart(true)}
                onCameraPress={() => {
                  // TODO: Implement camera functionality
                  console.log('Camera pressed');
                }}
                onSearchPress={() => {
                  setSearchSourceProductId(null);
                  setPreviousTab(activeTabRef.current);
                  setSearchVisible(true);
                }}
                onProfilePress={() => setShowProfileDetails(true)}
                onLogout={onLogout}
              />
              <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
                <Text style={styles.h1}>{labelMap[activeTab]}</Text>
                <Text style={styles.bodyText}>This is the {labelMap[activeTab].toLowerCase()} page.</Text>
              </Animated.View>
            </>
          )}
        </View>

        {!searchQuery && activeTab !== 'settings' && selectedProductId === null && !profileDetailsFromTab && !showSecurity && !referralNetworkFromTab && !(activeTab === 'shop' && selectedBrandId !== null && selectedBrand !== null) && (activeTab !== 'home' || isInitialHomeDataReady) && (
          <SafeAreaView edges={['bottom']} style={[styles.navBarContainer, isDarkMode && styles.navBarContainerDark]}>
            <View style={[styles.navBar, isDarkMode && styles.navBarDark]}>
              {TABS.map(key => {
              const active = activeTab === key;

            if (key === 'home') {
              const count = badgeCount[key] ?? 0;
              return (
                <Pressable
                  key={key}
                  style={styles.navItem}
                  onPress={() => navigateTo(key)}
                >
                  <View style={styles.indicator}>
                    {active && <View style={styles.indicatorLine} />}
                  </View>
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name={active ? iconActive[key] : iconInactive[key]}
                      size={24}
                      color={active ? (isDarkMode ? '#38bdf8' : Colors.sky) : (isDarkMode ? '#d1d5db' : Colors.textSecondary)}
                    />
                    {count > 0 && (
                      <View style={[styles.badge, isDarkMode && styles.badgeDark]}>
                        <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[
                    styles.navLabel,
                    active && styles.navLabelActive,
                    isDarkMode && styles.navLabelDark,
                    isDarkMode && active && styles.navLabelActiveDark,
                  ]}>
                    {labelMap[key]}
                  </Text>
                </Pressable>
              );
            }

            if (key === 'shop') {
              return (
                <Pressable key={key} style={styles.shopItem} onPress={() => {
                  setSelectedRoomId(null);
                  setSelectedCategoryId(null);
                  setSelectedBrandId(null);
                  setSelectedBrand(null);
                  navigateTo(key);
                }}>
                  <View style={styles.shopSlot}>
                    <View style={[styles.shopDiamond, active && styles.shopDiamondActive]}>
                      <View style={styles.shopDiamondInner}>
                        <Image
                          source={require('../../assets/home_logo.png')}
                          style={[
                            styles.shopLogoImage,
                            {
                              opacity: 1,
                              tintColor: Colors.white,
                            }
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            }

            if (key === 'profile') {
              const photoUrl = user?.avatar_url ?? null;
              const initial = user?.name ? user.name.charAt(0).toUpperCase() : null;
              return (
                <Pressable key={key} style={styles.navItem} onPress={() => navigateTo(key)}>
                  <View style={styles.indicator}>
                    {active && <View style={styles.indicatorLine} />}
                  </View>
                  <View style={[styles.avatar, active && styles.avatarActive]}>
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                    ) : initial ? (
                      <Text style={[styles.avatarInitial, active && styles.avatarInitialActive]}>
                        {initial}
                      </Text>
                    ) : (
                      <Ionicons name="person" size={14} color={active ? Colors.sky : Colors.textSecondary} />
                    )}
                  </View>
                  <Text style={[
                    styles.navLabel,
                    active && styles.navLabelActive,
                    isDarkMode && styles.navLabelDark,
                    isDarkMode && active && styles.navLabelActiveDark,
                  ]}>
                    {labelMap[key]}
                  </Text>
                </Pressable>
              );
            }

            const count = badgeCount[key] ?? 0;
            return (
              <Pressable
                key={key}
                style={styles.navItem}
                onPress={() => navigateTo(key)}
                onLongPress={() => key === 'notification' && deviceToken && setShowTokenModal(true)}
              >
                <View style={styles.indicator}>
                  {active && <View style={styles.indicatorLine} />}
                </View>
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={active ? iconActive[key] : iconInactive[key]}
                    size={24}
                    color={active ? (isDarkMode ? '#38bdf8' : Colors.sky) : (isDarkMode ? '#d1d5db' : Colors.textSecondary)}
                  />
                  {count > 0 && (
                    <View style={[styles.badge, isDarkMode && styles.badgeDark]}>
                      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.navLabel,
                  active && styles.navLabelActive,
                  isDarkMode && styles.navLabelDark,
                  isDarkMode && active && styles.navLabelActiveDark,
                ]}>
                  {labelMap[key]}
                </Text>
              </Pressable>
            );
          })}
            </View>
          </SafeAreaView>
        )}

        <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
            <View style={styles.menuPanel}>
              <Text style={styles.menuTitle}>Menu</Text>
              {TABS.map(item => (
                <TouchableOpacity
                  key={item}
                  style={styles.menuItem}
                  onPress={() => {
                    navigateTo(item);
                    setMenuVisible(false);
                  }}
                >
                  <Text style={styles.menuText}>{labelMap[item]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showTokenModal} transparent animationType="fade" onRequestClose={() => setShowTokenModal(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTokenModal(false)}>
            <View style={styles.tokenModal}>
              <Text style={styles.tokenTitle}>Push Notification Token</Text>
              <Text style={styles.tokenSubtitle}>Long-press notification icon to copy</Text>
              <View style={styles.tokenBox}>
                <Text style={styles.tokenText} selectable>{deviceToken}</Text>
              </View>
              <TouchableOpacity
                style={styles.tokenCopyBtn}
                onPress={() => {
                  if (deviceToken) {
                    Clipboard.setString(deviceToken);
                    setShowTokenModal(false);
                  }
                }}
              >
                <Ionicons name="copy" size={18} color={Colors.white} />
                <Text style={styles.tokenCopyText}>Copy Token</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tokenCloseBtn} onPress={() => setShowTokenModal(false)}>
                <Text style={styles.tokenCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>

      {searchVisible && (
        <SearchScreen
          token={token}
          isDarkMode={isDarkMode}
          onBack={() => {
            setSearchVisible(false);
            setActiveTab(previousTab);
            activeTabRef.current = previousTab;
          }}
          onSearchSubmit={(query) => {
            setSearchQuery(query);
            setSearchVisible(false);
          }}
        />
      )}

      {showCart && (
        <View style={styles.cartScreenOverlay}>
          <CartScreen
            token={token}
            user={enrichedUser}
            wishlistCount={wishlistCount}
            isDarkMode={isDarkMode}
            brands={homeBrands}
            onBack={() => setShowCart(false)}
            onProfilePress={() => {
              setShowCart(false);
              navigateTo('profile');
            }}
            onProductPress={(productId) => {
              setShowCart(false);
              setPreviousSearchQuery(null);
              setPreviousTab(activeTabRef.current);
              setSelectedProductId(productId);
            }}
            onShopNavigate={(brandId, shopName) => {
              console.log('[AppNavigator] CartScreen onShopNavigate:', { brandId, shopName, foundInHomeBrands: !!homeBrands.find(b => b.id === brandId) });
              setShowCart(false);
              setShopSourceIsCart(true);
              const brand = homeBrands.find(b => b.id === brandId) || {
                id: brandId,
                name: shopName,
              };
              setPreviousTab(activeTabRef.current);
              setSelectedBrandId(brandId);
              setSelectedBrand(brand);
              setSelectedRoomId(null);
              setSelectedCategoryId(null);
              activeTabRef.current = 'shop';
              setActiveTab('shop');
            }}
            onCheckout={(selectedItems) => {
              if (selectedItems && selectedItems.length > 0) {
                // Map cart items to checkout format with correct quantity field
                const formattedItems = selectedItems.map(item => ({
                  ...item,
                  quantity: item.crt_quantity || item.quantity || 1,
                }));
                setCheckoutCartItems(formattedItems);
              }
              setShowCart(false);
              setCheckoutSource('cart');
              setShowCheckout(true);
            }}
            onWishlistPress={() => {
              setShowCart(false);
              setActiveTab('wishlist');
            }}
          />
        </View>
      )}

      {showCheckout && (
        <View style={styles.cartScreenOverlay}>
          <CheckoutScreen
            item={checkoutCartItems.length === 0 ? checkoutItem : undefined}
            items={checkoutCartItems.length > 0 ? checkoutCartItems : []}
            token={token}
            user={enrichedUser}
            isDarkMode={isDarkMode}
            brands={homeBrands}
            onBack={() => {
              setShowCheckout(false);
              if (checkoutSource === 'product') {
                // If came from product detail, restore it
                if (checkoutItem) {
                  setSelectedProductId(checkoutItem.product_id);
                }
              } else {
                // If came from cart, go back to cart
                setShowCart(true);
              }
            }}
            onShopNavigate={(brandId, shopName) => {
              setShowCheckout(false);
              setShopSourceIsCheckout(true);
              const brand = homeBrands.find(b => b.id === brandId) || {
                id: brandId,
                name: shopName,
              };
              setPreviousTab(activeTabRef.current);
              setSelectedBrandId(brandId);
              setSelectedBrand(brand);
              setSelectedRoomId(null);
              setSelectedCategoryId(null);
              activeTabRef.current = 'shop';
              setActiveTab('shop');
            }}
            onNavigateToOrderSuccess={(orderData) => {
              console.log('[AppNavigator] onNavigateToOrderSuccess called');
              setCheckoutOrderData(orderData);
              setShowCheckout(false);
              setShowOrderSuccess(true);
              // Clear checkout items to prevent stale data
              setCheckoutItem(null);
              setCheckoutCartItems([]);
            }}
            onNavigateToShippingAddress={(addresses, selectedAddress, onSelect) => {
              setShippingAddressScreenData({ addresses, selectedAddress, onSelect });
              setShowShippingAddressScreen(true);
            }}
          />
        </View>
      )}

      {showOrderSuccess && checkoutOrderData && (
        <View style={styles.cartScreenOverlay}>
          <OrderSuccessScreen
            orderData={checkoutOrderData}
            isDarkMode={isDarkMode}
            onBack={() => {
              setShowOrderSuccess(false);
              setShowCheckout(true);
              setCheckoutOrderData(null);
            }}
            onNavigateToPayment={(checkoutUrl) => {
              console.log('[AppNavigator] onNavigateToPayment called with URL:', checkoutUrl);
              setPaymentCheckoutUrl(checkoutUrl);
              setShowOrderSuccess(false);
              setPaymentSourceScreen('checkout');
              setShowPaymentWebView(true);
            }}
            onPayLater={() => {
              console.log('[AppNavigator] Pay later clicked');
              setShowOrderSuccess(false);
              setShowCheckout(false);
              setCheckoutOrderData(null);
              setPurchasesStatus('pending');
              setShowPurchases(true);
            }}
          />
        </View>
      )}

      {showPaymentWebView && paymentCheckoutUrl && (
        <View style={styles.cartScreenOverlay}>
          <PaymentWebViewScreen
            checkoutUrl={paymentCheckoutUrl}
            isDarkMode={isDarkMode}
            onBack={() => {
              setShowPaymentWebView(false);
              if (paymentSourceScreen === 'purchases') {
                setShowPurchases(true);
              } else {
                setShowOrderSuccess(true);
              }
              setPaymentCheckoutUrl('');
            }}
            onPaymentSuccess={() => {
              console.log('[AppNavigator] Payment successful - fetching order and user details');
              setShowPaymentWebView(false);
              setShowCheckout(false);
              setShowOrderSuccess(false);
              setCheckoutOrderData(null);
              setCheckoutItem(null);
              setPaymentCheckoutUrl('');

              // Fetch latest order and user info in parallel
              if (token) {
                const headers = { Authorization: `Bearer ${token}` };

                Promise.all([
                  axios.get(`${API_CONFIG.BASE_URL}/orders/history`, { headers }),
                  axios.get(`${API_CONFIG.BASE_URL}/auth/me`, { headers }),
                ]).then(([orderRes, userRes]) => {
                  const orders = orderRes.data?.orders || [];
                  const userData = userRes.data?.data || userRes.data || {};

                  if (orders.length > 0) {
                    const latestOrder = orders[0];
                    console.log('[AppNavigator] Latest order fetched:', latestOrder);
                    console.log('[AppNavigator] User data fetched:', userData);

                    const confirmationData = {
                      order_number: latestOrder.order_number,
                      transaction_id: latestOrder.transaction_id || latestOrder.id,
                      amount: latestOrder.total_amount,
                      payment_method: latestOrder.payment_method,
                      product_name: latestOrder.items?.[0]?.name || 'Order',
                      quantity: latestOrder.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 1,
                      customer_name: userData.name || userData.full_name || latestOrder.customer_name || 'Customer',
                      customer_email: userData.email || latestOrder.customer_email,
                      customer_phone: userData.phone || userData.mobile || latestOrder.customer_phone,
                      delivery_address: latestOrder.delivery_address,
                      shipping_fee: latestOrder.shipping_fee || 0,
                      created_at: latestOrder.created_at,
                    };

                    setPaymentConfirmationData(confirmationData);
                    setShowPaymentConfirmation(true);
                  }
                }).catch(err => {
                  console.error('[AppNavigator] Error fetching order or user data:', err);
                  setShowPaymentSuccess(true);
                });

                // Refresh cart
                axios.get(`${API_CONFIG.BASE_URL}/cart`, { headers }).then(res => {
                  setCartCount(extractCount(res.data));
                }).catch(err => console.error('Failed to refresh cart:', err));
              }
            }}
          />
        </View>
      )}

      {showPaymentConfirmation && paymentConfirmationData && (
        <View style={styles.cartScreenOverlay}>
          <PaymentSuccessScreen
            orderData={paymentConfirmationData}
            isDarkMode={isDarkMode}
            onClose={() => {
              console.log('[AppNavigator] onContinueShopping called - closing PaymentSuccessScreen');
              setShowPaymentConfirmation(false);
              setPaymentConfirmationData(null);
              setActiveTab('home');
              setPurchasesStatus('paid');
            }}
            onViewOrders={() => {
              setShowPaymentConfirmation(false);
              setPaymentConfirmationData(null);
              setShowPurchases(true);
              setPurchasesStatus('paid');
            }}
          />
        </View>
      )}

      {showPaymentSuccess && (
        <View style={styles.cartScreenOverlay}>
          <PaymentSuccessScreen
            isDarkMode={isDarkMode}
            onClose={() => {
              setShowPaymentSuccess(false);
              setPurchasesStatus('paid');
              setShowPurchases(true);
            }}
          />
        </View>
      )}

      {showPaymentCancel && (
        <View style={styles.cartScreenOverlay}>
          <PaymentCancelScreen
            isDarkMode={isDarkMode}
            onRetry={() => {
              setShowPaymentCancel(false);
              setShowPurchases(true);
            }}
            onClose={() => {
              setShowPaymentCancel(false);
              setShowPurchases(true);
            }}
          />
        </View>
      )}

      {showProfileDetails && (
        <View style={styles.cartScreenOverlay}>
          <ProfileDetailsScreen
            token={token}
            cartCount={cartCount}
            onClose={() => setShowProfileDetails(false)}
            onCartPress={() => {
              setShowProfileDetails(false);
              setShowCart(true);
            }}
            onEditProfile={(profileData) => {
              setCurrentProfile(profileData);
              setShowProfileDetails(false);
              setShowProfileEdit(true);
            }}
          />
        </View>
      )}

      {showProfileEdit && (
        <View style={styles.cartScreenOverlay}>
          <ProfileEditScreen
            user={currentProfile || enrichedUser}
            isDarkMode={isDarkMode}
            onBack={() => {
              setShowProfileEdit(false);
              setShowProfileDetails(true);
            }}
            onSave={async (profileData) => {
              try {
                console.log('[AppNavigator] Profile save requested with data:', profileData);
                const updatePayload = {
                  name: profileData.firstName || '',
                  phone: profileData.phone,
                  middle_name: profileData.middleName,
                  birth_date: profileData.birthDate,
                  gender: profileData.gender?.toLowerCase() || 'male',
                  occupation: profileData.occupation,
                  work_location: profileData.workLocation?.toLowerCase() === 'overseas' ? 'overseas' : 'local',
                  country: profileData.country,
                  address: profileData.streetAddress,
                  region: profileData.region,
                  province: profileData.province,
                  city: profileData.city,
                  barangay: profileData.barangay,
                  zip_code: profileData.zipCode,
                };

                console.log('[AppNavigator] Sending update payload:', updatePayload);
                const response = await axios.put(
                  `${API_CONFIG.BASE_URL}/auth/me`,
                  updatePayload,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                  }
                );

                console.log('[AppNavigator] Profile updated successfully, response:', response.data);
                Toast.show({
                  type: 'success',
                  text1: 'Success',
                  text2: 'Profile updated successfully',
                });
                setShowProfileEdit(false);
                setShowProfileDetails(true);
              } catch (error: any) {
                console.log('[AppNavigator] Error updating profile:', error.response?.data || error.message);
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: error.response?.data?.message || error.message || 'Failed to update profile',
                });
              }
            }}
          />
        </View>
      )}

      <AffiliateReferralModal
        visible={showAffiliateReferralModal}
        onClose={() => setShowAffiliateReferralModal(false)}
        userName={enrichedUser?.name}
        username={enrichedUser?.username}
        referralTree={referralTree}
        isDarkMode={isDarkMode}
        onViewNetwork={() => {
          setShowAffiliateReferralModal(false);
          setReferralNetworkFromTab(true);
        }}
      />

      {showSecurity && (
        <View style={styles.cartScreenOverlay}>
          <SecurityScreen
            isDarkMode={isDarkMode}
            token={token}
            onBack={() => setShowSecurity(false)}
            onGoogleLinked={() => setLinkedAccountsRefreshTrigger(prev => prev + 1)}
            onOpenHistory={() => setShowHistory(true)}
          />
        </View>
      )}

      {showHistory && (
        <View style={styles.cartScreenOverlay}>
          <HistoryScreen
            isDarkMode={isDarkMode}
            token={token}
            onBack={() => setShowHistory(false)}
          />
        </View>
      )}

      {showAboutUs && (
        <View style={styles.cartScreenOverlay}>
          <AboutUsScreen
            isDarkMode={isDarkMode}
            onBack={() => setShowAboutUs(false)}
          />
        </View>
      )}

      {showPrivacyPolicy && (
        <View style={styles.cartScreenOverlay}>
          <PrivacyPolicyScreen
            isDarkMode={isDarkMode}
            onBack={() => setShowPrivacyPolicy(false)}
          />
        </View>
      )}

      {showTermsAndConditions && (
        <View style={styles.cartScreenOverlay}>
          <TermsAndConditionsScreen
            isDarkMode={isDarkMode}
            onBack={() => setShowTermsAndConditions(false)}
          />
        </View>
      )}

      {showIncomeDisclaimer && (
        <View style={styles.cartScreenOverlay}>
          <IncomeDisclaimerScreen
            isDarkMode={isDarkMode}
            onBack={() => setShowIncomeDisclaimer(false)}
          />
        </View>
      )}

      {showCookiePolicy && (
        <View style={styles.cartScreenOverlay}>
          <CookiePolicyScreen
            isDarkMode={isDarkMode}
            onBack={() => setShowCookiePolicy(false)}
          />
        </View>
      )}

      {showRewardsAndCommissions && (
        <View style={styles.cartScreenOverlay}>
          <RewardsAndCommissionsScreen
            isDarkMode={isDarkMode}
            onBack={() => setShowRewardsAndCommissions(false)}
          />
        </View>
      )}

      {showContactUs && (
        <View style={styles.cartScreenOverlay}>
          <ContactUsScreen
            isDarkMode={isDarkMode}
            onBack={() => setShowContactUs(false)}
          />
        </View>
      )}

      {showOurBranches && (
        <View style={styles.cartScreenOverlay}>
          <OurBranchesScreen
            isDarkMode={isDarkMode}
            onBack={() => setShowOurBranches(false)}
          />
        </View>
      )}

      {showFAQs && (
        <View style={styles.cartScreenOverlay}>
          <FAQsScreen
            isDarkMode={isDarkMode}
            onBack={() => setShowFAQs(false)}
          />
        </View>
      )}

      {showShippingInfo && (
        <View style={styles.cartScreenOverlay}>
          <ShippingInfoScreen
            isDarkMode={isDarkMode}
            onBack={() => setShowShippingInfo(false)}
          />
        </View>
      )}

      {showReturns && (
        <View style={styles.cartScreenOverlay}>
          <ReturnsScreen
            isDarkMode={isDarkMode}
            onBack={() => setShowReturns(false)}
          />
        </View>
      )}

      {referralNetworkFromTab && (
        <View style={styles.cartScreenOverlay}>
          <ReferralNetworkScreen
            token={token}
            tree={referralTree}
            onBack={() => {
              setReferralNetworkFromTab(false);
              setReferralTree(null);
              setCloseReferralNetwork(true);
            }}
          />
        </View>
      )}

      {showPurchases && (
        <View style={styles.cartScreenOverlay}>
          <PurchasesScreen
            token={token}
            status={purchasesStatus}
            isDarkMode={isDarkMode}
            initialOrderId={purchasesInitialOrderId}
            onBack={() => {
              setShowPurchases(false);
              setPurchasesInitialOrderId(undefined);
            }}
            onProductPress={(productId) => {
              setShowPurchases(false);
              setPreviousTab(activeTabRef.current);
              setSelectedProductId(productId);
            }}
            onProceedToPayment={(checkoutUrl) => {
              setPaymentCheckoutUrl(checkoutUrl);
              setShowPurchases(false);
              setPaymentSourceScreen('purchases');
              setShowPaymentWebView(true);
            }}
            onBuyAgain={(items) => {
              // Transform order items to checkout format
              const checkoutItems = items.map(item => ({
                product_id: item.product_id,
                product_name: item.name,
                product_image: item.image,
                product_price_member: item.price,
                quantity: item.quantity,
                variant_color: item.selected_color,
                variant_size: item.selected_size,
                variant_type: item.selected_type,
                brand_name: item.brand_name,
                brand_id: item.brand_id,
              }));
              setCheckoutCartItems(checkoutItems);
              setShowPurchases(false);
              setCheckoutSource('cart');
              setShowCheckout(true);
            }}
          />
        </View>
      )}

      {showShippingAddressScreen && shippingAddressScreenData && (
        <View style={styles.cartScreenOverlay}>
          <ShippingAddressSelectionScreen
            addresses={shippingAddressScreenData.addresses}
            selectedAddress={shippingAddressScreenData.selectedAddress}
            isDarkMode={isDarkMode}
            onBack={() => setShowShippingAddressScreen(false)}
            onSelectAddress={(address) => {
              shippingAddressScreenData.onSelect(address);
              setShowShippingAddressScreen(false);
            }}
          />
        </View>
      )}

      {showAFWalletOverview && (
        <View style={styles.cartScreenOverlay}>
          <AFWalletOverviewScreen
            isDarkMode={isDarkMode}
            onClose={() => setShowAFWalletOverview(false)}
            token={token}
          />
        </View>
      )}

      {showAFWalletVoucher && (
        <View style={styles.cartScreenOverlay}>
          <AFWalletVoucherScreen
            isDarkMode={isDarkMode}
            onClose={() => setShowAFWalletVoucher(false)}
            token={token}
          />
        </View>
      )}

      {showAFWalletRewards && (
        <View style={styles.cartScreenOverlay}>
          <AFWalletRewardsScreen
            isDarkMode={isDarkMode}
            onClose={() => setShowAFWalletRewards(false)}
            token={token}
          />
        </View>
      )}

      {showAFWalletNetwork && (
        <View style={styles.cartScreenOverlay}>
          <AFWalletNetworkScreen
            isDarkMode={isDarkMode}
            onClose={() => setShowAFWalletNetwork(false)}
            token={token}
          />
        </View>
      )}

      {showReferralScreen && referralCodeFromDeepLink && (
        <View style={styles.cartScreenOverlay}>
          <ReferralScreen
            referrerUsername={referralCodeFromDeepLink}
            referrerName={referrerProfileData?.name}
            referrerAvatarUrl={referrerProfileData?.avatar_url}
            isDarkMode={isDarkMode}
            onClose={() => {
              setShowReferralScreen(false);
              setReferralCodeFromDeepLink(null);
              setReferrerProfileData(null);
            }}
            onRegister={() => {
              setShowReferralSignupScreen(true);
            }}
          />
        </View>
      )}

      {showReferralSignupScreen && referralCodeFromDeepLink && (
        <View style={styles.cartScreenOverlay}>
          <ReferralSignupScreen
            referrerUsername={referralCodeFromDeepLink}
            isDarkMode={isDarkMode}
            onBack={() => {
              setShowReferralSignupScreen(false);
            }}
            onContinueToOtp={() => {
              setShowReferralSignupScreen(false);
              setShowReferralScreen(false);
              setReferralCodeFromDeepLink(null);
              setReferrerProfileData(null);
            }}
          />
        </View>
      )}

      {/* Exit Confirmation Modal */}
      <Modal
        visible={showExitConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExitConfirm(false)}
      >
        <Pressable style={styles.exitModalOverlay} onPress={() => setShowExitConfirm(false)} activeOpacity={1}>
          <View style={styles.exitModalContent}>
            <Text style={styles.exitModalTitle}>Close App</Text>
            <Text style={styles.exitModalMessage}>Do you want to close the application?</Text>

            <View style={styles.exitModalButtons}>
              <Pressable
                style={[styles.exitModalButton, styles.exitModalButtonCancel]}
                onPress={() => setShowExitConfirm(false)}
              >
                <Text style={styles.exitModalButtonCancelText}>Continue</Text>
              </Pressable>

              <Pressable
                style={[styles.exitModalButton, styles.exitModalButtonClose]}
                onPress={() => BackHandler.exitApp()}
              >
                <Text style={styles.exitModalButtonCloseText}>Close App</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
    </NavigationProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fbff' },
  safe: { flex: 1, backgroundColor: Colors.white },
  body: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  h1: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  navBarContainer: {
    backgroundColor: Colors.white,
  },
  navBarContainerDark: {
    backgroundColor: '#1f2937',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    overflow: 'visible',
  },
  navBarDark: {
    backgroundColor: '#1f2937',
    borderTopColor: '#374151',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    paddingVertical: 6,
  },
  indicator: {
    height: 3,
    width: '100%',
    alignItems: 'center',
    marginBottom: 2,
  },
  indicatorLine: {
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.sky,
    marginTop: -1,
  },
  iconWrap: {
    position: 'relative',
  },
  homeLogoImage: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
  shopLogoImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    marginTop: -4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeDark: {
    borderColor: '#111827',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 11,
  },
  navLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  navLabelActive: {
    color: Colors.sky,
    fontWeight: '700',
  },
  navLabelDark: {
    color: '#d1d5db',
  },
  navLabelActiveDark: {
    color: '#38bdf8',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarActive: {
    borderColor: Colors.sky,
    backgroundColor: '#e0f2fe',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 13,
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  avatarInitialActive: {
    color: Colors.sky,
  },
  shopItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    paddingBottom: 4,
  },
  shopSlot: {
    height: 37,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  shopDiamond: {
    width: 48,
    height: 48,
    backgroundColor: Colors.sky,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    shadowColor: Colors.sky,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  shopDiamondActive: {
    backgroundColor: Colors.skyDark,
  },
  shopDiamondInner: {
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
    height: '100%',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
  },
  menuPanel: {
    width: '78%',
    maxWidth: 320,
    backgroundColor: Colors.white,
    padding: 18,
    paddingTop: 36,
    borderBottomRightRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '100%',
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 12,
  },
  menuItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2b2f38',
  },
  menuText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  tokenModal: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  tokenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  tokenSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  tokenBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tokenText: {
    fontSize: 11,
    color: Colors.text,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  tokenCopyBtn: {
    backgroundColor: Colors.sky,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
  },
  tokenCopyText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  tokenCloseBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tokenCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  cartScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: Colors.white,
  },
  exitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  exitModalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: 12,
  },
  exitModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  exitModalMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  exitModalButtons: {
    width: '100%',
    gap: 10,
  },
  exitModalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitModalButtonCancel: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  exitModalButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  exitModalButtonClose: {
    backgroundColor: Colors.error,
  },
  exitModalButtonCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
});


