import { Alert, Platform } from "react-native";

export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmText = "Delete",
  cancelText = "Cancel"
) {
  if (Platform.OS === "web") {
    const confirmed = typeof window !== "undefined" ? window.confirm(`${title}\n\n${message}`) : false;
    if (confirmed) {
      void onConfirm();
    }
  } else {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel" },
        {
          text: confirmText,
          style: "destructive",
          onPress: () => {
            void onConfirm();
          },
        },
      ],
      { cancelable: true }
    );
  }
}
