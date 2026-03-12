import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../styles/colors';
import { spacing, borderRadius } from '../styles/commonStyles';

const BadgeItem = ({ icon, label, rarity = 'common', onPress }) => {
  const getRarityColor = (rarity) => {
    const rarityColors = {
      common: colors.secondary,
      uncommon: colors.success || '#10b981',
      rare: colors.accent,
      legendary: '#fbbf24',
    };
    return rarityColors[rarity] || colors.secondary;
  };

  const getRarityLabel = (rarity) => {
    return rarity.charAt(0).toUpperCase() + rarity.slice(1);
  };

  const rarityColor = getRarityColor(rarity);

  return (
    <TouchableOpacity
      style={[styles.container, { borderColor: rarityColor, borderWidth: 2 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: rarityColor }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.rarity, { color: rarityColor }]}>
          {getRarityLabel(rarity)}
        </Text>
      </View>

      <View style={[styles.rarityIndicator, { backgroundColor: rarityColor }]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  rarity: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  rarityIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
});

export default BadgeItem;
