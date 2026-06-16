import { profileApi } from "../services/profile";
import { apiClient } from "../client";

jest.mock("../client", () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("profileApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when profile payload is empty", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: null,
      },
    });

    const result = await profileApi.getMine();

    expect(mockedApiClient.get).toHaveBeenCalledWith("/profiles/me");
    expect(result).toBeNull();
  });

  it("updates profile by user id via update endpoint", async () => {
    mockedApiClient.put.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: "profile-1",
          userId: "student-1",
          address: "Updated address",
        },
      },
    });

    const result = await profileApi.updateByUserId("student-1", {
      address: "Updated address",
    });

    expect(mockedApiClient.put).toHaveBeenCalledWith(
      "/profiles/update/student-1",
      { address: "Updated address" },
    );
    expect(result).toMatchObject({
      id: "profile-1",
      userId: "student-1",
      address: "Updated address",
    });
  });

  it("uploads avatar using multipart form data contract", async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          profile: { id: "profile-1", userId: "student-1" },
          profilePicture: "https://cdn.example/avatar.jpg",
        },
      },
    });

    await profileApi.uploadAvatar({
      uri: "file:///avatar.jpg",
      name: "avatar.jpg",
      type: "image/jpeg",
    });

    expect(mockedApiClient.post).toHaveBeenCalledTimes(1);
    const [url, formData, config] = mockedApiClient.post.mock.calls[0];
    expect(url).toBe("/profiles/me/avatar");
    expect(formData).toBeInstanceOf(FormData);
    expect(config).toMatchObject({
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  });
});
