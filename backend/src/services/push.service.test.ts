import { PushService } from "./push.service.js";
import { AppError } from "../utils/errors.js";
import type { DeviceService } from "./device.service.js";

const mockGetFirebaseMessaging = vi.fn();
vi.mock("../lib/firebase.js", () => ({
  getFirebaseMessaging: () => mockGetFirebaseMessaging(),
}));

function createMockDeviceService(): DeviceService {
  return {
    registerDevice: vi.fn(),
    unregisterDevice: vi.fn(),
    getActiveAndroidTokensForTarget: vi.fn(),
    deactivateInvalidTokens: vi.fn(),
  } as unknown as DeviceService;
}

describe("PushService", () => {
  let deviceService: ReturnType<typeof createMockDeviceService>;
  let pushService: PushService;

  beforeEach(() => {
    deviceService = createMockDeviceService();
    pushService = new PushService(deviceService);
    vi.clearAllMocks();
  });

  const basePushInput = {
    target: { type: "allAndroid" as const },
    notification: { title: "Test", body: "Hello" },
  };

  it("throws 503 when FCM is not configured", async () => {
    mockGetFirebaseMessaging.mockReturnValue(null);

    await expect(pushService.sendPush(basePushInput)).rejects.toMatchObject({
      statusCode: 503,
      code: "FCM_NOT_CONFIGURED",
    });
  });

  it("returns zeros when token list is empty", async () => {
    const mockMessaging = { sendEachForMulticast: vi.fn() };
    mockGetFirebaseMessaging.mockReturnValue(mockMessaging);
    vi.mocked(deviceService.getActiveAndroidTokensForTarget).mockResolvedValue([]);

    const result = await pushService.sendPush(basePushInput);

    expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0 });
    expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
  });

  it("sends notifications and returns counts", async () => {
    const mockMessaging = {
      sendEachForMulticast: vi.fn().mockResolvedValue({
        successCount: 2,
        failureCount: 1,
        responses: [
          { success: true },
          { success: true },
          { success: false, error: { code: "messaging/internal-error" } },
        ],
      }),
    };
    mockGetFirebaseMessaging.mockReturnValue(mockMessaging);
    vi.mocked(deviceService.getActiveAndroidTokensForTarget).mockResolvedValue([
      "tok1",
      "tok2",
      "tok3",
    ]);

    const result = await pushService.sendPush(basePushInput);

    expect(result).toEqual({ attempted: 3, succeeded: 2, failed: 1 });
    expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ["tok1", "tok2", "tok3"],
      notification: { title: "Test", body: "Hello" },
      data: undefined,
    });
  });

  it("auto-deactivates invalid tokens", async () => {
    const mockMessaging = {
      sendEachForMulticast: vi.fn().mockResolvedValue({
        successCount: 0,
        failureCount: 2,
        responses: [
          { success: false, error: { code: "messaging/registration-token-not-registered" } },
          { success: false, error: { code: "messaging/invalid-registration-token" } },
        ],
      }),
    };
    mockGetFirebaseMessaging.mockReturnValue(mockMessaging);
    vi.mocked(deviceService.getActiveAndroidTokensForTarget).mockResolvedValue(["bad1", "bad2"]);

    await pushService.sendPush(basePushInput);

    expect(deviceService.deactivateInvalidTokens).toHaveBeenCalledWith(["bad1", "bad2"]);
  });

  it("chunks tokens into batches of 500", async () => {
    const tokens = Array.from({ length: 750 }, (_, i) => `tok${i}`);
    const mockMessaging = {
      sendEachForMulticast: vi.fn().mockResolvedValue({
        successCount: 0,
        failureCount: 0,
        responses: [],
      }),
    };

    // Make each call return the right counts
    mockMessaging.sendEachForMulticast
      .mockResolvedValueOnce({
        successCount: 500,
        failureCount: 0,
        responses: Array(500).fill({ success: true }),
      })
      .mockResolvedValueOnce({
        successCount: 250,
        failureCount: 0,
        responses: Array(250).fill({ success: true }),
      });

    mockGetFirebaseMessaging.mockReturnValue(mockMessaging);
    vi.mocked(deviceService.getActiveAndroidTokensForTarget).mockResolvedValue(tokens);

    const result = await pushService.sendPush(basePushInput);

    expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledTimes(2);
    expect(mockMessaging.sendEachForMulticast.mock.calls[0][0].tokens).toHaveLength(500);
    expect(mockMessaging.sendEachForMulticast.mock.calls[1][0].tokens).toHaveLength(250);
    expect(result).toEqual({ attempted: 750, succeeded: 750, failed: 0 });
  });
});
