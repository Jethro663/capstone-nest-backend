import { authApi } from "../services/auth";
import { publicClient } from "../client";

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
  },
  clearAuthSession: jest.fn(),
  getRefreshToken: jest.fn(),
  persistAuthTokens: jest.fn(),
  publicClient: {
    post: jest.fn(),
  },
}));

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
});
