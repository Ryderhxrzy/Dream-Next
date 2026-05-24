import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  BackHandler,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { API_CONFIG } from '../config/api';
import Toast from 'react-native-toast-message';
const { height: screenHeight } = Dimensions.get('window');

interface OrderItem {
  id: number;
  product_id: number;
  name: string;
  image?: string;
  quantity: number;
  price: number;
  selected_color?: string;
  selected_size?: string;
  selected_type?: string;
  brand_name?: string;
  brand_id?: number;
}

interface Order {
  id: number;
  order_number: string;
  mobile_order_id: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'to_receive' | 'delivered' | 'cancelled' | 'return';
  created_at: string;
  total_amount: number;
  shipping_fee: number;
  payment_method: string;
  tracking_number?: string;
  checkout_id?: string;
  items: OrderItem[];
}

interface PurchasesScreenProps {
  token?: string | null;
  status?: 'pending' | 'paid' | 'processing' | 'shipped' | 'to_receive' | 'delivered' | 'cancelled' | 'return';
  isDarkMode?: boolean;
  initialOrderId?: string;
  onBack?: () => void;
  onProceedToPayment?: (checkoutUrl: string) => void;
  onProductPress?: (productId: number) => void;
  onBuyAgain?: (items: OrderItem[]) => void;
}

const STATUS_CONFIG = {
  pending: {
    icon: 'time-outline',
    color: '#ef4444',
    label: 'Pending',
    description: 'Awaiting payment confirmation',
  },
  paid: {
    icon: 'checkmark',
    color: '#06b6d4',
    label: 'Paid',
    description: 'Payment confirmed, processing order',
  },
  processing: {
    icon: 'hourglass-outline',
    color: '#f59e0b',
    label: 'Processing',
    description: 'Order is being prepared',
  },
  shipped: {
    icon: 'car-outline',
    color: '#3b82f6',
    label: 'To Ship',
    description: 'Ready to be shipped',
  },
  to_receive: {
    icon: 'bag-outline',
    color: '#8b5cf6',
    label: 'To Receive',
    description: 'Package arrived, waiting for you',
  },
  delivered: {
    icon: 'checkmark-circle-outline',
    color: '#10b981',
    label: 'Delivered',
    description: 'Order completed',
  },
  cancelled: {
    icon: 'close-circle-outline',
    color: '#ef4444',
    label: 'Cancelled',
    description: 'Order was cancelled',
  },
  return: {
    icon: 'return-down-back-outline',
    color: '#f97316',
    label: 'Return',
    description: 'Returned order',
  },
};

const ALL_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'to_receive', 'delivered', 'cancelled', 'return'] as const;

const normalizeStatusKey = (status?: string) => {
  const s = String(status || '').trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
  if (s === 'to_ship' || s === 'shipping') return 'shipped';
  if (s === 'out_for_delivery') return 'to_receive';
  if (s === 'to_receive' || s === 'toreceive') return 'to_receive';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'return' || s === 'returned' || s === 'returns') return 'return';
  if (s in STATUS_CONFIG) return s as keyof typeof STATUS_CONFIG;
  return 'pending' as keyof typeof STATUS_CONFIG;
};

export default function PurchasesScreen({
  token,
  status: initialStatus = 'pending',
  isDarkMode = false,
  initialOrderId,
  onBack,
  onProceedToPayment,
  onProductPress,
  onBuyAgain,
}: PurchasesScreenProps) {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeLeft, setTimeLeft] = useState<Record<number, string>>({});
  const [paymentLoading, setPaymentLoading] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<any>(initialStatus);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [detailSlideAnim] = useState(new Animated.Value(0));
  const [cancellationReasons, setCancellationReasons] = useState<Record<string, string>>({});
  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [selectedCancellationReason, setSelectedCancellationReason] = useState<string | null>(null);
  const [cancelReasonLoading, setCancelReasonLoading] = useState(false);
  const [cancelReasonSlideAnim] = useState(new Animated.Value(screenHeight));
  const closeDetailModal = () => {
    Animated.timing(detailSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowDetailModal(false));
  };
  const detailPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 5,
    onPanResponderMove: (_, { dy }) => {
      if (dy > 0) {
        detailSlideAnim.setValue(1 - dy / screenHeight);
      }
    },
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 100 || vy > 0.5) {
        Animated.timing(detailSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowDetailModal(false));
      } else {
        Animated.timing(detailSlideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const cancelReasonPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 5,
    onPanResponderMove: (_, { dy }) => {
      if (dy > 0) {
        cancelReasonSlideAnim.setValue(screenHeight * (dy / screenHeight));
      }
    },
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 100 || vy > 0.5) {
        Animated.timing(cancelReasonSlideAnim, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowCancelReasonModal(false));
      } else {
        Animated.timing(cancelReasonSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  useEffect(() => {
    if (showDetailModal) {
      detailSlideAnim.setValue(0);
      Animated.timing(detailSlideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showDetailModal, detailSlideAnim]);

  useEffect(() => {
    if (showCancelReasonModal) {
      cancelReasonSlideAnim.setValue(screenHeight);
      Animated.timing(cancelReasonSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showCancelReasonModal, cancelReasonSlideAnim]);

  const detailTranslateY = detailSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight, 0],
  });

  const detailBackdropOpacity = detailSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const cancelReasonTranslateY = cancelReasonSlideAnim.interpolate({
    inputRange: [0, screenHeight],
    outputRange: [0, screenHeight],
  });

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
    borderLight: isDarkMode ? '#475569' : '#f1f5f9',
  };

  const fetchOrders = async (showLoading = true) => {
    if (!token) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Authentication required',
      });
      return;
    }

    if (showLoading) setLoading(true);
    try {
      console.log('[PurchasesScreen] Fetching orders with status:', selectedStatus);
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/orders/history`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('[PurchasesScreen] All orders fetched:', response.data);

      // Save all orders for searching, even if they don't match current filter
      const fetchedAllOrders = response.data?.orders || [];
      setAllOrders(fetchedAllOrders);

      const counts = fetchedAllOrders.reduce((acc: Record<string, number>, order: Order) => {
        const key = normalizeStatusKey(order.status);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      setStatusCounts(counts);

      const normalizedSelected = normalizeStatusKey(selectedStatus);
      const filteredOrders = fetchedAllOrders.filter((order: Order) => normalizeStatusKey(order.status) === normalizedSelected);

      console.log('[PurchasesScreen] Filtered orders for status', selectedStatus, ':', {
        totalOrders: fetchedAllOrders.length,
        filteredCount: filteredOrders.length,
        requestedStatus: selectedStatus,
        statuses: fetchedAllOrders.map((o: Order) => o.status),
      });
      setOrders(filteredOrders);
    } catch (error: any) {
      console.error('[PurchasesScreen] Error fetching orders:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to load orders',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Clear modal when switching tabs
    setShowDetailModal(false);
    setSelectedOrder(null);
    fetchOrders();
  }, [token, selectedStatus]);

  useEffect(() => {
    const fetchCancellationReasons = async () => {
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(
          `${API_CONFIG.BASE_URL}/orders/cancellation-reasons`,
          { headers }
        );
        setCancellationReasons(response.data?.cancellation_reasons || {});
      } catch (error) {
        console.error('Failed to fetch cancellation reasons:', error);
      }
    };
    fetchCancellationReasons();
  }, [token]);

  const hasSetInitialOrder = React.useRef(false);

  useEffect(() => {
    if (initialOrderId && allOrders.length > 0 && !hasSetInitialOrder.current) {
      console.log('[PurchasesScreen] Looking for order with initialOrderId:', initialOrderId);

      // Try to find order by any of the IDs (they should all be the same value according to user)
      let order = allOrders.find(o =>
        o.mobile_order_id === initialOrderId ||
        o.order_number === initialOrderId ||
        o.checkout_id === initialOrderId ||
        o.id.toString() === initialOrderId
      );

      if (order) {
        console.log('[PurchasesScreen] Found order:', order);
        setSelectedOrder(order);
        setShowDetailModal(true);

        // Also update selectedStatus to match the order's status so user sees it in the right tab
        const normalizedStatus = normalizeStatusKey(order.status);
        console.log('[PurchasesScreen] Updating status to:', normalizedStatus);
        setSelectedStatus(normalizedStatus);
        hasSetInitialOrder.current = true;
      } else {
        console.warn('[PurchasesScreen] Order not found with ID:', initialOrderId);
      }
    }
  }, [initialOrderId, allOrders]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack?.();
      return true;
    });

    return () => backHandler.remove();
  }, [onBack]);


  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft: Record<number, string> = {};
      orders.forEach(order => {
        const createdTime = new Date(order.created_at).getTime();
        const expiryTime = createdTime + 24 * 60 * 60 * 1000; // 24 hours
        const now = new Date().getTime();
        const diff = expiryTime - now;

        if (diff <= 0) {
          newTimeLeft[order.id] = 'Expired';
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          newTimeLeft[order.id] = `${hours}h ${minutes}m ${seconds}s`;
        }
      });
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [orders]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(false);
  };

  const handleProceedToPayment = async (order: Order) => {
    console.log('[PurchasesScreen] handleProceedToPayment called with order:', {
      id: order.id,
      order_number: order.order_number,
      fullOrder: order,
    });

    if (paymentLoading === order.id) {
      console.log('[PurchasesScreen] Already loading for this order');
      return;
    }

    if (!token) {
      console.log('[PurchasesScreen] No token found');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Authentication required',
      });
      return;
    }

    if (!order.order_number) {
      console.log('[PurchasesScreen] No order_number found in order');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Order number not found',
      });
      return;
    }

    setPaymentLoading(order.id);
    try {
      console.log('[PurchasesScreen] Proceeding to payment:', {
        orderNumber: order.order_number,
      });

      const apiUrl = `${API_CONFIG.BASE_URL}/mobile/payments/${order.order_number}/proceed`;
      console.log('[PurchasesScreen] Calling API:', apiUrl);

      const response = await axios.get(
        apiUrl,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('[PurchasesScreen] ✅ API SUCCESS:', {
        status: response.status,
        checkoutUrl: response.data?.checkout_url,
        hasCheckoutUrl: !!response.data?.checkout_url,
        fullResponse: response.data,
      });

      if (response.data?.checkout_url) {
        console.log('[PurchasesScreen] Calling onProceedToPayment with URL:', response.data.checkout_url);
        Toast.show({
          type: 'success',
          text1: 'Redirecting to Payment',
          text2: 'Opening PayMongo checkout...',
        });
        onProceedToPayment?.(response.data.checkout_url);
        console.log('[PurchasesScreen] onProceedToPayment callback executed');
      } else {
        console.log('[PurchasesScreen] No checkout_url in response');
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'No checkout URL received from server',
        });
      }
    } catch (error: any) {
      console.error('[PurchasesScreen] ❌ API ERROR:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });

      const errorMsg = error.response?.data?.message
        || error.response?.data?.error
        || error.response?.statusText
        || 'Failed to proceed to payment';

      Toast.show({
        type: 'error',
        text1: 'Payment Error',
        text2: errorMsg,
      });
    } finally {
      setPaymentLoading(null);
    }
  };

  const handleCancelOrder = async (order: Order) => {
    if (!token) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Authentication required' });
      return;
    }

    const normalizedStatus = normalizeStatusKey(order.status);

    // Allow cancellation for pending and paid orders only
    if (normalizedStatus !== 'pending' && normalizedStatus !== 'paid') {
      Toast.show({
        type: 'error',
        text1: 'Cannot Cancel',
        text2: 'Orders can only be cancelled if pending or paid.',
      });
      return;
    }

    setSelectedOrder(order);
    setSelectedCancellationReason(null);
    setShowCancelReasonModal(true);
  };

  const handleConfirmCancelWithReason = async () => {
    if (!selectedOrder || !token) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Order or token missing' });
      return;
    }

    if (cancelLoading === selectedOrder.id) return;

    setCancelLoading(selectedOrder.id);
    setCancelReasonLoading(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload: any = {};

      if (selectedCancellationReason) {
        payload.cancellation_reason = selectedCancellationReason;
      }

      // Try the correct endpoint with order ID
      await axios.post(
        `${API_CONFIG.BASE_URL}/orders/${selectedOrder.id}/cancel`,
        payload,
        { headers }
      );

      Toast.show({
        type: 'success',
        text1: 'Order Cancelled',
        text2: `Order #${selectedOrder.order_number} has been cancelled. Refund will be processed within 3-5 business days.`,
      });

      setShowDetailModal(false);
      setShowCancelReasonModal(false);
      setSelectedOrder(null);
      setSelectedCancellationReason(null);
      fetchOrders();
    } catch (error: any) {
      console.error('Cancel error:', error);
      const errorMsg = error?.response?.data?.message
        || error?.response?.data?.error
        || 'Failed to cancel order';
      Toast.show({
        type: 'error',
        text1: 'Cancel Failed',
        text2: errorMsg,
      });
    } finally {
      setCancelLoading(null);
      setCancelReasonLoading(false);
    }
  };

  const handleBuyAgain = (order: Order) => {
    if (!order || !order.items || order.items.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'No Items',
        text2: 'This order has no items to repurchase',
      });
      return;
    }

    // Call the onBuyAgain callback with the order items
    if (onBuyAgain) {
      onBuyAgain(order.items);
      setShowDetailModal(false);
      setSelectedOrder(null);
    } else {
      Toast.show({
        type: 'info',
        text1: 'Buy Again',
        text2: `Ready to purchase ${order.items.length} item(s) again`,
      });
      setShowDetailModal(false);
      setSelectedOrder(null);
    }
  };

  const statusConfig = STATUS_CONFIG[normalizeStatusKey(selectedStatus)];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['rgba(59,130,246,0.15)', 'rgba(31,41,55,0)'] : ['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#1f2937' : Colors.white }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back-outline" size={24} color={isDarkMode ? '#e5e7eb' : Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerGreeting, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>
              My Purchases
            </Text>
            <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#9ca3af' : Colors.textSecondary }]}>
              Track your orders
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Filter Bar at Top */}
      <View style={[styles.filterBar, { backgroundColor: colors.containerBg, borderTopColor: colors.border, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          scrollEventThrottle={16}
        >
          {ALL_STATUSES.map((filterStatus) => {
            const config = STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG];
            const isSelected = selectedStatus === filterStatus;
            return (
              <TouchableOpacity
                key={filterStatus}
                style={[
                  styles.filterButton,
                  isSelected && [styles.filterButtonActive, { backgroundColor: Colors.sky }]
                ]}
                onPress={() => setSelectedStatus(filterStatus)}
              >
                <Text style={[
                  styles.filterButtonText,
                  isSelected && { color: Colors.white, fontWeight: '700' }
                ]}>
                  {config.label}
                </Text>
                {Number(statusCounts[filterStatus] || 0) > 0 && (
                  <View style={[styles.filterCountBadge, isSelected && styles.filterCountBadgeActive]}>
                    <Text style={[styles.filterCountBadgeText, isSelected && styles.filterCountBadgeTextActive]}>
                      {statusCounts[filterStatus] > 99 ? '99+' : statusCounts[filterStatus]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.sky} />
            <Text style={[styles.loadingText, { color: colors.textSec }]}>Loading orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="inbox-outline" size={64} color={colors.textSec} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Orders</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSec }]}>
              You don't have any {statusConfig.label.toLowerCase()} orders yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item: order }) => (
              <TouchableOpacity
                style={[styles.orderCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}
                onPress={() => {
                  setSelectedOrder(order);
                  setShowDetailModal(true);
                }}
                activeOpacity={0.7}
              >
                {/* Order Header */}
                <View style={[styles.orderHeader, { borderBottomColor: colors.border }]}>
                  <View>
                    <Text style={[styles.orderNumber, { color: colors.text }]}>
                      Order #{order.order_number}
                    </Text>
                    <Text style={[styles.orderDate, { color: colors.textSec }]}>
                      {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]}>
                    <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>

                {/* Order Items */}
                <View style={[styles.itemsContainer, { borderBottomColor: colors.border }]}>
                  {(() => {
                    // Consolidate items by product_id
                    const consolidatedItems = order.items.reduce((acc: any[], item) => {
                      const existing = acc.find(i => i.product_id === item.product_id);
                      if (existing) {
                        existing.quantity += item.quantity;
                        existing.totalPrice += item.price * item.quantity;
                      } else {
                        acc.push({
                          ...item,
                          totalPrice: item.price * item.quantity,
                        });
                      }
                      return acc;
                    }, []);

                    return consolidatedItems.map((item, index) => (
                      <TouchableOpacity
                        key={`${item.product_id}-${index}`}
                        style={[
                          styles.itemRow,
                          index !== consolidatedItems.length - 1 && { borderBottomColor: colors.border },
                        ]}
                        onPress={() => onProductPress?.(item.product_id)}
                        activeOpacity={0.7}
                      >
                        {item.image && (
                          <Image
                            source={{ uri: item.image }}
                            style={styles.itemImage}
                            resizeMode="contain"
                          />
                        )}
                        <View style={styles.itemInfo}>
                          <View style={styles.itemNameRow}>
                            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                              {item.name}
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color={colors.textSec} />
                          </View>
                          <View>
                            <Text style={[styles.itemQty, { color: colors.textSec }]}>
                              Qty: {item.quantity}
                            </Text>
                            {(item.selected_color || item.selected_size || item.selected_type) && (
                              <Text style={[styles.itemVariant, { color: colors.textSec }]}>
                                {[item.selected_color, item.selected_size, item.selected_type].filter(Boolean).join(', ')}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Text style={[styles.itemPrice, { color: Colors.sky }]}>
                          ₱{item.totalPrice.toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    ));
                  })()}
                </View>

                {/* Shipping Fee */}
                {order.shipping_fee > 0 && (
                  <View style={[styles.shippingFeeRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.shippingLabel, { color: colors.textSec }]}>Shipping Fee</Text>
                    <Text style={[styles.shippingPrice, { color: colors.text }]}>
                      ₱{order.shipping_fee.toLocaleString()}
                    </Text>
                  </View>
                )}

                {/* Order Total */}
                <View style={styles.orderFooter}>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: colors.textSec }]}>Total Amount</Text>
                    <Text style={[styles.totalPrice, { color: Colors.sky }]}>
                      ₱{order.total_amount.toLocaleString()}
                    </Text>
                  </View>

                  {/* Payment Method */}
                  <View style={styles.paymentMethodRow}>
                    <Text style={[styles.paymentMethodLabel, { color: colors.textSec }]}>
                      Payment: {order.payment_method}
                    </Text>
                    {selectedStatus === 'pending' && (
                      <View style={styles.payUntilInline}>
                        <Ionicons
                          name={timeLeft[order.id] === 'Expired' ? 'alert-circle' : 'time'}
                          size={12}
                          color={timeLeft[order.id] === 'Expired' ? Colors.error : Colors.sky}
                        />
                        <Text
                          style={[
                            styles.payUntilInlineText,
                            { color: timeLeft[order.id] === 'Expired' ? Colors.error : Colors.sky },
                          ]}
                        >
                          {timeLeft[order.id] || 'Loading...'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Cancellation Reason (for cancelled orders) */}
                  {selectedStatus === 'cancelled' && order.refund_reason && (
                    <View style={[styles.cancellationReasonBox, { backgroundColor: `${Colors.error}10`, borderColor: Colors.error }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <Ionicons name="information-circle" size={18} color={Colors.error} style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cancellationReasonLabel, { color: colors.text }]}>Cancellation Reason</Text>
                          <Text style={[styles.cancellationReasonText, { color: colors.textSec }]}>
                            {order.refund_reason}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Order Actions */}
                  {(selectedStatus === 'pending' || selectedStatus === 'paid') && (
                    <View style={styles.paymentSection}>
                      <View style={styles.listActionsRow}>
                        <TouchableOpacity
                          style={[styles.cancelListBtn, cancelLoading === order.id && { opacity: 0.6 }]}
                          onPress={() => handleCancelOrder(order)}
                          disabled={cancelLoading === order.id}
                        >
                          {cancelLoading === order.id ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                          ) : (
                            <>
                              <Ionicons name="close-circle-outline" size={16} color={Colors.white} />
                              <Text style={styles.paymentBtnText}>Cancel Order</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        {selectedStatus === 'pending' && (
                          <TouchableOpacity
                            style={[styles.paymentBtn, paymentLoading === order.id && { opacity: 0.6 }]}
                            onPress={() => handleProceedToPayment(order)}
                            disabled={paymentLoading === order.id}
                          >
                            {paymentLoading === order.id ? (
                              <ActivityIndicator size="small" color={Colors.white} />
                            ) : (
                              <>
                                <Ionicons name="card" size={16} color={Colors.white} />
                                <Text style={styles.paymentBtnText}>Proceed to Payment</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Buy Again Button (for cancelled orders) */}
                  {selectedStatus === 'cancelled' && (
                    <View style={{ marginTop: 12 }}>
                      <TouchableOpacity
                        style={styles.paymentBtn}
                        onPress={() => handleBuyAgain(order)}
                      >
                        <Ionicons name="refresh-outline" size={16} color={Colors.white} />
                        <Text style={styles.paymentBtnText}>Buy Again</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 12, paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.sky}
              />
            }
          />
        )}
      </View>

      {/* Order Details Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent
        onRequestClose={closeDetailModal}
      >
        <View style={styles.sheetBackdrop}>
          <Animated.View style={[styles.sheetBackdropLayer, { opacity: detailBackdropOpacity }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeDetailModal} />
          </Animated.View>
          <Animated.View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.bg, transform: [{ translateY: detailTranslateY }] },
            ]}
            {...detailPanResponder.panHandlers}
          >
            {/* Sheet Handle */}
            <View style={styles.handleContainer}>
              <View style={[styles.sheetHandle, { backgroundColor: isDarkMode ? '#475569' : '#cbd5e1' }]} />
            </View>
            {/* Sheet Header */}
            <View
              style={[styles.sheetHeader, { backgroundColor: isDarkMode ? '#1f2937' : Colors.white, borderBottomColor: colors.border }]}
            >
              <Text style={[styles.sheetTitle, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>Order Details</Text>
            </View>

          {selectedOrder && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Order Number & Status */}
              <View style={[styles.detailCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSec }]}>Order Number</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>#{selectedOrder.order_number}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSec }]}>Order Date</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {new Date(selectedOrder.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSec }]}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${STATUS_CONFIG[normalizeStatusKey(selectedOrder.status)].color}20` }]}>
                    <Ionicons
                      name={STATUS_CONFIG[normalizeStatusKey(selectedOrder.status)].icon as any}
                      size={14}
                      color={STATUS_CONFIG[normalizeStatusKey(selectedOrder.status)].color}
                    />
                    <Text style={[styles.statusText, { color: STATUS_CONFIG[normalizeStatusKey(selectedOrder.status)].color }]}>
                      {STATUS_CONFIG[normalizeStatusKey(selectedOrder.status)].label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Order Items */}
              <View style={[styles.detailCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Items Ordered</Text>
                {selectedOrder.items.map((item, index) => (
                  <View key={`${item.product_id}-${index}`}>
                    <View style={styles.detailItemRow}>
                      {item.image && (
                        <Image
                          source={{ uri: item.image }}
                          style={styles.detailItemImage}
                          resizeMode="contain"
                        />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
                        <Text style={[styles.itemQty, { color: colors.textSec }]}>Qty: {item.quantity}</Text>
                        {(item.selected_color || item.selected_size || item.selected_type) && (
                          <Text style={[styles.itemVariant, { color: colors.textSec }]}>
                            {[item.selected_color, item.selected_size, item.selected_type].filter(Boolean).join(', ')}
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.itemPrice, { color: Colors.sky }]}>₱{(item.price * item.quantity).toLocaleString()}</Text>
                    </View>
                    {index < selectedOrder.items.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  </View>
                ))}
              </View>

              {/* Order Summary */}
              <View style={[styles.detailCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSec }]}>Subtotal</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    ₱{(selectedOrder.total_amount - selectedOrder.shipping_fee).toLocaleString()}
                  </Text>
                </View>
                {selectedOrder.shipping_fee > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSec }]}>Shipping Fee</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>₱{selectedOrder.shipping_fee.toLocaleString()}</Text>
                  </View>
                )}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: '700' }]}>Total Amount</Text>
                  <Text style={[styles.totalAmount, { color: Colors.sky }]}>₱{selectedOrder.total_amount.toLocaleString()}</Text>
                </View>
              </View>

              {/* Payment & Delivery Info */}
              <View style={[styles.detailCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment & Delivery</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSec }]}>Payment Method</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedOrder.payment_method}</Text>
                </View>
                {selectedOrder.tracking_number && (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSec }]}>Tracking Number</Text>
                      <Text style={[styles.detailValue, { color: Colors.sky }]}>{selectedOrder.tracking_number}</Text>
                    </View>
                  </>
                )}
              </View>
              {(selectedOrder.status === 'pending' || selectedOrder.status === 'paid') && (
                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={[styles.detailActionBtn, styles.cancelBtn]}
                    onPress={() => handleCancelOrder(selectedOrder)}
                    disabled={cancelLoading === selectedOrder.id}
                    activeOpacity={0.7}
                  >
                    {cancelLoading === selectedOrder.id ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons name="close-circle-outline" size={16} color={Colors.white} />
                        <Text style={styles.detailActionText}>Cancel Order</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {selectedOrder.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.detailActionBtn, styles.payBtn]}
                      onPress={() => handleProceedToPayment(selectedOrder)}
                      disabled={paymentLoading === selectedOrder.id}
                      activeOpacity={0.7}
                    >
                      {paymentLoading === selectedOrder.id ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <>
                          <Ionicons name="card-outline" size={16} color={Colors.white} />
                          <Text style={styles.detailActionText}>Proceed to Payment</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          )}
          </Animated.View>
        </View>
      </Modal>

      {/* Cancel Reason Modal */}
      <Modal
        visible={showCancelReasonModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelReasonModal(false)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowCancelReasonModal(false)}
          />
          <Animated.View
            style={[
              styles.cancelReasonSheet,
              { backgroundColor: isDarkMode ? '#1f2937' : Colors.white, transform: [{ translateY: cancelReasonTranslateY }] },
            ]}
            {...cancelReasonPanResponder.panHandlers}
          >
            {/* Handle Container */}
            <View style={styles.handleContainer}>
              <View style={[styles.sheetHandle, { backgroundColor: isDarkMode ? '#475569' : '#cbd5e1' }]} />
            </View>
            {/* Sheet Header */}
            <View
              style={[styles.sheetHeader, { backgroundColor: isDarkMode ? '#1f2937' : Colors.white, borderBottomColor: colors.border }]}
            >
              <Text style={[styles.sheetTitle, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>Reason for Cancellation</Text>
            </View>

            <ScrollView style={styles.reasonList} contentContainerStyle={styles.reasonListContent}>
              {Object.entries(cancellationReasons).length > 0 ? (
                Object.entries(cancellationReasons).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.reasonOption,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: selectedCancellationReason === key ? '#eff6ff' : 'transparent',
                      },
                    ]}
                    onPress={() => setSelectedCancellationReason(key)}
                  >
                    <View style={styles.reasonOptionContent}>
                      <Text style={[styles.reasonText, { color: colors.text, fontWeight: selectedCancellationReason === key ? '700' : '500' }]}>{label}</Text>
                    </View>
                    {selectedCancellationReason === key && (
                      <View style={styles.reasonCheckmark}>
                        <Ionicons name="checkmark" size={20} color={Colors.sky} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={[styles.reasonText, { color: colors.textSec, textAlign: 'center', marginTop: 20 }]}>
                  Loading reasons...
                </Text>
              )}
            </ScrollView>

            <View style={styles.reasonActions}>
              <TouchableOpacity
                style={[styles.reasonBtn, { backgroundColor: colors.border }]}
                onPress={() => setShowCancelReasonModal(false)}
                disabled={cancelReasonLoading}
              >
                <Text style={[styles.reasonBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reasonBtn,
                  { backgroundColor: '#ef4444', opacity: !selectedCancellationReason || cancelReasonLoading ? 0.6 : 1 },
                ]}
                onPress={handleConfirmCancelWithReason}
                disabled={!selectedCancellationReason || cancelReasonLoading}
              >
                {cancelReasonLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.reasonBtnText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: -10,
    marginRight: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerGreeting: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  orderCard: {
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    marginVertical: 6,
    borderWidth: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 11,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemsContainer: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 0,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 2,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemQty: {
    fontSize: 11,
  },
  itemVariant: {
    fontSize: 10,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  shippingFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  shippingLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  shippingPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
  },
  paymentMethodLabel: {
    fontSize: 11,
  },
  payUntilInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  payUntilInlineText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderFooter: {
    gap: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '800',
  },
  paymentBtn: {
    flex: 1,
    backgroundColor: Colors.sky,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 0,
  },
  paymentBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  paymentSection: {
    gap: 10,
    marginTop: 12,
  },
  listActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelListBtn: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  filterBar: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  filterContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    borderColor: Colors.sky,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  filterCountBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  filterCountBadgeTextActive: {
    color: Colors.white,
  },
  // Modal Styles
  modalContainer: {
    height: '90%',
    maxHeight: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdropLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 12,
    paddingBottom: 30,
  },
  detailCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  detailItemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 20,
  },
  detailActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  cancelBtn: {
    backgroundColor: '#ef4444',
  },
  payBtn: {
    backgroundColor: Colors.sky,
  },
  detailActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  reasonList: {
    flex: 1,
    paddingHorizontal: 0,
  },
  reasonListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  reasonOptionContent: {
    flex: 1,
  },
  reasonCheckmark: {
    marginLeft: 12,
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  reasonActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  reasonBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelReasonSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: screenHeight * 0.75,
    width: '100%',
    paddingBottom: 20,
  },
  cancellationReasonBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  cancellationReasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  cancellationReasonText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
