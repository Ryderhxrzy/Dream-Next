import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, BackHandler, Alert, ActivityIndicator, Animated, FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { API_CONFIG } from '../config/api';
import axios from 'axios';

interface HistoryScreenProps {
  onBack: () => void;
  isDarkMode: boolean;
  token?: string | null;
}

interface LoginHistoryItem {
  id: number;
  description: string;
  method: string;
  method_icon: string;
  device: string;
  platform: string;
  browser: string;
  ip_address: string;
  location?: string;
  created_at: string;
  timestamp: number;
}

export default function HistoryScreen({ onBack, isDarkMode, token }: HistoryScreenProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const [history, setHistory] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
    cardBg: isDarkMode ? '#1e293b' : '#f8fafc',
    borderLight: isDarkMode ? '#475569' : '#f1f5f9',
  };

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => backHandler.remove();
  }, [onBack]);

  useEffect(() => {
    if (token) {
      fetchLoginHistory(true);
    }
  }, [token]);

  const fetchLoginHistory = async (isRefresh: boolean = false) => {
    if (!token) return;
    if (loading && !isRefresh) return;

    try {
      const page = isRefresh ? 1 : currentPage;
      setLoading(true);
      if (isRefresh) {
        setRefreshing(true);
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_CONFIG.BASE_URL}/login-history`, {
        headers,
        params: { page, per_page: 20 },
      });

      console.log('[HistoryScreen] Login history response:', response.data);

      const newData = response.data.data || [];
      if (isRefresh) {
        setHistory(newData);
        setCurrentPage(1);
      } else {
        setHistory([...history, ...newData]);
        setCurrentPage(currentPage + 1);
      }

      setHasMore(response.data.pagination?.has_more || false);
    } catch (error) {
      console.error('[HistoryScreen] Error fetching login history:', error);
      Alert.alert('Error', 'Failed to load login history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const isToday = date.toDateString() === today.toDateString();
      const isYesterday = date.toDateString() === yesterday.toDateString();

      if (isToday) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      } else if (isYesterday) {
        return `Yesterday ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
          + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
    } catch {
      return 'Unknown date';
    }
  };

  const getMethodColor = (method: string): string => {
    const methodColors: { [key: string]: string } = {
      email: '#3b82f6',
      biometric: '#8b5cf6',
      google: '#ef4444',
      qr: '#06b6d4',
      facebook: '#1e40af',
    };
    return methodColors[method] || '#6b7280';
  };

  const renderHistoryItem = ({ item }: { item: LoginHistoryItem }) => (
    <View
      style={[
        styles.historyItem,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.historyItemLeft}>
        <View
          style={[
            styles.methodIcon,
            {
              backgroundColor: getMethodColor(item.method) + '20',
            },
          ]}
        >
          <Text style={{ fontSize: 18 }}>{item.method_icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.historyMethod, { color: colors.text }]}>
            {item.description}
          </Text>
          <View style={styles.historyDetails}>
            <Text style={[styles.detailText, { color: colors.textSec }]}>
              <Ionicons name="phone-portrait" size={12} color={colors.textSec} /> {item.device}
            </Text>
            <Text style={[styles.separator, { color: colors.border }]}>•</Text>
            <Text style={[styles.detailText, { color: colors.textSec }]}>
              <Ionicons name="globe" size={12} color={colors.textSec} /> {item.ip_address}
            </Text>
          </View>
          <Text style={[styles.historyTime, { color: colors.textSec }]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={48} color={colors.textSec} />
      <Text style={[styles.emptyText, { color: colors.text, marginTop: 12 }]}>
        No login history yet
      </Text>
      <Text style={[styles.emptySubText, { color: colors.textSec, marginTop: 4 }]}>
        Your login attempts will appear here
      </Text>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          transform: [
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 100],
                outputRange: [0, 100],
              }),
            },
          ],
        },
      ]}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={[]}>
        <LinearGradient
          colors={isDarkMode ? ['rgba(59,130,246,0.15)', 'rgba(31,41,55,0)'] : ['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[
            styles.header,
            {
              paddingTop: insets.top,
              backgroundColor: isDarkMode ? '#1f2937' : Colors.white,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back-outline" size={24} color={isDarkMode ? '#e5e7eb' : Colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
              Login History
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          style={[styles.list, { backgroundColor: colors.bg }]}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          ListFooterComponent={
            loading ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.sky} />
              </View>
            ) : null
          }
          onEndReached={() => {
            if (hasMore && !loading) {
              fetchLoginHistory(false);
            }
          }}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={() => fetchLoginHistory(true)}
          scrollEnabled={true}
        />
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: -10,
    marginRight: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  headerTitleDark: {
    color: '#f8fafc',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
    paddingBottom: 32,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    marginHorizontal: 0,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  historyMethod: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 11,
    fontWeight: '500',
  },
  separator: {
    fontSize: 11,
  },
  historyTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 13,
  },
});
