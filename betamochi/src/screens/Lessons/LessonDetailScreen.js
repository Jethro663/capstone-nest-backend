import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getLessonById } from '../../services/mockData';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/commonStyles';

const LessonDetailScreen = ({ route, navigation }) => {
  const { lesson: initialLesson } = route.params;
  const [lesson, setLesson] = useState(initialLesson);
  const [loading, setLoading] = useState(!initialLesson);

  useEffect(() => {
    if (!initialLesson) {
      loadLesson();
    }
  }, []);

  const loadLesson = async () => {
    try {
      const data = await getLessonById(route.params?.id);
      setLesson(data);
    } catch (error) {
      console.error('Failed to load lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !lesson) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const getDifficultyColor = (difficulty) => {
    const colorMap = {
      Easy: colors.difficultyEasy,
      Medium: colors.difficultyMedium,
      Hard: colors.difficultyHard,
    };
    return colorMap[difficulty] || colors.secondary;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.thumbnailContainer}>
            <Text style={styles.thumbnail}>{lesson.thumbnail}</Text>
          </View>

          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.lessonSubject}>{lesson.subject}</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoBadge}>
              <MaterialCommunityIcons
                name="star"
                size={14}
                color={getDifficultyColor(lesson.difficulty)}
              />
              <Text
                style={[
                  styles.infoBadgeText,
                  { color: getDifficultyColor(lesson.difficulty) },
                ]}
              >
                {lesson.difficulty}
              </Text>
            </View>

            <View style={styles.infoBadge}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={styles.infoBadgeText}>{lesson.duration} min</Text>
            </View>
          </View>

          <Text style={styles.lessonDescription}>{lesson.description}</Text>
        </View>

        {/* Progress Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Your Progress</Text>

          <View style={styles.progressRing}>
            <View style={[styles.progressRingBg, { borderColor: colors.backgroundLight }]}>
              <View
                style={[
                  styles.progressRingFill,
                  {
                    borderColor: getDifficultyColor(lesson.difficulty),
                    transform: [
                      {
                        rotate: `${(lesson.progress / 100) * 360}deg`,
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.progressRingCenter}>
                <Text style={styles.progressPercentage}>{lesson.progress}%</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressInfo}>
            <View style={styles.progressInfoItem}>
              <MaterialCommunityIcons
                name="layers"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.progressInfoLabel}>Topics Covered</Text>
              <Text style={styles.progressInfoValue}>5</Text>
            </View>
            <View style={styles.progressInfoItem}>
              <MaterialCommunityIcons
                name="play-circle-outline"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.progressInfoLabel}>Activities</Text>
              <Text style={styles.progressInfoValue}>8</Text>
            </View>
            <View style={styles.progressInfoItem}>
              <MaterialCommunityIcons
                name="trophy"
                size={16}
                color={colors.warning}
              />
              <Text style={styles.progressInfoLabel}>XP Earned</Text>
              <Text style={styles.progressInfoValue}>320</Text>
            </View>
          </View>
        </View>

        {/* Content Overview */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>What You'll Learn</Text>

          <View style={styles.learningItem}>
            <View style={styles.learningIcon}>
              <MaterialCommunityIcons
                name="lightbulb-outline"
                size={20}
                color={colors.warning}
              />
            </View>
            <View style={styles.learningContent}>
              <Text style={styles.learningTitle}>Core Concepts</Text>
              <Text style={styles.learningSubtitle}>
                Understand the fundamental principles and theory
              </Text>
            </View>
          </View>

          <View style={styles.learningItem}>
            <View style={styles.learningIcon}>
              <MaterialCommunityIcons
                name="pencil-outline"
                size={20}
                color={colors.info}
              />
            </View>
            <View style={styles.learningContent}>
              <Text style={styles.learningTitle}>Practical Exercises</Text>
              <Text style={styles.learningSubtitle}>
                Apply what you learn with hands-on exercises
              </Text>
            </View>
          </View>

          <View style={styles.learningItem}>
            <View style={styles.learningIcon}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={20}
                color={colors.success}
              />
            </View>
            <View style={styles.learningContent}>
              <Text style={styles.learningTitle}>Self-Assessment</Text>
              <Text style={styles.learningSubtitle}>
                Test your knowledge with practice questions
              </Text>
            </View>
          </View>
        </View>

        {/* Key Topics */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Topics in This Lesson</Text>

          {['Introduction & Overview', 'Core Concepts', 'Deep Dive', 'Examples & Applications', 'Practice Exercises'].map(
            (topic, index) => (
              <View key={index} style={styles.topicItem}>
                <View
                  style={[
                    styles.topicCheckmark,
                    {
                      backgroundColor:
                        index < lesson.progress / 25
                          ? getDifficultyColor(lesson.difficulty)
                          : colors.backgroundLight,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      index < lesson.progress / 25 ? 'check' : 'chevron-right'
                    }
                    size={14}
                    color={
                      index < lesson.progress / 25 ? colors.white : colors.secondary
                    }
                  />
                </View>
                <Text style={styles.topicName}>{topic}</Text>
              </View>
            )
          )}
        </View>

        {/* Recommendations */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Study Tips</Text>

          <View style={styles.tipItem}>
            <MaterialCommunityIcons
              name="lightbulb-on-outline"
              size={18}
              color={colors.warning}
            />
            <Text style={styles.tipText}>Take breaks every 15-20 minutes</Text>
          </View>

          <View style={styles.tipItem}>
            <MaterialCommunityIcons
              name="note-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.tipText}>
              Take notes while learning for better retention
            </Text>
          </View>

          <View style={styles.tipItem}>
            <MaterialCommunityIcons
              name="repeat"
              size={18}
              color={colors.success}
            />
            <Text style={styles.tipText}>Review past lessons regularly</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {!lesson.isCompleted ? (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={lesson.progress > 0 ? 'play-circle' : 'play-circle-outline'}
                  size={18}
                  color={colors.white}
                />
                <Text style={styles.primaryButtonText}>
                  {lesson.progress > 0 ? 'Continue Lesson' : 'Start Lesson'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="bookmark-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.secondaryButtonText}>Bookmark</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="eye-check-outline"
                  size={18}
                  color={colors.white}
                />
                <Text style={styles.primaryButtonText}>Review Lesson</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="share-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.secondaryButtonText}>Share Achievement</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  thumbnail: {
    fontSize: 40,
  },
  lessonTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  lessonSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.full,
  },
  infoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: spacing.xs,
    color: colors.textSecondary,
  },
  lessonDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  progressRing: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    height: 150,
  },
  progressRingBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingFill: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
  },
  progressRingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  progressPercentage: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.secondaryLight,
    paddingTop: spacing.lg,
  },
  progressInfoItem: {
    alignItems: 'center',
  },
  progressInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginVertical: spacing.xs,
  },
  progressInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  learningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  learningIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  learningContent: {
    flex: 1,
  },
  learningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  learningSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondaryLight,
  },
  topicCheckmark: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  topicName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  tipText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: spacing.md,
    lineHeight: 20,
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
});

export default LessonDetailScreen;
