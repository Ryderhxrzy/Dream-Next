import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  SafeAreaView,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

interface SelectedItem {
  wishlist_id: number;
  product_id: number;
  product: {
    id: number;
    name: string;
    priceMember: number;
    priceSrp?: number;
    image?: string;
  };
}

interface SelectedItemsModalProps {
  visible: boolean;
  selectedItems: SelectedItem[];
  selectedCount: number;
  totalPrice: number;
  onClose: () => void;
  onAddToCart: () => void;
  loading?: boolean;
}

export default function SelectedItemsModal({
  visible,
  selectedItems,
  selectedCount,
  totalPrice,
  onClose,
  onAddToCart,
  loading = false,
}: SelectedItemsModalProps) {
  const slideAnim = React.useRef(new Animated.Value(300)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Ready to Checkout</Text>
              <Text style={styles.subtitle}>{selectedCount} items selected</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={26} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Summary Card */}
          <LinearGradient
            colors={[Colors.sky, '#0ea5e9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={styles.summaryContent}>
              <View>
                <Text style={styles.summaryLabel}>Total Amount</Text>
                <Text style={styles.summaryPrice}>
                  ₱{totalPrice.toLocaleString()}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.savingsInfo}>
                <Ionicons name="gift" size={16} color={Colors.white} />
                <Text style={styles.savingsText}>Ready to save</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Items List */}
          <ScrollView
            style={styles.itemsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.itemsListContent}
          >
            {selectedItems.map((item) => (
              <View key={item.wishlist_id} style={styles.itemCard}>
                {/* Product Image */}
                {item.product.image && (
                  <Image
                    source={{ uri: item.product.image }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                )}

                {/* Product Info */}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.product.name}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.itemPrice}>
                      ₱{item.product.priceMember.toLocaleString()}
                    </Text>
                    {item.product.priceSrp && item.product.priceSrp > item.product.priceMember && (
                      <Text style={styles.itemOriginalPrice}>
                        ₱{item.product.priceSrp.toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Checkmark */}
                <View style={styles.itemCheck}>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.sky} />
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.addButton, loading && { opacity: 0.6 }]}
            onPress={onAddToCart}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <>
                <Ionicons name="hourglass" size={18} color={Colors.white} />
                <Text style={styles.addButtonText}>Adding...</Text>
              </>
            ) : (
              <>
                <Ionicons name="cart" size={18} color={Colors.white} />
                <Text style={styles.addButtonText}>Add All to Cart</Text>
              </>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 350,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  summaryCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  savingsInfo: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  savingsText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: '600',
  },
  itemsList: {
    flex: 1,
  },
  itemsListContent: {
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.sky,
  },
  itemOriginalPrice: {
    fontSize: 11,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  itemCheck: {
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: Colors.sky,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
    shadowColor: Colors.sky,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
