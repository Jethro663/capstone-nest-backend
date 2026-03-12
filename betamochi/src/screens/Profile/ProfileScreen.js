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
import StatCard from '../../components/StatCard';
import BadgeItem from '../../components/BadgeItem';
import { getUserProfile } from '../../services/mockData';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/commonStyles';

const ProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !profile) {
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>{profile.avatar}</Text>
          </View>

          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>

          <View style={styles.levelBadge}>
            <MaterialCommunityIcons name="star" size={16} color={colors.warning} />
            <Text style={styles.levelText}>Level {profile.level}</Text>
          </View>

          <Text style={styles.profileBio}>{profile.bio}</Text>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.editButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.settingsButtonText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <StatCard
              icon="🔥"
              label="Current Streak"
              value={profile.currentStreak}
              subvalue="days"
              color={colors.accent}
            />
            <StatCard
              icon="⭐"
              label="Total XP"
              value={profile.totalXP}
              color={colors.warning}
            />
          </View>

          <View style={styles.statsRow}>
            <StatCard
              icon="📚"
              label="Lessons Done"
              value={profile.totalLessonsCompleted}
              color={colors.primary}
            />
            <StatCard
              icon="📋"
              label="Assessments"
              value={profile.totalAssessmentsTaken}
              color={colors.info}
            />
          </View>
        </View>

        {/* Detailed Stats Card */}
        <View style={styles.detailedStatsCard}>
          <Text style={styles.cardTitle}>This Month's Stats</Text>

          <View style={styles.statRow}>
            <MaterialCommunityIcons
              name="book-open-outline"
              size={20}
              color={colors.primary}
            />
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Lessons This Month</Text>
              <Text style={styles.statValue}>{profile.stats.lessonsThisMonth}</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <MaterialCommunityIcons
              name="clipboard-check"
              size={20}
              color={colors.info}
            />
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Assessments Taken</Text>
              <Text style={styles.statValue}>{profile.stats.assessmentsThisMonth}</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color={colors.warning}
            />
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Study Time</Text>
              <Text style={styles.statValue}>
                {Math.floor(profile.stats.totalStudyTime / 60)}h{' '}
                {profile.stats.totalStudyTime % 60}m
              </Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <MaterialCommunityIcons
              name="percent"
              size={20}
              color={colors.success}
            />
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Average Score</Text>
              <Text style={styles.statValue}>{profile.averageScore}%</Text>
            </View>
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.achievementsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 Achievements</Text>
            <Text style={styles.badgeCount}>
              {profile.badges.length} earned
            </Text>
          </View>

          {profile.badges.map((badge) => (
            <BadgeItem
              key={badge.id}
              icon={badge.icon}
              label={badge.name}
              rarity={badge.rarity}
            />
          ))}
        </View>

        {/* Member Since */}
        <View style={styles.memberInfoCard}>
          <MaterialCommunityIcons
            name="calendar-check"
            size={24}
            color={colors.primary}
          />
          <View style={styles.memberInfoContent}>
            <Text style={styles.memberInfoLabel}>Member Since</Text>
            <Text style={styles.memberInfoValue}>
              {new Date(profile.joinDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="help-circle-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.actionText}>Help & Support</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.secondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.actionText}>Notifications</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.secondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="lock-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.actionText}>Privacy & Security</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="logout"
              size={18}
              color={colors.accent}
            />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Nexora LMS v0.1.0</Text>
        </View>
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
  profileHeader: {
    backgroundColor: colors.white,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    fontSize: 40,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning,
    marginLeft: spacing.xs,
  },
  profileBio: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  settingsButton: {
    flex: 1,
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
  settingsButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  statsSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  detailedStatsCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondaryLight,
  },
  statContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  achievementsSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badgeCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: colors.backgroundLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  memberInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  memberInfoContent: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  memberInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  memberInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionsSection: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondaryLight,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.md,
  },
  logoutContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: colors.accentLight,
    borderWidth: 2,
    borderColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  versionContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default ProfileScreen;
