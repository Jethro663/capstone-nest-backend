import { publicClient } from "../../api/client";
import { API_BASE_URL } from "../../api/config";

export type LoginServerStatusKind =
  | "checking"
  | "online"
  | "limited"
  | "unexpected"
  | "offline";

export type ApiTargetDescription = {
  label: "Hosted server" | "Local development" | "Configured server";
  address: string;
};

export type LoginServerStatus = ApiTargetDescription & {
  kind: LoginServerStatusKind;
  headline: string;
  detail: string;
  checkedAt: string | null;
};

function isPrivateIpv4(hostname: string) {
  const octets = hostname.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function isLocalHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "10.0.2.2" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized.endsWith(".local") ||
    isPrivateIpv4(normalized)
  );
}

export function describeApiTarget(apiUrl = API_BASE_URL): ApiTargetDescription {
  const configuredAddress = apiUrl.trim();

  try {
    const parsed = new URL(configuredAddress);
    const address = parsed.host;
    if (isLocalHostname(parsed.hostname)) {
      return { label: "Local development", address };
    }
    if (parsed.hostname.toLowerCase().endsWith(".up.railway.app")) {
      return { label: "Hosted server", address };
    }
    return { label: "Configured server", address };
  } catch {
    return {
      label: "Configured server",
      address: configuredAddress || "Not configured",
    };
  }
}

export async function checkLoginServerStatus(): Promise<LoginServerStatus> {
  const target = describeApiTarget();
  const checkedAt = new Date().toISOString();

  try {
    const live = await publicClient.get("/health/live", { timeout: 5000 });
    const payload = live.data as {
      status?: unknown;
      service?: { name?: unknown };
    };

    if (payload.status !== "ok" || payload.service?.name !== "backend") {
      return {
        ...target,
        kind: "unexpected",
        headline: "Unexpected server response",
        detail:
          "The configured address responded, but it did not identify the Nexora backend.",
        checkedAt,
      };
    }

    try {
      await publicClient.get("/health/ready", { timeout: 5000 });
      return {
        ...target,
        kind: "online",
        headline: "Connected",
        detail: "Nexora and its required services are ready.",
        checkedAt,
      };
    } catch {
      return {
        ...target,
        kind: "limited",
        headline: "Connected · limited",
        detail:
          "Nexora is online, but one or more supporting services are unavailable.",
        checkedAt,
      };
    }
  } catch {
    return {
      ...target,
      kind: "offline",
      headline: "Cannot reach server",
      detail:
        "Check your internet connection or confirm that this is the intended server.",
      checkedAt,
    };
  }
}
