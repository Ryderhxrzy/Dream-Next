import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { productService, Product } from '../services/productService';
import ItemCard from '../components/Items/ItemCard';
import AppHeader from '../components/AppHeader/AppHeader';
import Toast from 'react-native-toast-message';
import { useOptimizedProducts } from '../hooks/useOptimizedProducts';
import { ChatBotIcon } from '../components/ChatBot';

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

interface ShopScreenProps {
  token?: string | null;
  user?: any;
  cartCount?: number;
  roomId?: number | null;
  categoryId?: number | null;
  brandId?: number | null;
  categories?: any[];
  brands?: any[];
  onBack?: () => void;
  onProductPress?: (id: number) => void;
  onCartPress?: () => void;
  onOpenSearch?: () => void;
  wishlistItems?: any[];
  onWishlistChange?: () => void;
  isDarkMode?: boolean;
}

function ShopScreen({
  token,
  user,
  cartCount = 0,
  roomId = null,
  categoryId = null,
  brandId = null,
  categories = [],
  brands = [],
  onBack = () => {},
  onProductPress = () => {},
  onCartPress = () => {},
  onOpenSearch = () => {},
  wishlistItems = [],
  onWishlistChange = () => {},
  isDarkMode = false,
}: ShopScreenProps) {
  const shopScreenLoadStartRef = useRef(Date.now());
  const flatListRef = useRef<FlatList>(null);

  // Refs to preserve filter state across navigation
  const filterStateRef = useRef({
    roomId: roomId || null,
    categoryId: categoryId || null,
    brandId: brandId || null,
    sort: 'Relevant',
    price: 'All',
  });

  const colors = {
    bg: isDarkMode ? '#0f172a' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#334155' : '#e5e7eb',
    card: isDarkMode ? '#1e293b' : Colors.white,
    buttonBg: isDarkMode ? '#1e293b' : 'transparent',
    paginationBg: isDarkMode ? '#1e293b' : '#f0f9ff',
    paginationBgDisabled: isDarkMode ? '#0f172a' : '#f3f4f6',
    paginationBorder: isDarkMode ? '#334155' : Colors.sky,
  };

  useEffect(() => {
    console.log('🛍️ ShopScreen MOUNTED');
  }, []);

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(() => filterStateRef.current.roomId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(() => filterStateRef.current.categoryId);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(() => filterStateRef.current.brandId);
  const [selectedSort, setSelectedSort] = useState(() => filterStateRef.current.sort);
  const [selectedPrice, setSelectedPrice] = useState<any>(() => filterStateRef.current.price);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const prefetchedPageRef = useRef(2);

  const selectedRoom = useMemo(
    () => selectedRoomId ? ROOMS.find(r => r.room_id === selectedRoomId) : null,
    [selectedRoomId]
  );

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
    isTransitioning,
  } = useOptimizedProducts({
    token,
    roomId: selectedRoomId,
    categoryId: selectedCategoryId,
    brandId: selectedBrandId,
  });

  // Scroll to top when page changes or filters change
  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 50);
    return () => clearTimeout(scrollTimeout);
  }, [currentPage, selectedRoomId, selectedCategoryId, selectedBrandId]);

  // Background prefetch ONLY the next page (not multiple pages)
  useEffect(() => {
    if (!data?.pages) return;

    const lastPage = data.pages[data.pages.length - 1];
    const totalPages = lastPage?.totalPages || 0;

    // Only prefetch if the next page hasn't been fetched yet AND it exists
    if (currentPage + 1 <= totalPages && data.pages.length <= currentPage) {
      console.log(`🔮 Prefetching page ${currentPage + 1}...`);
      prefetchedPageRef.current = currentPage + 1;
      fetchNextPage();
    }
  }, [currentPage, data, fetchNextPage]);

  const handleRoomSelect = useCallback((roomId: number | null) => {
    filterStateRef.current.roomId = roomId;
    setSelectedRoomId(roomId);
    setCurrentPage(1);
    prefetchedPageRef.current = 2;
    console.log(`🏠 Room filter changed to: ${roomId}`);
  }, []);

  const handleCategorySelect = useCallback((categoryId: number | null) => {
    filterStateRef.current.categoryId = categoryId;
    setSelectedCategoryId(categoryId);
    setCurrentPage(1);
    prefetchedPageRef.current = 2;
    console.log(`📂 Category filter changed to: ${categoryId}`);
  }, []);

  const handleBrandSelect = useCallback((brandId: number | null) => {
    filterStateRef.current.brandId = brandId;
    setSelectedBrandId(brandId);
    setCurrentPage(1);
    prefetchedPageRef.current = 2;
    console.log(`🏷️ Brand filter changed to: ${brandId}`);
  }, []);

  const handleSortSelect = useCallback((sort: string) => {
    filterStateRef.current.sort = sort;
    setSelectedSort(sort);
    setCurrentPage(1);
    prefetchedPageRef.current = 2;
    console.log(`Sort filter changed to: ${sort}`);
  }, []);

  const handlePriceSelect = useCallback((price: any) => {
    filterStateRef.current.price = price;
    setSelectedPrice(price);
    setCurrentPage(1);
    prefetchedPageRef.current = 2;
    console.log(`Price filter changed to:`, price);
  }, []);

  // Get products from current page only
  const currentPageProducts = useMemo(() => {
    let products = data?.pages?.[currentPage - 1]?.products || [];

    // Apply price filter
    if (selectedPrice && selectedPrice !== 'All') {
      products = products.filter((product: Product) => {
        const price = product.price || 0;
        switch (selectedPrice) {
          case 'Under ₱5k':
            return price < 5000;
          case '₱5k-₱20k':
            return price >= 5000 && price < 20000;
          case '₱20k-₱50k':
            return price >= 20000 && price < 50000;
          case 'Over ₱50k':
            return price >= 50000;
          default:
            if (typeof selectedPrice === 'object' && selectedPrice.min !== undefined) {
              const min = selectedPrice.min || 0;
              const max = selectedPrice.max || Infinity;
              return price >= min && price <= max;
            }
            return true;
        }
      });
    }

    // Apply sort
    if (selectedSort && selectedSort !== 'Relevant') {
      products = [...products];
      switch (selectedSort) {
        case 'A-Z':
          products.sort((a: Product, b: Product) => (a.name || '').localeCompare(b.name || ''));
          break;
        case 'Z-A':
          products.sort((a: Product, b: Product) => (b.name || '').localeCompare(a.name || ''));
          break;
        case 'Price: Low':
          products.sort((a: Product, b: Product) => (a.price || 0) - (b.price || 0));
          break;
        case 'Price: High':
          products.sort((a: Product, b: Product) => (b.price || 0) - (a.price || 0));
          break;
        case 'Newest':
          products.sort((a: Product, b: Product) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA;
          });
          break;
      }
    }

    if (products.length > 0) {
      const loadTime = Date.now() - shopScreenLoadStartRef.current;
      console.log(`⚡ ShopScreen READY: ${products.length} products (page ${currentPage}) loaded in ${loadTime}ms`);
    }
    return products;
  }, [data?.pages, currentPage, selectedSort, selectedPrice]);

  // Get pagination info
  const paginationInfo = useMemo(() => {
    if (!data?.pages?.length) {
      return { currentPage: 0, totalPages: 0, total: 0, startProduct: 0, endProduct: 0 };
    }
    const lastPage = data.pages[data.pages.length - 1];
    const total = lastPage.total;
    const startProduct = ((currentPage - 1) * 20) + 1;
    const endProduct = Math.min(currentPage * 20, total);
    return {
      currentPage,
      totalPages: lastPage.totalPages,
      total,
      startProduct,
      endProduct,
    };
  }, [data, currentPage]);

  // Prepare data for masonry layout
  const masonryData = useMemo(() => {
    const leftColumn: Product[] = [];
    const rightColumn: Product[] = [];

    currentPageProducts.forEach((product, index) => {
      if (index % 2 === 0) {
        leftColumn.push(product);
      } else {
        rightColumn.push(product);
      }
    });

    return { leftColumn, rightColumn };
  }, [currentPageProducts]);

  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    prefetchedPageRef.current = 2;
    refetch();
  }, [refetch]);

  const handleNextPage = useCallback(() => {
    if (currentPage < paginationInfo.totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, paginationInfo.totalPages]);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

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
      categoryId: item.catid,
      brandId: item.brandType,
      badges: {
        musthave: item.musthave,
        bestseller: item.bestseller,
        salespromo: item.salespromo,
      },
    };

    // DEBUG: Log product card
    console.log('📦 ShopScreen renderItem:', {
      id: item.id,
      name: item.name,
      catid: item.catid,
      brandType: item.brandType,
      categoryId: productCard.categoryId,
      brandId: productCard.brandId,
    });

    return (
      <View style={styles.masonryItem}>
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

  const renderLoadingPlaceholders = () => {
    const dummyProducts = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      name: 'Loading...',
      image: undefined,
      soldCount: 0,
      priceSrp: 0,
      priceMember: 0,
      prodpv: 0,
      brand: 'Brand',
      variants: [],
      musthave: false,
      bestseller: false,
      salespromo: false,
    }));

    const leftColumn = dummyProducts.filter((_, i) => i % 2 === 0);
    const rightColumn = dummyProducts.filter((_, i) => i % 2 !== 0);

    const renderDummyCard = (item: any) => (
      <View key={`loading-${item.id}`} style={styles.masonryItem}>
        <View style={[styles.dummyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

  const renderHeader = () => (
    <View style={[styles.filterInfoContainer, { backgroundColor: isDarkMode ? '#1e293b' : 'transparent' }]}>
      <View style={styles.viewToggleWrapper}>
        <TouchableOpacity
          style={[
            styles.viewToggleButton,
            { backgroundColor: isDarkMode && viewType !== 'grid' ? colors.buttonBg : 'transparent' },
            viewType === 'grid' && styles.viewToggleButtonActive,
          ]}
          onPress={() => setViewType('grid')}
        >
          <Ionicons
            name="apps-outline"
            size={14}
            color={viewType === 'grid' ? Colors.white : colors.text}
          />
          <Text
            style={[
              styles.viewToggleText,
              { color: viewType === 'grid' ? Colors.white : colors.text },
              viewType === 'grid' && styles.viewToggleTextActive,
            ]}
          >
            Card
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewToggleButton,
            styles.viewToggleButtonLast,
            { backgroundColor: isDarkMode && viewType !== 'list' ? colors.buttonBg : 'transparent' },
            viewType === 'list' && styles.viewToggleButtonActive,
          ]}
          onPress={() => setViewType('list')}
        >
          <Ionicons
            name="reader-outline"
            size={14}
            color={viewType === 'list' ? Colors.white : colors.text}
          />
          <Text
            style={[
              styles.viewToggleText,
              { color: viewType === 'list' ? Colors.white : colors.text },
              viewType === 'list' && styles.viewToggleTextActive,
            ]}
          >
            List
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.productCountContainer}>
        <Text style={[styles.productCountInfo, { color: colors.textSec }]}>
          {paginationInfo.startProduct} to {paginationInfo.endProduct} of {paginationInfo.total} products
        </Text>
        {isTransitioning && (
          <ActivityIndicator size="small" color={Colors.sky} style={styles.filterLoadingIndicator} />
        )}
      </View>
    </View>
  );

  const renderContent = () => {
    if (currentPageProducts.length === 0 && isLoading) {
      return renderLoadingPlaceholders();
    }

    if (currentPageProducts.length === 0) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: colors.bg }]}>
          <Ionicons name="cube-outline" size={48} color={colors.textSec} />
          <Text style={[styles.emptyText, { color: colors.textSec }]}>No products found</Text>
        </View>
      );
    }

    return (
      <View style={styles.masonryGrid}>
        <View style={styles.masonryColumn}>
          {masonryData.leftColumn.map((product) => (
            <View key={`left-${product.id}`} style={styles.masonryItem}>
              {renderItem(product)}
            </View>
          ))}
        </View>
        <View style={styles.masonryColumn}>
          {masonryData.rightColumn.map((product) => (
            <View key={`right-${product.id}`} style={styles.masonryItem}>
              {renderItem(product)}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (currentPageProducts.length === 0) return null;

    return (
      <View style={[styles.paginationContainer, { backgroundColor: colors.bg }]}>
        <Pressable
          onPress={handlePreviousPage}
          disabled={currentPage === 1}
          style={[
            styles.paginationButton,
            {
              backgroundColor: currentPage === 1 ? colors.paginationBgDisabled : colors.paginationBg,
              borderColor: currentPage === 1 ? colors.border : colors.paginationBorder,
            },
            currentPage === 1 && styles.paginationButtonDisabled
          ]}
        >
          <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? colors.textSec : Colors.sky} />
          <Text style={[styles.paginationText, { color: currentPage === 1 ? colors.textSec : Colors.sky }, currentPage === 1 && styles.paginationTextDisabled]}>Prev</Text>
        </Pressable>

        <Text style={[styles.paginationInfo, { color: colors.text }]}>
          {paginationInfo.currentPage} / {paginationInfo.totalPages}
        </Text>

        <Pressable
          onPress={handleNextPage}
          disabled={currentPage >= paginationInfo.totalPages}
          style={[
            styles.paginationButton,
            {
              backgroundColor: currentPage >= paginationInfo.totalPages ? colors.paginationBgDisabled : colors.paginationBg,
              borderColor: currentPage >= paginationInfo.totalPages ? colors.border : colors.paginationBorder,
            },
            currentPage >= paginationInfo.totalPages && styles.paginationButtonDisabled
          ]}
        >
          <Text style={[styles.paginationText, { color: currentPage >= paginationInfo.totalPages ? colors.textSec : Colors.sky }, currentPage >= paginationInfo.totalPages && styles.paginationTextDisabled]}>
            Next
          </Text>
          <Ionicons name="chevron-forward" size={18} color={currentPage >= paginationInfo.totalPages ? colors.textSec : Colors.sky} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, position: 'relative' }}>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={[]}>
      <AppHeader
        user={user}
        cartCount={cartCount}
        isDarkMode={isDarkMode}
        onCartPress={onCartPress}
        onCameraPress={() => console.log('Camera pressed')}
        onSearchPress={onOpenSearch}
        onProfilePress={() => console.log('Profile pressed')}
        showRoomFilter={true}
        selectedRoom={selectedRoom?.room_name || 'All Room Types'}
        showCategoryFilter={true}
        selectedCategory={selectedCategoryId ? categories.find(c => c.id === selectedCategoryId)?.name : 'All Categories'}
        categories={categories}
        showBrandFilter={true}
        selectedBrand={selectedBrandId ? brands.find(b => b.id === selectedBrandId)?.name : 'All Brands'}
        brands={brands}
        onRoomFilterChange={(filterType, value) => {
          if (filterType === 'room') {
            handleRoomSelect(value === 'All Room Types' ? null : ROOMS.find(r => r.room_name === value)?.room_id || null);
          }
          if (filterType === 'category') {
            handleCategorySelect(value || null);
          }
          if (filterType === 'brand') {
            handleBrandSelect(value || null);
          }
          if (filterType === 'sort') {
            handleSortSelect(value);
          }
          if (filterType === 'price') {
            handlePriceSelect(value);
          }
        }}
      />

      <FlatList
        ref={flatListRef}
        style={[styles.flatList, { backgroundColor: colors.bg }]}
        contentContainerStyle={[styles.flatListContent, { backgroundColor: colors.bg }]}
        data={[{ type: 'header' }, { type: 'content' }, { type: 'footer' }]}
        renderItem={({ item }) => {
          if (item.type === 'header') return renderHeader();
          if (item.type === 'content') return renderContent();
          if (item.type === 'footer') return renderFooter();
          return null;
        }}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={isDarkMode ? '#fff' : Colors.sky} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>

    {/* Chat Bot Icon */}
    <ChatBotIcon position="bottom-right" visible={true} isDarkMode={isDarkMode} />
    </View>
  );
}

export default memo(ShopScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  flatList: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  flatListContent: {
    paddingBottom: 12,
    backgroundColor: Colors.white,
  },
  filterInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
  },
  viewToggleWrapper: {
    flexDirection: 'row',
    gap: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 0,
    backgroundColor: 'transparent',
  },
  viewToggleButtonActive: {
    backgroundColor: Colors.sky,
  },
  viewToggleButtonLast: {
    borderRightWidth: 0,
  },
  viewToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  viewToggleTextActive: {
    color: Colors.white,
  },
  productCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productCountInfo: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterLoadingIndicator: {
    marginLeft: 4,
  },
  masonryGrid: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 16,
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
    color: Colors.textSecondary,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: Colors.sky,
  },
  paginationButtonDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  paginationText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.sky,
  },
  paginationTextDisabled: {
    color: Colors.textSecondary,
  },
  paginationInfo: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
});
