import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { API_CONFIG } from '../config/api';
import ItemList from '../components/Items/ItemList';
import AddToCartModal from '../components/Items/AddToCartModal';
import MultipleItemsCartModal from '../components/Items/MultipleItemsCartModal';
import ConfirmationModal from '../components/ConfirmationModal/ConfirmationModal';
import { ChatBotIcon } from '../components/ChatBot';

interface WishlistItem {
  wishlist_id: number;
  product_id: number;
  date_added: string;
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
  };
}

interface WishlistScreenProps {
  token?: string | null;
  wishlistItems: WishlistItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onProductPress?: (id: number) => void;
  onCartUpdate?: () => void;
  onNavigateToCart?: () => void;
  isDarkMode?: boolean;
}

export default function WishlistScreen({ token, wishlistItems, loading, refreshing, onRefresh, onProductPress, onCartUpdate, onNavigateToCart, isDarkMode = false }: WishlistScreenProps) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(wishlistItems);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [sortOrder, setSortOrder] = useState<'new' | 'old'>('new');
  const [discountFilter, setDiscountFilter] = useState<'all' | 'discount'>('all');
  const [showModal, setShowModal] = useState(false);
  const [loadingMultiple, setLoadingMultiple] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<WishlistItem | null>(null);
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null);

  const colors = {
    bg: isDarkMode ? '#0f172a' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#334155' : '#e5e7eb',
    card: isDarkMode ? '#1e293b' : Colors.white,
    hint: isDarkMode ? '#1e293b' : '#f9fafb',
  };

  useEffect(() => {
    setWishlist(wishlistItems);
  }, [wishlistItems]);

  const handleSelectItem = (wishlistId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(wishlistId)) {
      newSelected.delete(wishlistId);
    } else {
      newSelected.add(wishlistId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === wishlist.length) {
      setSelectedItems(new Set());
    } else {
      const allIds = new Set(wishlist.map(item => item.wishlist_id));
      setSelectedItems(allIds);
    }
  };

  const getSortedWishlist = () => {
    let filtered = wishlist;

    // Filter by discount
    if (discountFilter === 'discount') {
      filtered = filtered.filter(item => {
        const discount = Math.round(
          ((item.product.priceSrp - item.product.priceMember) / item.product.priceSrp) * 100
        );
        return discount > 0;
      });
    }

    // Sort by date
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date_added).getTime();
      const dateB = new Date(b.date_added).getTime();
      return sortOrder === 'new' ? dateB - dateA : dateA - dateB;
    });
  };

  const getSelectedTotal = () => {
    return Array.from(selectedItems).reduce((total, wishlistId) => {
      const item = wishlist.find(w => w.wishlist_id === wishlistId);
      return total + (item ? item.product.priceMember : 0);
    }, 0);
  };

  const getSelectedItemsForModal = () => {
    return Array.from(selectedItems)
      .map(wishlistId => wishlist.find(w => w.wishlist_id === wishlistId))
      .filter((item): item is WishlistItem => item !== undefined);
  };


  const handleAddProductToCart = async (data: { 
    product_id: number; 
    variant_id?: number; 
    quantity: number;
    selected_color?: string | null;
    selected_size?: string | null;
    selected_type?: string | null;
  }) => {
    if (!token) return;
    try {
      console.log('Add to cart data received:', data);
      
      const cartData: any = {
        product_id: data.product_id,
        quantity: data.quantity,
      };

      // Only include variant_id if it exists and is not null
      if (data.variant_id) {
        cartData.variant_id = data.variant_id;
      }

      // Include variant details if they exist
      if (data.selected_color) {
        cartData.selected_color = data.selected_color;
      }
      if (data.selected_size) {
        cartData.selected_size = data.selected_size;
      }
      if (data.selected_type) {
        cartData.selected_type = data.selected_type;
      }

      console.log('Sending to API:', cartData);

      // Add to cart
      await axios.post(
        `${API_CONFIG.BASE_URL}/cart/add`,
        cartData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove from wishlist since it's moved to cart
      const wishlistItem = wishlist.find(item => item.product.id === data.product_id);
      if (wishlistItem) {
        await axios.delete(`${API_CONFIG.BASE_URL}/wishlist/${data.product_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Update local state to remove from wishlist
        setWishlist(wishlist.filter((item) => item.wishlist_id !== wishlistItem.wishlist_id));
        
        Toast.show({
          type: 'success',
          text1: 'Moved to Cart',
          text2: `${data.quantity} item(s) moved from wishlist to cart`,
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Added to Cart',
          text2: `${data.quantity} item(s) added to your cart`,
        });
      }
      
      setShowAddToCartModal(false);
      setSelectedProduct(null);
      setQuantity(1);
      setSelectedVariant(null);
      onCartUpdate?.();
    } catch (error: any) {
      console.error('Error adding to cart:', error);
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
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    }
  };

  const handleAddMultipleToCart = async (items: Array<{
    product_id: number;
    quantity: number;
    variant_id?: number;
    selected_color?: string | null;
    selected_size?: string | null;
    selected_type?: string | null;
  }>) => {
    if (!token) return;
    try {
      setLoadingMultiple(true);

      // Add items to cart using bulk-add endpoint
      await axios.post(
        `${API_CONFIG.BASE_URL}/cart/bulk-add`,
        { items },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove items from wishlist
      const wishlistIdsToRemove: number[] = [];
      items.forEach(item => {
        const wishlistItem = wishlist.find(w => w.product.id === item.product_id);
        if (wishlistItem) {
          wishlistIdsToRemove.push(wishlistItem.wishlist_id);
        }
      });

      // Remove each item from wishlist via API
      for (const item of items) {
        try {
          await axios.delete(`${API_CONFIG.BASE_URL}/wishlist/${item.product_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (error) {
          console.error(`Failed to remove product ${item.product_id} from wishlist:`, error);
        }
      }

      // Update local state to remove from wishlist
      setWishlist(wishlist.filter((item) => !wishlistIdsToRemove.includes(item.wishlist_id)));

      Toast.show({
        type: 'success',
        text1: 'Moved to Cart',
        text2: `${items.length} items moved from wishlist to cart`,
      });
      setShowModal(false);
      setSelectedItems(new Set());
      onCartUpdate?.();
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to add items to cart';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    } finally {
      setLoadingMultiple(false);
    }
  };

  const removeFromWishlist = (wishlistId: number) => {
    if (deletingIds.has(wishlistId)) return;

    const wishlistItem = wishlist.find(item => item.wishlist_id === wishlistId);
    const productName = wishlistItem?.product.name || 'Item';

    setItemToDelete({ id: wishlistId, name: productName });
    setConfirmDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    const { id: wishlistId, name: productName } = itemToDelete;

    try {
      setDeletingIds(prev => new Set(prev).add(wishlistId));
      setConfirmDeleteModal(false);

      const wishlistItem = wishlist.find(item => item.wishlist_id === wishlistId);
      const productId = wishlistItem?.product.id;

      // Call DELETE API to remove from wishlist
      if (token && productId) {
        await axios.delete(`${API_CONFIG.BASE_URL}/wishlist/${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Update local state
      setWishlist(wishlist.filter((item) => item.wishlist_id !== wishlistId));

      Toast.show({
        type: 'success',
        text1: 'Removed',
        text2: `${productName} removed from wishlist`,
      });
    } catch (error: any) {
      console.error('Error removing from wishlist:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove item',
      });
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(wishlistId);
        return next;
      });
      setItemToDelete(null);
    }
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => (
    <ItemList
      wishlist_id={item.wishlist_id}
      product_id={item.product_id}
      product={item.product}
      isSelected={selectedItems.has(item.wishlist_id)}
      onProductPress={onProductPress}
      onRemove={removeFromWishlist}
      onSelect={handleSelectItem}
      isDarkMode={isDarkMode}
      onAddToCart={(wishlistId) => {
        const product = wishlist.find(w => w.wishlist_id === wishlistId);
        if (product) {
          setSelectedProduct(product);
          setShowAddToCartModal(true);
        }
      }}
    />
  );

  const renderHiddenItem = (data: { item: WishlistItem }) => {
    const isDeleting = deletingIds.has(data.item.wishlist_id);
    
    return (
      <View style={styles.rowBack}>
        <TouchableOpacity
          style={[styles.backLeftBtn, styles.backLeftBtnLeft]}
          onPress={() => {
            setSelectedProduct(data.item);
            setShowAddToCartModal(true);
          }}
        >
          <View style={styles.cartActionInner}>
            <Ionicons name="cart-outline" size={22} color={Colors.white} />
            <Text style={styles.backTextWhite}>Add to Cart</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.backRightBtn, styles.backRightBtnRight]}
          onPress={() => removeFromWishlist(data.item.wishlist_id)}
          disabled={isDeleting}
        >
          <View style={styles.deleteActionInner}>
            {isDeleting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="trash-outline" size={22} color={Colors.white} />
            )}
            <Text style={styles.backTextWhite}>{isDeleting ? 'Deleting...' : 'Delete'}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={Colors.sky} />
      </View>
    );
  }

  if (wishlist.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.bg }]}>
        <Ionicons name="heart-outline" size={64} color={colors.textSec} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No items in your wishlist</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSec }]}>Add items to your wishlist to save them for later</Text>
      </View>
    );
  }

  const sortedWishlist = getSortedWishlist();

  return (
    <View style={{ flex: 1, position: 'relative' }}>
    <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.selectAllBtn}
            onPress={handleSelectAll}
            activeOpacity={0.7}
          >
            <View style={[
              styles.selectAllCheckbox,
              selectedItems.size > 0 && styles.selectAllCheckboxChecked,
              selectedItems.size === 0 && { borderColor: colors.border }
            ]}>
              {selectedItems.size > 0 && (
                <Ionicons name="checkmark" size={14} color={Colors.white} />
              )}
            </View>
            <Text style={[styles.selectAllText, selectedItems.size > 0 && styles.selectAllTextActive, { color: selectedItems.size === 0 ? colors.textSec : Colors.sky }]}>
              {selectedItems.size > 0 ? `${selectedItems.size} selected` : 'Select All'}
            </Text>
          </TouchableOpacity>

          <View style={styles.filterSection}>
            <TouchableOpacity
              style={[styles.filterBtn, sortOrder === 'new' && styles.filterBtnActive, sortOrder !== 'new' && { backgroundColor: isDarkMode ? '#1e293b' : '#f3f4f6' }]}
              onPress={() => setSortOrder('new')}
            >
              <Text style={[styles.filterText, sortOrder === 'new' && styles.filterTextActive, sortOrder !== 'new' && { color: colors.text }]}>New</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, sortOrder === 'old' && styles.filterBtnActive, sortOrder !== 'old' && { backgroundColor: isDarkMode ? '#1e293b' : '#f3f4f6' }]}
              onPress={() => setSortOrder('old')}
            >
              <Text style={[styles.filterText, sortOrder === 'old' && styles.filterTextActive, sortOrder !== 'old' && { color: colors.text }]}>Old</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, discountFilter === 'discount' && styles.filterBtnActive, discountFilter !== 'discount' && { backgroundColor: isDarkMode ? '#1e293b' : '#f3f4f6' }]}
              onPress={() => setDiscountFilter(discountFilter === 'discount' ? 'all' : 'discount')}
            >
              <Text style={[styles.filterText, discountFilter === 'discount' && styles.filterTextActive, discountFilter !== 'discount' && { color: colors.text }]}>On Sale</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.swipeHint, { backgroundColor: colors.hint, borderBottomColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textSec} />
        <Text style={[styles.swipeHintText, { color: colors.textSec }]}>
          Swipe <Text style={{ color: Colors.sky, fontWeight: '800' }}>right</Text> to add to cart, <Text style={{ color: '#ef4444', fontWeight: '800' }}>left</Text> to delete
        </Text>
      </View>

      <SwipeListView
        data={sortedWishlist}
        renderItem={renderWishlistItem}
        renderHiddenItem={renderHiddenItem}
        leftOpenValue={90}
        rightOpenValue={-90}
        swipeToOpenPercent={30}
        swipeToClosePercent={30}
        useNativeDriver={false}
        keyExtractor={(item) => item.wishlist_id.toString()}
        contentContainerStyle={[styles.listContent, { backgroundColor: colors.bg }]}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.sky]}
            tintColor={isDarkMode ? '#fff' : Colors.sky}
          />
        }
      />

      {selectedItems.size > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={styles.totalSection}>
            <Text style={[styles.totalLabel, { color: colors.textSec }]}>Total ({selectedItems.size}):</Text>
            <Text style={[styles.totalPrice, { color: colors.text }]}>₱{getSelectedTotal().toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={[styles.checkoutBtn, loadingMultiple && { opacity: 0.6 }]}
            onPress={() => setShowModal(true)}
            disabled={loadingMultiple}
          >
            <Text style={styles.checkoutBtnText}>Add Selected to Cart</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <MultipleItemsCartModal
          visible={showModal}
          items={getSelectedItemsForModal()}
          onClose={() => setShowModal(false)}
          onAddToCart={handleAddMultipleToCart}
          loading={loadingMultiple}
          token={token}
          onNavigateToCart={onNavigateToCart}
        />
      </Modal>

      <Modal
        visible={showAddToCartModal}
        transparent
        animationType="none"
        onRequestClose={() => {
          setShowAddToCartModal(false);
          setSelectedProduct(null);
          setQuantity(1);
          setSelectedVariant(null);
        }}
      >
        {selectedProduct && (
          <AddToCartModal
            visible={showAddToCartModal}
            product={{
              id: selectedProduct.product.id,
              name: selectedProduct.product.name,
              brand: selectedProduct.product.brand,
              image: selectedProduct.product.image,
              priceMember: selectedProduct.product.priceMember,
              priceSrp: selectedProduct.product.priceSrp,
              prodpv: selectedProduct.product.prodpv,
              qty: selectedProduct.product.qty,
              soldCount: 0,
              variants: (selectedProduct.product as any).variants || [],
            }}
            images={[selectedProduct.product.image || '']}
            selectedVariant={selectedVariant}
            quantity={quantity}
            isDarkMode={isDarkMode}
            onClose={() => {
              setShowAddToCartModal(false);
              setSelectedProduct(null);
              setQuantity(1);
              setSelectedVariant(null);
            }}
            onSelectVariant={setSelectedVariant}
            onQuantityChange={setQuantity}
            onAddToCart={handleAddProductToCart}
            onProductPress={(productId) => {
              setShowAddToCartModal(false);
              setSelectedProduct(null);
              setQuantity(1);
              setSelectedVariant(null);
              onProductPress?.(productId);
            }}
          />
        )}
      </Modal>

      {/* Confirmation Delete Modal */}
      <ConfirmationModal
        visible={confirmDeleteModal}
        title="Remove from Wishlist"
        message={`Are you sure you want to remove "${itemToDelete?.name}" from your wishlist?`}
        confirmText="Remove"
        cancelText="Cancel"
        isDestructive={true}
        isDarkMode={isDarkMode}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmDeleteModal(false);
          setItemToDelete(null);
        }}
      />
    </View>

    {/* Chat Bot Icon */}
    <ChatBotIcon position="bottom-right" visible={true} isDarkMode={isDarkMode} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  selectAllCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectAllCheckboxChecked: {
    backgroundColor: Colors.sky,
    borderColor: Colors.sky,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  selectAllTextActive: {
    color: Colors.sky,
    fontWeight: '700',
  },
  filterSection: {
    flexDirection: 'row',
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 0,
  },
  filterBtnActive: {
    backgroundColor: Colors.sky,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
  filterTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  listContent: {
    backgroundColor: Colors.white,
  },
  footer: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  checkoutBtn: {
    backgroundColor: Colors.sky,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  rowBack: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  backLeftBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
  },
  backLeftBtnLeft: {
    backgroundColor: Colors.sky,
    left: 0,
  },
  backRightBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
  },
  backRightBtnRight: {
    backgroundColor: '#ef4444',
    right: 0,
  },
  cartActionInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 90,
  },
  deleteActionInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 90,
  },
  backTextWhite: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  swipeHintText: {
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
});
