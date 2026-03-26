import { DeviceService } from "./device.service.js";
import { AppError } from "../utils/errors.js";

// Build a chainable mock that tracks calls
const mockUpsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelectChain = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();

function buildChainMock() {
  const chain = {
    upsert: (...args: unknown[]) => {
      mockUpsert(...args);
      return {
        select: (...sArgs: unknown[]) => {
          mockSelectChain(...sArgs);
          return { single: () => mockSingle() };
        },
      };
    },
    update: (...args: unknown[]) => {
      mockUpdate(...args);
      return {
        eq: (...eqArgs: unknown[]) => {
          mockEq(...eqArgs);
          return mockEq();
        },
        in: (...inArgs: unknown[]) => {
          mockIn(...inArgs);
          return mockIn();
        },
      };
    },
    select: (...args: unknown[]) => {
      mockSelectChain(...args);
      return {
        eq: (...eqArgs: unknown[]) => {
          mockEq(...eqArgs);
          // Return another chainable eq
          return {
            eq: (...eq2Args: unknown[]) => {
              mockEq(...eq2Args);
              return mockEq();
            },
          };
        },
      };
    },
  };
  return chain;
}

vi.mock("../lib/supabase.js", () => ({
  supabase: {
    from: vi.fn(() => buildChainMock()),
  },
}));

describe("DeviceService", () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
    vi.clearAllMocks();
  });

  describe("registerDevice", () => {
    it("returns upserted device data on success", async () => {
      const deviceData = {
        id: "uuid-1",
        platform: "android",
        client_type: "android",
        player_name: "Alice",
        app_version: "1.0",
        is_active: true,
        updated_at: "2026-01-01T00:00:00Z",
        last_seen_at: "2026-01-01T00:00:00Z",
      };
      mockSingle.mockResolvedValue({ data: deviceData, error: null });

      const result = await service.registerDevice({
        deviceToken: "a".repeat(30),
        platform: "android",
        clientType: "android",
        playerName: "  Alice  ",
      });

      expect(result).toEqual(deviceData);
    });

    it("throws 502 on supabase error", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "upsert failed" } });

      await expect(
        service.registerDevice({
          deviceToken: "a".repeat(30),
          platform: "android",
          clientType: "android",
        }),
      ).rejects.toMatchObject({
        statusCode: 502,
        code: "DEVICE_REGISTER_FAILED",
      });
    });
  });

  describe("unregisterDevice", () => {
    it("returns success on valid call", async () => {
      mockEq.mockResolvedValue({ error: null });

      const result = await service.unregisterDevice("a".repeat(30));
      expect(result).toEqual({ success: true });
    });

    it("throws 502 on supabase error", async () => {
      mockEq.mockResolvedValue({ error: { message: "update failed" } });

      await expect(service.unregisterDevice("a".repeat(30))).rejects.toMatchObject({
        statusCode: 502,
        code: "DEVICE_UNREGISTER_FAILED",
      });
    });
  });

  describe("getActiveAndroidTokensForTarget", () => {
    it("returns token directly for type token (no DB call)", async () => {
      const result = await service.getActiveAndroidTokensForTarget({
        type: "token",
        token: "my-token",
      });
      expect(result).toEqual(["my-token"]);
    });

    it("queries active android devices for allAndroid", async () => {
      mockEq.mockResolvedValue({
        data: [{ device_token: "tok1" }, { device_token: "tok2" }],
        error: null,
      });

      const result = await service.getActiveAndroidTokensForTarget({ type: "allAndroid" });
      expect(result).toEqual(["tok1", "tok2"]);
    });

    it("deduplicates tokens", async () => {
      mockEq.mockResolvedValue({
        data: [{ device_token: "tok1" }, { device_token: "tok1" }],
        error: null,
      });

      const result = await service.getActiveAndroidTokensForTarget({ type: "allAndroid" });
      expect(result).toEqual(["tok1"]);
    });

    it("throws 502 on supabase error", async () => {
      mockEq.mockResolvedValue({ data: null, error: { message: "query failed" } });

      await expect(
        service.getActiveAndroidTokensForTarget({ type: "allAndroid" }),
      ).rejects.toMatchObject({
        statusCode: 502,
        code: "DEVICE_LOOKUP_FAILED",
      });
    });
  });

  describe("deactivateInvalidTokens", () => {
    it("no-ops for empty array", async () => {
      await service.deactivateInvalidTokens([]);
      const { supabase } = await import("../lib/supabase.js");
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("calls update with in() for non-empty array", async () => {
      mockIn.mockResolvedValue({ error: null });
      await service.deactivateInvalidTokens(["tok1", "tok2"]);
      expect(mockIn).toHaveBeenCalled();
    });

    it("throws 502 on supabase error", async () => {
      mockIn.mockResolvedValue({ error: { message: "deactivate failed" } });
      await expect(service.deactivateInvalidTokens(["tok1"])).rejects.toMatchObject({
        statusCode: 502,
        code: "DEVICE_DEACTIVATE_FAILED",
      });
    });
  });
});
