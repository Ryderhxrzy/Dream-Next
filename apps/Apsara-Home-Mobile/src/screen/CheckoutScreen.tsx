import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  Image,
  Dimensions,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { API_CONFIG } from '../config/api';
import Toast from 'react-native-toast-message';

const SCREEN_WIDTH = Dimensions.get('window').width;

const getBrandLogo = (brandName: string, brands: BrandItem[]): string | null => {
  const brand = brands.find(b => b.name === brandName);
  if (!brand) return null;
  return brand.logo || (brand as any).brand_image || (brand as any).image || null;
};

interface CheckoutItem {
  product_id: number;
  product_name: string;
  product_image: string;
  product_price_member: number;
  product_price_srp?: number;
  brand_name?: string;
  quantity: number;
  variant_color?: string;
  variant_size?: string;
  variant_image?: string;
  brand_id?: number;
}

interface ShippingMethod {
  id: number;
  province: string;
  city: string;
  fee: number;
  status: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  logo?: string;
  subtitle?: string;
  badge?: string;
}

interface UserAddress {
  id: number;
  full_name: string;
  phone: string;
  address: string;
  region: string;
  province: string;
  city: string;
  barangay: string;
  zip_code: string;
  address_type: string;
  notes?: string;
  is_default: boolean;
  full_address: string;
}

interface BrandItem {
  id: number;
  name: string;
}

interface CheckoutScreenProps {
  item?: CheckoutItem;
  items?: any[];
  token?: string | null;
  user?: {
    name: string;
    phone?: string;
    email?: string;
    referrer_username?: string;
    referrer_name?: string;
  } | null;
  onBack?: () => void;
  onPlaceOrder?: (orderData: any) => Promise<void>;
  onNavigateToOrderSuccess?: (orderData: any) => void;
  onShopNavigate?: (brandId: number, shopName: string) => void;
  onNavigateToShippingAddress?: (addresses: UserAddress[], selectedAddress: UserAddress | null, onSelect: (address: UserAddress) => void) => void;
  brands?: BrandItem[];
  isDarkMode?: boolean;
}

export default function CheckoutScreen({
  item,
  items,
  token,
  user,
  onBack,
  onPlaceOrder,
  onNavigateToOrderSuccess,
  onShopNavigate,
  onNavigateToShippingAddress,
  brands = [],
  isDarkMode = false,
}: CheckoutScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [loadingShippingRates, setLoadingShippingRates] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<number | null>(null);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [isShippingExpanded, setIsShippingExpanded] = useState(true);
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
    borderLight: isDarkMode ? '#475569' : '#f1f5f9',
  };

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'gcash',
      name: 'GCash',
      icon: 'card',
      logo: 'https://wp.logos-download.com/wp-content/uploads/2020/06/GCash_Logo.png?dl',
      subtitle: 'Pay via GCash wallet',
      badge: 'Popular'
    },
    {
      id: 'maya',
      name: 'PayMaya',
      icon: 'card',
      logo: 'https://i.pinimg.com/474x/c8/bf/fc/c8bffcd5f259fee239e58ee22571a2f2.jpg',
      subtitle: 'Pay via Maya wallet',
      badge: 'Fast'
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: 'card',
      logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMwnnYyysKBShjpO_tS1hVLE9BKlheWWzvTg&s',
      subtitle: 'Visa or Master Card',
      badge: '3DS Secured'
    },
    {
      id: 'online_banking',
      name: 'Online Banking',
      icon: 'checkmark-circle',
      logo: 'https://support.coins.ph/hc/article_attachments/360000692201',
      subtitle: 'Instapay / Peso Net',
      badge: 'Bank Transfer'
    },
  ];

  const vouchers = [
    { id: 1, code: 'WELCOME20', description: '20% off your first purchase', discount: 0.20 },
    { id: 2, code: 'FREESHIP', description: 'Free shipping on orders above ₱500', discount: 0 },
  ];

  const voucherDiscount = selectedVoucher ? (vouchers.find(v => v.id === selectedVoucher)?.discount || 0) * subtotal : 0;

  // Fetch user addresses
  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_CONFIG.BASE_URL}/auth/addresses`, { headers });
      if (response.data && response.data.addresses) {
        setAddresses(response.data.addresses);
        // Set default address as selected
        const defaultAddr = response.data.addresses.find((a: UserAddress) => a.is_default);
        if (defaultAddr) {
          setSelectedAddress(defaultAddr);
        } else if (response.data.addresses.length > 0) {
          setSelectedAddress(response.data.addresses[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load addresses',
      });
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Fetch shipping rates based on selected address
  const fetchShippingRates = async (address?: UserAddress) => {
    const targetAddress = address || selectedAddress;
    if (!targetAddress) return;

    setLoadingShippingRates(true);
    try {
      const response = await axios.get(`${API_CONFIG.BASE_URL}/shipping-rates`);
      if (response.data && response.data.rates) {
        // Normalize city name (remove "City of" prefix for matching)
        const normalizeCity = (city: string) => {
          return city.toLowerCase().replace(/^city of\s+/, '').trim();
        };

        const normalizedTargetCity = normalizeCity(targetAddress.city);

        // Filter rates by CITY ONLY (most important)
        const filteredRates = response.data.rates.filter(
          (rate: ShippingMethod) => {
            const normalizedRateCity = normalizeCity(rate.city);
            return normalizedRateCity === normalizedTargetCity && rate.status;
          }
        );

        setShippingMethods(filteredRates);

        console.log('Shipping rates fetched:', {
          userCity: targetAddress.city,
          normalizedCity: normalizedTargetCity,
          ratesFound: filteredRates.length,
          rates: filteredRates.map(r => ({ city: r.city, fee: r.fee })),
        });

        // Show warning if no rates found
        if (filteredRates.length === 0) {
          Toast.show({
            type: 'info',
            text1: 'No Shipping Available',
            text2: `We don't have shipping rates for ${targetAddress.city} yet.`,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch shipping rates:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load shipping rates',
      });
    } finally {
      setLoadingShippingRates(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await fetchAddresses();
    };
    initialize();
  }, [token]);

  useEffect(() => {
    if (selectedAddress) {
      fetchShippingRates(selectedAddress);
    }
  }, [selectedAddress]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack?.();
      return true;
    });

    return () => backHandler.remove();
  }, [onBack]);

  // Group items by brand
  const groupItemsByBrand = (itemsToGroup: CheckoutItem[]) => {
    const grouped: { [key: string]: CheckoutItem[] } = {};
    itemsToGroup.forEach(item => {
      const brand = item.brand_name || 'Unknown Brand';
      if (!grouped[brand]) {
        grouped[brand] = [];
      }
      grouped[brand].push(item);
    });
    return grouped;
  };

  // Calculate totals - handle both single item and multiple items
  const checkoutItems = items && items.length > 0 ? items : (item ? [item] : []);
  const groupedItems = groupItemsByBrand(checkoutItems);
  const subtotal = checkoutItems.reduce((sum, i) => {
    const srpPrice = i.product_price_srp || i.product_price_member;
    return sum + (srpPrice * (i.quantity || 1));
  }, 0);
  const memberTotal = checkoutItems.reduce((sum, i) => sum + (i.product_price_member * (i.quantity || 1)), 0);
  // const shippingCost = shippingMethods.length > 0 ? shippingMethods[0].fee : 0;
  const shippingCost = 0; // Testing: disabled shipping fees
  const selectedShippingMethod = shippingMethods.length > 0 ? shippingMethods[0] : null;
  const shopDiscount = subtotal - memberTotal;
  const total = memberTotal - voucherDiscount + shippingCost;


  const handlePlaceOrder = async () => {
    console.log('[CheckoutScreen] Place order clicked');

    if (!selectedPaymentMethod) {
      Toast.show({
        type: 'error',
        text1: 'Payment Method Required',
        text2: 'Please select a payment method',
      });
      return;
    }

    if (!user || !selectedAddress || !token || checkoutItems.length === 0) {
      console.log('[CheckoutScreen] Missing required fields:', {
        hasItems: checkoutItems.length > 0,
        hasUser: !!user,
        hasAddress: !!selectedAddress,
        hasToken: !!token,
      });
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please complete all required fields',
      });
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      const deviceId = Device.deviceId || 'unknown';
      const appVersion = '1.0.0';
      const platformName = Platform.OS === 'ios' ? 'ios' : 'android';

      // REQUIRED FIELDS
      const totalQuantity = checkoutItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
      const paymentPayload: any = {
        amount: Math.round(total * 100) / 100,
        description: `Order - ${checkoutItems.length} item${checkoutItems.length > 1 ? 's' : ''} (${totalQuantity} total)`,
        payment_method: selectedPaymentMethod,
        platform: platformName,
        app_version: appVersion,
      };

      // OPTIONAL FIELDS
      paymentPayload.payment_mode = 'test';
      paymentPayload.device_id = deviceId;

      // Customer info (optional)
      if (user?.name || user?.email || user?.phone) {
        paymentPayload.customer = {
          name: user?.name || selectedAddress.full_name,
          email: user?.email,
          phone: user?.phone || selectedAddress.phone,
          address: selectedAddress.full_address || `${selectedAddress.address}, ${selectedAddress.city}, ${selectedAddress.province}`,
          referred_by: user?.referrer_username,
          is_member: false,
        };
      }

      // Order details (optional) - handle both single and multiple items
      if (checkoutItems.length === 1) {
        // Single item - use old format for backward compatibility
        const singleItem = checkoutItems[0];
        paymentPayload.order = {
          product_name: singleItem.product_name,
          product_id: singleItem.product_id,
          product_sku: `SKU-${singleItem.product_id}`,
          product_image: singleItem.variant_image || singleItem.product_image,
          quantity: singleItem.quantity,
          subtotal: Math.round(memberTotal * 100) / 100,
          // handling_fee: Math.round(shippingCost * 100) / 100,
          handling_fee: 0,
        };
        if (singleItem.variant_color) paymentPayload.order.selected_color = singleItem.variant_color;
        if (singleItem.variant_size) paymentPayload.order.selected_size = singleItem.variant_size;
      } else {
        // Multiple items
        paymentPayload.order = {
          items: checkoutItems.map(i => ({
            product_name: i.product_name,
            product_id: i.product_id,
            product_sku: `SKU-${i.product_id}`,
            product_image: i.variant_image || i.product_image,
            quantity: i.quantity,
            variant_color: i.variant_color,
            variant_size: i.variant_size,
          })),
          subtotal: Math.round(memberTotal * 100) / 100,
          // handling_fee: Math.round(shippingCost * 100) / 100,
          handling_fee: 0,
        };
      }

      console.log('[CheckoutScreen] Order object:', {
        items: checkoutItems.length,
        quantity: totalQuantity,
        subtotal: Math.round(memberTotal * 100) / 100,
      });

      // Voucher (optional)
      if (selectedVoucher) {
        const voucherCode = vouchers.find(v => v.id === selectedVoucher)?.code;
        if (voucherCode) {
          paymentPayload.voucher_code = voucherCode;
        }
      }

      console.log('[CheckoutScreen] Payment payload:', JSON.stringify(paymentPayload, null, 2));
      const apiUrl = `${API_CONFIG.BASE_URL}/mobile/payments/create`;
      console.log('[CheckoutScreen] Calling API:', apiUrl);
      console.log('[CheckoutScreen] Payment method:', selectedPaymentMethod, '-> lowercase:', selectedPaymentMethod.toLowerCase());

      const response = await axios.post(apiUrl, paymentPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[CheckoutScreen] ✅ API SUCCESS:', {
        status: response.status,
        orderId: response.data?.order_id,
        checkoutId: response.data?.checkout_id,
        mobileOrderId: response.data?.mobile_order_id,
        hasCheckoutUrl: !!response.data?.checkout_url,
        fullResponse: JSON.stringify(response.data, null, 2),
      });

      if (response.data?.checkout_url) {
        const orderData = {
          item: checkoutItems.length === 1 ? checkoutItems[0] : undefined,
          items: checkoutItems,
          user,
          selectedAddress,
          selectedPaymentMethod,
          shippingCost,
          voucherDiscount,
          selectedVoucher,
          subtotal,
          shopDiscount,
          total,
          token,
          checkoutUrl: response.data.checkout_url,
          orderId: response.data?.order_id,
          checkoutId: response.data?.checkout_id,
          mobileOrderId: response.data?.mobile_order_id,
          paymentIntentId: response.data?.payment_intent_id,
        };

        console.log('[CheckoutScreen] 📍 ORDER DATA CREATED:', {
          orderId: orderData.orderId,
          checkoutId: orderData.checkoutId,
          mobileOrderId: orderData.mobileOrderId,
          paymentIntentId: orderData.paymentIntentId,
        });

        console.log('[CheckoutScreen] 🚀 Navigating to PaymentWebView with checkout URL');
        onNavigateToOrderSuccess?.(orderData);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'No checkout URL received from server',
        });
      }
    } catch (error: any) {
      console.error('[CheckoutScreen] ❌ API ERROR:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });

      const errorMsg = error.response?.data?.message
        || error.response?.data?.error
        || error.response?.statusText
        || 'Failed to create payment';

      Toast.show({
        type: 'error',
        text1: 'Payment Error',
        text2: errorMsg,
      });
    } finally {
      // Ensure loading state is visible for at least 800ms
      const elapsedTime = Date.now() - startTime;
      const minDuration = 800;
      const remainingTime = Math.max(0, minDuration - elapsedTime);

      if (remainingTime > 0) {
        setTimeout(() => setLoading(false), remainingTime);
      } else {
        setLoading(false);
      }
    }
  };

  if (checkoutItems.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <LinearGradient
          colors={[Colors.forest, Colors.forestDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.header, { paddingTop: insets.top, borderBottomColor: '#e5e7eb' }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="chevron-back-outline" size={24} color={Colors.forest} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerGreeting}>Checkout</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSec }]}>No item selected</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={isDarkMode ? ['rgba(59,130,246,0.15)', 'rgba(31,41,55,0)'] : ['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#1f2937' : Colors.white, borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={[styles.backBtn, isDarkMode ? { backgroundColor: '#374151', borderColor: '#4b5563' } : { backgroundColor: '#f1f5f9', borderColor: '#e5e7eb' }]}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back-outline" size={20} color={isDarkMode ? '#e5e7eb' : Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerGreeting, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>
              Checkout
            </Text>
            {user?.name && (
              <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#9ca3af' : Colors.textSecondary }]} numberOfLines={1}>
                {user.name}
              </Text>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={[styles.content, { backgroundColor: colors.bg }]}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Order Item Section - Grouped by Brand */}
        {Object.entries(groupedItems).map(([brandName, brandItems]) => (
          <View key={brandName} style={[styles.section, { backgroundColor: colors.containerBg, padding: 0 }]}>
            {/* Shop Header */}
            <TouchableOpacity
              style={[styles.shopHeader, { borderBottomColor: colors.border, backgroundColor: colors.containerBg }]}
              onPress={() => {
                if (onShopNavigate) {
                  // Try multiple sources for brand ID
                  let brandId = (brandItems[0] as any)?.brand_id;
                  if (!brandId) {
                    const brand = brands.find(b => b.name === brandName);
                    brandId = brand?.id;
                  }
                  if (!brandId) {
                    brandId = 0;
                  }
                  console.log('[CheckoutScreen] Brand clicked:', { brandName, brandId, fromItem: (brandItems[0] as any)?.brand_id, fromBrandsArray: brands.find(b => b.name === brandName)?.id, availableBrands: brands.length });
                  onShopNavigate(brandId, brandName);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.shopInfo}>
                {(() => {
                  const logoUrl = getBrandLogo(brandName, brands);
                  if (logoUrl) {
                    return (
                      <Image
                        source={{ uri: logoUrl }}
                        style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border }}
                      />
                    );
                  }
                  return <Ionicons name="storefront" size={16} color={Colors.sky} />;
                })()}
                <Text style={[styles.shopName, { color: colors.text }]} numberOfLines={1}>
                  {brandName}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.sky} />
            </TouchableOpacity>

            {/* Product Cards for this Brand */}
            {brandItems.map((checkoutItem, itemIndex) => (
              <View key={itemIndex} style={[styles.itemCard, { borderColor: colors.border, backgroundColor: colors.borderLight, marginHorizontal: 12, marginTop: itemIndex === 0 ? 8 : 8, marginBottom: 8 }]}>
                <Image
                  source={{ uri: checkoutItem.variant_image || checkoutItem.product_image }}
                  style={styles.itemImage}
                  resizeMode="contain"
                />
                <View style={styles.itemDetails}>
                  <View>
                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                      {checkoutItem.product_name}
                    </Text>
                    {(checkoutItem.variant_color || checkoutItem.variant_size) && (
                      <Text style={[styles.itemVariantInfo, { color: colors.textSec }]}>
                        {checkoutItem.variant_color && `${checkoutItem.variant_color}`}
                        {checkoutItem.variant_color && checkoutItem.variant_size && ', '}
                        {checkoutItem.variant_size && `${checkoutItem.variant_size}`}
                      </Text>
                    )}
                  </View>
                  <View style={styles.itemFooter}>
                    <View style={styles.itemPriceContainer}>
                      <Text style={[styles.itemPrice, { color: Colors.sky }]}>
                        ₱{checkoutItem.product_price_member.toLocaleString()}
                      </Text>
                      {checkoutItem.product_price_srp && checkoutItem.product_price_srp > checkoutItem.product_price_member && (
                        <Text style={[styles.itemPriceSrp, { color: colors.textSec }]}>
                          ₱{checkoutItem.product_price_srp.toLocaleString()}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.itemQty, { color: colors.textSec }]}>
                      x{checkoutItem.quantity}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Shipping Address Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, padding: 0 }]}>
          <TouchableOpacity
            style={[styles.shippingHeaderRow, { borderBottomColor: colors.border, backgroundColor: colors.containerBg }]}
            onPress={() => setIsAddressExpanded(!isAddressExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.shippingHeaderInfo}>
              <Ionicons name="location" size={16} color={Colors.sky} />
              <Text style={[styles.shippingTitle, { color: colors.text }]}>Shipping To</Text>
            </View>
            <View style={styles.viewShippingContainer}>
              {addresses.length > 1 && !isAddressExpanded && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    onNavigateToShippingAddress?.(addresses, selectedAddress, setSelectedAddress);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.viewShippingText, { color: colors.textSec }]}>Change</Text>
                </TouchableOpacity>
              )}
              <Ionicons
                name={isAddressExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={Colors.sky}
              />
            </View>
          </TouchableOpacity>

          {!isAddressExpanded ? (
            // Sneak peek - collapsed view
            <View style={[styles.shippingContent, { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }]}>
              {selectedAddress ? (
                <View style={[styles.addressCardCompact, { backgroundColor: colors.borderLight, borderColor: colors.border, borderWidth: 1 }]}>
                  <Text style={[styles.addressNameCompact, { color: colors.text }]} numberOfLines={1}>
                    {selectedAddress.full_name}
                  </Text>
                  <Text style={[styles.addressTextCompact, { color: colors.textSec }]} numberOfLines={1}>
                    {selectedAddress.full_address}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.textSec }]}>No address found</Text>
              )}
            </View>
          ) : (
            // Full view - expanded
            <View style={[styles.shippingContent, { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }]}>
              {loadingAddresses ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={Colors.sky} />
                  <Text style={[styles.loadingText, { color: colors.textSec }]}>Loading addresses...</Text>
                </View>
              ) : selectedAddress ? (
                <View>
                  <View style={[styles.addressCard, { backgroundColor: colors.borderLight, borderColor: colors.border }]}>
                    <Text style={[styles.addressType, { color: Colors.forest }]}>
                      {selectedAddress.address_type}
                    </Text>
                    <Text style={[styles.addressName, { color: colors.text }]} numberOfLines={1}>
                      {selectedAddress.full_name} <Text style={[styles.addressPhone, { color: colors.textSec }]}>({selectedAddress.phone})</Text>
                    </Text>
                    <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={3}>
                      {selectedAddress.full_address}
                    </Text>
                    {selectedAddress.notes && (
                      <Text style={[styles.addressNotes, { color: colors.textSec }]}>
                        Notes: {selectedAddress.notes}
                      </Text>
                    )}
                  </View>

                  {/* Shipping Cost Display */}
                  {loadingShippingRates ? (
                    <View style={styles.shippingInfoContainer}>
                      <ActivityIndicator size="small" color={Colors.sky} />
                      <Text style={[styles.loadingText, { color: colors.textSec }]}>Loading shipping...</Text>
                    </View>
                  ) : selectedShippingMethod ? (
                    <View style={[styles.shippingInfo, { backgroundColor: colors.borderLight, marginTop: 8 }]}>
                      <View style={styles.shippingDetail}>
                        <Ionicons name="car" size={16} color={Colors.sky} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.shippingLabel, { color: colors.textSec }]}>Shipping</Text>
                          <Text style={[styles.shippingCity, { color: colors.text }]}>
                            {selectedShippingMethod.city}, {selectedShippingMethod.province}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.shippingCost, { color: Colors.sky }]}>
                        ₱{shippingCost.toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.textSec }]}>No address found</Text>
              )}
            </View>
          )}
        </View>

        {/* Referred By Section */}
        {user?.referrer_username && (
          <View style={[styles.section, { backgroundColor: colors.containerBg, padding: 0 }]}>
            <View style={[styles.shippingHeaderRow, { borderBottomColor: colors.border, backgroundColor: colors.containerBg }]}>
              <View style={styles.shippingHeaderInfo}>
                <Ionicons name="person" size={16} color={Colors.sky} />
                <Text style={[styles.shippingTitle, { color: colors.text }]}>Referred By</Text>
              </View>
            </View>

            <View style={[styles.shippingContent, { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 }]}>
              <View style={[styles.referrerCard, { backgroundColor: colors.borderLight, borderColor: colors.border }]}>
                <Ionicons name="person-circle" size={32} color={Colors.sky} />
                <Text style={[styles.referrerUsername, { color: colors.text }]}>
                  @{user.referrer_username}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment Method Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, padding: 0 }]}>
          <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>
              {!selectedPaymentMethod && (
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '500' }}>Required *</Text>
              )}
            </View>
          </View>

          <View style={[styles.paymentGrid, { paddingHorizontal: 14, paddingVertical: 12 }]}>
            {paymentMethods.map((method) => {
              const getBadgeColor = (methodId: string) => {
                const badgeColors: { [key: string]: string } = {
                  'gcash': '#1F2EF5',
                  'maya': '#FF6B00',
                  'card': '#FF0080',
                  'online_banking': '#00B050',
                };
                return badgeColors[methodId] || Colors.sky;
              };

              const badgeColor = getBadgeColor(method.id);

              return (
                <TouchableOpacity
                  key={method.id}
                  style={styles.paymentGridItem}
                  onPress={() => setSelectedPaymentMethod(method.id)}
                >
                  <View style={styles.paymentGridCard}>
                    {method.logo ? (
                      <Image
                        source={{ uri: method.logo }}
                        style={styles.paymentGridLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      <Ionicons name={method.icon as any} size={28} color={Colors.sky} />
                    )}
                    <View style={styles.paymentGridNameContainer}>
                      <Text style={[styles.paymentGridName, { color: colors.text }]} numberOfLines={1}>
                        {method.name}
                      </Text>
                      {method.subtitle && (
                        <Text style={[styles.paymentGridSubtitle, { color: colors.textSec }]} numberOfLines={1}>
                          {method.subtitle}
                        </Text>
                      )}
                    </View>
                    {method.badge && (
                      <View style={[styles.paymentBadge, { backgroundColor: badgeColor }]}>
                        <Text style={styles.paymentBadgeText}>{method.badge}</Text>
                      </View>
                    )}
                    <View style={[
                      styles.paymentCircleCheckbox,
                      selectedPaymentMethod === method.id && styles.paymentCircleCheckboxSelected
                    ]}>
                      {selectedPaymentMethod === method.id && (
                        <Ionicons name="checkmark" size={14} color={Colors.white} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Shipping Options Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, padding: 0 }]}>
          <TouchableOpacity
            style={[styles.shippingHeaderRow, { borderBottomColor: colors.border, backgroundColor: colors.containerBg }]}
            onPress={() => setIsShippingExpanded(!isShippingExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.shippingHeaderInfo}>
              <Ionicons name="layers" size={16} color={Colors.sky} />
              <Text style={[styles.shippingTitle, { color: colors.text }]}>Shipping Options</Text>
            </View>
            <View style={styles.viewShippingContainer}>
              <Ionicons
                name={isShippingExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={Colors.sky}
              />
            </View>
          </TouchableOpacity>

          {isShippingExpanded && (
            <View style={[styles.shippingContent, { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }]}>
              <View style={styles.shippingOptionsContainer}>
                {/* AF Home Delivery - Default */}
                <TouchableOpacity style={[styles.shippingOptionCard, { backgroundColor: colors.borderLight, borderColor: Colors.sky }]}>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionName, { color: colors.text }]}>AF Home Delivery</Text>
                    <Text style={[styles.optionDays, { color: colors.textSec }]}>Standard</Text>
                  </View>
                  <Text style={[styles.optionPrice, { color: Colors.sky }]}>₱{shippingCost.toLocaleString()}</Text>
                </TouchableOpacity>

                {/* Other Shipping Partners */}
                {shippingMethods.slice(0, 2).map((method, index) => (
                  <TouchableOpacity key={index} style={[styles.shippingOptionCard, { backgroundColor: colors.borderLight, borderColor: colors.border }]}>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionName, { color: colors.text }]}>{method.province}</Text>
                      <Text style={[styles.optionDays, { color: colors.textSec }]}>Delivery</Text>
                    </View>
                    <Text style={[styles.optionPrice, { color: Colors.sky }]}>₱{method.fee.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Voucher Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Vouchers</Text>
          <View style={styles.voucherList}>
            {vouchers.map((voucher) => (
              <TouchableOpacity
                key={voucher.id}
                style={[
                  styles.voucherCard,
                  {
                    backgroundColor: selectedVoucher === voucher.id ? `${Colors.sky}15` : colors.borderLight,
                    borderColor: selectedVoucher === voucher.id ? Colors.sky : colors.border,
                  },
                ]}
                onPress={() => setSelectedVoucher(selectedVoucher === voucher.id ? null : voucher.id)}
              >
                <View style={styles.voucherContent}>
                  <Text style={[styles.voucherCode, { color: Colors.sky }]}>{voucher.code}</Text>
                  <Text style={[styles.voucherDesc, { color: colors.textSec }]}>{voucher.description}</Text>
                </View>
                {selectedVoucher === voucher.id && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.sky} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price Summary Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, marginBottom: 0 }]}>
          <Text style={[styles.paymentDetailsLabel, { color: colors.text }]}>Payment Details</Text>

          <View style={[styles.priceRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.priceLabel, { color: colors.textSec }]}>Quantity</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>
              x{checkoutItems.reduce((sum, i) => sum + (i.quantity || 1), 0)}
            </Text>
          </View>

          <View style={[styles.priceRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.priceLabel, { color: colors.textSec }]}>Subtotal</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>
              ₱{subtotal.toLocaleString()}
            </Text>
          </View>

          {shopDiscount > 0 && (
            <View style={[styles.priceRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.priceLabel, { color: colors.textSec }]}>Member Discount</Text>
              <Text style={[styles.priceValue, { color: Colors.sky }]}>
                -₱{shopDiscount.toLocaleString()}
              </Text>
            </View>
          )}

          {voucherDiscount > 0 && (
            <View style={[styles.priceRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.priceLabel, { color: colors.textSec }]}>Voucher Discount ({selectedVoucher && vouchers.find(v => v.id === selectedVoucher)?.code})</Text>
              <Text style={[styles.priceValue, { color: Colors.sky }]}>
                -₱{voucherDiscount.toLocaleString()}
              </Text>
            </View>
          )}

          <View style={[styles.priceRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.priceLabel, { color: colors.textSec }]}>Shipping</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>
              ₱{shippingCost.toLocaleString()}
            </Text>
          </View>

          <View style={[styles.priceRow, { borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 12 }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalPrice, { color: Colors.sky }]}>
              ₱{total.toLocaleString()}
            </Text>
          </View>
        </View>
      </ScrollView>


      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.containerBg,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <View style={styles.footerContent}>
          <View style={styles.footerPrice}>
            <Text style={[styles.footerPriceLabel, { color: colors.textSec }]}>Total</Text>
            <Text style={[styles.footerPriceValue, { color: Colors.sky }]}>
              ₱{total.toLocaleString()}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.placeOrderBtn,
              {
                backgroundColor: loading ? '#64748b' : Colors.sky,
                opacity: 1,
              },
            ]}
            onPress={handlePlaceOrder}
            disabled={loading}
            activeOpacity={loading ? 1 : 0.7}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color={Colors.white} />
                <Text style={styles.placeOrderBtnText}>Processing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="bag-check" size={18} color={Colors.white} />
                <Text style={styles.placeOrderBtnText}>Place Order</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingContainer, { backgroundColor: colors.containerBg }]}>
            <ActivityIndicator size="large" color={Colors.sky} />
            <Text style={[styles.loadingText, { color: colors.text, marginTop: 16 }]}>
              Processing your order...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 0,
    marginRight: 0,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerGreeting: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 0,
    gap: 0,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  section: {
    borderRadius: 0,
    padding: 14,
    marginHorizontal: 0,
    width: '100%',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  itemCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  shopName: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewBrandText: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemVariantInfo: {
    fontSize: 10,
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemPriceSrp: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  itemQty: {
    fontSize: 11,
  },
  paymentList: {
    gap: 10,
  },
  paymentListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentGridItem: {
    width: '100%',
  },
  paymentGridCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
    minHeight: 50,
    gap: 10,
  },
  paymentGridLogo: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  paymentGridNameContainer: {
    flex: 1,
    marginRight: 8,
  },
  paymentGridName: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentGridSubtitle: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: Colors.sky,
  },
  paymentBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.white,
  },
  paymentGridCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  paymentCircleCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  paymentCircleCheckboxSelected: {
    borderColor: Colors.sky,
    backgroundColor: Colors.sky,
  },
  paymentListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  paymentListName: {
    fontSize: 13,
    fontWeight: '500',
  },
  paymentLogo: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  circleCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  circleCheckboxSelected: {
    borderColor: Colors.sky,
    backgroundColor: Colors.sky,
  },
  paymentDetailsLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  methodCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodName: {
    fontSize: 13,
    fontWeight: '600',
  },
  methodDays: {
    fontSize: 11,
  },
  methodPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  voucherList: {
    gap: 10,
  },
  voucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  voucherContent: {
    flex: 1,
  },
  voucherCode: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  voucherDesc: {
    fontSize: 11,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceDisplayFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceValueSrp: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerPrice: {
    flex: 1,
  },
  footerPriceLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  footerPriceValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  placeOrderBtn: {
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  placeOrderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  shippingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  shippingHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  shippingTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  shippingContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  viewShippingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewShippingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  addressEditBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  addressCardCompact: {
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
  },
  addressNameCompact: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  addressTextCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  addressType: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  addressName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 16,
  },
  addressPhone: {
    fontSize: 11,
  },
  addressText: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 6,
  },
  addressNotes: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  addressModal: {
    width: '90%',
    borderRadius: 16,
    maxHeight: '75%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  addressList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  addressListItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  addressListContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  addressListType: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  addressListName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 16,
  },
  addressListPhone: {
    fontSize: 11,
  },
  addressListAddress: {
    fontSize: 11,
    lineHeight: 15,
  },
  shippingInfoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  shippingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  shippingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  shippingLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  shippingCity: {
    fontSize: 12,
    fontWeight: '600',
  },
  shippingCost: {
    fontSize: 14,
    fontWeight: '700',
  },
  shippingOptionsSeparator: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  shippingOptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shippingOptionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
  },
  shippingOptionsContainer: {
    gap: 10,
  },
  shippingOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDays: {
    fontSize: 11,
  },
  optionPrice: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 12,
  },
  referrerCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referrerUsername: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
