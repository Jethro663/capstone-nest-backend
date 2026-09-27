import { AxiosError, AxiosHeaders } from "axios";
import {
  apiClient,
  publicClient,
  persistAuthTokens,
  getAccessToken,
  refreshSession,
  subscribeAuthSessionExpired,
} from "../client";
import {
  setAndroidAdmission,
  subscribeUpdatePolicyFailure,
} from "../../services/update/update-admission";

jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("expo-application", () => ({
  nativeApplicationVersion: "0.1.20",
  nativeBuildVersion: "21",
}));
jest.mock("../config", () => ({ API_BASE_URL: "https://example.com/api" }));
jest.mock("../storage", () => ({
  readAccessToken: jest.fn(async () => "access-token"),
  readRefreshToken: jest.fn(async () => "refresh-token"),
  persistAccessToken: jest.fn(),
  persistRefreshToken: jest.fn(),
  clearSecureSession: jest.fn(),
}));

describe("mobile client update contract", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.requireMock("react-native").Platform.OS = "android";
    setAndroidAdmission("allowed");
    await persistAuthTokens({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
  });

  it("preserves the session when a required update interrupts token refresh", async () => {
    const originalAdapter = publicClient.defaults.adapter;
    publicClient.defaults.adapter = async (config) => {
      throw new AxiosError(
        "Update required",
        "ERR_BAD_REQUEST",
        config,
        undefined,
        {
          config,
          status: 403,
          statusText: "Forbidden",
          headers: {},
          data: { code: "APP_UPDATE_REQUIRED" },
        },
      );
    };
    try {
      await expect(
        apiClient.get("/learning", {
          adapter: async (config) => {
            throw new AxiosError(
              "Expired access token",
              "ERR_BAD_REQUEST",
              config,
              undefined,
              {
                config,
                status: 401,
                statusText: "Unauthorized",
                headers: {},
                data: {},
              },
            );
          },
        }),
      ).rejects.toMatchObject({
        response: { data: { code: "APP_UPDATE_REQUIRED" } },
      });
      expect(getAccessToken()).toBe("access-token");
      expect(
        jest.requireMock("../storage").clearSecureSession,
      ).not.toHaveBeenCalled();
    } finally {
      publicClient.defaults.adapter = originalAdapter;
    }
  });

  it("shares one refresh rotation across simultaneous direct callers", async () => {
    const originalAdapter = publicClient.defaults.adapter;
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const adapter = jest.fn(async (config) => {
      await refreshGate;
      return {
        data: {
          data: {
            accessToken: "next-access-token",
            refreshToken: "next-refresh-token",
          },
        },
        status: 201,
        statusText: "Created",
        headers: {},
        config,
      };
    });
    publicClient.defaults.adapter = adapter;

    try {
      const firstRefresh = refreshSession();
      const secondRefresh = refreshSession();
      await Promise.resolve();
      releaseRefresh();

      await expect(Promise.all([firstRefresh, secondRefresh])).resolves.toEqual([
        {
          accessToken: "next-access-token",
          refreshToken: "next-refresh-token",
        },
        {
          accessToken: "next-access-token",
          refreshToken: "next-refresh-token",
        },
      ]);
      expect(adapter).toHaveBeenCalledTimes(1);
    } finally {
      publicClient.defaults.adapter = originalAdapter;
    }
  });

  it("notifies the auth root when refresh credentials are rejected", async () => {
    const originalAdapter = publicClient.defaults.adapter;
    const onSessionExpired = jest.fn();
    const unsubscribe = subscribeAuthSessionExpired(onSessionExpired);
    publicClient.defaults.adapter = async (config) => {
      throw new AxiosError(
        "Refresh token rejected",
        "ERR_BAD_REQUEST",
        config,
        undefined,
        {
          config,
          status: 401,
          statusText: "Unauthorized",
          headers: {},
          data: { message: "Invalid refresh token" },
        },
      );
    };

    try {
      await expect(refreshSession()).resolves.toBeNull();
      expect(onSessionExpired).toHaveBeenCalledTimes(1);
      expect(
        jest.requireMock("../storage").clearSecureSession,
      ).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
      publicClient.defaults.adapter = originalAdapter;
    }
  });

  it("does not send authenticated work while Android is being checked", async () => {
    setAndroidAdmission("checking");
    const adapter = jest.fn();
    await expect(apiClient.get("/learning", { adapter })).rejects.toMatchObject(
      { code: "APP_UPDATE_CHECK_PENDING" },
    );
    expect(adapter).not.toHaveBeenCalled();
  });

  it("notifies the root gate when Android is refused by policy", async () => {
    const onFailure = jest.fn();
    const unsubscribe = subscribeUpdatePolicyFailure(onFailure);
    await expect(
      apiClient.get("/learning", {
        adapter: async (config) => {
          throw new AxiosError(
            "Update required",
            "ERR_BAD_REQUEST",
            config,
            undefined,
            {
              config,
              status: 403,
              statusText: "Forbidden",
              headers: {},
              data: { code: "APP_UPDATE_REQUIRED" },
            },
          );
        },
      }),
    ).rejects.toThrow("Update required");
    expect(onFailure).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("does not gate iOS API requests when Android admission is blocked", async () => {
    setAndroidAdmission("blocked");
    jest.requireMock("react-native").Platform.OS = "ios";
    await expect(
      apiClient.get("/learning", {
        adapter: async (config) => ({
          data: {},
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        }),
      }),
    ).resolves.toMatchObject({ status: 200 });
  });
  it.each([publicClient, apiClient])(
    "reports installed native identity on HTTP requests",
    async (client) => {
      let headers: AxiosHeaders | undefined;
      await client.get("/learning", {
        adapter: async (config) => {
          headers = config.headers;
          return {
            data: {},
            status: 200,
            statusText: "OK",
            headers: {},
            config,
          };
        },
      });
      expect(headers?.get("X-App-Platform")).toBe("android");
      expect(headers?.get("X-App-Version-Code")).toBe("21");
    },
  );
  it("reports iOS independently", async () => {
    jest.requireMock("react-native").Platform.OS = "ios";
    let platform: unknown;
    await publicClient.get("/learning", {
      adapter: async (config) => {
        platform = config.headers.get("X-App-Platform");
        return { data: {}, status: 200, statusText: "OK", headers: {}, config };
      },
    });
    expect(platform).toBe("ios");
  });
  it("does not log out or refresh tokens for update-required responses", async () => {
    const storage = jest.requireMock("../storage");
    await expect(
      apiClient.get("/learning", {
        adapter: async (config) => {
          throw new AxiosError(
            "Update required",
            "ERR_BAD_REQUEST",
            config,
            undefined,
            {
              config,
              status: 403,
              statusText: "Forbidden",
              headers: {},
              data: { code: "APP_UPDATE_REQUIRED" },
            },
          );
        },
      }),
    ).rejects.toThrow("Update required");
    expect(storage.clearSecureSession).not.toHaveBeenCalled();
  });
});
