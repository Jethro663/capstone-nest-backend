import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LessonCard from '../../components/LessonCard';
import { getLessons } from '../../services/mockData';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/commonStyles';

const LessonsScreen = ({ navigation }) => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - spacing.lg * 2 - spacing.md) / 2;

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    setLoading(true);
    try {
      const data = await getLessons();
      setLessons(data);
    } catch (error) {
      console.error('Failed to load lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getLessons();
      setLessons(data);
    } catch (error) {
      console.error('Failed to refresh lessons:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLessonPress = (lesson) => {
    navigation.navigate('LessonDetail', {
      lesson,
      title: lesson.title,
    });
  };

  const filters = ['All', 'Easy', 'Medium', 'Hard', 'In Progress'];

  const filteredLessons = lessons.filter((lesson) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'In Progress') return lesson.progress > 0 && !lesson.isCompleted;
    return lesson.difficulty === activeFilter;
  });

  const continueLessons = lessons.filter((l) => l.isContinued);
  const completedLessons = lessons.filter((l) => l.isCompleted);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Lessons</Text>
            <Text style={styles.headerSubtitle}>
              Learn at your own pace
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons
              name="book-open"
              size={40}
              color={colors.primary}
            />
          </View>
        </View>

        {/* Continue Learning Section */}
        {continueLessons.length > 0 && (
          <View style={styles.continueSection}>
            <Text style={styles.sectionTitle}>Continue Learning</Text>
            <View style={styles.continueLessonCard}>
              <View style={styles.continueLessonHeader}>
                <Text style={styles.continueThumbnail}>
                  {continueLessons[0].thumbnail}
                </Text>
                <View style={styles.continueLessonInfo}>
                  <Text style={styles.continueLessonTitle}>
                    {continueLessons[0].title}
                  </Text>
                  <Text style={styles.continueLessonProgress}>
                    {continueLessons[0].progress}% Complete
                  </Text>
                </View>
              </View>
              <View style={styles.continueLessonProgressBar}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${continueLessons[0].progress}%` },
                  ]}
                />
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={colors.primary}
                style={styles.continueArrow}
              />
            </View>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {filters.map((filter) => (
              <View key={filter} style={styles.filterButtonWrapper}>
                <MaterialCommunityIcons
                  name={activeFilter === filter ? 'check-circle' : 'circle-outline'}
                  size={12}
                  color={
                    activeFilter === filter ? colors.primary : colors.secondary
                  }
                  style={styles.filterCheckbox}
                />
                <Text
                  onPress={() => setActiveFilter(filter)}
                  style={[
                    styles.filterButton,
                    activeFilter === filter && styles.filterButtonActive,
                  ]}
                >
                  {filter}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Lessons Grid */}
        <View style={styles.lessonsGridContainer}>
          {filteredLessons.length > 0 ? (
            <View style={styles.lessonsGrid}>
              {filteredLessons.map((lesson) => (
                <View key={lesson.id} style={{ width: cardWidth }}>
                  <LessonCard
                    lesson={lesson}
                    onPress={() => handleLessonPress(lesson)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="inbox-outline"
                size={48}
                color={colors.secondary}
              />
              <Text style={styles.emptyStateText}>
                No lessons with "{activeFilter}" difficulty yet
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Try a different filter to find lessons
              </Text>
            </View>
          )}
        </View>

        {/* Completed Summary */}
        {completedLessons.length > 0 && (
          <View style={styles.summarySection}>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.success || colors.primaryLight },
              ]}
            >
              <MaterialCommunityIcons
                name="trophy"
                size={24}
                color={colors.white}
              />
              <Text style={styles.summaryText}>
                {completedLessons.length} lessons completed!
              </Text>
              <Text style={styles.summarySubtext}>
                Great progress! Keep it up! 🎉
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  headerIcon: {
    marginLeft: spacing.lg,
  },
  continueSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  continueLessonCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  continueLessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  continueThumbnail: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  continueLessonInfo: {
    flex: 1,
  },
  continueLessonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  continueLessonProgress: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  continueLessonProgressBar: {
    height: 8,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  continueArrow: {
    position: 'absolute',
    right: spacing.lg,
    top: '50%',
    marginTop: -12,
  },
  filterContainer: {
    paddingVertical: spacing.md,
  },
  filterScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  filterButtonWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterCheckbox: {
    marginRight: spacing.xs,
  },
  filterButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundLight,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    color: colors.white,
  },
  lessonsGridContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  lessonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  emptyState: {
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  summarySection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  summaryCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  summarySubtext: {
    fontSize: 13,
    color: colors.white,
    marginTop: spacing.xs,
    textAlign: 'center',
    opacity: 0.9,
  },
});

export default LessonsScreen;
