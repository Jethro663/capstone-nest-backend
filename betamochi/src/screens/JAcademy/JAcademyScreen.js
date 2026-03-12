import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';
import { getJAcademyStats } from '../../services/mockData';
import StatCard from '../../components/StatCard';
import BadgeItem from '../../components/BadgeItem';

const JAcademyScreen = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let mounted = true;
    getJAcademyStats().then((s) => {
      if (mounted) setStats(s);
    });
    return () => (mounted = false);
  }, []);

  if (!stats) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading JAcademy stats...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>JAcademy — Progress & Achievements</Text>

      <View style={styles.row}>
        <StatCard label="Overall Progress" value={`${stats.overallProgress}%`} color={colors.primary} />
        <StatCard label="Total XP" value={`${stats.totalXP}`} color={colors.accent} />
      </View>

      <Text style={styles.section}>Subjects</Text>
      {stats.subjects.map((s) => (
        <View key={s.subject} style={styles.subjectCard}>
          <Text style={styles.subjectTitle}>{s.subject}</Text>
          <Text style={styles.subjectMeta}>{s.lessonsCompleted}/{s.lessonsTotal} lessons • {s.assessmentsPassed}/{s.assessmentsTotal} passed</Text>
          <View style={styles.subjectProgressRow}>
            <View style={[styles.progressBar, { backgroundColor: colors.secondaryLight }]}>
              <View style={{ flex: s.progress / 100, backgroundColor: colors.primary }} />
            </View>
            <Text style={styles.progressLabel}>{s.progress}%</Text>
          </View>
        </View>
      ))}

      <Text style={styles.section}>Achievements</Text>
      <View style={styles.badgeRow}>
        {stats.badges.map((b) => (
          <BadgeItem key={b.id} badge={b} />
        ))}
      </View>

      <Text style={styles.section}>Remarks</Text>
      <View style={styles.remarksBox}>
        <Text style={styles.remarksText}>{stats.remarks}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: colors.textSecondary },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  section: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 12, marginBottom: 8 },
  subjectCard: { backgroundColor: colors.white, padding: 12, borderRadius: 12, marginBottom: 12 },
  subjectTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  subjectMeta: { color: colors.textSecondary, marginTop: 4, marginBottom: 8 },
  subjectProgressRow: { flexDirection: 'row', alignItems: 'center' },
  progressBar: { flex: 1, height: 10, borderRadius: 6, overflow: 'hidden', marginRight: 10 },
  progressLabel: { width: 40, textAlign: 'right', color: colors.textSecondary },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  remarksBox: { backgroundColor: colors.white, borderRadius: 10, padding: 12 },
  remarksText: { color: colors.textSecondary },
});

export default JAcademyScreen;
