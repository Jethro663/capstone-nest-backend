import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { useSfx } from '../context/SfxContext';
import useSound from '../utils/useSound';

const clickSoundAsset = require('../../assets/sounds/click.wav');
import { spacing, borderRadius } from '../styles/commonStyles';

const AssessmentCard = ({ assessment, onPress }) => {
  const { enabled } = useSfx();
  const { play } = useSound(clickSoundAsset);
  const completionPercentage = Math.round(
    (assessment.completedQuestions / assessment.totalQuestions) * 100
  );

  const getDifficultyColor = (difficulty) => {
    const colorMap = {
      Easy: colors.difficultyEasy,
      Medium: colors.difficultyMedium,
      Hard: colors.difficultyHard,
    };
    return colorMap[difficulty] || colors.secondary;
  };

  const getDifficultyIcon = (difficulty) => {
    const iconMap = {
      Easy: 'star-outline',
      Medium: 'star-half-full',
      Hard: 'star',
    };
    return iconMap[difficulty] || 'help-circle';
  };

  const isOverdue =
    new Date(assessment.dueDate) < new Date() && !assessment.isCompleted;

  return (
    <TouchableOpacity
      style={[styles.card, isOverdue && styles.cardOverdue]}
      onPress={() => {
        if (enabled) play();
        if (onPress) onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{assessment.title}</Text>
          <Text style={styles.subject}>{assessment.subject}</Text>
        </View>
        {assessment.isCompleted && (
          <View style={styles.completedBadge}>
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color={colors.success}
            />
          </View>
        )}
      </View>

      <View style={styles.difficultyContainer}>
        <View style={styles.difficultyBadge}>
          <MaterialCommunityIcons
            name={getDifficultyIcon(assessment.difficulty)}
            size={14}
            color={getDifficultyColor(assessment.difficulty)}
          />
          <Text
            style={[
              styles.difficultyText,
              { color: getDifficultyColor(assessment.difficulty) },
            ]}
          >
            {assessment.difficulty}
          </Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressInfo}>
          <View style={styles.progressLabel}>
            <Text style={styles.progressLabelText}>Progress</Text>
            <Text style={styles.progressPercentage}>{completionPercentage}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${completionPercentage}%` },
              ]}
            />
          </View>
        </View>
        <Text style={styles.progressDetails}>
          {assessment.completedQuestions}/{assessment.totalQuestions}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={styles.footerText}>{assessment.timeLimit} min</Text>
        </View>

        <View style={styles.footerItem}>
          <MaterialCommunityIcons
            name="calendar"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={styles.footerText}>
            Due: {new Date(assessment.dueDate).toLocaleDateString()}
          </Text>
        </View>

        {assessment.isCompleted && (
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{assessment.score}%</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.startButton,
          assessment.isCompleted && styles.startButtonCompleted,
        ]}
        onPress={() => {
          if (enabled) play();
        }}
      >
        <MaterialCommunityIcons
          name={
            assessment.isCompleted ? 'eye-check-outline' : 'play-circle-outline'
          }
          size={18}
          color={assessment.isCompleted ? colors.success : colors.white}
        />
        <Text
          style={[
            styles.startButtonText,
            assessment.isCompleted && styles.startButtonTextCompleted,
          ]}
        >
          {assessment.isCompleted ? 'View Results' : 'Start'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
  cardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subject: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  completedBadge: {
    marginLeft: spacing.md,
  },
  difficultyContainer: {
    marginBottom: spacing.md,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundLight,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  progressSection: {
    marginBottom: spacing.md,
  },
  progressInfo: {
    marginBottom: spacing.sm,
  },
  progressLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.secondaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondaryLight,
    marginBottom: spacing.md,
  },
  footerItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  scoreContainer: {
    backgroundColor: colors.successLight || colors.primaryLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success || colors.primary,
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonCompleted: {
    backgroundColor: colors.success || colors.primaryLight,
  },
  startButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  startButtonTextCompleted: {
    color: colors.success,
  },
});

export default AssessmentCard;
