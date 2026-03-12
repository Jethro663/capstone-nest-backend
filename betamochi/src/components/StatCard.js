import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';
import { spacing, borderRadius } from '../styles/commonStyles';

const StatCard = ({ icon, label, value, subvalue, color = colors.primary }) => {
  return (
    <View style={[styles.card, { borderTopColor: color, borderTopWidth: 4 }]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>{value}</Text>
        {subvalue && <Text style={styles.subvalue}>{subvalue}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subvalue: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default StatCard;
