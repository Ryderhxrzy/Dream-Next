import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Pressable,
  TouchableOpacity,
  Image,
  Animated,
  BackHandler,
  TextInput,
  ImageBackground,
  Modal,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { productService, Product } from '../services/productService';
import ItemCard from '../components/Items/ItemCard';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { API_CONFIG } from '../config/api';

const { width } = Dimensions.get('window');

const ROOMS = [
  { room_id: 1, slug: 'bedroom', room_name: 'Bedroom' },
  { room_id: 2, slug: 'kitchen', room_name: 'Kitchen' },
  { room_id: 3, slug: 'living-room', room_name: 'Living Room' },
  { room_id: 4, slug: 'outdoor', room_name: 'Outdoor' },
  { room_id: 5, slug: 'study-office-room', room_name: 'Study & Office' },
  { room_id: 6, slug: 'dining-room', room_name: 'Dining Room' },
  { room_id: 7, slug: 'laundry-room', room_name: 'Laundry Room' },
  { room_id: 8, slug: 'bathroom', room_name: 'Bathroom' },
];

interface BrandInfo {
  id: number;
  name: string;
  logo?: string;
  brand_image?: string;
  image?: string;
  total_products?: number;
  supplier_name?: string;
  tagline?: string;
}

interface ShopByBrandScreenProps {
  token?: string | null;
  user?: any;
  cartCount?: number;
  brandId?: number;
  brand?: BrandInfo;
  categories?: any[];
  onBack?: () => void;
  onProductPress?: (id: number) => void;
  onCartPress?: () => void;
  wishlistItems?: any[];
  onWishlistChange?: () => void;
  isDarkMode?: boolean;
}

export default function ShopByBrandScreen({
  token,
  user,
  cartCount = 0,
  brandId,
  brand,
  categories = [],
  onBack = () => {},
  onProductPress = () => {},
  onCartPress = () => {},
  wishlistItems = [],
  onWishlistChange = () => {},
  isDarkMode = false,
}: ShopByBrandScreenProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'home' | 'products' | 'categories'>('products');
  const [showMenu, setShowMenu] = useState(false);
  const perPage = 20;
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const selectedRoom = useMemo(
    () => selectedRoomId ? ROOMS.find(r => r.room_id === selectedRoomId) : null,
    [selectedRoomId]
  );

  const masonryColumns = useMemo(() => {
    const leftColumn: Product[] = [];
    const rightColumn: Product[] = [];

    products.forEach((product, index) => {
      if (index % 2 === 0) {
        leftColumn.push(product);
      } else {
        rightColumn.push(product);
      }
    });

    return { leftColumn, rightColumn };
  }, [products]);

  const featuredProducts = useMemo(() => {
    const shuffled = [...products];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 4);
  }, [products]);

  const fetchProducts = useCallback(async (page: number = 1) => {
    if (!token || !brandId) return;

    try {
      setLoading(page === 1);
      const headers = { Authorization: `Bearer ${token}` };

      let url = `${API_CONFIG.BASE_URL}/products?status=1&page=${page}&per_page=${perPage}&brand_type=${brandId}`;
      if (selectedRoomId) url += `&room_type=${selectedRoomId}`;
      if (selectedCategoryId) url += `&cat_id=${selectedCategoryId}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery)}`;

      const response = await axios.get(url, { headers });

      let data = response.data?.data || response.data?.products || [];
      if (!Array.isArray(data)) {
        data = [];
      }

      const total = response.data?.meta?.total || response.data?.total || response.data?.pagination?.total || data.length;
      const pages = Math.ceil(total / perPage);

      setProducts(data);
      setTotalProducts(total);
      setTotalPages(pages);
      setCurrentPage(page);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load products',
        text2: error.message || 'Please try again',
      });
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, brandId, selectedRoomId, selectedCategoryId, searchQuery, perPage]);

  useEffect(() => {
    setCurrentPage(1);
    fetchProducts(1);
  }, [selectedRoomId, selectedCategoryId, searchQuery, fetchProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(currentPage);
  };

  const checkFollowingStatus = useCallback(async () => {
    if (!token || !brandId) return;
    try {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/followers/is-following`,
        { brand_id: brandId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('[ShopByBrandScreen] Follow status response for brandId', brandId, ':', JSON.stringify(response.data));

      let isFollowingStatus = false;
      // Try multiple possible response structures
      if (response.data?.is_following !== undefined) {
        isFollowingStatus = response.data.is_following === true || response.data.is_following === 1;
      } else if (response.data?.data?.is_following !== undefined) {
        isFollowingStatus = response.data.data.is_following === true || response.data.data.is_following === 1;
      } else if (typeof response.data === 'boolean') {
        isFollowingStatus = response.data === true;
      }

      console.log('[ShopByBrandScreen] Setting isFollowing to:', isFollowingStatus, 'for brandId:', brandId);
      setIsFollowing(isFollowingStatus);
    } catch (error) {
      console.error('Error checking follow status:', error);
      setIsFollowing(false);
    }
  }, [token, brandId]);

  const handleFollowPress = async () => {
    if (!token || !brandId) return;
    setFollowLoading(true);
    try {
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      await axios.post(
        `${API_CONFIG.BASE_URL}/followers/${endpoint}`,
        { brand_id: brandId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsFollowing(!isFollowing);
      Toast.show({
        type: 'success',
        text1: isFollowing ? 'Unfollowed' : 'Followed',
        text2: `You ${isFollowing ? 'unfollowed' : 'now follow'} ${brand?.name || 'this brand'}`,
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to update follow status',
        text2: error.message || 'Please try again',
      });
    } finally {
      setFollowLoading(false);
    }
  };

  useEffect(() => {
    console.log('[ShopByBrandScreen] useEffect triggered for brandId:', brandId, 'token exists:', !!token);
    if (token && brandId) {
      console.log('[ShopByBrandScreen] Calling checkFollowingStatus for brandId:', brandId);
      checkFollowingStatus();
    } else {
      console.log('[ShopByBrandScreen] Missing token or brandId, not checking follow status');
      setIsFollowing(false);
    }
  }, [token, brandId]);

  const handleRoomSelect = (roomId: number | null) => {
    setSelectedRoomId(roomId);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      fetchProducts(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      fetchProducts(currentPage - 1);
    }
  };

  const renderItem = (item: Product) => {
    const wishlistItem = wishlistItems?.find(w => w.product.id === item.id);
    const productCard = {
      id: item.id,
      name: item.name,
      image: item.image,
      soldCount: item.soldCount,
      originalPrice: item.priceSrp,
      memberPrice: item.priceMember,
      pv: item.prodpv,
      brandName: item.brand,
      variantCount: item.variants?.length ?? 0,
      badges: {
        musthave: item.musthave,
        bestseller: item.bestseller,
        salespromo: item.salespromo,
      },
    };

    return (
      <View key={`product-${item.id}`} style={styles.masonryItem}>
        <ItemCard
          product={productCard}
          token={token}
          isDarkMode={isDarkMode}
          onPress={(product) => onProductPress(product.id)}
          isWishlisted={!!wishlistItem}
          wishlistId={wishlistItem?.wishlist_id}
          onWishlistToggle={onWishlistChange}
        />
      </View>
    );
  };

  const renderFeaturedItem = (item: Product) => {
    const wishlistItem = wishlistItems?.find(w => w.product.id === item.id);
    const productCard = {
      id: item.id,
      name: item.name,
      image: item.image,
      soldCount: item.soldCount,
      originalPrice: item.priceSrp,
      memberPrice: item.priceMember,
      pv: item.prodpv,
      brandName: item.brand,
      variantCount: item.variants?.length ?? 0,
      badges: {
        musthave: item.musthave,
        bestseller: item.bestseller,
        salespromo: item.salespromo,
      },
    };

    return (
      <View key={`featured-${item.id}`} style={styles.featuredItemWrap}>
        <ItemCard
          product={productCard}
          token={token}
          isDarkMode={isDarkMode}
          onPress={(product) => onProductPress(product.id)}
          isWishlisted={!!wishlistItem}
          wishlistId={wishlistItem?.wishlist_id}
          onWishlistToggle={onWishlistChange}
        />
      </View>
    );
  };

  const getBrandLogo = () => {
    if (brand?.logo) return brand.logo;
    if (brand?.brand_image) return brand.brand_image;
    if (brand?.image) return brand.image;
    return null;
  };

  const getBrandInitial = () => {
    return brand?.name?.trim()?.charAt(0)?.toUpperCase() || '?';
  };

  const renderLoadingPlaceholders = () => {
    const dummyProducts = Array.from({ length: 6 }, (_, i) => ({ id: i }));
    const leftColumn = dummyProducts.filter((_, i) => i % 2 === 0);
    const rightColumn = dummyProducts.filter((_, i) => i % 2 !== 0);

    const renderDummyCard = (item: any) => (
      <View key={`loading-${item.id}`} style={styles.masonryItem}>
        <View style={[styles.dummyCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]}>
          <View style={[styles.dummyImageContainer, { backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9' }]}>
            <Image
              source={require('../../assets/af_home_logo.png')}
              style={styles.dummyImage}
              resizeMode="contain"
              tintColor={isDarkMode ? '#cbd5e1' : '#4b5563'}
            />
          </View>
          <View style={styles.dummyContent}>
            <View style={[styles.dummyLine, { backgroundColor: isDarkMode ? '#334155' : '#e5e7eb' }]} />
            <View style={[styles.dummyLine, { backgroundColor: isDarkMode ? '#334155' : '#e5e7eb', width: '70%' }]} />
            <View style={[styles.dummyLine, { backgroundColor: isDarkMode ? '#334155' : '#e5e7eb', width: '50%', marginTop: 8 }]} />
          </View>
        </View>
      </View>
    );

    return (
      <View style={styles.masonryGrid}>
        <View style={styles.masonryColumn}>
          {leftColumn.map(item => renderDummyCard(item))}
        </View>
        <View style={styles.masonryColumn}>
          {rightColumn.map(item => renderDummyCard(item))}
        </View>
      </View>
    );
  };

  const handleShareBrand = async () => {
    setShowMenu(false);
    try {
      await Share.share({
        message: `Check out ${brand?.name || 'this brand'} on our app!`,
        title: brand?.name || 'Brand',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleReportBrand = () => {
    setShowMenu(false);
    Toast.show({
      type: 'info',
      text1: 'Report Brand',
      text2: 'Thank you for your report. We will review it shortly.',
    });
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });

    return () => sub.remove();
  }, [onBack]);

  const themeColors = {
    containerBg: isDarkMode ? '#0f172a' : '#f8fbff',
    headerBg: isDarkMode ? '#1e293b' : Colors.white,
    headerBorder: isDarkMode ? '#334155' : '#e0f2fe',
    text: isDarkMode ? '#f1f5f9' : Colors.text,
    textSecondary: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    cardBg: isDarkMode ? '#1e293b' : Colors.white,
    cardBorder: isDarkMode ? '#334155' : '#e2e8f0',
    buttonBg: isDarkMode ? '#334155' : '#f1f5f9',
    buttonBorder: isDarkMode ? '#475569' : '#e5e7eb',
    searchBg: isDarkMode ? '#1e293b' : Colors.white,
    searchBorder: isDarkMode ? '#334155' : '#e5e7eb',
    paginationBg: isDarkMode ? '#0f172a' : '#f8fbff',
    paginationBorder: isDarkMode ? '#334155' : '#e5e7eb',
    divider: isDarkMode ? '#334155' : '#eef2f7',
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.containerBg }]}>
      {/* Custom Header with Brand Info */}
      <ImageBackground
        source={{ uri: 'https://mms.img.susercontent.com/ph-11134210-81ztm-mlh54hxutfya0b@resize_bs700x700' }}
        style={[styles.customHeader, { paddingTop: insets.top }]}
      >
        <View style={styles.headerOverlay} />

        {/* Top Row: Back, Search, Filter */}
        <View style={styles.searchRow}>
          <TouchableOpacity onPress={onBack} style={styles.backIconButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={16} color="rgba(255, 255, 255, 0.7)" style={styles.searchIconLeft} />
            <TextInput
              style={[styles.searchInput, { color: Colors.white }]}
              placeholder="Search products in this brand"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                <Ionicons name="close-circle" size={16} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.filterIconButton}
            onPress={() => setShowMenu(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Menu Modal */}
        <Modal
          visible={showMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowMenu(false)}
          >
            <View style={[styles.menuContainer, { top: insets.top + 60 }]}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleShareBrand}
              >
                <Ionicons name="share-social" size={18} color={Colors.sky} style={styles.menuIcon} />
                <Text style={styles.menuText}>Share Brand</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleReportBrand}
              >
                <Ionicons name="flag" size={18} color="#ef4444" style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: '#ef4444' }]}>Report Brand</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Bottom Row: Brand Info and Follow Button */}
        <View style={styles.headerContent}>
          <View style={styles.brandHeaderContent}>
            <View style={[styles.brandLogoHeader, { borderColor: '#cbd5e1' }]}>
              {getBrandLogo() ? (
                <Image source={{ uri: getBrandLogo() }} style={styles.brandLogoImageHeader} />
              ) : (
                <View style={styles.brandLogoFallbackHeader}>
                  <Text style={styles.brandInitialHeader}>{getBrandInitial()}</Text>
                </View>
              )}
            </View>
            <View style={styles.brandHeaderText}>
              <Text style={styles.brandHeaderLabel} numberOfLines={1}>Official Brand Store</Text>
              <View style={styles.brandNameRow}>
                <Text style={[styles.brandHeaderName, { color: Colors.white }]} numberOfLines={1}>{brand?.name || 'Brand'}</Text>
                <Ionicons name="checkmark-circle" size={14} color={Colors.sky} style={{ marginLeft: 4 }} />
              </View>
              {brand?.supplier_name ? (
                <Text style={[styles.brandHeaderSupplier, { color: '#e2e8f0' }]} numberOfLines={1}>{brand.supplier_name}</Text>
              ) : null}
              {brand?.tagline ? (
                <Text style={[styles.brandHeaderTagline, { color: '#e2e8f0' }]} numberOfLines={1}>{brand.tagline}</Text>
              ) : null}
              <View style={styles.brandMetaRow}>
                <Ionicons name="star" size={12} color="#fbbf24" />
                <Text style={[styles.brandHeaderProducts, { color: Colors.white }]} numberOfLines={1}>4.8</Text>
                <Text style={[styles.brandMetaDot, { color: '#cbd5e1' }]}>•</Text>
                <Ionicons name="people" size={12} color={Colors.sky} />
                <Text style={[styles.brandHeaderProducts, { color: Colors.white }]} numberOfLines={1}>12.5K followers</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleFollowPress}
            disabled={followLoading}
            style={[
              styles.topFollowButton,
              {
                backgroundColor: isFollowing ? '#0369a1' : Colors.sky,
                borderWidth: isFollowing ? 0 : 0,
              }
            ]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFollowing ? 'heart' : 'heart-outline'}
              size={16}
              color={Colors.white}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.topFollowButtonText, { color: Colors.white }]}>
              {followLoading ? 'Follow' : (isFollowing ? 'Followed' : 'Follow')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setSelectedTab('home')}
          >
            <Text style={[styles.tabText, selectedTab === 'home' && styles.tabTextActive]}>Home</Text>
            {selectedTab === 'home' && <View style={[styles.tabIndicator, { backgroundColor: Colors.sky }]} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setSelectedTab('products')}
          >
            <Text style={[styles.tabText, selectedTab === 'products' && styles.tabTextActive]}>Products</Text>
            {selectedTab === 'products' && <View style={[styles.tabIndicator, { backgroundColor: Colors.sky }]} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setSelectedTab('categories')}
          >
            <Text style={[styles.tabText, selectedTab === 'categories' && styles.tabTextActive]}>Categories</Text>
            {selectedTab === 'categories' && <View style={[styles.tabIndicator, { backgroundColor: Colors.sky }]} />}
          </TouchableOpacity>
        </View>
      </ImageBackground>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {featuredProducts.length > 0 && (
          <View style={[styles.featuredSection, { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]}>
            <View style={[styles.featuredHeaderRow, { borderBottomColor: themeColors.divider }]}>
              <Text style={[styles.featuredTitle, { color: themeColors.text }]}>Featured Products</Text>
              <Text style={[styles.featuredSubtitle, { color: themeColors.textSecondary }]}>Top picks from this brand</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredGrid}
            >
              {featuredProducts.map((item) => renderFeaturedItem(item))}
            </ScrollView>
          </View>
        )}

        {/* Products Grid */}
        {loading && !refreshing ? (
          renderLoadingPlaceholders()
        ) : products.length > 0 ? (
          <View style={styles.masonryGrid}>
            <View style={styles.masonryColumn}>
              {masonryColumns.leftColumn.map((product) => renderItem(product))}
            </View>
            <View style={styles.masonryColumn}>
              {masonryColumns.rightColumn.map((product) => renderItem(product))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={48} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No products found</Text>
          </View>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={[styles.paginationContainer, { backgroundColor: themeColors.paginationBg, borderTopColor: themeColors.paginationBorder }]}>
            <Pressable
              onPress={handlePreviousPage}
              disabled={currentPage === 1}
              style={[styles.paginationButton, { backgroundColor: currentPage === 1 ? themeColors.buttonBg : isDarkMode ? '#0e4a6b' : '#f0f9ff', borderColor: currentPage === 1 ? themeColors.buttonBorder : Colors.sky }, currentPage === 1 && styles.paginationButtonDisabled]}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={currentPage === 1 ? themeColors.textSecondary : Colors.sky}
              />
              <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                Previous
              </Text>
            </Pressable>

            <View style={styles.pageInfo}>
              <Text style={[styles.pageNumber, { color: themeColors.text }]}>
                Page {currentPage} of {totalPages}
              </Text>
            </View>

            <Pressable
              onPress={handleNextPage}
              disabled={currentPage >= totalPages}
              style={[styles.paginationButton, { backgroundColor: currentPage >= totalPages ? themeColors.buttonBg : isDarkMode ? '#0e4a6b' : '#f0f9ff', borderColor: currentPage >= totalPages ? themeColors.buttonBorder : Colors.sky }, currentPage >= totalPages && styles.paginationButtonDisabled]}
            >
              <Text style={[styles.paginationButtonText, currentPage >= totalPages && styles.paginationButtonTextDisabled]}>
                Next
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={currentPage >= totalPages ? themeColors.textSecondary : Colors.sky}
              />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeader: {
    paddingTop: 28,
    paddingBottom: 0,
    position: 'relative',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchIconLeft: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearSearchButton: {
    marginLeft: 6,
  },
  filterIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  brandHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandLogoHeader: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#0ea5e9',
  },
  brandLogoImageHeader: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  brandLogoFallbackHeader: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandInitialHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  brandHeaderText: {
    flex: 1,
  },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.sky,
    lineHeight: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  brandHeaderName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 18,
    marginBottom: 6,
  },
  brandHeaderSupplier: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 14,
  },
  brandHeaderTagline: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 13,
    fontStyle: 'italic',
  },
  brandMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  brandMetaDot: {
    fontSize: 9,
    color: Colors.textSecondary,
  },
  brandHeaderProducts: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 0,
    lineHeight: 13,
  },
  topFollowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  topFollowButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 0,
    paddingBottom: 0,
    marginHorizontal: 0,
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderTopWidth: 0,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: Colors.sky,
  },
  tabIndicator: {
    width: '80%',
    height: 2.5,
    marginTop: 2,
    borderRadius: 1.5,
  },
  masonryGrid: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  featuredSection: {
    marginHorizontal: 8,
    marginTop: 16,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  featuredHeaderRow: {
    paddingHorizontal: 4,
    marginBottom: 8,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  featuredSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  featuredGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    paddingTop: 2,
    paddingRight: 4,
  },
  featuredItemWrap: {
    width: width * 0.46,
  },
  masonryColumn: {
    flex: 1,
    gap: 8,
  },
  masonryItem: {
    width: '100%',
  },
  dummyCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  dummyImageContainer: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dummyImage: {
    width: '60%',
    height: '60%',
  },
  dummyContent: {
    padding: 12,
    gap: 6,
  },
  dummyLine: {
    height: 8,
    borderRadius: 4,
    width: '100%',
  },
  emptyContainer: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    marginTop: 16,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  paginationButtonDisabled: {
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.sky,
  },
  paginationButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  pageInfo: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  pageNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuContainer: {
    position: 'absolute',
    right: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
});
