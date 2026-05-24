import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { API_CONFIG } from '../config/api';
import Toast from 'react-native-toast-message';

interface OrderData {
  item: {
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
  };
  user: {
    name: string;
    phone?: string;
    email?: string;
    referrer_username?: string;
  };
  selectedAddress: {
    full_name: string;
    phone: string;
    full_address: string;
  };
  selectedPaymentMethod: string;
  shippingCost: number;
  voucherDiscount: number;
  selectedVoucher: number | null;
  subtotal: number;
  shopDiscount: number;
  total: number;
  token?: string;
}

interface OrderSuccessScreenProps {
  orderData: OrderData;
  onBack?: () => void;
  onNavigateToPayment?: (checkoutUrl: string) => void;
  onPayLater?: () => void;
  isDarkMode?: boolean;
}

export default function OrderSuccessScreen({
  orderData,
  onBack,
  onNavigateToPayment,
  onPayLater,
  isDarkMode = false,
}: OrderSuccessScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    containerBg: isDarkMode ? '#1f2937' : '#ffffff',
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
    borderLight: isDarkMode ? '#475569' : '#f1f5f9',
  };

  const handlePayment = async () => {
    console.log('[OrderSuccessScreen] Proceed to payment clicked');

    if (!orderData.token) {
      console.log('[OrderSuccessScreen] Missing authentication token');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Authentication token missing',
      });
      return;
    }

    console.log('[OrderSuccessScreen] Token found, setting loading to true');
    setLoading(true);

    try {
      console.log('[OrderSuccessScreen] Using checkout URL from orderData');

      if (orderData.checkoutUrl) {
        // Wait a moment to let user see the loading state
        await new Promise(resolve => setTimeout(resolve, 500));

        Toast.show({
          type: 'success',
          text1: 'Redirecting to Payment',
          text2: 'Opening PayMongo checkout...',
        });

        console.log('[OrderSuccessScreen] Navigating to payment with checkout URL');
        onNavigateToPayment?.(orderData.checkoutUrl);
      } else {
        console.log('[OrderSuccessScreen] No checkout URL in orderData');
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Checkout URL not available',
        });
        setLoading(false);
      }
    } catch (error: any) {
      console.error('[OrderSuccessScreen] Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to proceed to payment',
      });
      setLoading(false);
    } finally {
      console.log('[OrderSuccessScreen] Setting loading to false');
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={isDarkMode ? ['rgba(59,130,246,0.15)', 'rgba(31,41,55,0)'] : ['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#1f2937' : Colors.white, borderBottomColor: colors.border, borderBottomWidth: 1 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back-outline" size={24} color={isDarkMode ? '#e5e7eb' : Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerGreeting, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>
              Order Summary
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={[styles.content, { backgroundColor: colors.bg }]}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Success Icon Section */}
        <View style={[styles.successSection, { backgroundColor: colors.containerBg, marginTop: 16, borderColor: colors.border }]}>
          <View style={[styles.successIconContainer, { backgroundColor: `${Colors.forest}15` }]}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.forest} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Order Ready</Text>
          <Text style={[styles.successSubtitle, { color: colors.textSec }]}>
            Review your order and proceed to payment
          </Text>
        </View>

        {/* Product Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, marginTop: 12, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Product Details</Text>

          <View style={[styles.productCard, { backgroundColor: colors.borderLight, borderColor: colors.border }]}>
            <View style={styles.productContent}>
              <View>
                <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                  {orderData.item.product_name}
                </Text>
                {(orderData.item.variant_color || orderData.item.variant_size) && (
                  <Text style={[styles.productVariant, { color: colors.textSec }]}>
                    {orderData.item.variant_color && `${orderData.item.variant_color}`}
                    {orderData.item.variant_color && orderData.item.variant_size && ', '}
                    {orderData.item.variant_size && `${orderData.item.variant_size}`}
                  </Text>
                )}
              </View>
              <View style={styles.priceQtyContainer}>
                <View>
                  <Text style={[styles.productPrice, { color: Colors.sky }]}>
                    ₱{orderData.item.product_price_member.toLocaleString()}
                  </Text>
                  {orderData.item.product_price_srp && orderData.item.product_price_srp > orderData.item.product_price_member && (
                    <Text style={[styles.productPriceSrp, { color: colors.textSec }]}>
                      ₱{orderData.item.product_price_srp.toLocaleString()}
                    </Text>
                  )}
                </View>
                <Text style={[styles.productQty, { color: colors.textSec }]}>
                  x{orderData.item.quantity}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Shipping Address Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, marginTop: 12, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Delivery Address</Text>

          <View style={[styles.addressCard, { backgroundColor: colors.borderLight, borderColor: colors.border }]}>
            <View style={styles.addressRow}>
              <Ionicons name="location" size={16} color={Colors.sky} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.addressName, { color: colors.text }]}>
                  {orderData.selectedAddress.full_name}
                </Text>
                <Text style={[styles.addressPhone, { color: colors.textSec }]}>
                  {orderData.selectedAddress.phone}
                </Text>
                <Text style={[styles.addressText, { color: colors.textSec }]}>
                  {orderData.selectedAddress.full_address}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payment Method Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, marginTop: 12, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Payment Method</Text>

          <View style={[styles.paymentMethodCard, { backgroundColor: colors.borderLight, borderColor: colors.border }]}>
            <View style={styles.methodRow}>
              <Ionicons name="card" size={20} color={Colors.sky} />
              <Text style={[styles.methodName, { color: colors.text, marginLeft: 8 }]}>
                {orderData.selectedPaymentMethod.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Summary Section */}
        <View style={[styles.section, { backgroundColor: colors.containerBg, marginTop: 12, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Order Summary</Text>

          <View style={[styles.priceRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.priceLabel, { color: colors.textSec }]}>Subtotal</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>
              ₱{orderData.subtotal.toLocaleString()}
            </Text>
          </View>

          {orderData.shopDiscount > 0 && (
            <View style={[styles.priceRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.priceLabel, { color: colors.textSec }]}>Member Discount</Text>
              <Text style={[styles.priceValue, { color: Colors.sky }]}>
                -₱{orderData.shopDiscount.toLocaleString()}
              </Text>
            </View>
          )}

          {orderData.voucherDiscount > 0 && (
            <View style={[styles.priceRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.priceLabel, { color: colors.textSec }]}>Voucher Discount</Text>
              <Text style={[styles.priceValue, { color: Colors.sky }]}>
                -₱{orderData.voucherDiscount.toLocaleString()}
              </Text>
            </View>
          )}

          <View style={[styles.priceRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.priceLabel, { color: colors.textSec }]}>Shipping</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>
              ₱{orderData.shippingCost.toLocaleString()}
            </Text>
          </View>

          <View style={[styles.priceRow, { borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 12 }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Amount</Text>
            <Text style={[styles.totalPrice, { color: Colors.sky }]}>
              ₱{orderData.total.toLocaleString()}
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
        <TouchableOpacity
          style={[
            styles.payLaterBtn,
            {
              backgroundColor: colors.borderLight,
              borderColor: colors.border,
            },
          ]}
          onPress={onPayLater}
          disabled={loading}
        >
          <Ionicons name="time-outline" size={18} color={Colors.sky} />
          <Text style={[styles.payLaterBtnText, { color: Colors.sky }]}>Pay Later</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.payBtn,
            {
              backgroundColor: Colors.sky,
              opacity: loading ? 0.6 : 1,
            },
          ]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="card" size={18} color={Colors.white} />
              <Text style={styles.payBtnText}>Proceed to Payment</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingModalContainer, { backgroundColor: colors.containerBg }]}>
            <ActivityIndicator size="large" color={Colors.sky} />
            <Text style={[styles.loadingModalText, { color: colors.text, marginTop: 16 }]}>
              Processing payment...
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
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: -10,
    marginRight: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerGreeting: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
  },
  successSection: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  section: {
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  productCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  productContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    flex: 1,
  },
  productVariant: {
    fontSize: 10,
    marginTop: 2,
  },
  priceQtyContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  productPriceSrp: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  productQty: {
    fontSize: 11,
  },
  addressCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  addressPhone: {
    fontSize: 11,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 11,
    lineHeight: 15,
  },
  paymentMethodCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodName: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
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
    flexDirection: 'row',
    gap: 10,
  },
  payLaterBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  payLaterBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  payBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
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
  loadingModalContainer: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  loadingModalText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
