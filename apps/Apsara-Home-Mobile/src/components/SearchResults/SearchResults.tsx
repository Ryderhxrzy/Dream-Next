import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const PLACEHOLDER_RESULTS = [
  { id: '1', category: 'Product', title: 'Premium Home Package', price: '₱ 2,500', icon: 'home-outline' as const },
  { id: '2', category: 'Service', title: 'Interior Design Plan', price: '₱ 1,800', icon: 'color-palette-outline' as const },
  { id: '3', category: 'Product', title: 'Smart Living Bundle', price: '₱ 4,200', icon: 'bulb-outline' as const },
  { id: '4', category: 'Promo', title: 'Summer Sale Package', price: '₱ 999', icon: 'pricetag-outline' as const },
  { id: '5', category: 'Service', title: 'Property Consultation', price: '₱ 500', icon: 'business-outline' as const },
];

interface SearchResultsProps {
  query: string;
}

export default function SearchResults({ query }: SearchResultsProps) {
  const filtered = PLACEHOLDER_RESULTS.filter(item =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.resultLabel}>
        {filtered.length > 0
          ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for `
          : 'No results for '}
        <Text style={styles.queryText}>"{query}"</Text>
      </Text>

      {filtered.length > 0 ? (
        filtered.map(item => (
          <Pressable key={item.id} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={22} color={Colors.sky} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardCategory}>{item.category}</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>
            <Text style={styles.cardPrice}>{item.price}</Text>
          </Pressable>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No matches found</Text>
          <Text style={styles.emptySubtitle}>Try a different keyword</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  resultLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  queryText: {
    color: Colors.sky,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  cardPressed: {
    opacity: 0.75,
    backgroundColor: '#f0f9ff',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.sky,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
