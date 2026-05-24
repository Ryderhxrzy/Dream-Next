import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface HeaderFilterProps {
  onFilterChange?: (filterType: string, value: any) => void;
  showRoomFilter?: boolean;
  selectedRoom?: string;
  showCategoryFilter?: boolean;
  selectedCategory?: string;
  categories?: any[];
  showBrandFilter?: boolean;
  selectedBrand?: string;
  brands?: any[];
  isDarkMode?: boolean;
}

const SORT_OPTIONS = ['Relevant', 'A-Z', 'Z-A', 'Price: Low', 'Price: High', 'Newest'];
const PRICE_OPTIONS = ['All', 'Under ₱5k', '₱5k-₱20k', '₱20k-₱50k', 'Over ₱50k'];
const ROOM_OPTIONS = [
  { id: 0, name: 'All Room Types' },
  { id: 1, name: 'Bedroom' },
  { id: 2, name: 'Kitchen' },
  { id: 3, name: 'Living Room' },
  { id: 4, name: 'Outdoor' },
  { id: 5, name: 'Study & Office' },
  { id: 6, name: 'Dining Room' },
  { id: 7, name: 'Laundry Room' },
  { id: 8, name: 'Bathroom' },
];

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.75;

export default function HeaderFilter({
  onFilterChange,
  showRoomFilter = false,
  selectedRoom = 'Bedroom',
  showCategoryFilter = false,
  selectedCategory = 'All Categories',
  categories = [],
  showBrandFilter = false,
  selectedBrand = 'All Brands',
  brands = [],
  isDarkMode = false,
}: HeaderFilterProps) {
  const [activeSort, setActiveSort] = useState('Relevant');
  const [activePrice, setActivePrice] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [activeRoom, setActiveRoom] = useState(selectedRoom);
  const [activeCategory, setActiveCategory] = useState(selectedCategory);
  const [activeBrand, setActiveBrand] = useState(selectedBrand);
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);
  const [brandSearch, setBrandSearch] = useState('');

  const colors = {
    bg: isDarkMode ? '#1e293b' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#334155' : '#e5e7eb',
    buttonBg: isDarkMode ? '#334155' : '#f3f4f6',
    buttonBgActive: isDarkMode ? '#0f4c7f' : '#eff6ff',
    buttonBorderActive: isDarkMode ? '#0284c7' : Colors.sky,
    dropdownBg: isDarkMode ? '#1e293b' : Colors.white,
    dropdownBorder: isDarkMode ? '#334155' : '#e5e7eb',
    dropdownItem: isDarkMode ? '#293548' : '#f3f4f6',
    modalBg: isDarkMode ? '#1e293b' : Colors.white,
    handle: isDarkMode ? '#475569' : '#cbd5e1',
  };

  const modalTranslateY = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          modalTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100) {
          Animated.timing(modalTranslateY, {
            toValue: MODAL_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => setExpandedFilter(null));
        } else {
          Animated.spring(modalTranslateY, {
            toValue: 0,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (expandedFilter === 'room' || expandedFilter === 'category' || expandedFilter === 'brand' || expandedFilter === 'sort' || expandedFilter === 'price') {
      // Animate modal into view
      Animated.spring(modalTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset modal position when closing
      modalTranslateY.setValue(MODAL_HEIGHT);
    }
  }, [expandedFilter, modalTranslateY]);

  useEffect(() => {
    setActiveRoom(selectedRoom);
  }, [selectedRoom]);

  useEffect(() => {
    setActiveCategory(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    setActiveBrand(selectedBrand);
  }, [selectedBrand]);

  const handleSort = (sort: string) => {
    setActiveSort(sort);
    setExpandedFilter(null);
    onFilterChange?.('sort', sort);
  };

  const handlePrice = (price: string) => {
    setActivePrice(price);
    setMinPrice('');
    setMaxPrice('');
    setExpandedFilter(null);
    onFilterChange?.('price', price);
  };

  const handleCustomPriceRange = () => {
    if (minPrice || maxPrice) {
      const rangeLabel = `₱${minPrice || '0'}-₱${maxPrice || '∞'}`;
      setActivePrice(rangeLabel);
      setExpandedFilter(null);
      onFilterChange?.('price', { min: minPrice ? parseInt(minPrice) : 0, max: maxPrice ? parseInt(maxPrice) : null });
    }
  };

  const handleRoom = (room: string) => {
    setActiveRoom(room);
    setExpandedFilter(null);
    onFilterChange?.('room', room);
  };

  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return brands;
    return brands.filter(brand =>
      brand.name.toLowerCase().includes(brandSearch.toLowerCase())
    );
  }, [brands, brandSearch]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Room Type - Always visible when in ShopByRoomScreen */}
        {showRoomFilter && (
          <View style={styles.filterItem}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: colors.buttonBg, borderColor: colors.border },
                activeRoom !== 'All Room Types' && { backgroundColor: colors.buttonBgActive, borderColor: colors.buttonBorderActive },
              ]}
              onPress={() => setExpandedFilter(expandedFilter === 'room' ? null : 'room')}
            >
              <Ionicons name="home-outline" size={14} color={colors.text} />
              <Text style={[styles.filterText, { color: colors.text }]} numberOfLines={1}>{activeRoom}</Text>
              <Ionicons
                name={expandedFilter === 'room' ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={colors.text}
              />
            </TouchableOpacity>

            <Modal
              visible={expandedFilter === 'room'}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setExpandedFilter(null)}
            >
              <View style={styles.modalContainer}>
                <Pressable
                  style={styles.modalOverlay}
                  onPress={() => setExpandedFilter(null)}
                />
                <Animated.View
                  style={[
                    styles.roomFilterModal,
                    { backgroundColor: colors.modalBg },
                    {
                      transform: [{ translateY: modalTranslateY }],
                    },
                  ]}
                  {...panResponder.panHandlers}
                >
                  <View style={styles.roomFilterHandleContainer}>
                    <View style={[styles.roomFilterHandle, { backgroundColor: colors.handle }]} />
                  </View>
                  <View style={[styles.roomFilterHeader, { borderBottomColor: colors.dropdownItem }]}>
                    <Text style={[styles.roomFilterTitle, { color: colors.text }]}>Room Type</Text>
                    <TouchableOpacity onPress={() => setExpandedFilter(null)}>
                      <Ionicons name="close-circle" size={28} color={colors.textSec} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    style={styles.roomFilterList}
                    showsVerticalScrollIndicator={false}
                  >
                    {ROOM_OPTIONS.map((room, index) => (
                      <TouchableOpacity
                        key={room.id}
                        style={[
                          styles.roomFilterItem,
                          { borderBottomColor: colors.dropdownItem },
                          index === ROOM_OPTIONS.length - 1 && styles.roomFilterItemLast,
                          activeRoom === room.name && room.name !== 'All Room Types' && { backgroundColor: colors.buttonBgActive },
                        ]}
                        onPress={() => {
                          handleRoom(room.name);
                          setExpandedFilter(null);
                        }}
                      >
                        <View style={styles.roomFilterItemContent}>
                          <Text
                            style={[
                              styles.roomFilterItemText,
                              { color: colors.text },
                              activeRoom === room.name && room.name !== 'All Room Types' && { fontWeight: '700', color: Colors.sky },
                            ]}
                          >
                            {room.name}
                          </Text>
                        </View>
                        {activeRoom === room.name && room.name !== 'All Room Types' && (
                          <View style={styles.roomFilterCheckmark}>
                            <Ionicons name="checkmark" size={20} color={Colors.sky} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </Animated.View>
              </View>
            </Modal>
          </View>
        )}

        {/* Category Filter */}
        {showCategoryFilter && (
          <View style={styles.filterItem}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: colors.buttonBg, borderColor: colors.border },
                activeCategory !== 'All Categories' && { backgroundColor: colors.buttonBgActive, borderColor: colors.buttonBorderActive },
              ]}
              onPress={() => setExpandedFilter(expandedFilter === 'category' ? null : 'category')}
            >
              <Ionicons name="list-outline" size={14} color={colors.text} />
              <Text style={[styles.filterText, { color: colors.text }]} numberOfLines={1}>{activeCategory}</Text>
              <Ionicons
                name={expandedFilter === 'category' ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={colors.text}
              />
            </TouchableOpacity>

            <Modal
              visible={expandedFilter === 'category'}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setExpandedFilter(null)}
            >
              <View style={styles.modalContainer}>
                <Pressable
                  style={styles.modalOverlay}
                  onPress={() => setExpandedFilter(null)}
                />
                <Animated.View
                  style={[
                    styles.roomFilterModal,
                    { backgroundColor: colors.modalBg },
                    {
                      transform: [{ translateY: modalTranslateY }],
                    },
                  ]}
                  {...panResponder.panHandlers}
                >
                  <View style={styles.roomFilterHandleContainer}>
                    <View style={[styles.roomFilterHandle, { backgroundColor: colors.handle }]} />
                  </View>
                  <View style={[styles.roomFilterHeader, { borderBottomColor: colors.dropdownItem }]}>
                    <Text style={[styles.roomFilterTitle, { color: colors.text }]}>Categories</Text>
                    <TouchableOpacity onPress={() => setExpandedFilter(null)}>
                      <Ionicons name="close-circle" size={28} color={colors.textSec} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    style={styles.roomFilterList}
                    showsVerticalScrollIndicator={false}
                  >
                    <TouchableOpacity
                      style={[
                        styles.roomFilterItem,
                        { borderBottomColor: colors.dropdownItem },
                      ]}
                      onPress={() => {
                        setActiveCategory('All Categories');
                        setExpandedFilter(null);
                        onFilterChange?.('category', null);
                      }}
                    >
                      <View style={styles.roomFilterItemContent}>
                        <Text
                          style={[
                            styles.roomFilterItemText,
                            { color: colors.text },
                          ]}
                        >
                          All Categories
                        </Text>
                      </View>
                      {activeCategory === 'All Categories' && (
                        <View style={styles.roomFilterCheckmark}>
                          <Ionicons name="checkmark" size={20} color={Colors.sky} />
                        </View>
                      )}
                    </TouchableOpacity>
                    {categories.map((category, index) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.roomFilterItem,
                          { borderBottomColor: colors.dropdownItem },
                          index === categories.length - 1 && styles.roomFilterItemLast,
                          activeCategory === category.name && { backgroundColor: colors.buttonBgActive },
                        ]}
                        onPress={() => {
                          setActiveCategory(category.name);
                          setExpandedFilter(null);
                          onFilterChange?.('category', category.id);
                        }}
                      >
                        <View style={styles.roomFilterItemContent}>
                          <Text
                            style={[
                              styles.roomFilterItemText,
                              { color: colors.text },
                              activeCategory === category.name && { fontWeight: '700', color: Colors.sky },
                            ]}
                          >
                            {category.name}
                          </Text>
                        </View>
                        {activeCategory === category.name && (
                          <View style={styles.roomFilterCheckmark}>
                            <Ionicons name="checkmark" size={20} color={Colors.sky} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </Animated.View>
              </View>
            </Modal>
          </View>
        )}

        {/* Brand Filter */}
        {showBrandFilter && (
          <View style={styles.filterItem}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: colors.buttonBg, borderColor: colors.border },
                activeBrand !== 'All Brands' && { backgroundColor: colors.buttonBgActive, borderColor: colors.buttonBorderActive },
              ]}
              onPress={() => {
                setBrandSearch('');
                setExpandedFilter(expandedFilter === 'brand' ? null : 'brand');
              }}
            >
              <Ionicons name="bag-outline" size={14} color={colors.text} />
              <Text style={[styles.filterText, { color: colors.text }]} numberOfLines={1}>
                {brands.length === 0 ? 'Loading...' : activeBrand}
              </Text>
              <Ionicons
                name={expandedFilter === 'brand' ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={colors.text}
              />
            </TouchableOpacity>

            <Modal
              visible={expandedFilter === 'brand'}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setExpandedFilter(null)}
            >
              <View style={styles.modalContainer}>
                <Pressable
                  style={styles.modalOverlay}
                  onPress={() => setExpandedFilter(null)}
                />
                <Animated.View
                  style={[
                    styles.roomFilterModal,
                    { backgroundColor: colors.modalBg },
                    {
                      transform: [{ translateY: modalTranslateY }],
                    },
                  ]}
                  {...panResponder.panHandlers}
                >
                  <View style={styles.roomFilterHandleContainer}>
                    <View style={[styles.roomFilterHandle, { backgroundColor: colors.handle }]} />
                  </View>
                  <View style={[styles.roomFilterHeader, { borderBottomColor: colors.dropdownItem }]}>
                    <Text style={[styles.roomFilterTitle, { color: colors.text }]}>Brands</Text>
                    <TouchableOpacity onPress={() => setExpandedFilter(null)}>
                      <Ionicons name="close-circle" size={28} color={colors.textSec} />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.brandSearchContainer, { backgroundColor: colors.dropdownItem, borderBottomColor: colors.dropdownItem }]}>
                    <Ionicons name="search" size={16} color={colors.textSec} style={styles.brandSearchIcon} />
                    <TextInput
                      style={[styles.brandSearchInput, { color: colors.text }]}
                      placeholder="Search brands..."
                      placeholderTextColor={colors.textSec}
                      value={brandSearch}
                      onChangeText={setBrandSearch}
                    />
                    {brandSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setBrandSearch('')} style={styles.brandSearchClear}>
                        <Ionicons name="close-circle" size={16} color={colors.textSec} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView
                    style={styles.roomFilterList}
                    showsVerticalScrollIndicator={false}
                  >
                    <TouchableOpacity
                      style={[
                        styles.roomFilterItem,
                        { borderBottomColor: colors.dropdownItem },
                      ]}
                      onPress={() => {
                        setActiveBrand('All Brands');
                        setExpandedFilter(null);
                        onFilterChange?.('brand', null);
                      }}
                    >
                      <View style={styles.roomFilterItemContent}>
                        <Text
                          style={[
                            styles.roomFilterItemText,
                            { color: colors.text },
                          ]}
                        >
                          All Brands
                        </Text>
                      </View>
                      {activeBrand === 'All Brands' && (
                        <View style={styles.roomFilterCheckmark}>
                          <Ionicons name="checkmark" size={20} color={Colors.sky} />
                        </View>
                      )}
                    </TouchableOpacity>
                    {filteredBrands.length > 0 ? filteredBrands.map((brand, index) => (
                      <TouchableOpacity
                        key={brand.id}
                        style={[
                          styles.roomFilterItem,
                          { borderBottomColor: colors.dropdownItem },
                          index === filteredBrands.length - 1 && styles.roomFilterItemLast,
                          activeBrand === brand.name && { backgroundColor: colors.buttonBgActive },
                        ]}
                        onPress={() => {
                          setActiveBrand(brand.name);
                          setBrandSearch('');
                          setExpandedFilter(null);
                          onFilterChange?.('brand', brand.id);
                        }}
                      >
                        <View style={styles.roomFilterItemContent}>
                          <Text
                            style={[
                              styles.roomFilterItemText,
                              { color: colors.text },
                              activeBrand === brand.name && { fontWeight: '700', color: Colors.sky },
                            ]}
                          >
                            {brand.name}
                          </Text>
                        </View>
                        {activeBrand === brand.name && (
                          <View style={styles.roomFilterCheckmark}>
                            <Ionicons name="checkmark" size={20} color={Colors.sky} />
                          </View>
                        )}
                      </TouchableOpacity>
                    )) : (
                      <View style={styles.noResultsContainer}>
                        <Text style={[styles.noResultsText, { color: colors.textSec }]}>No brands found</Text>
                      </View>
                    )}
                  </ScrollView>
                </Animated.View>
              </View>
            </Modal>
          </View>
        )}

        {/* Sort */}
        <View style={styles.filterItem}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.buttonBg, borderColor: colors.border },
              expandedFilter === 'sort' && { backgroundColor: colors.buttonBgActive, borderColor: colors.buttonBorderActive },
            ]}
            onPress={() => setExpandedFilter(expandedFilter === 'sort' ? null : 'sort')}
          >
            <Ionicons name="swap-vertical" size={14} color={colors.text} />
            <Text style={[styles.filterText, { color: colors.text }]}>{activeSort}</Text>
            <Ionicons
              name={expandedFilter === 'sort' ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.text}
            />
          </TouchableOpacity>

          <Modal
            visible={expandedFilter === 'sort'}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setExpandedFilter(null)}
          >
            <View style={styles.modalContainer}>
              <Pressable
                style={styles.modalOverlay}
                onPress={() => setExpandedFilter(null)}
              />
              <Animated.View
                style={[
                  styles.roomFilterModal,
                  { backgroundColor: colors.modalBg },
                  {
                    transform: [{ translateY: modalTranslateY }],
                  },
                ]}
                {...panResponder.panHandlers}
              >
                <View style={styles.roomFilterHandleContainer}>
                  <View style={[styles.roomFilterHandle, { backgroundColor: colors.handle }]} />
                </View>
                <View style={[styles.roomFilterHeader, { borderBottomColor: colors.dropdownItem }]}>
                  <Text style={[styles.roomFilterTitle, { color: colors.text }]}>Sort By</Text>
                  <TouchableOpacity onPress={() => setExpandedFilter(null)}>
                    <Ionicons name="close-circle" size={28} color={colors.textSec} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.roomFilterList}
                  showsVerticalScrollIndicator={false}
                >
                  {SORT_OPTIONS.map((sort, index) => (
                    <TouchableOpacity
                      key={sort}
                      style={[
                        styles.roomFilterItem,
                        { borderBottomColor: colors.dropdownItem },
                        index === SORT_OPTIONS.length - 1 && styles.roomFilterItemLast,
                        activeSort === sort && { backgroundColor: colors.buttonBgActive },
                      ]}
                      onPress={() => {
                        handleSort(sort);
                        setExpandedFilter(null);
                      }}
                    >
                      <View style={styles.roomFilterItemContent}>
                        <Text
                          style={[
                            styles.roomFilterItemText,
                            { color: colors.text },
                            activeSort === sort && { fontWeight: '700', color: Colors.sky },
                          ]}
                        >
                          {sort}
                        </Text>
                      </View>
                      {activeSort === sort && (
                        <View style={styles.roomFilterCheckmark}>
                          <Ionicons name="checkmark" size={20} color={Colors.sky} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            </View>
          </Modal>
        </View>

        {/* Price */}
        <View style={styles.filterItem}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.buttonBg, borderColor: colors.border },
              expandedFilter === 'price' && { backgroundColor: colors.buttonBgActive, borderColor: colors.buttonBorderActive },
            ]}
            onPress={() => setExpandedFilter(expandedFilter === 'price' ? null : 'price')}
          >
            <Ionicons name="pricetag-outline" size={14} color={colors.text} />
            <Text style={[styles.filterText, { color: colors.text }]}>{activePrice}</Text>
            <Ionicons
              name={expandedFilter === 'price' ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.text}
            />
          </TouchableOpacity>

          <Modal
            visible={expandedFilter === 'price'}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setExpandedFilter(null)}
          >
            <View style={styles.modalContainer}>
              <Pressable
                style={styles.modalOverlay}
                onPress={() => setExpandedFilter(null)}
              />
              <Animated.View
                style={[
                  styles.roomFilterModal,
                  { backgroundColor: colors.modalBg },
                  {
                    transform: [{ translateY: modalTranslateY }],
                  },
                ]}
                {...panResponder.panHandlers}
              >
                <View style={styles.roomFilterHandleContainer}>
                  <View style={[styles.roomFilterHandle, { backgroundColor: colors.handle }]} />
                </View>
                <View style={[styles.roomFilterHeader, { borderBottomColor: colors.dropdownItem }]}>
                  <Text style={[styles.roomFilterTitle, { color: colors.text }]}>Price Range</Text>
                  <TouchableOpacity onPress={() => setExpandedFilter(null)}>
                    <Ionicons name="close-circle" size={28} color={colors.textSec} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.roomFilterList}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Custom Price Range Input */}
                  <View style={[styles.customPriceContainer, { backgroundColor: colors.dropdownItem, borderBottomColor: colors.dropdownItem }]}>
                    <Text style={[styles.customPriceLabel, { color: colors.text }]}>Custom Range</Text>
                    <View style={styles.priceInputRow}>
                      <TextInput
                        style={[
                          styles.priceInput,
                          {
                            backgroundColor: colors.bg,
                            borderColor: colors.border,
                            color: colors.text,
                          }
                        ]}
                        placeholder="Min"
                        placeholderTextColor={colors.textSec}
                        value={minPrice}
                        onChangeText={setMinPrice}
                        keyboardType="numeric"
                      />
                      <Text style={[styles.priceInputDash, { color: colors.text }]}>-</Text>
                      <TextInput
                        style={[
                          styles.priceInput,
                          {
                            backgroundColor: colors.bg,
                            borderColor: colors.border,
                            color: colors.text,
                          }
                        ]}
                        placeholder="Max"
                        placeholderTextColor={colors.textSec}
                        value={maxPrice}
                        onChangeText={setMaxPrice}
                        keyboardType="numeric"
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.applyPriceBtn, { backgroundColor: Colors.sky }]}
                      onPress={handleCustomPriceRange}
                    >
                      <Text style={styles.applyPriceBtnText}>Apply</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Preset Price Options */}
                  <View style={[styles.presetPriceHeader, { borderTopColor: colors.dropdownItem, borderBottomColor: colors.dropdownItem }]}>
                    <Text style={[styles.presetPriceLabel, { color: colors.textSec }]}>Or select preset</Text>
                  </View>

                  {PRICE_OPTIONS.map((price, index) => (
                    <TouchableOpacity
                      key={price}
                      style={[
                        styles.roomFilterItem,
                        { borderBottomColor: colors.dropdownItem },
                        index === PRICE_OPTIONS.length - 1 && styles.roomFilterItemLast,
                        activePrice === price && { backgroundColor: colors.buttonBgActive },
                      ]}
                      onPress={() => {
                        handlePrice(price);
                        setExpandedFilter(null);
                      }}
                    >
                      <View style={styles.roomFilterItemContent}>
                        <Text
                          style={[
                            styles.roomFilterItemText,
                            { color: colors.text },
                            activePrice === price && { fontWeight: '700', color: Colors.sky },
                          ]}
                        >
                          {price}
                        </Text>
                      </View>
                      {activePrice === price && (
                        <View style={styles.roomFilterCheckmark}>
                          <Ionicons name="checkmark" size={20} color={Colors.sky} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            </View>
          </Modal>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 8,
    gap: 8,
    alignItems: 'center',
  },
  filterItem: {
    position: 'relative',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: Colors.sky,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    maxWidth: 120,
  },
  dropdown: {
    position: 'absolute',
    top: 42,
    left: 0,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 140,
    maxHeight: 320,
    zIndex: 1000,
  },
  dropdownWide: {
    minWidth: 180,
    maxHeight: 400,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  dropdownTextActive: {
    color: Colors.sky,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalOverlay: {
    flex: 1,
  },
  roomFilterModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: MODAL_HEIGHT,
    width: '100%',
    paddingBottom: 20,
  },
  roomFilterHandleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  roomFilterHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
  },
  roomFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  roomFilterTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  roomFilterList: {
    paddingHorizontal: 0,
    flex: 1,
  },
  roomFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  roomFilterItemLast: {
    borderBottomWidth: 0,
  },
  roomFilterItemActive: {
    backgroundColor: '#eff6ff',
  },
  roomFilterItemContent: {
    flex: 1,
  },
  roomFilterItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  roomFilterItemTextActive: {
    fontWeight: '700',
    color: Colors.sky,
  },
  roomFilterCheckmark: {
    marginLeft: 12,
  },
  brandSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
  },
  brandSearchIcon: {
    marginRight: 8,
  },
  brandSearchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 6,
  },
  brandSearchClear: {
    padding: 4,
  },
  noResultsContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  customPriceContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  customPriceLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    color: Colors.text,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
  },
  priceInputDash: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyPriceBtn: {
    backgroundColor: Colors.sky,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyPriceBtnText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  presetPriceHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#f3f4f6',
    borderBottomColor: '#f3f4f6',
  },
  presetPriceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
