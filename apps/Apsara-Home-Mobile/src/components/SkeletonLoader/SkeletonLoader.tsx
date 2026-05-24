import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  style?: any;
  borderRadius?: number;
}

export function Skeleton({ width = '100%', height = 20, style, borderRadius = 4 }: SkeletonProps) {
  return (
    <LinearGradient
      colors={['#e5e7eb', '#f3f4f6', '#e5e7eb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        {
          width,
          height,
          borderRadius,
        },
        styles.skeleton,
        style,
      ]}
    />
  );
}

export function BannerSkeleton() {
  return (
    <View style={styles.bannerSkeleton}>
      <Skeleton height={190} borderRadius={24} />
    </View>
  );
}

export function SectionHeaderSkeleton() {
  return (
    <View style={styles.sectionHeaderSkeleton}>
      <Skeleton width={120} height={20} />
      <View style={styles.sectionHeaderRight}>
        <Skeleton width={40} height={12} />
        <Skeleton width={16} height={16} borderRadius={8} />
      </View>
    </View>
  );
}

export function CircleSkeleton() {
  return (
    <View style={styles.circleSkeleton}>
      <Skeleton width={72} height={72} borderRadius={36} />
      <Skeleton width={60} height={12} style={{ marginTop: 8 }} />
    </View>
  );
}

export function RoomGridSkeleton() {
  return (
    <View style={styles.roomGridSkeleton}>
      {[1, 2, 3, 4, 5, 6, 7, 8].map(item => (
        <View key={item} style={styles.roomItemSkeleton}>
          <Skeleton width={60} height={60} borderRadius={30} />
          <Skeleton width={50} height={10} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

export function CategoryRowSkeleton() {
  return (
    <View style={styles.categoryRowSkeleton}>
      {[1, 2, 3, 4, 5].map(item => (
        <CircleSkeleton key={item} />
      ))}
    </View>
  );
}

export function BrandCardSkeleton() {
  return (
    <View style={styles.brandCardSkeleton}>
      <Skeleton width={170} height={110} borderRadius={18} />
    </View>
  );
}

export function FeaturedProductsSkeleton() {
  return (
    <View style={styles.masonryGridSkeleton}>
      <View style={styles.masonryColumnSkeleton}>
        <Skeleton width="100%" height={220} borderRadius={8} />
        <Skeleton width="100%" height={260} borderRadius={8} style={{ marginTop: 8 }} />
      </View>
      <View style={styles.masonryColumnSkeleton}>
        <Skeleton width="100%" height={260} borderRadius={8} />
        <Skeleton width="100%" height={220} borderRadius={8} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function HomeScreenSkeleton() {
  return (
    <View style={styles.container}>
      <BannerSkeleton />
      
      <View style={styles.section}>
        <SectionHeaderSkeleton />
        <RoomGridSkeleton />
      </View>

      <View style={styles.section}>
        <SectionHeaderSkeleton />
        <CategoryRowSkeleton />
      </View>

      <View style={styles.section}>
        <SectionHeaderSkeleton />
        <View style={styles.brandRowSkeleton}>
          {[1, 2, 3].map(item => (
            <BrandCardSkeleton key={item} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeaderSkeleton />
        <FeaturedProductsSkeleton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbff',
    padding: 16,
    paddingBottom: 28,
    gap: 16,
  },
  skeleton: {
    overflow: 'hidden',
  },
  bannerSkeleton: {
    marginBottom: 10,
  },
  section: {
    gap: 10,
  },
  sectionHeaderSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleSkeleton: {
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  roomGridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  roomItemSkeleton: {
    width: '25%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  masonryGridSkeleton: {
    flexDirection: 'row',
    gap: 8,
  },
  masonryColumnSkeleton: {
    flex: 1,
    gap: 8,
  },
  categoryRowSkeleton: {
    flexDirection: 'row',
    paddingRight: 4,
  },
  brandCardSkeleton: {
    marginRight: 12,
  },
  brandRowSkeleton: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 4,
  },
});
