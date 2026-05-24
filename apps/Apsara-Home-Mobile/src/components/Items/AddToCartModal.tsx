import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, Dimensions,
  ActivityIndicator, TextInput, BackHandler, Animated, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import Toast from 'react-native-toast-message';

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

interface AddToCartModalProps {
  visible: boolean;
  product: Product | null;
  images: string[];
  selectedVariant: number | null;
  quantity: number;
  onClose: () => void;
  onSelectVariant: (variantId: number) => void;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: (data: {
    product_id: number;
    variant_id?: number;
    quantity: number;
    selected_color?: string | null;
    selected_size?: string | null;
    selected_type?: string | null;
  }) => Promise<void>;
  onCheckout?: () => void;
  onProductPress?: (productId: number) => void;
  loading?: boolean;
  isDarkMode?: boolean;
}

export default function AddToCartModal({
  visible,
  product,
  images,
  selectedVariant,
  quantity,
  onClose,
  onSelectVariant,
  onQuantityChange,
  onAddToCart,
  onCheckout,
  onProductPress,
  loading = false,
  isDarkMode = false,
}: AddToCartModalProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [isClosing, setIsClosing] = useState(false);
  const scrollY = useRef(0);

  const colors = {
    bg: isDarkMode ? '#111827' : Colors.white,
    containerBg: isDarkMode ? '#1f2937' : '#f9fafb',
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
    borderLight: isDarkMode ? '#1f2937' : '#f1f5f9',
    dragHandle: isDarkMode ? '#4b5563' : '#cbd5e1',
    imageBg: isDarkMode ? '#1f2937' : '#f1f5f9',
  };

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
          handleClose();
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
      setIsClosing(false);
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
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

  const handleClose = () => {
    setIsClosing(true);
    onClose();
  };

  useEffect(() => {
    if (!visible) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => sub.remove();
  }, [visible, onClose]);


  const handleAddToCart = async () => {
    if (!product) return;

    if ((product.variants?.length ?? 0) > 0 && !selectedVariant) {
      Toast.show({
        type: 'error',
        text1: 'Variant Required',
        text2: 'Please select a variant before adding to cart',
      });
      return;
    }

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
    } catch (error: any) {
      console.error('Add to cart error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.response?.data?.message || 'Failed to add item to cart',
      });
    }
  };

  if (!visible || !product) return null;

  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={handleClose}
      />
      <Animated.View
        style={[
          styles.shopeeModal,
          { paddingBottom: 0, backgroundColor: colors.bg, transform: [{ translateY: slideAnim }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandleContainer}>
          <View style={[styles.dragHandle, { backgroundColor: colors.dragHandle }]} />
        </View>

        {/* Header */}
        <View style={[styles.shopeeModalHeader, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
          <View style={{ width: 28 }} />
          <Text style={[styles.shopeeModalHeaderText, { color: colors.text }]}>Save to Cart</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.shopeeModalContent}
          onScroll={(event) => { scrollY.current = event.nativeEvent.contentOffset.y; }}
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
            <View style={[styles.shopeeProductImage, { backgroundColor: colors.imageBg }]}>
              <Image
                source={{
                  uri: selectedVariant
                    ? (product.variants?.find(v => v.id === selectedVariant)?.images?.[0] || images[0] || product.image)
                    : (images[0] || product.image)
                }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
              {product.priceSrp && product.priceMember &&
                Math.round(((product.priceSrp - product.priceMember) / product.priceSrp) * 100) > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>
                    -{Math.round(((product.priceSrp - product.priceMember) / product.priceSrp) * 100)}%
                  </Text>
                </View>
              )}
            </View>

            {/* Product Info */}
            <View style={styles.shopeeProductInfo}>
              {/* Brand Name */}
              {product.brand && (
                <Text style={[styles.shopeeBrandName, { color: colors.textSec }]} numberOfLines={1}>
                  {product.brand}
                </Text>
              )}
              <TouchableOpacity
                onPress={() => product && onProductPress?.(product.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.shopeeProductName, { color: colors.text }]} numberOfLines={2}>
                  {product.name}
                </Text>
              </TouchableOpacity>

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
                <Text style={[styles.shopeeRatingText, { color: colors.textSec }]}>({product.soldCount} sold)</Text>
              </View>

              {/* PV Badge */}
              <View style={styles.pvBadgeRow}>
                <Ionicons name="trending-up" size={12} color={Colors.white} />
                <Text style={styles.pvBadgeText}>{product.prodpv || 0} PV</Text>
              </View>

              {/* Price Section */}
              <View style={styles.shopeePriceSection}>
                <View>
                  <Text style={[styles.shopeePriceLabel, { color: colors.textSec }]}>Price</Text>
                  <View style={styles.shopeePriceRow}>
                    <Text style={[styles.shopeePrice, { color: Colors.sky }]}>
                      ₱{(selectedVariant
                        ? (product.variants?.find(v => v.id === selectedVariant)?.priceMember ?? product.priceMember ?? 0)
                        : (product.priceMember ?? 0)).toLocaleString()}
                    </Text>
                    {(selectedVariant
                      ? (product.variants?.find(v => v.id === selectedVariant)?.priceSrp ?? 0)
                      : (product.priceSrp ?? 0)) > (selectedVariant
                        ? (product.variants?.find(v => v.id === selectedVariant)?.priceMember ?? 0)
                        : (product.priceMember ?? 0)) && (
                      <Text style={[styles.shopeeOriginalPrice, { color: colors.textSec }]}>
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
          <View style={[styles.shopeeDivider, { backgroundColor: colors.border }]} />

          {/* Variant Selection */}
          {(product.variants?.length ?? 0) > 0 && (
            <View style={[styles.shopeeSection, { paddingHorizontal: 16, backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
              <View style={styles.shopeeSectionHeader}>
                <Text style={[styles.shopeeSectionTitle, { color: colors.text }]}>Variant</Text>
                <Text style={styles.shopeeSectionRequired}>Required</Text>
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
                        { backgroundColor: colors.containerBg, borderColor: colors.border },
                        selectedVariant === variant.id && { borderColor: Colors.sky, backgroundColor: isDarkMode ? '#1e293b' : '#f0f9ff' }
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
                          { backgroundColor: variant.colorHex }
                        ]} />
                      ) : null}
                      <Text
                        style={[styles.shopeeVariantOptionText, { color: colors.text }]}
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

          {/* Quantity Selection */}
          <View style={[styles.shopeeSection, { paddingHorizontal: 16, backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
            <View style={styles.shopeeSectionHeader}>
              <Text style={[styles.shopeeSectionTitle, { color: colors.text }]}>Quantity</Text>
            </View>
            <View style={styles.shopeeQuantityControl}>
              <TouchableOpacity
                style={[styles.shopeeQuantityBtn, { backgroundColor: colors.containerBg, borderColor: colors.border }]}
                onPress={() => quantity > 1 && onQuantityChange(quantity - 1)}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={18} color={colors.text} />
              </TouchableOpacity>
              <TextInput
                style={[styles.shopeeQuantityInput, { backgroundColor: colors.containerBg, borderColor: colors.border, color: colors.text }]}
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
                style={[styles.shopeeQuantityBtn, { backgroundColor: colors.containerBg, borderColor: colors.border }]}
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
                <Ionicons name="add" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Price Summary */}
          <View style={[styles.shopeePriceSummary, { paddingHorizontal: 16, backgroundColor: colors.bg }]}>
            {/* Subtotal */}
            <View style={[styles.shopeePriceSummaryRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 }]}>
              <Text style={[styles.shopeePriceSummaryLabel, { color: colors.textSec }]}>Subtotal</Text>
              <Text style={[styles.shopeePriceSummaryValue, { color: colors.text }]}>
                ₱{(
                  quantity * (selectedVariant
                    ? (product.variants?.find(v => v.id === selectedVariant)?.priceMember ?? product.priceMember ?? 0)
                    : (product.priceMember ?? 0))
                ).toLocaleString()}
              </Text>
            </View>

            <View style={styles.shopeePriceSummaryRow}>
              <Text style={[styles.shopeePriceSummaryLabel, { color: colors.textSec }]}>Shipping</Text>
              <Text style={[styles.shopeeShippingText, { color: colors.textSec }]}>See at checkout</Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={[styles.shopeeCheckoutFooterGradient, { backgroundColor: colors.bg, borderTopColor: colors.border, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.checkoutBtn, loading && { opacity: 0.6 }]}
              onPress={() => {
                handleAddToCart().then(() => {
                  onCheckout?.();
                });
              }}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="flash" size={20} color={Colors.white} />
                  <Text style={styles.checkoutBtnText}>Proceed to{'\n'}Checkout</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addToCartBtn, loading && { opacity: 0.6 }]}
              onPress={handleAddToCart}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="cart-outline" size={18} color={Colors.white} />
                  <Text style={styles.addToCartBtnText}>Save to Cart</Text>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
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
  },
  shopeeModalHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  shopeeModalContent: {
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
  shopeeProductImage: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
  },
  discountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  shopeeProductInfo: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  shopeeBrandName: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  shopeeDivider: {
    height: 1,
    marginVertical: 12,
  },
  shopeeSection: {
    paddingHorizontal: 0,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  shopeeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shopeeSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  shopeeSectionRequired: {
    fontSize: 11,
    color: '#ef4444',
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
    borderWidth: 2,
  },
  shopeeVariantOptionText: {
    fontSize: 10,
    color: Colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  shopeeQuantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  shopeeQuantityBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopeeQuantityInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 36,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  shopeePriceSummary: {
    paddingVertical: 12,
  },
  shopeePriceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  shopeePriceSummaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  shopeePriceSummaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  shopeeShippingText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  shopeeCheckoutFooterGradient: {
    borderTopWidth: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 0,
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f97316',
    height: 52,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addToCartBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  checkoutBtn: {
    flex: 0.4,
    flexDirection: 'column',
    backgroundColor: Colors.sky,
    height: 52,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  checkoutBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 13,
  },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrowIcon: {
    marginTop: 2,
  },
});
