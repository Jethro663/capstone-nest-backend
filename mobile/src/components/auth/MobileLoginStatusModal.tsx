import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { LoginServerStatus } from "../../services/system-status/login-server-status";
import { campusColors } from "./campus-login-theme";
import type { LoginVersionStatus } from "./login-status-model";

const stateColors = {
  checking: "#64748B",
  online: "#2F8A5B",
  limited: "#C57A10",
  unexpected: "#C83D4D",
  offline: "#C83D4D",
  current: "#2F8A5B",
  supported: "#2F8A5B",
  available: "#C57A10",
  required: "#C83D4D",
  unverified: "#C57A10",
} as const;

type Props = {
  checking: boolean;
  onCheckAgain: () => void;
  onClose: () => void;
  onReviewUpdate: () => void;
  server: LoginServerStatus;
  version: LoginVersionStatus;
  visible: boolean;
};

function StatusRow({
  color,
  eyebrow,
  headline,
  detail,
  meta,
  icon,
}: {
  color: string;
  eyebrow: string;
  headline: string;
  detail: string;
  meta: string;
  icon: string;
}) {
  return (
    <View
      style={{
        backgroundColor: "#FFF8F4",
        borderColor: "#F1DDD6",
        borderRadius: 18,
        borderWidth: 1,
        flexDirection: "row",
        padding: 14,
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          borderColor: "#F0DDD6",
          borderRadius: 13,
          borderWidth: 1,
          height: 40,
          justifyContent: "center",
          marginRight: 11,
          width: 40,
        }}
      >
        <MaterialCommunityIcons color={color} name={icon as never} size={20} />
        <View
          style={{
            backgroundColor: color,
            borderColor: "#FFFFFF",
            borderRadius: 999,
            borderWidth: 1.5,
            bottom: 3,
            height: 8,
            position: "absolute",
            right: 3,
            width: 8,
          }}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: campusColors.muted,
            fontSize: 9,
            fontWeight: "800",
            letterSpacing: 1.1,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </Text>
        <Text
          style={{
            color: campusColors.ink,
            fontSize: 14,
            fontWeight: "800",
            marginTop: 3,
          }}
        >
          {headline}
        </Text>
        <Text
          selectable
          style={{
            color: campusColors.muted,
            fontSize: 10,
            lineHeight: 15,
            marginTop: 3,
          }}
        >
          {meta}
        </Text>
        <Text
          style={{
            color: campusColors.muted,
            fontSize: 11,
            lineHeight: 16,
            marginTop: 5,
          }}
        >
          {detail}
        </Text>
      </View>
    </View>
  );
}

export function MobileLoginStatusModal({
  checking,
  onCheckAgain,
  onClose,
  onReviewUpdate,
  server,
  version,
  visible,
}: Props) {
  const updateActionable =
    version.kind === "available" || version.kind === "required";

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        style={{
          alignItems: "center",
          backgroundColor: "rgba(38,23,22,0.52)",
          flex: 1,
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: campusColors.paper,
            borderRadius: 26,
            elevation: 12,
            maxWidth: 360,
            padding: 20,
            shadowColor: "#261716",
            shadowOffset: { height: 10, width: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 24,
            width: "100%",
          }}
        >
          <View style={{ alignItems: "flex-start", flexDirection: "row" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text
                style={{
                  color: campusColors.ink,
                  fontSize: 20,
                  fontWeight: "900",
                }}
              >
                Connection & app status
              </Text>
              <Text
                style={{
                  color: campusColors.muted,
                  fontSize: 11,
                  lineHeight: 16,
                  marginTop: 4,
                }}
              >
                Confirm this APK is pointing to the intended Nexora campus.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close connection and app status"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={{
                alignItems: "center",
                backgroundColor: "#F9ECE8",
                borderRadius: 13,
                height: 40,
                justifyContent: "center",
                width: 40,
              }}
            >
              <MaterialCommunityIcons
                color={campusColors.deepRed}
                name="close"
                size={20}
              />
            </Pressable>
          </View>

          <View style={{ gap: 10, marginTop: 18 }}>
            <StatusRow
              color={stateColors[server.kind]}
              detail={server.detail}
              eyebrow="Server"
              headline={server.headline}
              icon="server-network"
              meta={`${server.label} · ${server.address}`}
            />
            <StatusRow
              color={stateColors[version.kind]}
              detail={version.detail}
              eyebrow="APK version"
              headline={version.headline}
              icon="cellphone-check"
              meta={version.installedLabel}
            />
          </View>

          {checking ? (
            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                marginTop: 14,
              }}
            >
              <ActivityIndicator color={campusColors.red} size="small" />
              <Text
                style={{
                  color: campusColors.muted,
                  fontSize: 11,
                  fontWeight: "700",
                  marginLeft: 8,
                }}
              >
                Checking now
              </Text>
            </View>
          ) : null}

          <View
            style={{
              flexDirection: updateActionable ? "row" : "column",
              gap: 10,
              marginTop: 16,
            }}
          >
            <Pressable
              accessibilityLabel="Check server and app version again"
              accessibilityRole="button"
              disabled={checking}
              onPress={onCheckAgain}
              style={{
                alignItems: "center",
                backgroundColor: updateActionable ? "#F9ECE8" : campusColors.red,
                borderRadius: 14,
                flex: 1,
                justifyContent: "center",
                minHeight: 46,
                opacity: checking ? 0.62 : 1,
                paddingHorizontal: 14,
              }}
            >
              <Text
                style={{
                  color: updateActionable ? campusColors.deepRed : campusColors.white,
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                Check again
              </Text>
            </Pressable>
            {updateActionable ? (
              <Pressable
                accessibilityLabel="Review available app update"
                accessibilityRole="button"
                onPress={onReviewUpdate}
                style={{
                  alignItems: "center",
                  backgroundColor: campusColors.red,
                  borderRadius: 14,
                  flex: 1,
                  justifyContent: "center",
                  minHeight: 46,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    color: campusColors.white,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  Review update
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
