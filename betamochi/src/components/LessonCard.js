import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { useSfx } from '../context/SfxContext';
import useSound from '../utils/useSound';

const clickSoundAsset = require('../../assets/sounds/click.wav');
import { spacing, borderRadius } from '../styles/commonStyles';
import ProgressRing from './ProgressRing';

const LessonCard = ({ lesson, onPress }) => {
  const { enabled } = useSfx();
  const { play } = useSound(clickSoundAsset);
  const getDifficultyColor = (difficulty) => {
    const colorMap = {
      Easy: colors.difficultyEasy,
      Medium: colors.difficultyMedium,
      Hard: colors.difficultyHard,
    };
    return colorMap[difficulty] || colors.secondary;
  };

  const isContinued = lesson.progress > 0 && !lesson.isCompleted;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        lesson.isCompleted && styles.cardCompleted,
        lesson.isContinued && styles.cardContinued,
      ]}
      onPress={() => {
        if (enabled) play();
        if (onPress) onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Thumbnail and Title section */}
        <View style={styles.headerSection}>
          <View style={styles.thumbnailContainer}>
            <Text style={styles.thumbnail}>{lesson.thumbnail}</Text>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title} numberOfLines={2}>
              {lesson.title}
            </Text>
            <Text style={styles.subject}>{lesson.subject}</Text>
          </View>

          {lesson.isCompleted && (
            <View style={styles.completedBadge}>
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color={colors.success}
              />
            </View>
          )}
        </View>

        {/* Difficulty and Stats */}
        <View style={styles.statsRow}>
          <View style={styles.difficultyBadge}>
            <MaterialCommunityIcons
              name="star"
              size={12}
              color={getDifficultyColor(lesson.difficulty)}
            />
            <Text
              style={[
                styles.difficultyText,
                { color: getDifficultyColor(lesson.difficulty) },
              ]}
            >
              {lesson.difficulty}
            </Text>
          </View>

          <View style={styles.durationBadge}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={12}
              color={colors.textSecondary}
            />
            <Text style={styles.durationText}>{lesson.duration} min</Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${lesson.progress}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{lesson.progress}% complete</Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            lesson.isCompleted && styles.actionButtonCompleted,
          ]}
          onPress={() => {
            if (enabled) play();
          }}
        >
          <MaterialCommunityIcons
            name={
              lesson.isCompleted ? 'eye-check-outline' : 'play-circle-outline'
            }
            size={16}
            color={lesson.isCompleted ? colors.success : colors.white}
          />
          <Text
            style={[
              styles.actionButtonText,
              lesson.isCompleted && styles.actionButtonTextCompleted,
            ]}
          >
            {lesson.isCompleted ? 'Review' : 'Learn'}
          </Text>
        </TouchableOpacity>

        {/* Lock indicator for new lessons */}
        {lesson.progress === 0 && !lesson.isCompleted && (
          <View style={styles.lockOverlay}>
            <MaterialCommunityIcons
              name="lock"
              size={28}
              color={colors.textSecondary}
            />
          </View>
        )}

        {/* Continued indicator */}
        {isContinued && (
          <View style={styles.continuedBadge}>
            <MaterialCommunityIcons
              name="fire"
              size={14}
              color={colors.accent}
            />
            <Text style={styles.continuedText}>Continue</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 200,
  },
  cardCompleted: {
    backgroundColor: colors.primaryLight,
    opacity: 0.85,
  },
  cardContinued: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cardContent: {
    flex: 1,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  thumbnailContainer: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  thumbnail: {
    fontSize: 28,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subject: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  completedBadge: {
    marginLeft: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundLight,
    marginRight: spacing.sm,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundLight,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  progressSection: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  actionButtonCompleted: {
    backgroundColor: colors.success || colors.primaryLight,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  actionButtonTextCompleted: {
    color: colors.success,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: borderRadius.lg,
    opacity: 0.9,
  },
  continuedBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  continuedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
    marginLeft: spacing.xs,
  },
});

export default LessonCard;
