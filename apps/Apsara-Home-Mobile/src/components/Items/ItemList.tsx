import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const BADGE_CONFIG = [
  { key: 'musthave', label: 'Must Have', bg: ['#f97316', '#ea580c'] as const, icon: 'heart' as const },
  { key: 'bestseller', label: 'Bestseller', bg: ['#d4a017', '#b8860b'] as const, icon: 'flame' as const },
  { key: 'salespromo', label: 'On Sale', bg: [Colors.forest, '#1e4236'] as const, icon: 'flash' as const },
] as const;

export interface ItemListProps {
  wishlist_id: number;
  product_id: number;
  product: {
    id: number;
    name: string;
    brand: string;
    image: string;
    priceSrp: number;
    priceMember: number;
    avgRating: number;
    qty: number;
    prodpv: number;
    musthave?: boolean;
    bestseller?: boolean;
    salespromo?: boolean;
    variants?: Array<{
      id: number;
      name: string;
      color?: string;
      size?: string;
    }>;
  };
  isSelected?: boolean;
  onProductPress?: (id: number) => void;
  onRemove?: (wishlistId: number) => void;
  onAddToCart?: (wishlistId: number) => void;
  onSelect?: (wishlistId: number) => void;
  isDarkMode?: boolean;
}

export default function ItemList({
  wishlist_id,
  product_id,
  product,
  isSelected = false,
  onProductPress,
  onRemove,
  onAddToCart,
  onSelect,
  isDarkMode = false,
}: ItemListProps) {
  const [isWishlisted, setIsWishlisted] = useState(true);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const colors = {
    bg: isDarkMode ? '#1e293b' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#334155' : '#e5e7eb',
    selectedBg: isDarkMode ? '#0f4c7f' : '#f0f7ff',
  };

  const discount = Math.round(
    ((product.priceSrp - product.priceMember) / product.priceSrp) * 100
  );
  const inStock = product.qty > 0;
  const activeBadges = BADGE_CONFIG.filter(b => product[b.key as keyof typeof product]);

  const handleSelectWithAnimation = () => {
    // Animate checkbox
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    onSelect?.(wishlist_id);
  };

  const handleRemoveFromWishlist = () => {
    setIsWishlisted(false);
    onRemove?.(wishlist_id);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderBottomColor: colors.border }, isSelected && { backgroundColor: colors.selectedBg }]}>
      {(discount > 0 || !inStock) && (
        <LinearGradient
          colors={['transparent', Colors.sky + '15']}
          style={styles.containerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      )}

      <TouchableOpacity
        style={styles.checkbox}
        onPress={handleSelectWithAnimation}
        activeOpacity={0.7}
      >
        <Animated.View style={[styles.checkboxBox, isSelected && styles.checkboxBoxChecked, !isSelected && { borderColor: colors.border }, { transform: [{ scale: scaleAnim }] }]}>
          {isSelected && <Ionicons name="checkmark" size={14} color={Colors.white} />}
        </Animated.View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.contentWrapper}
        onPress={() => onProductPress?.(product.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.imageContainer, { backgroundColor: isDarkMode ? '#0f172a' : '#f3f4f6' }]}>
          <Image
            source={{ uri: product.image }}
            style={styles.productImage}
          />
          {!inStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.brandRow}>
            <Text style={[styles.brand, { color: colors.textSec }]} numberOfLines={1}>
              {product.brand}
            </Text>
            {inStock && (
              <View style={styles.itemStockBadge}>
                <Text style={styles.itemStockText}>{product.qty} left</Text>
              </View>
            )}
          </View>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {product.name}
          </Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color="#fbbf24" />
            <Text style={[styles.rating, { color: colors.textSec }]}>{product.avgRating || 'No rating'}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={[styles.memberPrice, { color: colors.text }]}>
              ₱{product.priceMember.toLocaleString()}
            </Text>
            <Text style={[styles.srpPrice, { color: colors.textSec }]}>
              ₱{product.priceSrp.toLocaleString()}
            </Text>
          </View>

          <View style={styles.badgeRow}>
            <LinearGradient
              colors={[Colors.sky, Colors.skyDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pvBadge}
            >
              <Ionicons name="trending-up" size={10} color={Colors.white} />
              <Text style={styles.pvText}>{product.prodpv} PV</Text>
            </LinearGradient>

            {activeBadges.map(b => (
              <LinearGradient
                key={b.key}
                colors={b.bg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.productBadge}
              >
                <Ionicons name={b.icon} size={10} color={Colors.white} />
                <Text style={styles.productBadgeText}>{b.label}</Text>
              </LinearGradient>
            ))}

            {product.variants && product.variants.length > 0 && (
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.variantBadge}
              >
                <Ionicons name="layers" size={10} color={Colors.white} />
                <Text style={styles.variantText}>{product.variants.length} variants</Text>
              </LinearGradient>
            )}
          </View>

        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
    alignItems: 'flex-start',
    position: 'relative',
  },
  containerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  containerSelected: {
    backgroundColor: '#f0f7ff',
  },
  checkbox: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: Colors.sky,
    borderColor: Colors.sky,
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    flexShrink: 0,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 11,
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
  detailsContainer: {
    flex: 1,
    gap: 5,
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  brand: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    flex: 1,
  },
  itemStockBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemStockText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  productName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rating: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  srpPrice: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  pvBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pvText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
  productBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  productBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
  variantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  variantText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
});
