import { registerDeviceBodySchema, unregisterDeviceBodySchema } from "./device.validators.js";

describe("registerDeviceBodySchema", () => {
  const validBody = {
    deviceToken: "a".repeat(30),
    platform: "android" as const,
    clientType: "android" as const,
  };

  it("accepts valid input", () => {
    const result = registerDeviceBodySchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  it("rejects deviceToken shorter than 20 chars", () => {
    const result = registerDeviceBodySchema.safeParse({ ...validBody, deviceToken: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects deviceToken longer than 4096 chars", () => {
    const result = registerDeviceBodySchema.safeParse({
      ...validBody,
      deviceToken: "a".repeat(4097),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid platform", () => {
    const result = registerDeviceBodySchema.safeParse({ ...validBody, platform: "ios" });
    expect(result.success).toBe(false);
  });

  it("accepts optional playerName and normalizes it", () => {
    const result = registerDeviceBodySchema.safeParse({
      ...validBody,
      playerName: "  Alice  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.playerName).toBe("Alice");
  });

  it("accepts optional appVersion", () => {
    const result = registerDeviceBodySchema.safeParse({
      ...validBody,
      appVersion: "1.2.3",
    });
    expect(result.success).toBe(true);
  });

  it("rejects appVersion longer than 50 chars", () => {
    const result = registerDeviceBodySchema.safeParse({
      ...validBody,
      appVersion: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });
});

describe("unregisterDeviceBodySchema", () => {
  it("accepts valid token", () => {
    const result = unregisterDeviceBodySchema.safeParse({ deviceToken: "a".repeat(30) });
    expect(result.success).toBe(true);
  });

  it("rejects token shorter than 20 chars", () => {
    const result = unregisterDeviceBodySchema.safeParse({ deviceToken: "short" });
    expect(result.success).toBe(false);
  });
});
