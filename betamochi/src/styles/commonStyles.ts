import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const commonStyles = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  
  screenContainerWithoutPadding: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Headers
  screenHeader: {
    marginVertical: spacing.lg,
  },
  
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  
  screenHeaderSmall: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  
  screenSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  
  // Cards
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  
  cardCompact: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  
  cardHighlight: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  
  // Text styles
  heading1: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  
  heading2: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  
  heading3: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  
  heading4: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Buttons
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  
  buttonPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  buttonSecondary: {
    backgroundColor: colors.secondaryLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  buttonAccent: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  buttonSmall: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Rows and layouts
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rowSpaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  rowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  column: {
    flexDirection: 'column',
  },
  
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  flexOne: {
    flex: 1,
  },
  
  // Dividers
  divider: {
    height: 1,
    backgroundColor: colors.secondaryLight,
    marginVertical: spacing.md,
  },
  
  // Badge/Tag
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignSelf: 'flex-start',
  },
  
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  
  // Progress bar
  progressBar: {
    height: 6,
    backgroundColor: colors.secondaryLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  
  // Spacing utilities
  spacerVertical: {
    height: spacing.lg,
  },
  
  spacerHorizontal: {
    width: spacing.lg,
  },
  
  // Safe area
  safeAreaContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Centered empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

export default commonStyles;
