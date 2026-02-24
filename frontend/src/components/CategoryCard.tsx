import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    image: string;
  };
  onPress: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: category.image }} style={styles.image} />
        <View style={styles.overlay} />
        <Text style={styles.name}>{category.name}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 140,
    height: 100,
    marginRight: 12,
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  name: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
});
