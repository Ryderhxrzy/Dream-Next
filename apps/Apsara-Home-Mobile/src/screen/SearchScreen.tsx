import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Animated, Dimensions, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { Colors } from '../constants/colors';
import { authService, SearchHistoryItem } from '../services/authService';
import { userBehaviorService } from '../services/userBehaviorService';
import { API_CONFIG } from '../config/api';
import Toast from 'react-native-toast-message';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 8 - 8 - 8) / 2;

interface SearchScreenProps {
  onBack: () => void;
  token?: string | null;
  onProductPress?: (id: number) => void;
  onSearchSubmit?: (query: string) => void;
  isDarkMode?: boolean;
}

interface RecommendationItem {
  id: number;
  name: string;
  image: string;
  category_name: string;
  type: string;
}

interface LiveSearchItem {
  id: number;
  name: string;
  original_price: number;
  discounted_price: number;
  pv: number;
  image: string;
  has_discount: boolean;
  discount_percentage: number;
}

function getHistoryLabel(item: SearchHistoryItem) {
  return item.query ?? item.term ?? item.keyword ?? item.name ?? '';
}

export default function SearchScreen({ onBack, token, onProductPress, onSearchSubmit, isDarkMode = false }: SearchScreenProps) {
  const insets = useSafeAreaInsets();

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    headerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSecondary: isDarkMode ? '#9ca3af' : Colors.textSecondary,
    input: isDarkMode ? '#374151' : Colors.white,
    inputBorder: isDarkMode ? '#4b5563' : '#e5e7eb',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    liveRow: isDarkMode ? '#1e293b' : Colors.white,
  };

  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingQuery, setSavingQuery] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [liveResults, setLiveResults] = useState<LiveSearchItem[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoadingHistory(true);
    authService.getSearchHistory(token)
      .then(items => { if (active) setHistory(items); })
      .catch(error => {
        if (!active) return;
        Toast.show({ type: 'error', text1: 'Search history failed', text2: error.message || 'Unable to load search history.' });
      })
      .finally(() => { if (active) setLoadingHistory(false); });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoadingRecs(true);
    axios.get(`${API_CONFIG.BASE_URL}/search/recommendations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!active) return;
        if (res.data?.success && Array.isArray(res.data?.data)) {
          const seen = new Set<number>();
          const unique = res.data.data.filter((item: RecommendationItem) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
          // shuffle so order differs each load
          for (let i = unique.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [unique[i], unique[j]] = [unique[j], unique[i]];
          }
          setRecommendations(unique);
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoadingRecs(false); });
    return () => { active = false; };
  }, [token]);

  const runLiveSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!token || trimmed.length < 2) {
      setLiveResults([]);
      setLoadingLive(false);
      return;
    }
    let active = true;
    setLoadingLive(true);
    axios.get(`${API_CONFIG.BASE_URL}/search/live`, {
      params: { q: trimmed, limit: 10 },
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!active) return;
        console.log('🔍 Live search response:', res.data);
        if (res.data?.success && Array.isArray(res.data?.data)) {
          setLiveResults(res.data.data);
        } else if (Array.isArray(res.data?.data)) {
          setLiveResults(res.data.data);
        } else if (Array.isArray(res.data)) {
          setLiveResults(res.data);
        } else {
          setLiveResults([]);
        }
      })
      .catch(err => {
        if (active) {
          console.error('🔍 Live search error:', err.message);
          setLiveResults([]);
        }
      })
      .finally(() => { if (active) setLoadingLive(false); });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setLiveResults([]);
      setLoadingLive(false);
      return;
    }
    setLoadingLive(true);
    debounceRef.current = setTimeout(() => runLiveSearch(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runLiveSearch]);

  const recentSearches = useMemo(() => {
    const seen = new Set<string>();
    const labels = history
      .map(getHistoryLabel)
      .map(label => label.trim())
      .filter(Boolean)
      .filter(label => {
        const normalized = label.toLowerCase();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
    if (labels.length > 0) return labels.slice(0, 15);
    return ['sofa', 'dining table', 'bed frame', 'floor lamp', 'curtains'];
  }, [history]);

  function handleBack() {
    inputRef.current?.blur();
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onBack());
  }

  async function submitSearch(term: string) {
    const next = term.trim();
    if (!next) return;
    setQuery(next);
    if (!token) {
      Toast.show({ type: 'error', text1: 'Search unavailable', text2: 'Please sign in again.' });
      return;
    }
    setSavingQuery(true);
    try {
      await authService.saveSearchHistory(token, next);
      setHistory(prev => {
        const normalized = prev.filter(item => getHistoryLabel(item).toLowerCase() !== next.toLowerCase());
        return [{ query: next }, ...normalized].slice(0, 8);
      });
      // Track search behavior
      userBehaviorService.trackBehavior(token, 'search', undefined, undefined, undefined, next).catch(() => {});
      onSearchSubmit?.(next);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Search failed', text2: error.message || 'Unable to save the search.' });
      onSearchSubmit?.(next); // proceed anyway
    } finally {
      setSavingQuery(false);
    }
  }

  const hasQuery = query.trim().length > 0;

  return (
    <Animated.View style={[styles.root, isDarkMode && styles.rootDark, { transform: [{ translateX: slideAnim }] }]}>
      <View style={[styles.header, isDarkMode && styles.headerDark, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={[styles.searchWrapper, isDarkMode && styles.searchWrapperDark]}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => submitSearch(query)}
            placeholder="Search products..."
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
          />
          {hasQuery ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
              <Ionicons name="camera-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={handleBack} style={styles.cancelBtn} activeOpacity={0.7}>
          <Text style={[styles.cancelText, isDarkMode && styles.cancelTextDark]}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.scroll, { backgroundColor: hasQuery ? colors.liveRow : colors.bg }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={{ backgroundColor: colors.liveRow, height: 1000, position: 'absolute', top: -1000, left: 0, right: 0 }} />
        
        {/* Live search results */}
        {hasQuery && (
          <View style={styles.liveSection}>
            {loadingLive ? (
              <View style={styles.liveLoading}>
                <ActivityIndicator size="small" color={Colors.sky} />
                <Text style={[styles.liveLoadingText, isDarkMode && styles.liveLoadingTextDark]}>Searching...</Text>
              </View>
            ) : liveResults.length > 0 ? (
              liveResults.map((item, index) => (
                <TouchableOpacity
                  key={`live-${item.id}`}
                  style={[styles.liveRow, isDarkMode && styles.liveRowDark, index < liveResults.length - 1 && styles.liveRowBorder, isDarkMode && index < liveResults.length - 1 && styles.liveRowBorderDark]}
                  activeOpacity={0.8}
                  onPress={() => {
                    submitSearch(item.name);
                    onProductPress?.(item.id);
                  }}
                >
                  <Image source={{ uri: item.image }} style={styles.liveThumb} resizeMode="cover" />
                  <View style={styles.liveInfo}>
                    <Text style={[styles.liveName, isDarkMode && styles.liveNameDark]} numberOfLines={2}>{item.name}</Text>
                    <View style={styles.livePriceRow}>
                      <Text style={styles.livePrice}>
                        ₱{item.discounted_price.toLocaleString()}
                      </Text>
                      {item.has_discount && (
                        <>
                          <Text style={styles.liveOriginalPrice}>
                            ₱{item.original_price.toLocaleString()}
                          </Text>
                          <View style={styles.liveDiscountBadge}>
                            <Text style={styles.liveDiscountText}>{item.discount_percentage}% OFF</Text>
                          </View>
                        </>
                      )}
                      <View style={styles.livePvBadge}>
                        <Ionicons name="star" size={8} color={Colors.white} />
                        <Text style={styles.livePvText}>PV {item.pv}</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#4b5563' : '#d1d5db'} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.liveEmpty}>
                <Ionicons name="search-outline" size={28} color={isDarkMode ? '#4b5563' : '#d1d5db'} />
                <Text style={[styles.liveEmptyText, isDarkMode && styles.liveEmptyTextDark]}>No results for "{query}"</Text>
              </View>
            )}
          </View>
        )}

        {/* Recent searches */}
        {!hasQuery && (
          <View style={[styles.section, isDarkMode && styles.sectionDark]}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>Recent Searches</Text>
              {loadingHistory && <ActivityIndicator size="small" color={Colors.sky} />}
            </View>
            <View style={styles.historyList}>
              {recentSearches.slice(0, showAllRecent ? recentSearches.length : 5).map((term, index, arr) => (
                <TouchableOpacity
                  key={`recent-${term.toLowerCase()}`}
                  style={[styles.historyRow, index < arr.length - 1 && styles.historyRowBorder, isDarkMode && index < arr.length - 1 && styles.historyRowBorderDark]}
                  onPress={() => submitSearch(term)}
                  activeOpacity={0.7}
                  disabled={savingQuery}
                >
                  <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
                  <Text style={[styles.historyText, isDarkMode && styles.historyTextDark]} numberOfLines={1} ellipsizeMode="tail">{term}</Text>
                  <Ionicons name="arrow-forward-outline" size={13} color={isDarkMode ? '#4b5563' : '#d1d5db'} />
                </TouchableOpacity>
              ))}
              {!showAllRecent && recentSearches.length > 5 && (
                <TouchableOpacity
                  style={styles.historySeeMoreRow}
                  onPress={() => setShowAllRecent(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.historySeeMoreText, isDarkMode && styles.historySeeMoreTextDark]}>See more</Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.sky} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Recommendations */}
        {!hasQuery && (
          <View style={[styles.recsSection, isDarkMode && styles.recsSectionDark]}>
            <View style={styles.sectionRow}>
              <View style={styles.recsTitleRow}>
                <Ionicons name="sparkles" size={14} color={Colors.sky} />
                <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>Recommended for You</Text>
              </View>
              {loadingRecs && <ActivityIndicator size="small" color={Colors.sky} />}
            </View>

            {loadingRecs && recommendations.length === 0 ? (
              <View style={[styles.recsTable, isDarkMode && styles.recsTableDark]}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={[styles.recsTableCell, isDarkMode && styles.recsTableCellDark]}>
                    <View style={styles.recBoxContainer}>
                      <View style={[styles.recBoxWrap, { backgroundColor: isDarkMode ? '#374151' : '#f1f5f9' }]} />
                    </View>
                    <View style={{ height: 10, width: 40, backgroundColor: isDarkMode ? '#374151' : '#f1f5f9', borderRadius: 4, marginTop: 4 }} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.recsTable, isDarkMode && styles.recsTableDark]}>
                {recommendations.map((item) => (
                  <TouchableOpacity
                    key={`rec-${item.id}`}
                    style={[styles.recsTableCell, isDarkMode && styles.recsTableCellDark]}
                    activeOpacity={0.8}
                    onPress={() => onProductPress?.(item.id)}
                  >
                    <View style={styles.recBoxContainer}>
                      <View style={[styles.recBoxWrap, isDarkMode && styles.recBoxWrapDark]}>
                        <Image source={{ uri: item.image }} style={styles.roomImage} resizeMode="contain" />
                      </View>
                    </View>
                    <Text style={[styles.circleLabel, isDarkMode && styles.circleLabelDark]} numberOfLines={2}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.white,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: Colors.white,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 0,
  },
  cancelBtn: {
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 14,
    color: Colors.sky,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  liveSection: {
    backgroundColor: Colors.white,
  },
  liveLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
    justifyContent: 'center',
  },
  liveLoadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  liveRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  liveThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  liveInfo: {
    flex: 1,
    gap: 4,
  },
  liveName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 18,
  },
  livePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sky,
  },
  liveOriginalPrice: {
    fontSize: 11,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  liveDiscountBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDiscountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ef4444',
  },
  livePvBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.sky,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  livePvText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.white,
  },
  liveEmpty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 36,
  },
  liveEmptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  section: {
    paddingHorizontal: 8,
    paddingVertical: 16,
    backgroundColor: Colors.white,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  historyList: {
    gap: 0,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  historyRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  historySeeMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  historySeeMoreText: {
    fontSize: 13,
    color: Colors.sky,
    fontWeight: '600',
  },
  recsSection: {
    paddingHorizontal: 8,
    paddingVertical: 16,
    backgroundColor: '#f0f9ff',
  },
  recsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recsTable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: Colors.white,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  recsTableCell: {
    width: '33.333%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  recBoxContainer: {
    width: 64,
    height: 64,
  },
  recBoxWrap: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  roomImage: {
    width: '100%',
    height: '100%',
  },
  circleLabel: {
    fontSize: 11,
    textAlign: 'center',
    color: Colors.text,
    fontWeight: '600',
    lineHeight: 14,
    paddingHorizontal: 4,
  },
  // Dark mode styles
  rootDark: {
    backgroundColor: '#0f172a',
  },
  headerDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  searchWrapperDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  searchInputDark: {
    color: '#f8fafc',
  },
  cancelTextDark: {
    color: '#38bdf8',
  },
  liveRowDark: {
    backgroundColor: '#1e293b',
  },
  liveRowBorderDark: {
    borderBottomColor: '#334155',
  },
  liveNameDark: {
    color: '#f8fafc',
  },
  liveLoadingTextDark: {
    color: '#9ca3af',
  },
  liveEmptyTextDark: {
    color: '#9ca3af',
  },
  sectionDark: {
    backgroundColor: '#1e293b',
  },
  sectionTitleDark: {
    color: '#f8fafc',
  },
  historyRowBorderDark: {
    borderBottomColor: '#334155',
  },
  historyTextDark: {
    color: '#f8fafc',
  },
  historySeeMoreTextDark: {
    color: '#38bdf8',
  },
  recsSectionDark: {
    backgroundColor: '#1e293b',
  },
  recsTableDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  recsTableCellDark: {
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  recBoxWrapDark: {
    backgroundColor: '#374151',
  },
  circleLabelDark: {
    color: '#f8fafc',
  },
});
