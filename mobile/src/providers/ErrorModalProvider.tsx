import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { clearGlobalErrorPresenter, setGlobalErrorPresenter } from "../api/errors";
import type { ErrorPresentationPayload } from "../types/api";
import { colors, radii } from "../theme/tokens";

type ErrorModalContextValue = {
  presentError: (payload: ErrorPresentationPayload) => void;
  dismissError: () => void;
};

const ErrorModalContext = createContext<ErrorModalContextValue | undefined>(undefined);

export function ErrorModalProvider({ children }: PropsWithChildren) {
  const [payload, setPayload] = useState<ErrorPresentationPayload | null>(null);

  useEffect(() => {
    setGlobalErrorPresenter(setPayload);
    return () => clearGlobalErrorPresenter();
  }, []);

  const value = useMemo(
    () => ({
      presentError: setPayload,
      dismissError: () => setPayload(null),
    }),
    [],
  );

  return (
    <ErrorModalContext.Provider value={value}>
      {children}
      <Modal animationType="fade" transparent visible={!!payload} onRequestClose={() => setPayload(null)}>
        <View className="flex-1 items-center justify-center bg-slate-950/60 px-6">
          <View
            style={{
              width: "100%",
              maxWidth: 360,
              borderRadius: radii.header,
              backgroundColor: colors.white,
              padding: 24,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "900", color: colors.red }}>Nexora Error</Text>
            <Text style={{ marginTop: 10, fontSize: 24, fontWeight: "900", color: colors.text }}>
              {payload?.title ?? "Something went wrong"}
            </Text>
            <Text style={{ marginTop: 10, fontSize: 14, lineHeight: 22, color: colors.textSecondary }}>
              {payload?.message ?? "Please try again in a moment."}
            </Text>
            <Pressable
              onPress={() => setPayload(null)}
              style={{
                marginTop: 18,
                alignItems: "center",
                borderRadius: 18,
                backgroundColor: colors.text,
                paddingVertical: 14,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "800", color: colors.white }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ErrorModalContext.Provider>
  );
}

export function useErrorModal() {
  const context = useContext(ErrorModalContext);
  if (!context) {
    throw new Error("useErrorModal must be used within ErrorModalProvider");
  }

  return context;
}
