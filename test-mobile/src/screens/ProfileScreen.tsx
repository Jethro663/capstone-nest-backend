import { useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Card, GradientHeader, Pill, ProgressBar, ScreenScroll, SectionTitle } from "../components/ui/primitives";
import { achievements, subjects, userProfile } from "../data/mockData";
import type { MainTabParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = BottomTabScreenProps<MainTabParamList, "Profile">;
type MenuItem = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  color: string;
  info?: string;
};

const avatarOptions = ["🎓", "🐼", "🦊", "🐸", "🤖", "🦁", "🐯", "🐻", "🦅", "🌟"];

export function ProfileScreen(_: Props) {
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile.avatar);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const earnedAchievements = achievements.filter((achievement) => achievement.earned);
  const overallProgress = useMemo(
    () => Math.round(subjects.reduce((total, subject) => total + subject.progress, 0) / subjects.length),
    []
  );

  const menuItems: MenuItem[] = [
    { icon: "bell-outline", label: "Notifications", color: colors.blue, info: "5 new" },
    { icon: "shield-check-outline", label: "Privacy & Security", color: colors.green },
    { icon: "cog-outline", label: "App Settings", color: colors.muted },
    { icon: "help-circle-outline", label: "Help & Support", color: colors.amber },
  ];

  return (
    <ScreenScroll>
      <GradientHeader
        colors={gradients.profile}
        title=""
        rightContent={
          <Pressable
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.2)",
            }}
          >
            <MaterialCommunityIcons name="cog-outline" size={18} color={colors.white} />
          </Pressable>
        }
      >
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <View style={{ position: "relative" }}>
            <Pressable
              onPress={() => setShowAvatarPicker((prev) => !prev)}
              style={{
                width: 92,
                height: 92,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.2)",
                borderWidth: 4,
                borderColor: "rgba(255,255,255,0.3)",
              }}
            >
              <Text style={{ fontSize: 52 }}>{selectedAvatar}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowAvatarPicker((prev) => !prev)}
              style={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 30,
                height: 30,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.white,
              }}
            >
              <MaterialCommunityIcons name="pencil" size={13} color={colors.purpleDeep} />
            </Pressable>
          </View>

          {showAvatarPicker ? (
            <View
              style={{
                marginTop: 14,
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 8,
                borderRadius: 20,
                padding: 12,
                backgroundColor: "rgba(255,255,255,0.18)",
              }}
            >
              {avatarOptions.map((avatar) => (
                <Pressable
                  key={avatar}
                  onPress={() => {
                    setSelectedAvatar(avatar);
                    setShowAvatarPicker(false);
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selectedAvatar === avatar ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)",
                    borderWidth: selectedAvatar === avatar ? 2 : 0,
                    borderColor: colors.white,
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{avatar}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={{ marginTop: 14, fontSize: 24, fontWeight: "900", color: colors.white }}>
            {userProfile.name}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.82)" }}>
            {userProfile.grade} • {userProfile.section}
          </Text>
          <View
            style={{
              marginTop: 12,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: "rgba(255,255,255,0.18)",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <MaterialCommunityIcons name="flash" size={14} color="#FFD700" />
            <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>
              Level {userProfile.level} • {userProfile.xp} XP
            </Text>
          </View>
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 18 }}>
          {[
            { icon: "book-open-page-variant", value: userProfile.totalLessonsCompleted, label: "Lessons", color: colors.blue },
            { icon: "fire", value: userProfile.streak, label: "Streak", color: colors.orange },
            { icon: "star", value: `${userProfile.averageScore}%`, label: "Avg", color: colors.amber },
            { icon: "clock-outline", value: `${userProfile.studyHours}h`, label: "Hours", color: colors.green },
          ].map((item) => (
            <Card key={item.label} style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 14, alignItems: "center" }}>
              <MaterialCommunityIcons name={item.icon as never} size={18} color={item.color} />
              <Text style={{ marginTop: 8, fontSize: 16, fontWeight: "900", color: colors.text }}>{item.value}</Text>
              <Text style={{ marginTop: 4, fontSize: 10, fontWeight: "700", color: colors.muted }}>{item.label}</Text>
            </Card>
          ))}
        </View>

        <Card style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <SectionTitle title="Overall Progress" />
            <Text style={{ fontSize: 18, fontWeight: "900", color: colors.purple }}>{overallProgress}%</Text>
          </View>
          <ProgressBar value={overallProgress} color={colors.purpleDeep} trackColor="#EEF2F7" height={12} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {subjects.map((subject) => (
              <View key={subject.id} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 12 }}>{subject.emoji}</Text>
                <View style={{ width: 40, height: 4, borderRadius: 999, backgroundColor: "#E5E7EB", overflow: "hidden" }}>
                  <View style={{ width: `${subject.progress}%`, height: "100%", backgroundColor: subject.color }} />
                </View>
              </View>
            ))}
          </View>
        </Card>

        <View style={{ marginBottom: 18 }}>
          <SectionTitle
            title="Achievements 🏅"
            right={<Text style={{ fontSize: 12, fontWeight: "800", color: colors.purple }}>{earnedAchievements.length} earned</Text>}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {earnedAchievements.map((achievement) => (
              <Card key={achievement.id} style={{ width: 92, alignItems: "center", paddingVertical: 16 }}>
                <Text style={{ fontSize: 28 }}>{achievement.emoji}</Text>
                <Text style={{ marginTop: 8, fontSize: 10, fontWeight: "800", color: colors.text, textAlign: "center" }}>
                  {achievement.title}
                </Text>
              </Card>
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: 10, marginBottom: 18 }}>
          {menuItems.map((item) => (
            <Pressable key={item.label}>
              <Card style={{ paddingVertical: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: `${item.color}20`,
                    }}
                  >
                    <MaterialCommunityIcons name={item.icon as never} size={18} color={item.color} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: "800", color: colors.text }}>{item.label}</Text>
                  {item.info ? <Pill label={item.info} backgroundColor={colors.red} color={colors.white} /> : null}
                  <MaterialCommunityIcons name="chevron-right" size={16} color={colors.muted} />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={{
            marginBottom: 8,
            borderRadius: 20,
            backgroundColor: colors.paleRed,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
          <MaterialCommunityIcons name="logout" size={18} color={colors.red} />
          <Text style={{ fontSize: 14, fontWeight: "800", color: colors.red }}>Sign Out</Text>
        </Pressable>
      </View>
    </ScreenScroll>
  );
}
