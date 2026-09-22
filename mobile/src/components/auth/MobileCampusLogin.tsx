import { mobileBrand } from "../../theme/mobileBrand";
import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { resolveCampusLoginLayout } from "./campus-login-layout";
import { campusColors } from "./campus-login-theme";
import type { LoginStatusTone } from "./login-status-model";

const seal = require("../../../assets/auth/gabhs-seal.png");
const students = require("../../../assets/auth/nexora-students.png");

const toneColors: Record<LoginStatusTone, string> = {
  neutral: mobileBrand.navyRaised,
  green: mobileBrand.success,
  amber: mobileBrand.warning,
  red: mobileBrand.danger,
};

type Props = PropsWithChildren<{
  footer?: ReactNode;
  onOpenStatus: () => void;
  statusTone: LoginStatusTone;
}>;

export function MobileCampusLogin({
  children,
  footer,
  onOpenStatus,
  statusTone,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;
  const layout = resolveCampusLoginLayout({ width, height, keyboardVisible });

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const startEntrance = async () => {
      const reduceMotion =
        (await AccessibilityInfo.isReduceMotionEnabled?.()) ?? false;
      if (!active) return;
      if (reduceMotion) {
        entrance.setValue(1);
        return;
      }
      Animated.timing(entrance, {
        duration: 380,
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };
    void startEntrance();
    return () => {
      active = false;
    };
  }, [entrance]);

  const split = layout.mode === "split";
  return (
    <View
      style={{
        backgroundColor: campusColors.cream,
        flex: 1,
        flexDirection: split ? "row" : "column",
      }}
    >
      <LinearGradient
        colors={[mobileBrand.navy, mobileBrand.navyRaised]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={{
          height: layout.heroHeight,
          overflow: "hidden",
          position: "relative",
          width: split ? "48%" : "100%",
        }}
      >
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          source={students}
          style={{
            bottom: 0,
            height: "100%",
            left: 0,
            opacity: split ? 0.24 : 0.18,
            position: "absolute",
            right: 0,
            top: 0,
            width: "100%",
          }}
        />
        <View pointerEvents="none" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, backgroundColor: mobileBrand.red }} />

        <Animated.View
          style={{
            flex: 1,
            opacity: entrance,
            paddingBottom: split ? Math.max(insets.bottom, 30) : 0,
            paddingHorizontal: split ? 42 : 22,
            paddingTop: split ? Math.max(insets.top + 78, 104) : insets.top + (layout.compact ? 26 : 40),
            zIndex: 2,
          }}
        >
          <View style={{ alignItems: "center", flexDirection: "row" }}>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={seal}
              style={{
                height: layout.compact ? 46 : split ? 78 : 58,
                width: layout.compact ? 46 : split ? 78 : 58,
              }}
            />
            <View style={{ flex: 1, marginLeft: 12, minWidth: 0, paddingRight: 8 }}>
              <Text
                numberOfLines={2}
                style={{
                  color: campusColors.white,
                  fontSize: layout.compact ? 10 : split ? 15 : 11,
                  flexShrink: 1,
                  fontWeight: "800",
                  letterSpacing: 0.9,
                  lineHeight: layout.compact ? 13 : split ? 20 : 15,
                }}
              >
                GAT ANDRES BONIFACIO HIGH SCHOOL
              </Text>
              {!layout.compact ? (
                <Text
                  style={{
                    color: mobileBrand.inverseMuted,
                    fontSize: split ? 11 : 9,
                    letterSpacing: 1.1,
                    marginTop: 3,
                  }}
                >
                  DIGITAL CAMPUS
                </Text>
              ) : null}
            </View>
          </View>

          {!layout.compact ? (
            <View style={{ marginTop: split ? 44 : 14, maxWidth: 480 }}>
              <Text
                style={{
                  color: campusColors.white,
                  fontSize: split ? 46 : 27,
                  fontWeight: "900",
                  letterSpacing: split ? 2.8 : 2,
                  lineHeight: split ? 52 : 34,
                }}
              >
                NEXORA
              </Text>
              <Text
                style={{
                  color: mobileBrand.inverseMuted,
                  fontSize: split ? 13 : 9,
                  fontWeight: "700",
                  letterSpacing: split ? 2.4 : 1.8,
                  marginTop: 3,
                }}
              >
                LEARNING MANAGEMENT SYSTEM
              </Text>
              {split ? (
                <Text
                  style={{
                    color: mobileBrand.inverseMuted,
                    fontSize: 15,
                    lineHeight: 23,
                    marginTop: 18,
                    maxWidth: 390,
                  }}
                >
                  One school community for lessons, progress, and meaningful
                  learning.
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={{ marginTop: 9 }}>
              <Text
                style={{
                  color: campusColors.white,
                  fontSize: 21,
                  fontWeight: "900",
                  letterSpacing: 1.8,
                }}
              >
                NEXORA
              </Text>
              <Text
                style={{
                  color: mobileBrand.inverseMuted,
                  fontSize: 7,
                  fontWeight: "700",
                  letterSpacing: 1.4,
                }}
              >
                LEARNING MANAGEMENT SYSTEM
              </Text>
            </View>
          )}
        </Animated.View>
      </LinearGradient>

      <Pressable
        accessibilityHint="Shows the connected server and installed APK version."
        accessibilityLabel="Open connection and app status"
        accessibilityRole="button"
        hitSlop={6}
        onPress={onOpenStatus}
        style={{
          alignItems: "center",
          backgroundColor: mobileBrand.inverseForeground,
          borderColor: mobileBrand.dangerSoft,
          borderRadius: 15,
          borderWidth: 1,
          elevation: 4,
          height: 44,
          justifyContent: "center",
          left: insets.left + 12,
          position: "absolute",
          shadowColor: mobileBrand.redPressed,
          shadowOffset: { height: 3, width: 0 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
          top: insets.top + 8,
          width: 44,
          zIndex: 10,
        }}
      >
        <Text
          style={{
            color: campusColors.deepRed,
            fontSize: 20,
            fontWeight: "900",
            lineHeight: 22,
          }}
        >
          !
        </Text>
        <View
          style={{
            backgroundColor: toneColors[statusTone],
            borderColor: campusColors.white,
            borderRadius: 999,
            borderWidth: 2,
            bottom: 5,
            height: 10,
            position: "absolute",
            right: 5,
            width: 10,
          }}
        />
      </Pressable>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        style={{ flex: 1, minWidth: 0 }}
      >
        <View
          style={{
            backgroundColor: campusColors.paper,
          borderTopLeftRadius: split ? 28 : 22,
          borderTopRightRadius: split ? 0 : 22,
            flex: 1,
            marginLeft: split ? -26 : 0,
          marginTop: split ? 0 : -14,
            overflow: "hidden",
          }}
        >
          <ScrollView
            contentContainerStyle={{
              alignItems: "center",
              flexGrow: 1,
              justifyContent: "center",
              paddingBottom: Math.max(insets.bottom + 22, 30),
              paddingHorizontal: split ? 48 : 22,
              paddingTop: split ? Math.max(insets.top + 38, 54) : 38,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={{
                maxWidth: 480,
                opacity: entrance,
                width: "100%",
              }}
            >
              {children}
              {footer ? <View style={{ marginTop: 15 }}>{footer}</View> : null}
              <View
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  marginTop: 24,
                }}
              >
                <MaterialCommunityIcons
                  color={campusColors.muted}
                  name="shield-check-outline"
                  size={14}
                />
                <Text
                  style={{
                    color: campusColors.muted,
                    fontSize: 10,
                    marginLeft: 6,
                  }}
                >
                  GABHS Digital Campus · Secure sign in
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
