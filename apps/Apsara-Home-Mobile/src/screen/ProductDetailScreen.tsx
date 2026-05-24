import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Dimensions, ActivityIndicator, BackHandler, TextInput, NativeSyntheticEvent, NativeScrollEvent, Animated, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import RenderHtml from 'react-native-render-html';
import { Colors } from '../constants/colors';
import { productService, type Product, type ProductCard, type ProductReviewsResponse, type ProductReview } from '../services/productService';
import { authService } from '../services/authService';
import { userBehaviorService } from '../services/userBehaviorService';
import ItemCard from '../components/Items/ItemCard';
import ImageViewerModal from '../components/Items/ImageViewerModal';
import BuyNowModal from '../components/Items/BuyNowModal';
import AddToCartModal from '../components/Items/AddToCartModal';
import PrimaryButton from '../components/Button/PrimaryButton';
import AppHeader from '../components/AppHeader/AppHeader';
import axios from 'axios';
import { API_CONFIG } from '../config/api';
import Toast from 'react-native-toast-message';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 8 - 8 - 8) / 2;

interface WishlistItem {
  wishlist_id: number;
  product_id: number;
  date_added: string;
}

interface ProductDetailScreenProps {
  productId: number;
  token?: string | null;
  onBack: () => void;
  onProductPress?: (id: number) => void;
  onSearch?: () => void;
  onCartUpdate?: () => void;
  onWishlistToggle?: (productId: number, isWishlisted: boolean) => void;
  onShopNavigate?: (brandType: number, shopName: string) => void;
  onCheckout?: (product: any, quantity: number, variant?: any) => void;
  user?: {
    name?: string;
    avatar_url?: string;
    badge_name?: string;
    username?: string;
    monthly_activation?: {
      current_month_pv: number;
      threshold_pv: number;
      remaining_pv: number;
    };
  } | null;
  cartCount?: number;
  wishlistItems?: WishlistItem[];
  isDarkMode?: boolean;
}

const BADGE_CONFIG = [
  { key: 'musthave' as const,   label: 'Must Have',  bg: ['#f97316', '#ea580c'] as [string, string], icon: 'heart' as const },
  { key: 'bestseller' as const, label: 'Bestseller', bg: ['#d4a017', '#b8860b'] as [string, string], icon: 'flame' as const },
  { key: 'salespromo' as const, label: 'On Sale',    bg: [Colors.forest, '#1e4236'] as [string, string], icon: 'flash' as const },
];

interface BrandProfile {
  id: number;
  name: string;
  profile_picture?: string;
  status: number;
  is_online: boolean;
  chat_performance: number;
  overall_rating: number;
  total_reviews: number;
  total_products: number;
  joined_date: string;
  supplier_name: string;
}

function toProductCard(p: Product): ProductCard {
  return {
    id: p.id,
    name: p.name,
    image: p.image,
    soldCount: p.soldCount,
    originalPrice: p.priceSrp,
    memberPrice: p.priceMember,
    pv: p.prodpv,
    brandName: p.brand,
    variantCount: p.variants?.length ?? 0,
    badges: {
      musthave: p.musthave,
      bestseller: p.bestseller,
      salespromo: p.salespromo,
    },
  };
}

export default function ProductDetailScreen({
  productId,
  token,
  onBack,
  onProductPress,
  onSearch,
  onCartUpdate,
  onWishlistToggle,
  onShopNavigate,
  onCheckout,
  user,
  cartCount = 0,
  wishlistItems = [],
  isDarkMode = false,
}: ProductDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Product | null>(null);

  // Debug logging
  console.log(`🔍 ProductDetailScreen mounted with productId: ${productId}`);
  const [relatedProducts, setRelatedProducts] = useState<ProductCard[]>([]);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [productReviews, setProductReviews] = useState<ProductReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [specificationsExpanded, setSpecificationsExpanded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const galleryScrollRef = useRef<ScrollView>(null);
  const imageViewerScrollRef = useRef<ScrollView>(null);
  const [showHeaderOnScroll, setShowHeaderOnScroll] = useState(false);
  const headerTranslateY = useRef(new Animated.Value(-100)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const [addingToCart, setAddingToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);
  const [youMayAlsoLike, setYouMayAlsoLike] = useState<ProductCard[]>([]);
  const [visibleYouMayAlsoLikeCount, setVisibleYouMayAlsoLikeCount] = useState(8);

  useEffect(() => {
    console.log(`🎯 ProductDetailScreen mounted for product ID: ${productId}`);
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('🔙 Back button pressed');
      if (showImageViewer) {
        console.log('📸 Closing image viewer');
        setShowImageViewer(false);
        return true;
      }
      if (showBuyModal) {
        console.log('🛒 Closing buy modal');
        setShowBuyModal(false);
        return true;
      }
      console.log('🚪 Going back');
      onBack();
      return true;
    });
    return () => backHandler.remove();
  }, [onBack, showBuyModal, showImageViewer]);

  // Update wishlisted state when wishlistItems change
  useEffect(() => {
    if (product) {
      const isProductWishlisted = wishlistItems.some(item => item.product_id === product.id);
      setIsWishlisted(isProductWishlisted);
    }
  }, [wishlistItems, product?.id]);

  useEffect(() => {
    setLoading(true);
    setProduct(null);
    setRelatedProducts([]);
    setYouMayAlsoLike([]);
    setVisibleYouMayAlsoLikeCount(8);
    setBrandProfile(null);
    setActiveImage(0);
    setDescriptionExpanded(false);
    setSpecificationsExpanded(false);
    setSelectedVariant(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });

    let active = true;
    productService.getProductById(productId, token ?? undefined)
      .then(async data => {
        if (!active) return;
        console.log(`✅ Product loaded: ${data.name} (ID: ${data.id})`);
        setProduct(data);

        // Check if product is in wishlist
        const isProductWishlisted = wishlistItems.some(item => item.product_id === data.id);
        setIsWishlisted(isProductWishlisted);
        console.log(`❤️ Is wishlisted: ${isProductWishlisted}`);

        // Set first variant as default
        if (data.variants && data.variants.length > 0) {
          setSelectedVariant(data.variants[0].id);
        }

        // Fetch brand profile if brandType is available
        if (data.brandType && token) {
          try {
            const brandData = await authService.getBrandProfile(data.brandType, token);
            if (brandData) {
              setBrandProfile(brandData);
            }
          } catch (error) {
            // Silently fail brand profile fetch
          }
        }

        // Fetch product reviews
        if (token) {
          try {
            const reviewsData = await productService.getProductReviews(productId, token);
            if (reviewsData) {
              setProductReviews(reviewsData);
            }
          } catch (error) {
            // Silently fail reviews fetch
          }
        }

        // Track product view behavior
        if (token && active && data?.id) {
          userBehaviorService.trackBehavior(
            token,
            'product_view',
            data.id,
            data.catid,
            data.brandType,
          ).catch(() => {});
        }

        // Fetch related products by brand type
        if (data.brandType && token) {
          productService.getProductsByBrand(data.brandType, token)
            .then(items => {
              if (!active) return;
              const filteredItems = items.filter(p => p.id !== productId);
              // Shuffle the array and take 8 items
              const shuffled = filteredItems.sort(() => Math.random() - 0.5);
              const cards = shuffled
                .slice(0, 8)
                .map(toProductCard);
              setRelatedProducts(cards);
            })
            .catch(() => {});
        }

        // Fetch "You May Also Like" products
        if (token) {
          productService.getProducts(token)
            .then(items => {
              if (!active) return;
              // Filter out current product and shuffle
              const filteredItems = items.filter(p => p.id !== productId);
              const shuffled = filteredItems.sort(() => Math.random() - 0.5);
              // Take at least 20 items for lazy loading
              const cards = shuffled
                .slice(0, Math.max(20, shuffled.length))
                .map(toProductCard);
              setYouMayAlsoLike(cards);
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [productId, token]);


  // Create image list with variant mapping (unique images only)
  const imagesWithVariants = useMemo(() => {
    if (!product) return [];

    const list: Array<{ image: string; variantId: number | null }> = [];
    const addedImages = new Set<string>();

    // Add variant images first (with variant ID) - only if not already added
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach(v => {
        if (v.images && v.images.length > 0) {
          const imgUrl = v.images[0];
          // Only add if this image hasn't been added yet
          if (!addedImages.has(imgUrl)) {
            list.push({ image: imgUrl, variantId: v.id });
            addedImages.add(imgUrl);
          }
        }
      });
    }

    // Add product images (no variant ID - don't auto-select)
    if (product.images && product.images.length > 0) {
      product.images.forEach(img => {
        if (img && !addedImages.has(img)) {
          list.push({ image: img, variantId: null });
          addedImages.add(img);
        }
      });
    }

    // Add main product image if not already added
    if (product.image && !addedImages.has(product.image)) {
      list.push({ image: product.image, variantId: null });
      addedImages.add(product.image);
    }

    return list;
  }, [product]);

  const images = useMemo(() => {
    return imagesWithVariants.map(item => item.image);
  }, [imagesWithVariants]);

  const hasDiscount = product ? (product.priceMember ?? 0) < (product.priceSrp ?? 0) : false;
  const discountPct = (hasDiscount && product)
    ? Math.round(((product.priceSrp ?? 0) - (product.priceMember ?? 0)) / (product.priceSrp ?? 0) * 100)
    : 0;

  const activeBadges = product
    ? BADGE_CONFIG.filter(b => (product as any)[b.key])
    : [];

  const handleScrollEvent = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;

    setShowHeaderOnScroll(scrollY > 100);

    // Auto-load more items when user scrolls near bottom
    if (contentHeight - scrollY - scrollViewHeight < 500) {
      if (visibleYouMayAlsoLikeCount < youMayAlsoLike.length) {
        setVisibleYouMayAlsoLikeCount(prev => Math.min(prev + 8, youMayAlsoLike.length));
      }
    }
  };

  useEffect(() => {
    if (showHeaderOnScroll) {
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(headerOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showHeaderOnScroll, headerTranslateY, headerOpacity]);

  const addToCart = async (cartData: {
    product_id: number;
    variant_id?: number;
    quantity: number;
    selected_color?: string | null;
    selected_size?: string | null;
    selected_type?: string | null;
  }) => {
    if (!token) {
      console.log('Missing token');
      return;
    }

    setAddingToCart(true);
    try {
      console.log('Add to cart data received:', cartData);
      
      const requestData: any = {
        product_id: cartData.product_id,
        quantity: cartData.quantity,
      };

      // Only include variant_id if it exists and is not null
      if (cartData.variant_id) {
        requestData.variant_id = cartData.variant_id;
      }

      // Include variant details if they exist
      if (cartData.selected_color) {
        requestData.selected_color = cartData.selected_color;
      }
      if (cartData.selected_size) {
        requestData.selected_size = cartData.selected_size;
      }
      if (cartData.selected_type) {
        requestData.selected_type = cartData.selected_type;
      }

      console.log('Sending to API:', requestData);

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/cart/add`,
        requestData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data?.success) {
        console.log('Item added to cart successfully');
        setShowAddToCartModal(false);

        // Track cart add behavior
        userBehaviorService.trackBehavior(token, 'cart_add', cartData.product_id).catch(() => {});

        onCartUpdate?.();
      }
    } catch (error: any) {
      console.error('Failed to add to cart:', error);
      console.error('Error response:', error?.response?.data);
      console.error('Error status:', error?.response?.status);
      console.error('Error headers:', error?.response?.headers);
      
      let errorMessage = 'Failed to add item to cart';
      
      // Check for specific database errors
      if (error?.response?.data?.error?.includes('column') && error?.response?.data?.error?.includes('does not exist')) {
        errorMessage = 'Server database error. Please try again later or contact support.';
      } else if (error?.response?.data?.message) {
        errorMessage = error?.response?.data?.message;
      }
      
      console.error('Error details:', errorMessage);
    } finally {
      setAddingToCart(false);
    }
  };

  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleShareProduct = async () => {
    if (!product) return;

    try {
      const slug = slugify(product.name);
      const shareUrl = `https://www.afhome.ph/product/${slug}-i${product.id}`;

      await Share.share({
        message: `Check out this product: ${product.name}\n\n${shareUrl}`,
      });
    } catch (error) {
      console.error('Error sharing product:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to share product',
      });
    }
  };

  const toggleWishlist = async () => {
    if (!token) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please log in to add items to wishlist',
      });
      return;
    }

    if (!product) {
      console.log('Missing product');
      return;
    }

    try {
      setWishlistLoading(true);

      if (isWishlisted) {
        // Remove from wishlist - DELETE request
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

      const newWishlistState = !isWishlisted;
      setIsWishlisted(newWishlistState);
      onWishlistToggle?.(product.id, newWishlistState);

      // Track wishlist behavior
      const behaviorType = newWishlistState ? 'wishlist_add' : 'wishlist_remove';
      userBehaviorService.trackBehavior(token, behaviorType, product.id, product.catid, product.brandType).catch(() => {});

      Toast.show({
        type: 'success',
        text1: isWishlisted ? 'Removed from wishlist' : 'Added to wishlist',
        text2: isWishlisted ? 'Item removed from your wishlist' : 'Item added to your wishlist',
      });
    } catch (error: any) {
      console.error('Failed to update wishlist:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: isWishlisted ? 'Failed to remove from wishlist' : 'Failed to add to wishlist',
      });
    } finally {
      setWishlistLoading(false);
    }
  };

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#ffffff',
    containerBg: isDarkMode ? '#1e293b' : '#f8fbff',
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#334155' : '#e5e7eb',
    card: isDarkMode ? '#1e293b' : Colors.white,
    cardBorder: isDarkMode ? '#334155' : '#e5e7eb',
    divider: isDarkMode ? '#334155' : '#f1f5f9',
  };

  if (loading) {
    console.log('⏳ ProductDetailScreen: Loading state...');
  } else if (product) {
    console.log(`📦 ProductDetailScreen: Rendering product "${product.name}"`);
  } else {
    console.log('❌ ProductDetailScreen: No product data available');
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.containerBg }]}>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.sky} />
        </View>
      ) : product ? (
        <>
          <Animated.View
            style={[
              styles.animatedHeader,
              {
                transform: [{ translateY: headerTranslateY }],
                opacity: headerOpacity,
              },
            ]}
            pointerEvents={showHeaderOnScroll ? 'auto' : 'none'}
          >
            <View style={[styles.scrollHeader, { backgroundColor: colors.card, paddingTop: insets.top }]}>
              <TouchableOpacity
                onPress={() => {
                  try {
                    if (onBack && typeof onBack === 'function') {
                      onBack();
                    }
                  } catch (error) {
                    console.error('Error in back navigation:', error);
                  }
                }}
                style={styles.scrollHeaderBackBtn}
              >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.scrollHeaderTitle, { color: colors.text }]} numberOfLines={1}>
                {product?.name || ''}
              </Text>
              <View style={styles.scrollHeaderActions}>
                <TouchableOpacity
                  onPress={toggleWishlist}
                  disabled={wishlistLoading}
                >
                  <Ionicons
                    name={isWishlisted ? 'heart' : 'heart-outline'}
                    size={20}
                    color={isWishlisted ? '#ef4444' : colors.text}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShareProduct}>
                  <Ionicons name="share-social-outline" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.containerBg }]}
            onScroll={handleScrollEvent}
            scrollEventThrottle={16}
          >
          {/* Image Gallery */}
          <View style={[styles.galleryWrap, { backgroundColor: Colors.white, borderBottomColor: colors.divider }]}>
            <ScrollView
              ref={galleryScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              style={{ backgroundColor: Colors.white }}
              onMomentumScrollEnd={e => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveImage(index);
                // Auto-select variant based on image index
                if (imagesWithVariants.length > index) {
                  const item = imagesWithVariants[index];
                  if (item.variantId !== null) {
                    setSelectedVariant(item.variantId);
                  }
                }
              }}
            >
              {images.length > 0 ? images.map((img, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.95}
                  onPress={() => {
                    // Set active image and scroll gallery to this image
                    setActiveImage(i);
                    setImageViewerIndex(i);
                    setShowImageViewer(true);
                    galleryScrollRef.current?.scrollTo({
                      x: i * SCREEN_WIDTH,
                      animated: true,
                    });
                    // Auto-select variant based on image index
                    if (imagesWithVariants.length > i && imagesWithVariants[i].variantId !== null) {
                      setSelectedVariant(imagesWithVariants[i].variantId);
                    }
                  }}
                  style={[styles.galleryImageContainer, { backgroundColor: Colors.white }]}
                >
                  <Image source={{ uri: img }} style={styles.galleryImage} resizeMode="contain" />
                </TouchableOpacity>
              )) : (
                <View style={[styles.galleryImageContainer, styles.galleryFallback, { backgroundColor: Colors.white }]}>
                  <Ionicons name="image-outline" size={48} color="#d1d5db" />
                </View>
              )}
            </ScrollView>
            {/* Navigation Dots */}
            {images.length > 0 && (
              <View style={styles.galleryDotsContainer}>
                {images.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      setActiveImage(i);
                      setImageViewerIndex(i);
                      setShowImageViewer(true);
                      galleryScrollRef.current?.scrollTo({
                        x: i * SCREEN_WIDTH,
                        animated: true,
                      });
                      // Auto-select variant based on image index
                      if (imagesWithVariants.length > i && imagesWithVariants[i].variantId !== null) {
                        setSelectedVariant(imagesWithVariants[i].variantId);
                      }
                    }}
                    style={[
                      styles.galleryDot,
                      i === activeImage
                        ? styles.galleryDotActive
                        : { borderColor: 'rgba(0, 0, 0, 0.5)' }
                    ]}
                    activeOpacity={0.7}
                  />
                ))}
              </View>
            )}
            {/* Back Button */}
            <TouchableOpacity
              onPress={() => {
                try {
                  if (onBack && typeof onBack === 'function') {
                    onBack();
                  } else {
                    console.warn('onBack callback is not available');
                  }
                } catch (error) {
                  console.error('Error in back navigation:', error);
                }
              }}
              style={[styles.galleryBackBtn, { paddingTop: insets.top + 10 }]}
              activeOpacity={0.7}
            >
              <View style={styles.galleryBackBtnInner}>
                <Ionicons name="arrow-back" size={22} color={Colors.white} />
              </View>
            </TouchableOpacity>

            {/* Top Right Icons */}
            <View style={[styles.galleryTopRightIcons, { paddingTop: insets.top + 10 }]}>
              {/* Heart/Wishlist Icon */}
              <TouchableOpacity
                onPress={toggleWishlist}
                style={styles.galleryIconBtn}
                activeOpacity={0.7}
                disabled={wishlistLoading}
              >
                <View style={styles.galleryIconBtnInner}>
                  {wishlistLoading ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Ionicons
                      name={isWishlisted ? 'heart' : 'heart-outline'}
                      size={22}
                      color={isWishlisted ? '#ef4444' : Colors.white}
                    />
                  )}
                </View>
              </TouchableOpacity>

              {/* Share Icon */}
              <TouchableOpacity
                onPress={handleShareProduct}
                style={styles.galleryIconBtn}
                activeOpacity={0.7}
              >
                <View style={styles.galleryIconBtnInner}>
                  <Ionicons name="share-social-outline" size={22} color={Colors.white} />
                </View>
              </TouchableOpacity>

              {/* More Options (3-dot menu) */}
              <TouchableOpacity
                onPress={() => {
                  console.log('More options');
                }}
                style={styles.galleryIconBtn}
                activeOpacity={0.7}
              >
                <View style={styles.galleryIconBtnInner}>
                  <Ionicons name="ellipsis-vertical" size={22} color={Colors.white} />
                </View>
              </TouchableOpacity>
            </View>
                      </View>

          {/* Price and Badges Section */}
          <View style={[styles.priceAndBadgesSection, { backgroundColor: colors.card }]}>
            {/* Price Card */}
            <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.priceRow}>
                <View style={styles.priceContent}>
                  <Text style={[styles.priceLabel, { color: colors.textSec }]}>Price</Text>
                  <View style={styles.priceDisplayRow}>
                    <Text style={[styles.currentPrice, { color: colors.text }]}>₱{(product.priceMember ?? 0).toLocaleString()}</Text>
                    {hasDiscount && (
                      <>
                        <Text style={[styles.originalPrice, { color: colors.textSec }]}>₱{(product.priceSrp ?? 0).toLocaleString()}</Text>
                        <View style={styles.discountBadgeSmall}>
                          <Text style={styles.discountBadgeText}>{discountPct}% OFF</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
                {product.soldCount > 0 && (
                  <View style={[styles.soldInfoCard, { backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }]}>
                    <Ionicons name="bag-check-outline" size={16} color={Colors.sky} />
                    <View>
                      <Text style={[styles.soldLabelSmall, { color: colors.textSec }]}>Sold</Text>
                      <Text style={[styles.soldCountSmall, { color: colors.text }]}>{product.soldCount}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Badges inline with price */}
              {(activeBadges.length > 0 || product.prodpv) && (
                <View style={styles.badgesRow}>
                  <LinearGradient
                    colors={[Colors.sky, Colors.skyDark]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.badge}
                  >
                    <Ionicons name="trending-up" size={10} color={Colors.white} />
                    <Text style={styles.badgeLabel}>PV {product.prodpv}</Text>
                  </LinearGradient>
                  {activeBadges.map(b => (
                    <LinearGradient
                      key={b.key}
                      colors={b.bg}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.badge}
                    >
                      <Ionicons name={b.icon} size={10} color={Colors.white} />
                      <Text style={styles.badgeLabel}>{b.label}</Text>
                    </LinearGradient>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Product Name and Details */}
          <View style={[styles.nameSection, { backgroundColor: colors.card }]}>
            <View style={[styles.nameCard, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder, borderTopColor: colors.cardBorder }]}>
              {/* Product Name and Rating Container */}
              <View style={styles.nameAndRatingContainer}>
                {/* Product Name */}
                <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>

                {/* Rating and Sold Row */}
                <View style={styles.ratingAndSoldRow}>
                  <View style={[styles.ratingBadge, { backgroundColor: isDarkMode ? '#2d2a1a' : '#fffbeb' }]}>
                    <Ionicons name="star" size={13} color="#fbbf24" />
                    <Text style={[styles.ratingBadgeText, { color: colors.text }]}>4.8</Text>
                    <Text style={[styles.reviewCountText, { color: colors.textSec }]}>(2.5K reviews)</Text>
                  </View>
                  {product.soldCount > 0 && (
                    <>
                      <View style={[styles.dividerDot, { backgroundColor: colors.divider }]} />
                      <View style={styles.soldBadge}>
                        <Ionicons name="bag-check-outline" size={13} color={colors.textSec} />
                        <Text style={[styles.soldCountText, { color: colors.textSec }]}>{product.soldCount} sold</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>


              {/* Trust Badge Row */}
              <View style={[styles.trustBadgeRow, { paddingVertical: 12, paddingHorizontal: 12, backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb', borderTopColor: colors.divider, borderTopWidth: 1 }]}>
                <View style={styles.trustBadgeItem}>
                  <Ionicons name="shield-checkmark" size={14} color={Colors.sky} />
                  <Text style={[styles.trustBadgeText, { color: colors.text }]}>Authentic</Text>
                </View>
                <View style={[styles.trustBadgeDivider, { backgroundColor: colors.divider }]} />
                <View style={styles.trustBadgeItem}>
                  <Ionicons name="arrow-undo" size={14} color={Colors.forest} />
                  <Text style={[styles.trustBadgeText, { color: colors.text }]}>7-Day Return</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Variants */}
          {(product.variants?.length ?? 0) > 0 && (
            <View style={[styles.variantsSection, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Variants ({product.variants.length})</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.variantsScrollView}
              >
                <View style={styles.variantsList}>
                  {product.variants.map((variant, index) => (
                    <TouchableOpacity
                      key={variant.id}
                      style={[
                        styles.variantCard,
                        selectedVariant === variant.id && styles.variantCardSelected,
                        { borderColor: selectedVariant === variant.id ? Colors.sky : colors.divider, backgroundColor: colors.containerBg }
                      ]}
                      onPress={() => setSelectedVariant(variant.id)}
                      activeOpacity={0.7}
                    >
                      {/* Variant Image, Color Circle, or Label */}
                      <View style={[styles.variantMediaContainer, { backgroundColor: isDarkMode ? '#111827' : '#f1f5f9', borderBottomColor: colors.divider }]}>
                        {variant.images && variant.images.length > 0 ? (
                          <Image
                            source={{ uri: variant.images[0] }}
                            style={styles.variantImage}
                            resizeMode="cover"
                          />
                        ) : variant.colorHex ? (
                          <View style={[
                            styles.variantColorCircle,
                            { backgroundColor: variant.colorHex, borderColor: isDarkMode ? 'rgba(255,255,255,0.3)' : '#e5e7eb' }
                          ]} />
                        ) : (
                          <View style={[styles.variantPlaceholder, { backgroundColor: colors.divider }]}>
                            <Ionicons name="image-outline" size={24} color={colors.textSec} />
                          </View>
                        )}
                        {selectedVariant === variant.id && (
                          <View style={styles.variantCheckmark}>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.sky} />
                          </View>
                        )}
                      </View>

                      {/* Variant Info */}
                      <View style={styles.variantInfo}>
                        <Text
                          style={[styles.variantLabel, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {variant.color || variant.name || `Variant ${index + 1}`}
                        </Text>
                        {(variant.size || variant.style) && (
                          <Text
                            style={[styles.variantSubInfo, { color: colors.textSec }]}
                            numberOfLines={1}
                          >
                            {[variant.size, variant.style].filter(Boolean).join(' • ')}
                          </Text>
                        )}
                        <Text
                          style={[
                            styles.variantStock,
                            { color: variant.qty > 0 ? (isDarkMode ? '#4ade80' : Colors.forest) : '#ef4444', fontWeight: '700' }
                          ]}
                        >
                          {variant.qty > 10 ? `${variant.qty} left` : variant.qty > 0 ? `${variant.qty} left` : 'Out of stock'}
                        </Text>
                        <Text style={[styles.variantPrice, { color: colors.text }]}>
                          ₱{(variant.priceMember ?? variant.priceSrp).toLocaleString()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {selectedVariant && (() => {
                const variant = product.variants?.find(v => v.id === selectedVariant);
                if (!variant) return null;

                const variantDiscount = (variant.priceSrp ?? 0) - (variant.priceMember ?? 0);
                const hasVariantDiscount = variantDiscount > 0;

                return (
                  <View style={[styles.variantDetailsCard, { backgroundColor: colors.card, borderTopColor: colors.divider, borderBottomColor: colors.divider }]}>
                    {/* Header with price */}
                    <View style={[styles.variantDetailsHeader, { borderBottomColor: colors.divider }]}>
                      <View>
                        <Text style={[styles.variantDetailsTitle, { color: colors.text }]}>
                          {variant.color || variant.name || 'Selected Variant'}
                        </Text>
                        <Text style={[styles.variantDetailsSku, { color: colors.textSec }]}>SKU: {variant.sku}</Text>
                      </View>
                      <View style={styles.variantPriceContainer}>
                        <Text style={[styles.variantPriceLarge, { color: colors.text }]}>
                          ₱{(variant.priceMember ?? variant.priceSrp).toLocaleString()}
                        </Text>
                        {hasVariantDiscount && (
                          <Text style={[styles.variantPriceOriginal, { color: colors.textSec }]}>
                            ₱{(variant.priceSrp ?? 0).toLocaleString()}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Details Grid */}
                    <View style={[styles.variantDetailsGrid, { gap: 8 }]}>
                      <View style={[styles.detailGridItem, { backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }]}>
                        <Ionicons name="cube-outline" size={16} color={Colors.sky} />
                        <Text style={[styles.detailGridLabel, { color: colors.textSec }]}>Stock</Text>
                        <Text style={[
                          styles.detailGridValue,
                          { color: variant.qty > 0 ? (isDarkMode ? '#4ade80' : Colors.forest) : '#ef4444', fontWeight: '700' }
                        ]}>
                          {variant.qty}
                        </Text>
                      </View>

                      {variant.size && (
                        <View style={[styles.detailGridItem, { backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }]}>
                          <Ionicons name="expand-outline" size={16} color={Colors.sky} />
                          <Text style={[styles.detailGridLabel, { color: colors.textSec }]}>Size</Text>
                          <Text style={[styles.detailGridValue, { color: colors.text }]}>{variant.size}</Text>
                        </View>
                      )}

                      <View style={[styles.detailGridItem, { backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }]}>
                        <Ionicons name="star-outline" size={16} color={Colors.sky} />
                        <Text style={[styles.detailGridLabel, { color: colors.textSec }]}>PV</Text>
                        <Text style={[styles.detailGridValue, { color: colors.text }]}>{variant.prodpv}</Text>
                      </View>

                      {hasVariantDiscount && (
                        <View style={[styles.detailGridItem, { backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }]}>
                          <Ionicons name="pricetag-outline" size={16} color="#ef4444" />
                          <Text style={[styles.detailGridLabel, { color: colors.textSec }]}>Save</Text>
                          <Text style={[styles.detailGridValue, { color: '#ef4444' }]}>
                            ₱{variantDiscount.toLocaleString()}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Additional Info */}
                    <View style={[styles.variantAdditionalInfo, { backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb' }]}>
                      {variant.style && (
                        <View style={styles.infoPair}>
                          <Text style={[styles.infoLabel, { color: colors.textSec }]}>Style:</Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>{variant.style}</Text>
                        </View>
                      )}
                      {(variant.width || variant.height || variant.dimension) && (
                        <View style={styles.infoPair}>
                          <Text style={[styles.infoLabel, { color: colors.textSec }]}>Dimensions:</Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>
                            {[
                              variant.width && `W: ${variant.width}`,
                              variant.height && `H: ${variant.height}`,
                              variant.dimension && `D: ${variant.dimension}`
                            ].filter(Boolean).join(' x ')}
                          </Text>
                        </View>
                      )}
                      <View style={styles.infoPair}>
                        <Text style={[styles.infoLabel, { color: colors.textSec }]}>Status:</Text>
                        <Text style={[
                          styles.infoValue,
                          { color: variant.qty > 0 ? (isDarkMode ? '#4ade80' : Colors.forest) : '#ef4444', fontWeight: '700' }
                        ]}>
                          {variant.qty > 0 ? '✓ In Stock' : '✗ Out of Stock'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })()}
            </View>
          )}

          {/* Description & Specifications Wrapper */}
          {(!!product.description || !!product.specifications || !!product.material || !!product.warranty || product.pswidth || product.pslenght || product.psheight) && (
            <View style={[styles.descriptionsWrapper, { backgroundColor: colors.card, borderColor: colors.divider }]}>
              {/* Description */}
              {!!product.description && (
                <View style={[styles.descriptionSection, { backgroundColor: colors.card, borderBottomColor: colors.divider, borderTopColor: colors.divider }]}>
              <TouchableOpacity
                style={[styles.descriptionHeader, { backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }]}
                onPress={() => setDescriptionExpanded(!descriptionExpanded)}
                activeOpacity={0.7}
              >
                <Text style={[styles.descriptionTitle, { color: colors.text }]}>Description</Text>
                <Ionicons
                  name={descriptionExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
              {descriptionExpanded && (
                <View style={[styles.descriptionContent, { backgroundColor: colors.card }]}>
                  <View style={styles.descriptionContentInner}>
                    <RenderHtml
                      source={{ html: product.description }}
                      contentWidth={SCREEN_WIDTH - 16}
                      tagsStyles={{
                        body: { color: colors.text, fontSize: 14, lineHeight: 22 },
                        h3: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 6 },
                        h4: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 10, marginBottom: 6 },
                        p: { color: colors.text, fontSize: 14, lineHeight: 22, marginBottom: 10 },
                        ul: { marginLeft: 20, marginBottom: 10 },
                        li: { color: colors.text, fontSize: 14, lineHeight: 22, marginBottom: 6 },
                        hr: { backgroundColor: colors.divider, marginVertical: 12 },
                        strong: { fontWeight: '700' },
                      }}
                    />
                  </View>
                </View>
              )}
                </View>
              )}

              {/* Specifications */}
              {(!!product.specifications || !!product.material || !!product.warranty || product.pswidth || product.pslenght || product.psheight) && (
                <View style={[styles.specificationsSection, { backgroundColor: colors.card, borderBottomColor: colors.divider, borderTopColor: colors.divider }]}>
                <TouchableOpacity
                  style={[styles.specificationsHeader, { backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }]}
                  onPress={() => setSpecificationsExpanded(!specificationsExpanded)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.specificationsTitle, { color: colors.text }]}>Specifications</Text>
                  <Ionicons
                    name={specificationsExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.text}
                  />
                </TouchableOpacity>
                {specificationsExpanded && (
                  <View style={[styles.specificationsContent, { backgroundColor: colors.card }]}>
                    <View style={styles.specificationsContentInner}>
                    {product.pswidth || product.pslenght || product.psheight ? (
                      <View style={styles.specRow}>
                        <Text style={[styles.specLabel, { color: colors.textSec }]}>Dimensions:</Text>
                        <Text style={[styles.specValue, { color: colors.text }]}>
                          W: {product.pswidth} cm x D: {product.pslenght} cm x H: {product.psheight} cm
                        </Text>
                      </View>
                    ) : null}
                    {product.material ? (
                      <View style={styles.specRow}>
                        <Text style={[styles.specLabel, { color: colors.textSec }]}>Material:</Text>
                        <Text style={[styles.specValue, { color: colors.text }]}>{product.material}</Text>
                      </View>
                    ) : null}
                    {product.warranty ? (
                      <View style={styles.specRow}>
                        <Text style={[styles.specLabel, { color: colors.textSec }]}>Warranty:</Text>
                        <Text style={[styles.specValue, { color: colors.text }]}>{product.warranty}</Text>
                      </View>
                    ) : null}
                    {product.specifications ? (
                      <View style={styles.specRow}>
                        <Text style={[styles.specValue, { color: colors.text }]}>{product.specifications}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              )}
                </View>
              )}
            </View>
          )}

          {/* Product Rating - Shopee Style */}
          <View style={styles.ratingSection}>
            <View style={[styles.ratingCard, { backgroundColor: colors.card, borderColor: colors.divider }]}>
              {productReviews && productReviews.summary ? (
                <>
                  {/* Rating Summary Header */}
                  <View style={[styles.ratingSummaryHeader, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
                    <View style={styles.ratingScoreContainer}>
                      <Text style={[styles.ratingScoreLarge, { color: colors.text }]}>{((productReviews.summary.average || 0) || 0).toFixed(1)}</Text>
                      <View style={styles.ratingStarsLarge}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <Ionicons
                            key={star}
                            name={star <= Math.round(productReviews.summary.average || 0) ? 'star' : 'star-outline'}
                            size={20}
                            color={star <= Math.round(productReviews.summary.average || 0) ? '#fbbf24' : colors.divider}
                          />
                        ))}
                      </View>
                    </View>
                    <View style={styles.ratingStats}>
                      <Text style={[styles.ratingCount, { color: colors.text }]}>{productReviews.summary.count || 0} ratings</Text>
                      <TouchableOpacity style={styles.viewAllButton}>
                        <Text style={[styles.viewAllText, { color: Colors.sky }]}>See all</Text>
                        <Ionicons name="chevron-forward" size={16} color={Colors.sky} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Rating Distribution */}
                  <View style={[styles.ratingDistribution, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
                    {[5, 4, 3, 2, 1].map(rating => {
                      const count = productReviews.reviews?.filter(r => r.rating === rating).length || 0;
                      const percentage = productReviews.summary.count > 0 ? (count / productReviews.summary.count) * 100 : 0;
                      return (
                        <View key={rating} style={styles.ratingBarRow}>
                          <Text style={[styles.ratingBarLabel, { color: colors.text }]}>{rating}★</Text>
                          <View style={[styles.ratingBarTrack, { backgroundColor: colors.divider }]}>
                            <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
                          </View>
                          <Text style={[styles.ratingBarCount, { color: colors.text }]}>{count}</Text>
                        </View>
                      );
                    })}
                  </View>
                  
                  {/* Customer Reviews */}
                  {productReviews.reviews && productReviews.reviews.length > 0 && (
                    <View style={[styles.reviewsSection, { backgroundColor: colors.card }]}>
                      <View style={[styles.reviewsSectionHeader, { borderBottomColor: colors.divider }]}>
                        <Text style={[styles.reviewsSectionTitle, { color: colors.text }]}>Customer Reviews</Text>
                        <Text style={[styles.reviewsSectionCount, { color: colors.textSec }]}>({productReviews.reviews.length})</Text>
                      </View>
                      {productReviews.reviews.slice(0, 2).map((review, index) => (
                        <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.containerBg, borderColor: colors.divider }]}>
                          <View style={styles.reviewHeader}>
                            <View style={styles.reviewerInfo}>
                              <View style={styles.avatarContainer}>
                                <Image
                                  source={{ uri: review.customer_avatar || 'https://via.placeholder.com/40' }}
                                  style={styles.reviewAvatar}
                                  resizeMode="cover"
                                />
                              </View>
                              <View style={styles.reviewerDetails}>
                                <Text style={[styles.reviewCustomerName, { color: colors.text }]}>
                                  {review.customer_name.charAt(0)}{review.customer_name.slice(1).replace(/./g, '*')}
                                </Text>
                                <View style={styles.reviewRatingRow}>
                                  <View style={styles.reviewStars}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <Ionicons
                                        key={star}
                                        name={star <= review.rating ? 'star' : 'star-outline'}
                                        size={12}
                                        color={star <= review.rating ? '#fbbf24' : colors.divider}
                                      />
                                    ))}
                                  </View>
                                  <Text style={[styles.reviewRatingText, { color: colors.textSec }]}>{review.rating}.0</Text>
                                </View>
                              </View>
                            </View>
                            <Text style={[styles.reviewDate, { color: colors.textSec }]}>
                              {new Date(review.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </Text>
                          </View>
                          <Text style={[styles.reviewComment, { color: colors.text }]}>{review.review}</Text>
                          {index < productReviews.reviews.slice(0, 2).length - 1 && (
                            <View style={[styles.reviewSeparator, { backgroundColor: colors.divider }]} />
                          )}
                        </View>
                      ))}
                      {productReviews.reviews.length > 2 && (
                        <TouchableOpacity style={[styles.seeAllReviewsBtn, { backgroundColor: colors.containerBg, borderTopColor: colors.divider }]}>
                          <Text style={[styles.seeAllReviewsBtnText, { color: Colors.sky }]}>See all reviews ({productReviews.reviews.length})</Text>
                          <Ionicons name="chevron-forward" size={16} color={Colors.sky} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <>
                  {/* No Ratings State */}
                  <View style={[styles.noRatingContainer, { backgroundColor: colors.card }]}>
                    <View style={styles.noRatingScore}>
                      <Ionicons name="star-outline" size={24} color={colors.divider} />
                      <Text style={[styles.noRatingText, { color: colors.textSec }]}>No ratings yet</Text>
                    </View>
                    <TouchableOpacity style={styles.firstReviewButton}>
                      <Text style={styles.firstReviewButtonText}>Be the first to review</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Brand Information */}
          {brandProfile && (
            <View style={[styles.brandSection, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Shop Information</Text>
              <View style={[styles.brandCard, { backgroundColor: colors.containerBg, borderColor: colors.divider }]}>
                <Image
                  source={{ uri: brandProfile.profile_picture || 'https://via.placeholder.com/60' }}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
                <View style={styles.brandInfo}>
                  <View style={styles.brandHeader}>
                    <Text style={[styles.brandName, { color: colors.text }]}>{brandProfile.name}</Text>
                    <View style={[
                      styles.onlineDot,
                      brandProfile.is_online ? styles.onlineDotActive : styles.onlineDotInactive
                    ]} />
                  </View>
                  <View style={styles.brandStats}>
                    <View style={styles.brandStat}>
                      <Ionicons name="star" size={12} color="#fbbf24" />
                      <Text style={[styles.brandStatText, { color: colors.text }]}>{(brandProfile.overall_rating || 0).toFixed(1)}</Text>
                    </View>
                    <View style={styles.brandStatDivider} />
                    <View style={styles.brandStat}>
                      <Text style={[styles.brandStatText, { color: colors.text }]}>{brandProfile.total_reviews} reviews</Text>
                    </View>
                    <View style={styles.brandStatDivider} />
                    <View style={styles.brandStat}>
                      <Text style={[styles.brandStatText, { color: colors.text }]}>{brandProfile.total_products} products</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.chatButton, { backgroundColor: isDarkMode ? '#111827' : '#f0f9ff' }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (product && onShopNavigate) {
                      onShopNavigate(product.brandType, brandProfile?.name || '');
                    }
                  }}
                >
                  <Ionicons name="chevron-forward" size={20} color={Colors.sky} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <View style={[styles.relatedSection, { backgroundColor: colors.card }]}>
              <View style={[styles.relatedHeader, { borderBottomColor: colors.divider }]}>
                <Ionicons name="grid-outline" size={15} color={Colors.sky} />
                <Text style={[styles.relatedTitle, { color: colors.text }]}>Related Products</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relatedScroll}>
                <View style={styles.relatedRow}>
                  {relatedProducts.map(p => (
                    <View key={p.id} style={styles.relatedCard}>
                      <ItemCard product={p} onPress={item => onProductPress?.(item.id)} isDarkMode={isDarkMode} />
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* You May Also Like Section - With Lazy Loading */}
          {youMayAlsoLike.length > 0 && (
            <View style={[styles.youMayAlsoLikeSection, { backgroundColor: colors.card }]}>
              <View style={[styles.youMayAlsoLikeHeader, { borderTopColor: colors.divider, borderBottomColor: colors.divider }]}>
                <View style={[styles.youMayAlsoLikeBorder, { backgroundColor: colors.divider }]} />
                <Text style={[styles.youMayAlsoLikeTitle, { color: colors.text }]}>You May Also Like</Text>
                <View style={[styles.youMayAlsoLikeBorder, { backgroundColor: colors.divider }]} />
              </View>
              <View style={styles.youMayAlsoLikeMasonryGrid}>
                <View style={styles.youMayAlsoLikeMasonryColumn}>
                  {youMayAlsoLike
                    .slice(0, visibleYouMayAlsoLikeCount)
                    .filter((_, i) => i % 2 === 0)
                    .map(p => (
                      <View key={p.id} style={styles.youMayAlsoLikeItem}>
                        <ItemCard product={p} onPress={item => onProductPress?.(item.id)} isDarkMode={isDarkMode} />
                      </View>
                    ))}
                </View>
                <View style={styles.youMayAlsoLikeMasonryColumn}>
                  {youMayAlsoLike
                    .slice(0, visibleYouMayAlsoLikeCount)
                    .filter((_, i) => i % 2 === 1)
                    .map(p => (
                      <View key={p.id} style={styles.youMayAlsoLikeItem}>
                        <ItemCard product={p} onPress={item => onProductPress?.(item.id)} isDarkMode={isDarkMode} />
                      </View>
                    ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Buy Now Button - Fixed Bottom */}
        <LinearGradient
          colors={isDarkMode ? ['#0f172a', '#1e293b'] : ['#f0f9ff', '#f0fdf4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.buyNowContainer, { borderTopColor: colors.divider }]}
        >
          <View style={{ paddingTop: 8, paddingBottom: insets.bottom || 4 }}>
          {/* Decorative Icon */}
          <View style={styles.decorativeIconContainer}>
            <Ionicons name="sparkles" size={16} color={Colors.sky} />
            <Text style={styles.decorativeText}>Complete your order</Text>
          </View>

          {/* Button Row */}
          <View style={styles.buttonRow}>
            {/* Add to Cart Button */}
            <TouchableOpacity
              style={[styles.addToCartButton, addingToCart && { opacity: 0.6 }]}
              onPress={() => setShowAddToCartModal(true)}
              activeOpacity={0.7}
              disabled={addingToCart}
            >
              <View style={styles.addToCartContent}>
                {addingToCart ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Ionicons name="cart-outline" size={20} color={Colors.white} />
                )}
                <Text style={styles.addToCartText}>{addingToCart ? 'Processing...' : 'Add to cart'}</Text>
              </View>
            </TouchableOpacity>

            {/* Buy Now Button with Save Badge */}
            <View style={styles.buyNowButtonContainer}>
              <TouchableOpacity
                style={styles.buyNowButton}
                onPress={() => {
                  setShowBuyModal(true);
                  setQuantity(1);
                }}
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
          </View>
        </LinearGradient>
        </>
      ) : (
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={36} color="#d1d5db" />
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      )}

      {/* Full Screen Image Slideshow Viewer */}
      <ImageViewerModal
        visible={showImageViewer}
        product={product}
        brandProfile={brandProfile}
        images={images}
        imagesWithVariants={imagesWithVariants}
        selectedVariant={selectedVariant}
        imageViewerIndex={imageViewerIndex}
        cartCount={cartCount}
        onClose={() => setShowImageViewer(false)}
        onAddToCart={() => {
          console.log('Add to cart');
          setShowImageViewer(false);
        }}
        onBuyNow={() => {
          setShowBuyModal(true);
          setShowImageViewer(false);
          setQuantity(1);
        }}
        onSelectVariant={setSelectedVariant}
        onImageIndexChange={setImageViewerIndex}
        onProductPress={() => {
          setShowImageViewer(false);
        }}
        hasDiscount={hasDiscount}
      />

      {/* Old slideshow code is now in ImageViewerModal component - removed for clarity */}
      {false && (
        <View>
          {/* Header with Brand Info and Close */}
          <LinearGradient
            colors={['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.slideshowHeader, { paddingTop: insets.top + 8 }]}
          >
            <TouchableOpacity
              onPress={() => setShowImageViewer(false)}
              activeOpacity={0.7}
              style={styles.slideshowCloseBtn}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>

            {/* Brand/Seller Info */}
            <View style={styles.slideshowBrandInfo}>
              <Image
                source={{ uri: brandProfile?.profile_picture || 'https://via.placeholder.com/32' }}
                style={styles.slideshowBrandImage}
                resizeMode="contain"
              />
              <View style={styles.slideshowBrandText}>
                <Text style={styles.slideshowBrandName} numberOfLines={1}>
                  {product.brand || 'Store'}
                </Text>
                {brandProfile && (
                  <View style={styles.slideshowRatingRow}>
                    <Ionicons name="star" size={12} color="#fbbf24" />
                    <Text style={styles.slideshowRating}>
                      {(brandProfile.overall_rating || 0).toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Share Button */}
            <TouchableOpacity
              style={styles.slideshowShareBtn}
              activeOpacity={0.7}
              onPress={() => {
                console.log('Share product');
              }}
            >
              <Ionicons name="share-social-outline" size={22} color={Colors.text} />
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
                setImageViewerIndex(index);
                // Auto-select variant based on image index
                if (imagesWithVariants.length > index) {
                  const item = imagesWithVariants[index];
                  if (item.variantId !== null) {
                    setSelectedVariant(item.variantId);
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
            style={[styles.slideshowProductCard, { paddingBottom: insets.bottom + 12 }]}
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
                <Text style={styles.slideshowCardName} numberOfLines={2}>
                  {product.name}
                </Text>

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
                      <Ionicons name="star" size={12} color={Colors.sky} />
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
                  {product.variants.map((variant, idx) => (
                    <TouchableOpacity
                      key={variant.id}
                      style={[
                        styles.slideshowVariantOption,
                        selectedVariant === variant.id && styles.slideshowVariantOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedVariant(variant.id);
                        // Scroll to the variant's image in the gallery
                        const variantIndex = imagesWithVariants.findIndex(item => item.variantId === variant.id);
                        if (variantIndex >= 0) {
                          setImageViewerIndex(variantIndex);
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

            {/* Action Buttons */}
            <View style={styles.slideshowButtonRow}>
              <TouchableOpacity
                style={styles.slideshowAddToCartBtn}
                activeOpacity={0.7}
                onPress={() => {
                  console.log('Add to cart');
                  setShowImageViewer(false);
                }}
              >
                <Ionicons name="cart-outline" size={20} color="#f97316" />
                <Text style={styles.slideshowAddToCartText}>Add to Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.slideshowBuyNowBtn}
                activeOpacity={0.7}
                onPress={() => {
                  setShowBuyModal(true);
                  setShowImageViewer(false);
                  setQuantity(1);
                }}
              >
                <Ionicons name="flash" size={18} color={Colors.white} />
                <Text style={styles.slideshowBuyNowText}>Buy Now</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}

      <BuyNowModal
        visible={showBuyModal}
        product={product}
        images={images}
        selectedVariant={selectedVariant}
        quantity={quantity}
        onClose={() => setShowBuyModal(false)}
        onSelectVariant={setSelectedVariant}
        onQuantityChange={setQuantity}
        onCheckout={() => {
          setShowBuyModal(false);
          const variant = product?.variants?.find(v => v.id === selectedVariant);
          onCheckout?.(product, quantity, variant);
        }}
        onAddToCart={addToCart}
        loading={addingToCart}
        isDarkMode={isDarkMode}
      />

      <AddToCartModal
        visible={showAddToCartModal}
        product={product}
        images={images}
        selectedVariant={selectedVariant}
        quantity={quantity}
        isDarkMode={isDarkMode}
        onClose={() => setShowAddToCartModal(false)}
        onSelectVariant={setSelectedVariant}
        onQuantityChange={setQuantity}
        onAddToCart={addToCart}
        onCheckout={() => {
          setShowAddToCartModal(false);
          const variant = product?.variants?.find(v => v.id === selectedVariant);
          onCheckout?.(product, quantity, variant);
        }}
        loading={addingToCart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  scrollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  scrollHeaderBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollHeaderTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  scrollHeaderActions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  scrollContent: {
    paddingBottom: 80, // Reduced padding for Buy Now button
  },
  galleryWrap: {
    width: SCREEN_WIDTH,
    minHeight: 300,
    maxHeight: SCREEN_WIDTH * 0.85,
    backgroundColor: '#ffffff',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  galleryImageContainer: {
    width: SCREEN_WIDTH,
    minHeight: 300,
    maxHeight: SCREEN_WIDTH * 0.85,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: '100%',
    minHeight: 300,
    maxHeight: SCREEN_WIDTH * 0.85,
  },
  galleryFallback: {
    width: SCREEN_WIDTH,
    minHeight: 300,
    maxHeight: SCREEN_WIDTH * 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  galleryDotsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    alignItems: 'center',
  },
  galleryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  galleryDotActive: {
    borderColor: Colors.sky,
    backgroundColor: Colors.sky,
    width: 10,
  },
  galleryBackBtn: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 12,
  },
  galleryBackBtnInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryTopRightIcons: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
  },
  galleryIconBtn: {
    padding: 0,
  },
  galleryIconBtnInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 80,
    left: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    maxWidth: SCREEN_WIDTH - 24,
  },
  discountBadgeText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  discountMessage: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  soldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  soldText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  productName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 24,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
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
    gap: 10,
  },
  currentPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.sky,
  },
  originalPrice: {
    fontSize: 15,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  relatedSection: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  relatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 0,
  },
  relatedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  relatedScroll: {
    paddingHorizontal: 0,
  },
  relatedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  relatedCard: {
    width: 220,
    height: 380, // Increased height to accommodate tallest item
  },
  priceAndBadgesSection: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 12,
  },
  priceCard: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  priceContent: {
    flex: 1,
    gap: 8,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  discountBadgeSmall: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
  soldInfoCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.sky,
    minWidth: 80,
  },
  soldLabelSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  soldCountSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.sky,
  },
  badgesCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  badgesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceSoldContainer: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameSection: {
    paddingVertical: 8,
  },
  nameCard: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    gap: 12,
  },
  nameAndRatingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 24,
    flex: 1,
  },
  ratingAndSoldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },
  reviewCountText: {
    fontSize: 10,
    color: '#b45309',
    fontWeight: '500',
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
  },
  soldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  soldCountText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  detailsGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  detailContent: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  trustSection: {
    gap: 10,
    marginTop: 4,
  },
  trustSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  trustGridRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  trustIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustItemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  trustItemSubtext: {
    fontSize: 9,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  trustBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 0,
  },
  trustBadgeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  trustBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  trustBadgeDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e5e7eb',
  },
  guaranteesSection: {
    gap: 8,
    marginTop: 4,
  },
  guaranteeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
  },
  guaranteeContent: {
    flex: 1,
    gap: 2,
  },
  guaranteeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  guaranteeSubtext: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  ratingSection: {
    paddingVertical: 8,
  },
  ratingCard: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  // New Shopee-style rating styles
  ratingSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  ratingScoreContainer: {
    alignItems: 'center',
  },
  ratingScoreLarge: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 56,
  },
  ratingStarsLarge: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 8,
  },
  ratingStats: {
    alignItems: 'flex-end',
    gap: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.sky,
    fontWeight: '600',
  },
  ratingDistribution: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  ratingBarLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    width: 24,
    textAlign: 'right',
  },
  ratingBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 4,
  },
  ratingBarCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    width: 30,
    textAlign: 'right',
  },
  reviewsSection: {
    marginTop: 8,
  },
  reviewsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  reviewsSectionCount: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  reviewCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  reviewAvatar: {
    width: 40,
    height: 40,
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewCustomerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewRatingText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  reviewSeparator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 12,
  },
  seeAllReviewsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
  },
  seeAllReviewsBtnText: {
    fontSize: 14,
    color: Colors.sky,
    fontWeight: '600',
  },
  // No ratings state
  noRatingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  noRatingScore: {
    alignItems: 'center',
    gap: 8,
  },
  noRatingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  firstReviewButton: {
    backgroundColor: Colors.sky,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  firstReviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  variantsSection: {
    paddingVertical: 8,
  },
  variantsScrollView: {
    paddingHorizontal: 8,
  },
  variantsList: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  variantCard: {
    width: 140,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    paddingBottom: 8,
  },
  variantCardSelected: {
    borderColor: Colors.sky,
    borderWidth: 2.5,
    shadowColor: Colors.sky,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  variantMediaContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  variantImage: {
    width: '100%',
    height: '100%',
  },
  variantColorCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  variantPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 2,
  },
  variantInfo: {
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 4,
  },
  variantLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  variantSubInfo: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  variantStock: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  stockAvailable: {
    color: Colors.forest,
  },
  stockLow: {
    color: '#ef4444',
  },
  variantPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.sky,
    marginTop: 4,
  },
  variantDetailsCard: {
    marginHorizontal: 0,
    marginTop: 12,
    marginBottom: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  variantDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  variantDetailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  variantDetailsSku: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  variantPriceContainer: {
    alignItems: 'flex-end',
  },
  variantPriceLarge: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sky,
  },
  variantPriceOriginal: {
    fontSize: 12,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  variantDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 8,
  },
  detailGridItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    gap: 4,
  },
  detailGridLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  detailGridValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  variantAdditionalInfo: {
    backgroundColor: '#f9fafb',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  infoPair: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  statusInStock: {
    color: Colors.forest,
    fontWeight: '700',
  },
  statusOutOfStock: {
    color: '#ef4444',
    fontWeight: '700',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  descriptionsWrapper: {
    marginHorizontal: 0,
    marginVertical: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  descriptionSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
  },
  descriptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  descriptionContent: {
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  descriptionContentInner: {
    padding: 12,
    gap: 16,
  },
  descriptionBlock: {
    gap: 8,
  },
  specificationsBlock: {
    gap: 8,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  specificationsSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  specificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
  },
  specificationsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  specificationsContent: {
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  specificationsContentInner: {
    padding: 12,
    gap: 12,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  specLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    flexShrink: 0,
  },
  specValue: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  brandSection: {
    paddingVertical: 8,
  },
  brandCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  brandLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  brandInfo: {
    flex: 1,
    gap: 2,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  brandSupplier: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  brandStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  brandStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandStatText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  brandStatDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#e5e7eb',
  },
  chatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineDotActive: {
    backgroundColor: Colors.forest,
  },
  onlineDotInactive: {
    backgroundColor: '#9ca3af',
  },
  // Buy Now Button Styles
  buyNowContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 0,
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
  priceDisplay: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  compactPriceText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 22,
  },
  priceLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceIcon: {
    marginRight: 4,
  },
  buttonRow: {
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
  // Slideshow Image Viewer Styles
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
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  slideshowCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideshowBrandInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
  },
  slideshowBrandImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
  },
  slideshowBrandText: {
    flex: 1,
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
  slideshowShareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
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
  slideshowCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 18,
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
  slideshowButtonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 8,
  },
  slideshowAddToCartBtn: {
    flex: 0.4,
    borderWidth: 1.5,
    borderColor: Colors.sky,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  slideshowAddToCartText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sky,
  },
  slideshowBuyNowBtn: {
    flex: 0.6,
    backgroundColor: Colors.sky,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  slideshowBuyNowText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  // Buy Now Button Styles
  buyNowContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 0,
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
  buttonRow: {
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
  stockInStock: {
    color: Colors.forest,
    fontWeight: '600',
  },
  stockOutOfStock: {
    color: '#ef4444',
    fontWeight: '600',
  },
  youMayAlsoLikeSection: {
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 0,
  },
  youMayAlsoLikeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  youMayAlsoLikeBorder: {
    flex: 1,
    height: 1,
  },
  youMayAlsoLikeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  youMayAlsoLikeMasonryGrid: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 0,
  },
  youMayAlsoLikeMasonryColumn: {
    flex: 1,
    gap: 8,
  },
  youMayAlsoLikeItem: {
    width: '100%',
  },
});
