import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { orderService } from '../services/orderService';
import { ChatBotIcon } from '../components/ChatBot';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationsScreenProps {
  token?: string | null;
  userId?: string | number;
  isDarkMode?: boolean;
  onNavigateToPurchases?: (status: string, orderId?: string) => void;
  isVisible?: boolean;
}

export default function NotificationsScreen({ token, userId, isDarkMode = false, onNavigateToPurchases, isVisible = true }: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');
  const [expandedNotificationId, setExpandedNotificationId] = useState<number | null>(null);
  const [loadingUpdates, setLoadingUpdates] = useState<Record<number, boolean>>({});

  // Integrate with useNotifications for realtime updates
  useNotifications(userId || '', token || '', onNavigateToPurchases, () => {
    // Refresh notification list when realtime event is received
    if (isVisible) {
      fetchNotifications(true);
    }
  });

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
    borderLight: isDarkMode ? '#374151' : '#e5e7eb',
    emptyIcon: isDarkMode ? '#0284c7' : Colors.sky,
    unreadBg: isDarkMode ? '#374151' : '#f8f8f8',
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  const fetchNotifications = async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await orderService.getNotifications(token);
      setNotifications(data);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchNotifications(true);
  };

  const fetchNotificationUpdates = async (notificationId: number) => {
    if (!token) return;
    setLoadingUpdates(prev => ({ ...prev, [notificationId]: true }));
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'https://api.afhomebiz.com'}/mobile/notifications/${notificationId}/updates`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        // Update the notification with fetched updates
        setNotifications((prev: any) => {
          if (!prev?.notifications) return prev;
          const updated = prev.notifications.map((n: any) =>
            n.id === notificationId ? { ...n, updates: data.updates } : n
          );
          return { ...prev, notifications: updated };
        });
      }
    } catch (error) {
      console.error('Error fetching notification updates:', error);
    } finally {
      setLoadingUpdates(prev => ({ ...prev, [notificationId]: false }));
    }
  };

  const toggleNotificationExpand = async (notificationId: number) => {
    if (expandedNotificationId === notificationId) {
      setExpandedNotificationId(null);
    } else {
      setExpandedNotificationId(notificationId);
      // Fetch updates if not already loaded
      const notification = notifications?.notifications.find((n: any) => n.id === notificationId);
      if (notification && !notification.updates) {
        await fetchNotificationUpdates(notificationId);
      }
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      case 'info':
      default:
        return Colors.sky;
    }
  };

  const getSeverityIcon = (severity: string): any => {
    switch (severity) {
      case 'success':
        return 'checkmark-circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'alert-circle';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } else if (isYesterday) {
      return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    }
  };

  const getFilteredNotifications = () => {
    if (!notifications?.notifications) return [];
    if (filterType === 'all') return notifications.notifications;
    if (filterType === 'unread') return notifications.notifications.filter((item: any) => !item.is_read);
    if (filterType === 'read') return notifications.notifications.filter((item: any) => item.is_read);
    return notifications.notifications;
  };

  const handleNotificationPress = async (item: any) => {
    const href = item?.href;
    const orderId = item?.order_id;

    console.log('[NotificationsScreen] Notification pressed:', { href, orderId });

    if (token && item?.id) {
      try {
        await orderService.readNotification(token, item.id);
        setNotifications((prev: any) => {
          if (!prev?.notifications) return prev;
          const updated = prev.notifications.map((n: any) =>
            n.id === item.id ? { ...n, is_read: true } : n
          );
          const unreadCount = updated.filter((n: any) => !n.is_read).length;
          return { ...prev, notifications: updated, unread_count: unreadCount };
        });
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    if (!href) return;

    // Parse deep link format: purchases://status or purchases://status/mobile-order-id
    const deepLinkRegex = /^purchases:\/\/([^\/]+)(?:\/(.+))?$/;
    const match = href.match(deepLinkRegex);

    console.log('[NotificationsScreen] Deep link match:', match);

    if (match && match[1]) {
      const status = match[1];
      const parsedOrderId = match[2] || orderId;
      console.log('[NotificationsScreen] Calling onNavigateToPurchases with:', { status, parsedOrderId });
      onNavigateToPurchases?.(status, parsedOrderId);
    }
  };

  const getNotificationStatus = (item: any): string | null => {
    const rawStatus = item?.status || item?.order_status;
    if (typeof rawStatus === 'string' && rawStatus.trim()) {
      const s = rawStatus.trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
      if (s === 'out_for_delivery') return 'to_receive';
      if (s === 'to_ship') return 'shipped';
      return s;
    }
    if (typeof item?.href !== 'string') return null;
    const deepLinkRegex = /^purchases:\/\/([^\/]+)(?:\/(.+))?$/;
    const match = item.href.match(deepLinkRegex);
    if (!match?.[1]) return null;
    const s = String(match[1]).toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
    if (s === 'out_for_delivery') return 'to_receive';
    if (s === 'to_ship') return 'shipped';
    return s;
  };

  const getStatusBadgeConfig = (status: string | null, dark: boolean) => {
    const normalized = (status || '').replace(/[_-]/g, ' ').trim().toLowerCase();
    switch (normalized) {
      case 'pending':
        return { label: 'Pending', bg: dark ? '#3f2f0a' : '#fef3c7', text: dark ? '#fcd34d' : '#92400e' };
      case 'paid':
        return { label: 'Paid', bg: dark ? '#0f3b2e' : '#dcfce7', text: dark ? '#86efac' : '#166534' };
      case 'processing':
        return { label: 'Processing', bg: dark ? '#0f2a4d' : '#dbeafe', text: dark ? '#93c5fd' : '#1e40af' };
      case 'to ship':
      case 'toship':
      case 'shipped':
        return { label: 'To Ship', bg: dark ? '#3a1f45' : '#f3e8ff', text: dark ? '#d8b4fe' : '#6b21a8' };
      case 'to receive':
      case 'toreceive':
      case 'out for delivery':
        return { label: 'To Receive', bg: dark ? '#123348' : '#cffafe', text: dark ? '#67e8f9' : '#0e7490' };
      case 'delivered':
        return { label: 'Delivered', bg: dark ? '#1f3f21' : '#d1fae5', text: dark ? '#6ee7b7' : '#065f46' };
      case 'cancelled':
        return { label: 'Cancelled', bg: dark ? '#3f1f1f' : '#fee2e2', text: dark ? '#fca5a5' : '#991b1b' };
      default:
        return null;
    }
  };

  const totalNotifications = notifications?.unread_count || 0;

  return (
    <View style={styles.root}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.titleSection, { backgroundColor: colors.containerBg, borderBottomColor: colors.border }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
            {totalNotifications > 0 && (
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>{totalNotifications}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.filterBar, { backgroundColor: colors.containerBg, borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
            scrollEventThrottle={16}
          >
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'all' && [styles.filterButtonActive, { backgroundColor: Colors.sky }]
              ]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[
                styles.filterButtonText,
                filterType === 'all' && { color: Colors.white, fontWeight: '700' }
              ]}>
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'unread' && [styles.filterButtonActive, { backgroundColor: Colors.sky }]
              ]}
              onPress={() => setFilterType('unread')}
            >
              <Text style={[
                styles.filterButtonText,
                filterType === 'unread' && { color: Colors.white, fontWeight: '700' }
              ]}>
                Unread
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'read' && [styles.filterButtonActive, { backgroundColor: Colors.sky }]
              ]}
              onPress={() => setFilterType('read')}
            >
              <Text style={[
                styles.filterButtonText,
                filterType === 'read' && { color: Colors.white, fontWeight: '700' }
              ]}>
                Read
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.emptyIcon} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.sky}
            />
          }
        >
          {notifications?.notifications && notifications.notifications.length > 0 ? (
            (() => {
              const filtered = getFilteredNotifications();
              return filtered.length > 0 ? filtered.map((item: any, index: number) => {
                const isExpanded = expandedNotificationId === item.id;
                const isLoadingUpdates = loadingUpdates[item.id];

                return (
                  <View
                    key={item.id}
                    style={[
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: !item.is_read ? colors.unreadBg : 'transparent',
                      },
                      index !== filtered.length - 1 && styles.notificationItemBorder,
                    ]}
                  >
                    <TouchableOpacity
                      style={[styles.notificationItem]}
                      onPress={() => handleNotificationPress(item)}
                      activeOpacity={0.7}
                    >
                      {item.product_image ? (
                        <View style={[styles.notificationImageBox, { backgroundColor: colors.borderLight }]}>
                          <Image
                            source={{ uri: item.product_image }}
                            style={styles.notificationImage}
                            resizeMode="contain"
                          />
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.notificationIconBox,
                            { backgroundColor: getSeverityColor(item.severity) },
                          ]}
                        >
                          <Ionicons
                            name={getSeverityIcon(item.severity)}
                            size={24}
                            color={Colors.white}
                          />
                        </View>
                      )}
                      <View style={styles.notificationContent}>
                        <View style={styles.notificationHeaderRow}>
                          <Text style={[styles.notificationTitle, { color: colors.text }]}>{item.title}</Text>
                          <Text style={[styles.notificationTime, { color: colors.textSec }]}>{formatDate(item.created_at)}</Text>
                        </View>
                        {(() => {
                          const badge = getStatusBadgeConfig(getNotificationStatus(item), isDarkMode);
                          if (!badge) return null;
                          return (
                            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                              <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                            </View>
                          );
                        })()}
                        <Text style={[styles.notificationDescription, { color: colors.textSec }]}>{item.message}</Text>
                        {item.amount > 0 && (
                          <Text style={[styles.notificationAmount, { color: colors.emptyIcon }]}>
                            Amount: ₱{item.amount.toLocaleString()}
                          </Text>
                        )}
                        {(item.updates || []).length > 0 && (
                          <TouchableOpacity
                            style={styles.updatesToggle}
                            onPress={() => toggleNotificationExpand(item.id)}
                          >
                            <Text style={[styles.updatesToggleText, { color: Colors.sky }]}>
                              View {(item.updates || []).length} update{(item.updates || []).length !== 1 ? 's' : ''} {isExpanded ? '▼' : '▶'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.updatesContainer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
                        {isLoadingUpdates ? (
                          <View style={styles.updatesLoading}>
                            <ActivityIndicator size="small" color={Colors.sky} />
                          </View>
                        ) : (
                          (item.updates || []).map((update: any, updateIndex: number) => (
                            <View
                              key={`${item.id}-update-${updateIndex}`}
                              style={[
                                styles.updateItem,
                                { borderLeftColor: Colors.sky, borderBottomColor: colors.border },
                                updateIndex === (item.updates || []).length - 1 && styles.updateItemLast,
                              ]}
                            >
                              <View style={styles.updateTimelineIcon}>
                                <View style={[styles.updateDot, { backgroundColor: Colors.sky }]} />
                              </View>
                              <View style={styles.updateContent}>
                                <View style={styles.updateHeaderRow}>
                                  <Text style={[styles.updateTitle, { color: colors.text }]}>{update.title}</Text>
                                  <Text style={[styles.updateTime, { color: colors.textSec }]}>{formatDate(update.event_date || update.created_at)}</Text>
                                </View>
                                <Text style={[styles.updateMessage, { color: colors.textSec }]}>{update.message}</Text>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              }) : (
                    <View style={styles.emptyContainer}>
                  <Ionicons name="checkmark-circle-outline" size={64} color={colors.emptyIcon} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up!</Text>
                  <Text style={[styles.emptyDescription, { color: colors.textSec }]}>You have no new notifications</Text>
                </View>
              );
            })()
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color={colors.emptyIcon} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up!</Text>
              <Text style={[styles.emptyDescription, { color: colors.textSec }]}>You have no new notifications</Text>
            </View>
          )}
        </ScrollView>
      )}
      </View>

      {/* Chat Bot Icon */}
      <ChatBotIcon position="bottom-right" visible={true} isDarkMode={isDarkMode} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  filterBar: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  filterButton: {
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  totalBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  notificationItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  notificationIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  notificationTime: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    flexShrink: 0,
  },
  notificationDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    lineHeight: 18,
  },
  notificationCount: {
    fontSize: 12,
    color: Colors.sky,
    fontWeight: '600',
    marginTop: 2,
  },
  notificationImageBox: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  notificationImage: {
    width: '100%',
    height: '100%',
  },
  notificationAmount: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 2,
    marginBottom: 2,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  updatesToggle: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  updatesToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.sky,
  },
  updatesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 0,
  },
  updatesLoading: {
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.sky,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingLeft: 12,
  },
  updateItemLast: {
    borderBottomWidth: 0,
  },
  updateTimelineIcon: {
    width: 20,
    height: 20,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -20,
  },
  updateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.sky,
  },
  updateContent: {
    flex: 1,
    gap: 4,
  },
  updateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  updateTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  updateTime: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    flexShrink: 0,
  },
  updateMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '400',
    lineHeight: 16,
  },
});
