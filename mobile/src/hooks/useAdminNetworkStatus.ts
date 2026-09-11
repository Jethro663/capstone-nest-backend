import { useNetInfo } from "@react-native-community/netinfo";

export function useAdminNetworkStatus() {
  const network = useNetInfo();
  const isOffline =
    network.isConnected === false || network.isInternetReachable === false;

  return {
    isOffline,
    isConnected: !isOffline,
    type: network.type,
  };
}
