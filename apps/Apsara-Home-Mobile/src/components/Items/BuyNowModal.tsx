import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image, TextInput, StyleSheet, Dimensions, BackHandler, Animated, ActivityIndicator, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Product {
  id: number;
  name: string;
  brand?: string;
  image?: string;
  images?: string[];
  priceMember?: number;
  priceSrp?: number;
  prodpv?: number;
  soldCount: number;
  qty: number;
  variants?: Array<{
    id: number;
    color?: string;
    name?: string;
    colorHex?: string;
    images?: string[];
    priceMember?: number;
    priceSrp?: number;
    qty: number;
  }>;
}

interface BuyNowModalProps {
  visible: boolean;
  product: Product | null;
  images: string[];
  selectedVariant: number | null;
  quantity: number;
  onClose: () => void;
  onSelectVariant: (variantId: number) => void;
  onQuantityChange: (quantity: number) => void;
  onCheckout: () => void;
  onAddToCart?: (data: {
    product_id: number;
    variant_id?: number;
    quantity: number;
    selected_color?: string | null;
    selected_size?: string | null;
    selected_type?: string | null;
  }) => Promise<void>;
  loading?: boolean;
  isDarkMode?: boolean;
}

export default function BuyNowModal({
  visible,
  product,
  images,
  selectedVariant,
  quantity,
  onClose,
  onSelectVariant,
  onQuantityChange,
  onCheckout,
  onAddToCart,
  loading = false,
  isDarkMode = false,
}: BuyNowModalProps) {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(0);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [addingToCart, setAddingToCart] = React.useState(false);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => scrollY.current === 0,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (scrollY.current > 0) return false;
        return gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (scrollY.current === 0 && gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (scrollY.current === 0 && gestureState.dy > 100) {
          onClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  useEffect(() => {
    if (!visible) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => sub.remove();
  }, [visible, onClose]);

  const handleScroll = (event: any) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  };

  if (!visible || !product) return null;

  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.shopeeModal,
          { paddingBottom: 0, transform: [{ translateY: slideAnim }], backgroundColor: isDarkMode ? '#1e293b' : Colors.white },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandleContainer}>
          <View style={[styles.dragHandle, { backgroundColor: isDarkMode ? '#334155' : '#cbd5e1' }]} />
        </View>

        {/* Header */}
        <View style={[styles.shopeeModalHeader, { borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
          <View style={{ width: 28 }} />
          <Text style={[styles.shopeeModalHeaderText, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>Purchase</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.shopeeModalContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Full Section Gradient Background */}
          <LinearGradient
            colors={['transparent', Colors.sky + '08', Colors.sky + '15']}
            style={styles.fullSectionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            {/* Product Card */}
            <View style={styles.shopeeProductCard}>
            {/* Image */}
            <View style={[styles.shopeeProductImage, { backgroundColor: isDarkMode ? '#111827' : '#f1f5f9' }]}>
              <Image
                source={{
                  uri: selectedVariant
                    ? (product.variants?.find(v => v.id === selectedVariant)?.images?.[0] || images[0] || product.image)
                    : (images[0] || product.image)
                }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </View>

            {/* Product Info */}
            <View style={styles.shopeeProductInfo}>
              {/* Brand Name */}
              {product.brand && (
                <Text style={[styles.shopeeBrandName, { color: isDarkMode ? '#94a3b8' : Colors.textSecondary }]} numberOfLines={1}>
                  {product.brand}
                </Text>
              )}
              <Text style={[styles.shopeeProductName, { color: isDarkMode ? '#f8fafc' : Colors.text }]} numberOfLines={2}>
                {product.name}
              </Text>

              {/* Rating and PV */}
              <View style={styles.shopeeRatingRow}>
                <View style={styles.shopeeStars}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Ionicons
                      key={star}
                      name={star <= 4 ? 'star' : 'star-outline'}
                      size={14}
                      color="#fbbf24"
                    />
                  ))}
                </View>
                <Text style={[styles.shopeeRatingText, { color: isDarkMode ? '#94a3b8' : Colors.textSecondary }]}>({product.soldCount} sold)</Text>
              </View>

              {/* PV Badge */}
              <View style={styles.pvBadgeRow}>
                <Ionicons name="trending-up" size={12} color={Colors.white} />
                <Text style={styles.pvBadgeText}>{product.prodpv || 0} PV</Text>
              </View>

              {/* Price Section */}
              <View style={styles.shopeePriceSection}>
                <View>
                  <Text style={[styles.shopeePriceLabel, { color: isDarkMode ? '#94a3b8' : Colors.textSecondary }]}>Price</Text>
                  <View style={styles.shopeePriceRow}>
                    <Text style={[styles.shopeePrice, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>
                      ₱{(selectedVariant
                        ? (product.variants?.find(v => v.id === selectedVariant)?.priceMember ?? product.priceMember ?? 0)
                        : (product.priceMember ?? 0)).toLocaleString()}
                    </Text>
                    {(selectedVariant
                      ? (product.variants?.find(v => v.id === selectedVariant)?.priceSrp ?? 0)
                      : (product.priceSrp ?? 0)) > (selectedVariant
                        ? (product.variants?.find(v => v.id === selectedVariant)?.priceMember ?? 0)
                        : (product.priceMember ?? 0)) && (
                      <Text style={[styles.shopeeOriginalPrice, { color: isDarkMode ? '#64748b' : Colors.textSecondary }]}>
                        ₱{(selectedVariant
                          ? (product.variants?.find(v => v.id === selectedVariant)?.priceSrp ?? 0)
                          : (product.priceSrp ?? 0)).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
            </View>
            </LinearGradient>

          {/* Divider */}
          <View style={[styles.shopeeDivider, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }]} />

          {/* Variant Selection - Shopee Style */}
          {(product.variants?.length ?? 0) > 0 && (
            <View style={[styles.shopeeSection, { paddingHorizontal: 16, borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
              <View style={styles.shopeeSectionHeader}>
                <Text style={[styles.shopeeSectionTitle, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>Variant</Text>
                <Text style={[styles.shopeeSectionRequired, { color: isDarkMode ? '#94a3b8' : Colors.textSecondary }]}>Required</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.shopeeVariantScroll}
              >
                <View style={styles.shopeeVariantRow}>
                  {(product.variants || []).map((variant, index) => (
                    <TouchableOpacity
                      key={variant.id}
                      style={[
                        styles.shopeeVariantOption,
                        {
                          borderColor: selectedVariant === variant.id ? Colors.sky : (isDarkMode ? '#475569' : '#e5e7eb'),
                          backgroundColor: selectedVariant === variant.id ? (isDarkMode ? '#0c4a6e' : '#f0f9ff') : (isDarkMode ? '#1e293b' : '#f9fafb'),
                        }
                      ]}
                      onPress={() => onSelectVariant(variant.id)}
                      activeOpacity={0.6}
                    >
                      {variant.images && variant.images.length > 0 ? (
                        <Image
                          source={{ uri: variant.images[0] }}
                          style={styles.shopeeVariantOptionImage}
                          resizeMode="cover"
                        />
                      ) : variant.colorHex ? (
                        <View style={[
                          styles.shopeeVariantOptionColor,
                          { backgroundColor: variant.colorHex, borderColor: isDarkMode ? '#64748b' : '#d1d5db' }
                        ]} />
                      ) : null}
                      <Text
                        style={[styles.shopeeVariantOptionText, { color: isDarkMode ? '#f8fafc' : Colors.text }]}
                        numberOfLines={2}
                      >
                        {variant.color || variant.name || `Var ${index + 1}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Quantity - Shopee Style */}
          <View style={[styles.shopeeSection, { paddingHorizontal: 16, borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
            <View style={styles.shopeeSectionHeader}>
              <Text style={[styles.shopeeSectionTitle, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>Quantity</Text>
              <Text style={[styles.shopeeStockLeft, { color: isDarkMode ? '#94a3b8' : Colors.textSecondary }]}>
                {selectedVariant
                  ? (product.variants?.find(v => v.id === selectedVariant)?.qty ?? product.qty)
                  : product.qty} available
              </Text>
            </View>
            <View style={[styles.shopeeQuantityControl, { borderColor: isDarkMode ? '#475569' : '#e5e7eb' }]}>
              <TouchableOpacity
                style={styles.shopeeQuantityBtn}
                onPress={() => quantity > 1 && onQuantityChange(quantity - 1)}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={18} color={isDarkMode ? '#f8fafc' : Colors.text} />
              </TouchableOpacity>
              <TextInput
                style={[styles.shopeeQuantityInput, { color: isDarkMode ? '#f8fafc' : Colors.text }]}
                value={quantity.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 1;
                  const maxQty = selectedVariant
                    ? (product.variants?.find(v => v.id === selectedVariant)?.qty ?? product.qty)
                    : product.qty;
                  if (num > 0 && num <= maxQty) {
                    onQuantityChange(num);
                  }
                }}
                keyboardType="number-pad"
                editable={false}
              />
              <TouchableOpacity
                style={styles.shopeeQuantityBtn}
                onPress={() => {
                  const maxQty = selectedVariant
                    ? (product.variants?.find(v => v.id === selectedVariant)?.qty ?? product.qty)
                    : product.qty;
                  if (quantity < maxQty) {
                    onQuantityChange(quantity + 1);
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color={isDarkMode ? '#f8fafc' : Colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Price Summary - Shopee Style */}
          <View style={[styles.shopeePriceSummary, { borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
            {/* Original Subtotal (SRP) */}
            <View style={styles.shopeePriceSummaryRow}>
              <Text style={[styles.shopeePriceSummaryLabel, { color: isDarkMode ? '#94a3b8' : Colors.textSecondary }]}>Subtotal (SRP)</Text>
              <Text style={[styles.shopeePriceSummaryValue, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>
                ₱{(
                  quantity * (selectedVariant
                    ? (product.variants?.find(v => v.id === selectedVariant)?.priceSrp ?? product.priceSrp ?? 0)
                    : (product.priceSrp ?? 0))
                ).toLocaleString()}
              </Text>
            </View>

            {/* Member Discount */}
            {(selectedVariant
              ? (product.variants?.find(v => v.id === selectedVariant)?.priceSrp ?? 0)
              : (product.priceSrp ?? 0)) > (selectedVariant
                ? (product.variants?.find(v => v.id === selectedVariant)?.priceMember ?? 0)
                : (product.priceMember ?? 0)) && (
              <View style={styles.shopeePriceSummaryRow}>
                <Text style={[styles.discountLabel, { color: isDarkMode ? '#94a3b8' : Colors.textSecondary }]}>Member Discount</Text>
                <Text style={[styles.discountValue, { color: isDarkMode ? '#4ade80' : '#10b981' }]}>
                  -₱{(
                    quantity * (
                      (selectedVariant
                        ? (product.variants?.find(v => v.id === selectedVariant)?.priceSrp ?? product.priceSrp ?? 0)
                        : (product.priceSrp ?? 0)) -
                      (selectedVariant
                        ? (product.variants?.find(v => v.id === selectedVariant)?.priceMember ?? product.priceMember ?? 0)
                        : (product.priceMember ?? 0))
                    )
                  ).toLocaleString()}
                </Text>
              </View>
            )}

            {/* Subtotal After Discount */}
            <View style={[styles.shopeePriceSummaryRow, { borderTopWidth: 1, borderTopColor: isDarkMode ? '#334155' : '#f1f5f9', paddingTop: 8, marginTop: 8 }]}>
              <Text style={[styles.shopeePriceSummaryLabel, { color: isDarkMode ? '#94a3b8' : Colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.shopeePriceSummaryValue, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>
                ₱{(
                  quantity * (selectedVariant
                    ? (product.variants?.find(v => v.id === selectedVariant)?.priceMember ?? product.priceMember ?? 0)
                    : (product.priceMember ?? 0))
                ).toLocaleString()}
              </Text>
            </View>

            <View style={styles.shopeePriceSummaryRow}>
              <Text style={[styles.shopeePriceSummaryLabel, { color: isDarkMode ? '#94a3b8' : Colors.textSecondary }]}>Shipping</Text>
              <Text style={[styles.shopeeShippingText, { color: isDarkMode ? '#94a3b8' : Colors.textSecondary }]}>See at checkout</Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Total & Button - Styled like ProductDetailScreen */}
        <View style={[styles.shopeeCheckoutFooterGradient, { paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom + 12, 12), borderTopColor: isDarkMode ? '#334155' : '#f1f5f9', backgroundColor: isDarkMode ? '#1e293b' : Colors.white }]}>
          {/* Total Info */}
          <View style={styles.checkoutTotalContainer}>
            <Text style={[styles.checkoutTotalLabel, { color: isDarkMode ? '#94a3b8' : Colors.textSecondary }]}>Total Price</Text>
            <Text style={styles.checkoutTotalPrice}>
              ₱{(
                quantity * (selectedVariant
                  ? (product.variants?.find(v => v.id === selectedVariant)?.priceMember ?? product.priceMember ?? 0)
                  : (product.priceMember ?? 0))
              ).toLocaleString()}
            </Text>
          </View>

          {/* Buttons Row */}
          <View style={styles.buttonRow}>
            {/* Add to Cart Button */}
            <TouchableOpacity
              style={[styles.addToCartBtnBuyNow, (loading || addingToCart) && { opacity: 0.6 }]}
              onPress={async () => {
                if (!product || !onAddToCart) return;
                setAddingToCart(true);
                try {
                  // Extract variant details if a variant is selected
                  const selectedVariantData = selectedVariant 
                    ? product.variants?.find(v => v.id === selectedVariant)
                    : null;

                  await onAddToCart({
                    product_id: product.id,
                    variant_id: selectedVariant || undefined,
                    quantity,
                    selected_color: selectedVariantData?.color || null,
                    selected_size: selectedVariantData?.name || null,
                    selected_type: selectedVariantData?.name || null, // Using name as type for now
                  });
                } finally {
                  setAddingToCart(false);
                }
              }}
              disabled={loading || addingToCart}
              activeOpacity={0.7}
            >
              {addingToCart ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="cart-outline" size={18} color={Colors.white} />
                  <Text style={styles.addToCartBtnBuyNowText}>Add to Cart</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Proceed to Checkout Button */}
            <TouchableOpacity
              style={[styles.checkoutButtonStyle, (loading || checkoutLoading) && { opacity: 0.6 }]}
              onPress={async () => {
                setCheckoutLoading(true);
                try {
                  await Promise.resolve(onCheckout());
                } finally {
                  setCheckoutLoading(false);
                }
              }}
              disabled={loading || checkoutLoading}
              activeOpacity={0.7}
            >
              {checkoutLoading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                  <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  shopeeModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    flexDirection: 'column',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
  },
  shopeeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  shopeeModalHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  shopeeModalContent: {
    flex: 1,
    paddingHorizontal: 0,
  },
  shopeeProductCard: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 16,
    position: 'relative',
  },
  fullSectionGradient: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  shopeeBrandName: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shopeeProductImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  shopeeProductInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  shopeeProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 16,
  },
  shopeeRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  shopeeStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  shopeeRatingText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  pvBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.sky,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  pvBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  shopeePriceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  shopeePriceLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  shopeePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  shopeePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.sky,
  },
  shopeeOriginalPrice: {
    fontSize: 12,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  discountTag: {
    backgroundColor: Colors.sky,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  discountTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  shopeeDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  shopeeSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  shopeeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shopeeSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  shopeeSectionRequired: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  shopeeVariantScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  shopeeVariantRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shopeeVariantOption: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    minWidth: 75,
  },
  shopeeVariantOptionImage: {
    width: 55,
    height: 55,
    borderRadius: 6,
  },
  shopeeVariantOptionColor: {
    width: 55,
    height: 55,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  shopeeVariantOptionSelected: {
    borderColor: Colors.sky,
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
  },
  shopeeVariantOptionText: {
    fontSize: 10,
    color: Colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  shopeeStockLeft: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  shopeeQuantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
  },
  shopeeQuantityBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopeeQuantityInput: {
    flex: 1,
    height: 36,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  shopeePriceSummary: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  shopeePriceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shopeePriceSummaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  shopeePriceSummaryValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
  shopeeShippingText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  discountLabel: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  discountValue: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
  shopeeCheckoutFooterGradient: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: Colors.white,
  },
  checkoutTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkoutTotalLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  checkoutTotalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.sky,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 0,
    marginTop: 12,
  },
  addToCartBtnBuyNow: {
    flex: 0.4,
    flexDirection: 'row',
    backgroundColor: '#f97316',
    height: 52,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addToCartBtnBuyNowText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  checkoutButtonStyle: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.sky,
    height: 52,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkoutButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
});
