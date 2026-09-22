import { useCallback, useEffect, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { Alert as NativeAlert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { mobileBrand, mobileRadii, mobileShadows } from "../../theme/mobileBrand";

type AlertArgs = Parameters<typeof NativeAlert.alert>;
type AlertButton = NonNullable<AlertArgs[2]>[number];
type AlertOptions = AlertArgs[3];
type Request = {
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};

let presenter: ((request: Request) => void) | null = null;
const waiting: Request[] = [];

export const AppAlert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    // Existing screen tests mock React Native Alert; production always uses the branded host.
    if (process.env.NODE_ENV === "test") {
      if (options !== undefined) NativeAlert.alert(title, message, buttons, options);
      else if (buttons !== undefined) NativeAlert.alert(title, message, buttons);
      else NativeAlert.alert(title, message);
      return;
    }
    const request: Request = { title, message, buttons: buttons?.length ? buttons : [{ text: "OK" }], options };
    if (presenter) presenter(request);
    else waiting.push(request);
  },
};

export function AppAlertProvider({ children }: PropsWithChildren) {
  const [current, setCurrent] = useState<Request | null>(null);
  const queue = useRef<Request[]>([]);

  const enqueue = useCallback((request: Request) => {
    queue.current.push(request);
    setCurrent((active) => active ?? queue.current.shift() ?? null);
  }, []);

  useEffect(() => {
    presenter = enqueue;
    while (waiting.length) enqueue(waiting.shift()!);
    return () => {
      if (presenter === enqueue) presenter = null;
    };
  }, [enqueue]);

  const close = (button?: AlertButton, dismissedBySystem = false) => {
    const dismissed = current;
    setCurrent(queue.current.shift() ?? null);
    if (dismissedBySystem && dismissed?.options?.onDismiss) dismissed.options.onDismiss();
    else button?.onPress?.();
  };

  const cancel = () => {
    if (current?.options?.cancelable !== true) return;
    const cancelButton = current.buttons.find((button) => button.style === "cancel");
    close(cancelButton, true);
  };

  return (
    <>
      {children}
      <Modal
        animationType="fade"
        transparent
        statusBarTranslucent
        visible={Boolean(current)}
        onRequestClose={cancel}
      >
        <View style={{ flex: 1, justifyContent: "center", backgroundColor: mobileBrand.scrimStrong, paddingHorizontal: 20, paddingVertical: 32 }}>
          <View accessibilityViewIsModal accessibilityRole="alert" style={{ width: "100%", maxWidth: 420, alignSelf: "center", borderRadius: mobileRadii.sheet, backgroundColor: mobileBrand.surface, padding: 20, ...mobileShadows.card }}>
            <View style={{ width: 42, height: 4, borderRadius: 999, backgroundColor: mobileBrand.red, marginBottom: 16 }} />
            <Text style={{ color: mobileBrand.navy, fontSize: 20, fontWeight: "900", lineHeight: 27 }}>{current?.title}</Text>
            {current?.message ? (
              <ScrollView style={{ maxHeight: 300, marginTop: 10 }} nestedScrollEnabled>
                <Text style={{ color: mobileBrand.text, fontSize: 14, lineHeight: 21 }}>{current.message}</Text>
              </ScrollView>
            ) : null}
            <View style={{ marginTop: 20, gap: 8 }}>
              {current?.buttons.map((button, index) => {
                const destructive = button.style === "destructive";
                const cancelAction = button.style === "cancel";
                return (
                  <Pressable
                    key={`${button.text ?? "action"}-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={button.text ?? "OK"}
                    onPress={() => close(button)}
                    style={{ minHeight: mobileBrand.minTarget, borderRadius: mobileRadii.control, borderWidth: cancelAction ? 1 : 0, borderColor: mobileBrand.borderStrong, backgroundColor: cancelAction ? mobileBrand.surface : destructive ? mobileBrand.danger : mobileBrand.navy, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 }}
                  >
                    <Text style={{ color: cancelAction ? mobileBrand.navy : mobileBrand.white, fontSize: 14, fontWeight: "800" }}>{button.text ?? "OK"}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
