import { apiClient, publicClient } from "../client";
import { authApi } from "../services/auth";

jest.mock("react-native", () => ({
  Platform: {
    OS: "android",
    select: (options: Record<string, unknown>) => options.android ?? options.default,
  },
}));

jest.mock("expo-constants", () => ({
  expoConfig: {
    hostUri: "localhost:3000",
  },
}));

jest.mock("../client", () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
  clearAuthSession: jest.fn(),
  getRefreshToken: jest.fn(),
  persistAuthTokens: jest.fn(),
  publicClient: {
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedPublicClient = publicClient as jest.Mocked<typeof publicClient>;

describe("mobile auth api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("treats the backend credential-validation success envelope as valid", async () => {
    mockedPublicClient.post.mockResolvedValue({
      data: {
        success: true,
        message: "Credentials valid",
      },
    });

    await expect(
      authApi.validateCredentials({
        email: "student@example.com",
        password: "Password123!",
      }),
    ).resolves.toBe(true);

    expect(mockedPublicClient.post).toHaveBeenCalledWith("/auth/validate-credentials", {
      email: "student@example.com",
      password: "Password123!",
    });
  });

  it("sends the complete authenticated password-change DTO and propagates failure", async () => {
    const payload = {
      oldPassword: "Old@Pass1",
      newPassword: "New@Pass2",
      confirmPassword: "New@Pass2",
    };
    mockedApiClient.post.mockRejectedValueOnce(new Error("current password incorrect"));

    await expect(authApi.changePassword(payload)).rejects.toThrow("current password incorrect");
    expect(mockedApiClient.post).toHaveBeenCalledWith("/auth/change-password", payload);
  });
});
