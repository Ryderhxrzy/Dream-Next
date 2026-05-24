import React, { useRef, useMemo } from 'react';
import {
  View, Image, Text, TouchableOpacity, ScrollView, StyleSheet,
  Dimensions, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Product {
  id: number;
  name: string;
  brand?: string;
  prodpv: number;
  image?: string;
  images?: string[];
  priceMember?: number;
  priceSrp?: number;
  soldCount: number;
  variants?: Array<{
    id: number;
    color?: string;
    name?: string;
    colorHex?: string;
    images?: string[];
    priceMember?: number;
    priceSrp?: number;
  }>;
}

interface BrandProfile {
  profile_picture?: string;
  overall_rating?: number;
}

interface ImageWithVariant {
  image: string;
  variantId: number | null;
}

interface ImageViewerModalProps {
  visible: boolean;
  product: Product | null;
  brandProfile?: BrandProfile;
  images: string[];
  imagesWithVariants: ImageWithVariant[];
  selectedVariant: number | null;
  imageViewerIndex: number;
  onClose: () => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  onSelectVariant: (variantId: number) => void;
  onImageIndexChange: (index: number) => void;
  onProductPress?: (productId: number) => void;
  hasDiscount: boolean;
  cartCount?: number;
}

export default function ImageViewerModal({
  visible,
  product,
  brandProfile,
  images,
  imagesWithVariants,
  selectedVariant,
  imageViewerIndex,
  onClose,
  onAddToCart,
  onBuyNow,
  onSelectVariant,
  onImageIndexChange,
  onProductPress,
  hasDiscount,
  cartCount = 0,
}: ImageViewerModalProps) {
  const insets = useSafeAreaInsets();
  const imageViewerScrollRef = useRef<ScrollView>(null);

  if (!visible || !product) return null;

  return (
    <View style={styles.slideshowOverlay}>
      {/* Header with Brand Info and Close */}
      <LinearGradient
        colors={['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.slideshowHeader, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.7}
          style={styles.slideshowIconBtn}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>

        {/* Brand/Seller Info */}
        <TouchableOpacity
          style={styles.slideshowBrandInfo}
          activeOpacity={0.7}
          onPress={() => {
            console.log('Visit brand profile');
          }}
        >
          <View style={styles.slideshowBrandImageContainer}>
            <Image
              source={{ uri: brandProfile?.profile_picture || 'https://via.placeholder.com/32' }}
              style={styles.slideshowBrandImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.slideshowBrandTextContainer}>
            <View style={styles.slideshowBrandNameRow}>
              <Text style={styles.slideshowBrandName} numberOfLines={1}>
                {product.brand || 'Store'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </View>
            {brandProfile && (
              <View style={styles.slideshowRatingRow}>
                <Ionicons name="star" size={12} color="#fbbf24" />
                <Text style={styles.slideshowRating}>
                  {(brandProfile.overall_rating || 0).toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.slideshowIconBtn}
          activeOpacity={0.7}
          onPress={() => {
            console.log('Share product');
          }}
        >
          <Ionicons name="share-social-outline" size={20} color={Colors.text} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Main Image Carousel */}
      <View style={styles.slideshowImageWrapper}>
        <ScrollView
          ref={imageViewerScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={e => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            onImageIndexChange(index);
            // Auto-select variant based on image index
            if (imagesWithVariants.length > index) {
              const item = imagesWithVariants[index];
              if (item.variantId !== null) {
                onSelectVariant(item.variantId);
              }
            }
          }}
          style={styles.slideshowImageScroll}
        >
          {images.map((img, i) => (
            <View key={i} style={styles.slideshowImageContainer}>
              {/* Image */}
              <Image
                source={{ uri: img }}
                style={styles.slideshowImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Page Indicator */}
        <View style={styles.slideshowPageIndicator}>
          <Text style={styles.slideshowPageText}>
            {imageViewerIndex + 1}/{images.length}
          </Text>
        </View>
      </View>

      {/* Bottom Product Card */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0)', Colors.white]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.slideshowProductCard}
      >
        {/* Product Image Thumbnail and Info */}
        <View style={styles.slideshowCardContent}>
          {/* Thumbnail */}
          <Image
            source={{ uri: images[imageViewerIndex] }}
            style={styles.slideshowCardImage}
            resizeMode="cover"
          />

          {/* Product Details */}
          <View style={styles.slideshowCardDetails}>
            <TouchableOpacity
              style={styles.slideshowProductNameRow}
              onPress={() => {
                if (onProductPress && product) {
                  onProductPress(product.id);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.slideshowCardName} numberOfLines={2}>
                {product.name}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.sky} />
            </TouchableOpacity>

            {/* Variant Label */}
            {selectedVariant && product.variants && (
              <Text style={styles.slideshowVariantLabelText} numberOfLines={1}>
                {product.variants.find(v => v.id === selectedVariant)?.color ||
                 product.variants.find(v => v.id === selectedVariant)?.name ||
                 'Variant'}
              </Text>
            )}

            {/* Pricing */}
            <View style={styles.slideshowCardPricing}>
              <Text style={styles.slideshowCardPrice}>
                ₱{(selectedVariant
                  ? (product.variants?.find(v => v.id === selectedVariant)?.priceMember ?? product.priceMember)
                  : product.priceMember).toLocaleString()}
              </Text>
              {(selectedVariant
                ? (product.variants?.find(v => v.id === selectedVariant)?.priceSrp ?? 0)
                : product.priceSrp) > (selectedVariant
                  ? (product.variants?.find(v => v.id === selectedVariant)?.priceMember ?? 0)
                  : product.priceMember) && (
                <Text style={styles.slideshowCardOriginalPrice}>
                  ₱{(selectedVariant
                    ? (product.variants?.find(v => v.id === selectedVariant)?.priceSrp ?? 0)
                    : product.priceSrp).toLocaleString()}
                </Text>
              )}
            </View>

            {/* PV and Sold Count */}
            <View style={styles.slideshowCardMetaRow}>
              {product.prodpv > 0 && (
                <View style={styles.slideshowCardMeta}>
                  <Ionicons name="trending-up" size={12} color={Colors.sky} />
                  <Text style={styles.slideshowCardMetaText}>
                    PV {product.prodpv}
                  </Text>
                </View>
              )}
              {product.soldCount > 0 && (
                <View style={styles.slideshowCardMeta}>
                  <Ionicons name="bag-check-outline" size={12} color={Colors.textSecondary} />
                  <Text style={styles.slideshowCardMetaText}>
                    {product.soldCount} sold
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Variants Section */}
        {product.variants && product.variants.length > 0 && (
          <View style={styles.slideshowVariantsSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.slideshowVariantsScroll}
            >
              {product.variants.map((variant) => (
                <TouchableOpacity
                  key={variant.id}
                  style={[
                    styles.slideshowVariantOption,
                    selectedVariant === variant.id && styles.slideshowVariantOptionSelected,
                  ]}
                  onPress={() => {
                    onSelectVariant(variant.id);
                    const variantIndex = imagesWithVariants.findIndex(item => item.variantId === variant.id);
                    if (variantIndex >= 0) {
                      onImageIndexChange(variantIndex);
                      imageViewerScrollRef.current?.scrollTo({
                        x: variantIndex * SCREEN_WIDTH,
                        animated: true,
                      });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {variant.images && variant.images.length > 0 ? (
                    <Image
                      source={{ uri: variant.images[0] }}
                      style={styles.slideshowVariantImage}
                      resizeMode="cover"
                    />
                  ) : variant.colorHex ? (
                    <View
                      style={[
                        styles.slideshowVariantColor,
                        { backgroundColor: variant.colorHex },
                      ]}
                    />
                  ) : (
                    <Ionicons name="image-outline" size={20} color="#d1d5db" />
                  )}
                  {selectedVariant === variant.id && (
                    <View style={styles.slideshowVariantCheck}>
                      <Ionicons name="checkmark" size={14} color={Colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </LinearGradient>

      {/* Action Buttons with Gradient Background */}
      <LinearGradient
        colors={['#f0f9ff', '#f0fdf4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.slideshowButtonContainer, { paddingBottom: insets.bottom || 12 }]}
        >
          {/* Decorative Icon */}
          <View style={styles.decorativeIconContainer}>
            <Ionicons name="sparkles" size={16} color={Colors.sky} />
            <Text style={styles.decorativeText}>Complete your order</Text>
          </View>

          {/* Button Row */}
          <View style={styles.slideshowButtonRow}>
            {/* Add to Cart Button */}
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={onAddToCart}
              activeOpacity={0.7}
            >
              <View style={styles.addToCartContent}>
                <Ionicons name="cart-outline" size={20} color={Colors.white} />
                <Text style={styles.addToCartText}>Add to cart</Text>
              </View>
            </TouchableOpacity>

            {/* Buy Now Button with Save Badge */}
            <View style={styles.buyNowButtonContainer}>
              <TouchableOpacity
                style={styles.buyNowButton}
                onPress={onBuyNow}
                activeOpacity={0.7}
              >
                <View style={styles.buyNowContent}>
                  <Ionicons name="flash" size={18} color={Colors.white} />
                  <View style={styles.buyNowTextContainer}>
                    <Text style={styles.buyNowTitle}>Buy Now</Text>
                    <Text style={styles.buyNowSubtitle}>Limited stock • Fast shipping</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                </View>
              </TouchableOpacity>
              {hasDiscount && (
                <View style={styles.saveBadge}>
                  <Ionicons name="gift" size={12} color={Colors.white} />
                  <Text style={styles.saveBadgeText}>Special Deal</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  slideshowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8fafc',
    zIndex: 2000,
    flexDirection: 'column',
  },
  slideshowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  slideshowIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideshowBrandInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 12,
  },
  slideshowBrandImageContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: Colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slideshowBrandImage: {
    width: '100%',
    height: '100%',
  },
  slideshowBrandTextContainer: {
    flex: 1,
  },
  slideshowBrandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slideshowBrandName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  slideshowRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  slideshowRating: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  slideshowImageWrapper: {
    flex: 1,
    position: 'relative',
  },
  slideshowImageScroll: {
    flex: 1,
  },
  slideshowImageContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  slideshowImage: {
    width: '90%',
    height: '85%',
    zIndex: 10,
  },
  slideshowPageIndicator: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  slideshowPageText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  slideshowProductCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  slideshowCardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  slideshowCardImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  slideshowCardDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  slideshowProductNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  slideshowCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 18,
    flex: 1,
    flexShrink: 1,
  },
  slideshowCardPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slideshowCardPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.sky,
  },
  slideshowCardOriginalPrice: {
    fontSize: 12,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  slideshowCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slideshowCardMetaText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  slideshowCardMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  slideshowVariantsSection: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  slideshowVariantsScroll: {
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  slideshowVariantOption: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  slideshowVariantOptionSelected: {
    borderColor: Colors.sky,
    backgroundColor: Colors.sky,
  },
  slideshowVariantImage: {
    width: '100%',
    height: '100%',
  },
  slideshowVariantColor: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  slideshowVariantCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideshowVariantLabelText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  slideshowButtonContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  decorativeIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    paddingLeft: 2,
  },
  decorativeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.sky,
    letterSpacing: 0.3,
  },
  slideshowButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  addToCartButton: {
    width: 70,
    height: 52,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    backgroundColor: '#f97316',
    borderWidth: 1.5,
    borderColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  addToCartText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
    lineHeight: 13,
    textAlign: 'center',
  },
  buyNowButtonContainer: {
    flex: 1,
    position: 'relative',
  },
  buyNowButton: {
    backgroundColor: Colors.sky,
    height: 52,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyNowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    gap: 8,
  },
  buyNowTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  buyNowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  buyNowSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  saveBadge: {
    position: 'absolute',
    top: -12,
    right: 12,
    backgroundColor: '#f97316',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
