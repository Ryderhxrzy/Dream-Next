import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const { height: screenHeight } = Dimensions.get('window');

interface BottomSheetItem {
  code: string;
  name: string;
  zipCode?: string;
}

interface BottomSheetSelectorProps {
  visible: boolean;
  title: string;
  items: BottomSheetItem[];
  selectedItem: BottomSheetItem | null;
  loading?: boolean;
  isDarkMode?: boolean;
  onSelect: (item: BottomSheetItem) => void;
  onClose: () => void;
}

export default function BottomSheetSelector({
  visible,
  title,
  items,
  selectedItem,
  loading = false,
  isDarkMode = false,
  onSelect,
  onClose,
}: BottomSheetSelectorProps) {
  const [slideAnim] = useState(new Animated.Value(0));

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
    overlay: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(0, 0, 0, 0.5)',
  };

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Handle back button
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => backHandler.remove();
  }, [visible, onClose]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 5,
    onPanResponderMove: (_, { dy }) => {
      if (dy > 0) {
        slideAnim.setValue(1 - dy / screenHeight);
      }
    },
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 100 || vy > 0.5) {
        // Slide down
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onClose());
      } else {
        // Slide back up
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight, 0],
  });

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  if (!visible) return null;

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.backdrop,
          {
            backgroundColor: colors.overlay,
            opacity: backdropOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheetContainer,
          {
            backgroundColor: colors.containerBg,
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandleContainer}>
          <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
        </View>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.sky} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color={colors.textSec} />
            <Text style={[styles.emptyText, { color: colors.textSec }]}>No items found</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.item,
                  {
                    backgroundColor: selectedItem?.code === item.code ? `${Colors.sky}15` : 'transparent',
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => {
                  onSelect(item);
                  // Auto close after selection
                  Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                  }).start(() => onClose());
                }}
              >
                <View style={styles.itemContent}>
                  <Text
                    style={[
                      styles.itemName,
                      {
                        color: colors.text,
                        fontWeight: selectedItem?.code === item.code ? '700' : '500',
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                  {item.zipCode && (
                    <Text style={[styles.itemZipCode, { color: colors.textSec }]}>
                      {item.zipCode}
                    </Text>
                  )}
                </View>
                {selectedItem?.code === item.code && (
                  <Ionicons name="checkmark-circle" size={24} color={Colors.sky} />
                )}
              </TouchableOpacity>
            )}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: screenHeight * 0.8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 48,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    marginBottom: 4,
  },
  itemZipCode: {
    fontSize: 11,
  },
});
