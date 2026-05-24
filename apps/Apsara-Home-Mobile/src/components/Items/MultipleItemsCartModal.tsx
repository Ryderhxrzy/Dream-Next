import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, Dimensions,
  ActivityIndicator, BackHandler, Animated, Modal, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

interface CartItem {
  wishlist_id: number;
  product_id: number;
  product: {
    id: number;
    name: string;
    image: string;
    priceMember: number;
    priceSrp?: number;
    qty: number;
    variants?: Array<{
      id: number;
      name?: string;
      color?: string;
      colorHex?: string;
      size?: string;
      images?: string[];
    }>;
  };
}

interface MultipleItemsCartModalProps {
  visible: boolean;
  items: CartItem[];
  onClose: () => void;
  onAddToCart: (items: Array<{
    product_id: number;
    quantity: number;
    variant_id?: number;
  }>) => Promise<void>;
  loading?: boolean;
  token?: string | null;
  onCartUpdate?: () => void;
  onNavigateToCart?: () => void;
}

export default function MultipleItemsCartModal({
  visible,
  items,
  onClose,
  onAddToCart,
  loading = false,
  token,
  onCartUpdate,
  onNavigateToCart,
}: MultipleItemsCartModalProps) {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(0);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});
  const [selectedVariants, setSelectedVariants] = useState<{ [key: number]: number | null }>({});
  const [expandedVariants, setExpandedVariants] = useState<{ [key: number]: boolean }>({});
  const [displayedImages, setDisplayedImages] = useState<{ [key: number]: string }>({});
  const [selectedColors, setSelectedColors] = useState<{ [key: number]: string | null }>({});
  const [selectedSizes, setSelectedSizes] = useState<{ [key: number]: string | null }>({});
  const [selectedTypes, setSelectedTypes] = useState<{ [key: number]: string | null }>({});
  const [isProcessing, setIsProcessing] = useState(false);

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
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }).start();

      // Initialize quantities and variants
      const initialQuantities: { [key: number]: number } = {};
      const initialVariants: { [key: number]: number | null } = {};
      const initialImages: { [key: number]: string } = {};
      const initialColors: { [key: number]: string | null } = {};
      const initialSizes: { [key: number]: string | null } = {};
      const initialTypes: { [key: number]: string | null } = {};
      items.forEach(item => {
        initialQuantities[item.product_id] = 1;
        const firstVariant = item.product.variants?.length ? item.product.variants[0] : null;
        initialVariants[item.product_id] = firstVariant?.id || null;
        initialColors[item.product_id] = firstVariant?.color || null;
        initialSizes[item.product_id] = firstVariant?.size || null;
        initialImages[item.product_id] = item.product.image;
      });
      setQuantities(initialQuantities);
      setSelectedVariants(initialVariants);
      setSelectedColors(initialColors);
      setSelectedSizes(initialSizes);
      setSelectedTypes(initialTypes);
      setDisplayedImages(initialImages);
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim, items]);

  useEffect(() => {
    if (!visible) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => sub.remove();
  }, [visible, onClose]);

  const getTotal = () => {
    return items.reduce((total, item) => {
      const qty = quantities[item.product_id] || 1;
      return total + (item.product.priceMember * qty);
    }, 0);
  };

  const handleQuantityChange = (productId: number, delta: number) => {
    const currentQty = quantities[productId] || 1;
    const newQty = Math.max(1, Math.min(currentQty + delta, 99));
    setQuantities(prev => ({ ...prev, [productId]: newQty }));
  };

  const handleAddToCart = async () => {
    setIsProcessing(true);
    try {
      const cartItems = items.map(item => ({
        product_id: item.product_id,
        variant_id: selectedVariants[item.product_id] || null,
        quantity: quantities[item.product_id] || 1,
        selected_color: selectedColors[item.product_id] || null,
        selected_size: selectedSizes[item.product_id] || null,
        selected_type: selectedTypes[item.product_id] || null,
      }));

      await onAddToCart(cartItems);
      onClose();
      onNavigateToCart?.();
    } catch (error) {
      console.error('Error adding items to cart:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!visible) return null;

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
          { transform: [{ translateY: slideAnim }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header */}
        <View style={styles.shopeeModalHeader}>
          <View style={{ width: 28 }} />
          <Text style={styles.shopeeModalHeaderText}>
            {items.length} Items to Cart
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Summary Card */}
        <LinearGradient
          colors={[Colors.sky, '#0ea5e9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryContent}>
            <View>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryPrice}>
                ₱{getTotal().toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.itemCountBadge}>
              <Ionicons name="cart" size={18} color={Colors.white} />
              <Text style={styles.itemCountText}>{items.length}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Items List */}
        <ScrollView
          style={styles.itemsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.itemsContent}
          onScroll={(event) => { scrollY.current = event.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
        >
          {items.map((item) => (
            <View key={item.product_id} style={styles.itemContainer}>
              <View style={styles.itemCard}>
                {/* Product Image */}
                <Image
                  source={{ uri: displayedImages[item.product_id] || item.product.image }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />

                {/* Product Info */}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.product.name}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.itemPrice}>
                      ₱{item.product.priceMember.toLocaleString()}
                    </Text>
                    {item.product.priceSrp && item.product.priceSrp > item.product.priceMember && (
                      <Text style={styles.itemOriginalPrice}>
                        ₱{item.product.priceSrp.toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Quantity Selector */}
                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => handleQuantityChange(item.product_id, -1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={16} color={Colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>
                    {quantities[item.product_id] || 1}
                  </Text>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => handleQuantityChange(item.product_id, 1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color={Colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Variants Section */}
              {item.product.variants && item.product.variants.length > 0 && (
                <View style={styles.variantsSection}>
                  <TouchableOpacity
                    style={styles.variantsHeader}
                    onPress={() => setExpandedVariants(prev => ({
                      ...prev,
                      [item.product_id]: !prev[item.product_id]
                    }))}
                    activeOpacity={0.7}
                  >
                    <View style={styles.variantsLabelRow}>
                      <Text style={styles.variantsLabel}>Variants</Text>
                      <Text style={styles.selectedVariantText}>
                        {item.product.variants.find(v => v.id === selectedVariants[item.product_id])?.name ||
                         item.product.variants.find(v => v.id === selectedVariants[item.product_id])?.color ||
                         'Select variant'}
                      </Text>
                    </View>
                    <Ionicons
                      name={expandedVariants[item.product_id] ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={Colors.sky}
                    />
                  </TouchableOpacity>

                  {expandedVariants[item.product_id] && (
                    <View style={styles.variantsList}>
                      {item.product.variants.map((variant) => (
                        <TouchableOpacity
                          key={variant.id}
                          style={[
                            styles.variantOption,
                            selectedVariants[item.product_id] === variant.id && styles.variantOptionSelected,
                          ]}
                          onPress={() => {
                            setSelectedVariants(prev => ({
                              ...prev,
                              [item.product_id]: variant.id
                            }));
                            setSelectedColors(prev => ({
                              ...prev,
                              [item.product_id]: variant.color || null
                            }));
                            setSelectedSizes(prev => ({
                              ...prev,
                              [item.product_id]: variant.size || null
                            }));
                            // Update displayed image if variant has images
                            if (variant.images && variant.images.length > 0) {
                              setDisplayedImages(prev => ({
                                ...prev,
                                [item.product_id]: variant.images![0]
                              }));
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          {variant.colorHex && (
                            <View
                              style={[
                                styles.colorDot,
                                { backgroundColor: variant.colorHex }
                              ]}
                            />
                          )}
                          <Text style={styles.variantOptionText}>
                            {variant.name || variant.color || variant.size || `Variant ${variant.id}`}
                          </Text>
                          {selectedVariants[item.product_id] === variant.id && (
                            <Ionicons name="checkmark" size={18} color={Colors.sky} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.shopeeCheckoutFooter, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.saveToCartBtn, isProcessing && { opacity: 0.6 }]}
            onPress={handleAddToCart}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color={Colors.white} />
                <Text style={styles.saveToCartBtnText}>Processing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="cart" size={18} color={Colors.white} />
                <Text style={styles.saveToCartBtnText}>Save to Cart</Text>
              </>
            )}
          </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  shopeeModalHeaderText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  summaryCard: {
    marginHorizontal: 12,
    marginVertical: 12,
    padding: 14,
    borderRadius: 12,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 6,
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    paddingLeft: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  itemCountBadge: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  itemCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  itemsList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  itemsContent: {
    gap: 10,
    paddingBottom: 12,
  },
  itemContainer: {
    gap: 0,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 0,
    padding: 10,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sky,
  },
  itemOriginalPrice: {
    fontSize: 11,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 6,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  shopeeCheckoutFooter: {
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  saveToCartBtn: {
    backgroundColor: '#f97316',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    gap: 8,
  },
  saveToCartBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  variantsSection: {
    backgroundColor: '#f9fafb',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderTopWidth: 0,
    marginBottom: 10,
  },
  variantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  variantsLabelRow: {
    flex: 1,
    gap: 8,
  },
  variantsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  selectedVariantText: {
    fontSize: 12,
    color: Colors.sky,
    fontWeight: '600',
  },
  variantsList: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    gap: 6,
  },
  variantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  variantOptionSelected: {
    backgroundColor: '#f0f9ff',
    borderColor: Colors.sky,
    borderWidth: 2,
  },
  variantOptionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
});
