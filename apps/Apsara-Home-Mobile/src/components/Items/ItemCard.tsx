import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, ImageSourcePropType, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import type { ProductCard } from '../../services/productService';
import { userBehaviorService } from '../../services/userBehaviorService';
import axios from 'axios';
import { API_CONFIG } from '../../config/api';
import Toast from 'react-native-toast-message';

interface ItemCardProps {
  product: ProductCard;
  onPress?: (product: ProductCard) => void;
  token?: string | null;
  isWishlisted?: boolean;
  wishlistId?: number;
  onWishlistToggle?: (productId: number, isWishlisted: boolean) => void;
  isDarkMode?: boolean;
}

const BADGE_CONFIG = [
  { key: 'musthave',   label: 'Must Have',  bg: ['#f97316', '#ea580c'] as const, icon: 'heart'     as const },
  { key: 'bestseller', label: 'Bestseller', bg: ['#d4a017', '#b8860b'] as const, icon: 'flame'     as const },
  { key: 'salespromo', label: 'On Sale',    bg: [Colors.forest, '#1e4236'] as const, icon: 'flash' as const },
] as const;

const getValidImageUrl = (imageUrl: string | undefined): ImageSourcePropType | null => {
  if (!imageUrl || imageUrl.trim() === '') {
    return null;
  }

  // Ensure the URL is absolute
  let url = imageUrl.trim();
  if (!url.startsWith('http') && !url.startsWith('file://')) {
    // Try to make it absolute if it's relative
    if (!url.startsWith('/')) {
      url = '/' + url;
    }
    url = 'https://backend.afhome.ph/api' + url;
  }

  return { uri: url };
};

function ItemCard({
  product,
  onPress,
  token,
  isWishlisted = false,
  wishlistId,
  onWishlistToggle,
  onAddToCart,
  onHideItem,
  onReportItem,
  isDarkMode = false,
}: ItemCardProps) {
  const [wishlisted, setWishlisted] = useState(isWishlisted);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showMenu) {
      Animated.spring(menuScaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(menuScaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showMenu, menuScaleAnim]);

  // Debug logging
  console.log(`🎨 ItemCard rendering: ${product.name} (ID: ${product.id})`);

  const colors = {
    bg: isDarkMode ? '#1e293b' : '#f8f9fa',
    border: isDarkMode ? '#334155' : '#e5e7eb',
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    imageBg: isDarkMode ? '#0f172a' : '#f1f5f9',
  };

  // Memoize price calculations
  const priceData = useMemo(() => {
    const displayPrice = product.memberPrice || product.originalPrice;
    const hasDiscount = displayPrice < product.originalPrice;
    const discountPct = hasDiscount
      ? Math.round(((product.originalPrice || 0) - displayPrice) / (product.originalPrice || 0) * 100)
      : 0;
    return { displayPrice, hasDiscount, discountPct };
  }, [product.memberPrice, product.originalPrice]);

  const { displayPrice, hasDiscount, discountPct } = priceData;

  // Memoize badge filtering
  const activeBadges = useMemo(() => BADGE_CONFIG.filter(b => product.badges[b.key]), [product.badges]);

  const handleWishlistToggle = useCallback(async () => {
    if (!token) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please log in to add items to wishlist',
      });
      return;
    }

    try {
      setIsTogglingWishlist(true);

      // DEBUG: Log product data
      console.log('🎯 ItemCard Wishlist Toggle:', {
        productId: product.id,
        productName: product.name,
        categoryId: product.categoryId,
        brandId: product.brandId,
        fullProduct: product,
      });

      if (wishlisted) {
        // Remove from wishlist - DELETE request using product_id
        await axios.delete(`${API_CONFIG.BASE_URL}/wishlist/${product.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Add to wishlist - POST request
        await axios.post(
          `${API_CONFIG.BASE_URL}/wishlist`,
          { product_id: product.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setWishlisted(!wishlisted);
      onWishlistToggle?.(product.id, !wishlisted);

      // Track wishlist behavior
      const behaviorType = !wishlisted ? 'wishlist_add' : 'wishlist_remove';
      console.log('📊 Tracking behavior:', {
        behaviorType,
        productId: product.id,
        categoryId: product.categoryId,
        brandId: product.brandId,
      });
      userBehaviorService.trackBehavior(token, behaviorType, product.id, product.categoryId, product.brandId).catch((err) => {
        console.error('❌ Behavior tracking failed:', err);
      });

      Toast.show({
        type: 'success',
        text1: wishlisted ? 'Removed from wishlist' : 'Added to wishlist',
        text2: wishlisted ? 'Item removed from your wishlist' : 'Item added to your wishlist',
      });
    } catch (error: any) {
      console.error('Error toggling wishlist:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: wishlisted ? 'Failed to remove from wishlist' : 'Failed to add to wishlist',
      });
    } finally {
      setIsTogglingWishlist(false);
    }
  }, [token, product.id, wishlisted, onWishlistToggle]);

  const handlePress = () => {
    console.log(`👆 ItemCard pressed: ${product.name} (ID: ${product.id})`);
    onPress?.(product);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}
      onPress={handlePress}
      onLongPress={() => setShowMenu(true)}
      activeOpacity={0.8}
    >

      {/* Image */}
      <View style={styles.imageContainer}>
        {imageError || !product.image ? (
          <Image
            source={require('../../../assets/af_home_logo.png')}
            style={[styles.productImage, styles.imagePlaceholder, { tintColor: isDarkMode ? '#cbd5e1' : '#4b5563' }]}
            resizeMode="contain"
          />
        ) : (
          <Image
            source={getValidImageUrl(product.image) || require('../../../assets/af_home_logo.png')}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => {
              setImageError(true);
              console.warn(`Failed to load image for product ${product.id}: ${product.image}`);
            }}
          />
        )}

        {/* Top-left: Enjoy X% ribbon */}
        {hasDiscount && (
          <View style={styles.enjoyBadge}>
            <Ionicons name="pricetag" size={10} color={Colors.white} />
            <Text style={styles.enjoyBadgeText}>Enjoy {discountPct}% OFF</Text>
          </View>
        )}

        {/* Top-right: Heart icon for wishlist */}
        <TouchableOpacity
          style={[styles.wishlistButton, isTogglingWishlist && { opacity: 0.8 }]}
          onPress={handleWishlistToggle}
          disabled={isTogglingWishlist}
          activeOpacity={0.7}
        >
          {isTogglingWishlist ? (
            <ActivityIndicator size={16} color="#ef4444" />
          ) : (
            <Ionicons
              name={wishlisted ? "heart" : "heart-outline"}
              size={18}
              color={wishlisted ? "#ef4444" : Colors.white}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Border Below Image */}
      <View style={[styles.imageBorder, { backgroundColor: colors.border }]} />

      {/* Info */}
      <View style={styles.infoContainer}>

        {hasDiscount && (
          <LinearGradient
            colors={['transparent', Colors.sky + '20']}
            style={styles.detailsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        )}

        {/* Brand + Sold Count */}
        <View style={styles.brandRow}>
          <Text style={[styles.brandText, { color: colors.textSec }]} numberOfLines={1}>{product.brandName}</Text>
          {product.soldCount > 0 && (
            <View style={styles.soldRow}>
              <Ionicons name="bag-check-outline" size={10} color={colors.textSec} />
              <Text style={[styles.soldCountText, { color: colors.textSec }]}>{product.soldCount} sold</Text>
            </View>
          )}
        </View>

        {/* Product Name */}
        <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2} ellipsizeMode="tail">
          {product.name}
        </Text>

        {/* Badges Row */}
        <View style={styles.badgesRow}>

          {/* PV badge */}
          <LinearGradient
            colors={[Colors.sky, Colors.skyDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Ionicons name="trending-up" size={9} color={Colors.white} />
            <Text style={styles.badgeLabel}>PV {product.pv}</Text>
          </LinearGradient>

          {/* Save amount badge */}
          {hasDiscount && (
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badge}
            >
              <Ionicons name="pricetag" size={9} color={Colors.white} />
              <Text style={styles.badgeLabel}>Save ₱{((product.originalPrice || 0) - displayPrice).toLocaleString()}</Text>
            </LinearGradient>
          )}

          {/* Product badges */}
          {activeBadges.map(b => (
            <LinearGradient
              key={b.key}
              colors={b.bg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badge}
            >
              <Ionicons name={b.icon} size={9} color={Colors.white} />
              <Text style={styles.badgeLabel}>{b.label}</Text>
            </LinearGradient>
          ))}

          {/* Variants badge */}
          {product.variantCount > 0 && (
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badge}
            >
              <Ionicons name="layers" size={9} color={Colors.white} />
              <Text style={styles.badgeLabel}>{product.variantCount} variants</Text>
            </LinearGradient>
          )}
        </View>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={[styles.currentPrice, { color: Colors.sky }]}>₱{displayPrice.toLocaleString()}</Text>
          {hasDiscount && (
            <Text style={[styles.originalPrice, { color: colors.textSec }]}>₱{(product.originalPrice || 0).toLocaleString()}</Text>
          )}
        </View>

      </View>

      {/* Options Menu Overlay - On Image Section */}
      {showMenu && (
        <TouchableOpacity
          style={styles.imageMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <Animated.View
            style={[
              styles.menuContainer,
              {
                backgroundColor: isDarkMode ? '#1e293b' : Colors.white,
                transform: [
                  {
                    scale: menuScaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
                opacity: menuScaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          >
            {/* Add to Wishlist */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleWishlistToggle();
              }}
            >
              <Ionicons
                name={wishlisted ? "heart" : "heart-outline"}
                size={18}
                color={wishlisted ? "#ef4444" : (isDarkMode ? '#0ea5e9' : Colors.sky)}
              />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                {wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
              </Text>
            </TouchableOpacity>

            {/* Add to Cart */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onAddToCart?.(product.id);
              }}
            >
              <Ionicons name="cart-outline" size={18} color={isDarkMode ? '#0ea5e9' : Colors.sky} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Add to Cart</Text>
            </TouchableOpacity>

            {/* Hide Item */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onHideItem?.(product.id);
              }}
            >
              <Ionicons name="eye-off-outline" size={18} color={isDarkMode ? '#0ea5e9' : Colors.sky} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Hide Item</Text>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.menuItem, styles.closeMenuItem, { borderTopColor: isDarkMode ? '#334155' : '#e5e7eb' }]}
              onPress={() => setShowMenu(false)}
            >
              <Ionicons name="close" size={18} color={isDarkMode ? '#94a3b8' : '#6b7280'} />
              <Text style={[styles.menuItemText, { color: isDarkMode ? '#94a3b8' : '#6b7280' }]}>Close</Text>
            </TouchableOpacity>

          </Animated.View>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default React.memo(ItemCard);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    width: '100%',
    alignSelf: 'flex-start',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  enjoyBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: Colors.sky,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomRightRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.9,
  },
  enjoyBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 16,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBorder: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  infoContainer: {
    padding: 12,
    gap: 6,
  },
  detailsGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  soldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  soldCountText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 18,
    flexShrink: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.sky,
  },
  originalPrice: {
    fontSize: 13,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  saveBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: Colors.sky,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomRightRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  imageMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  menuContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 200,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  closeMenuItem: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 4,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
});
