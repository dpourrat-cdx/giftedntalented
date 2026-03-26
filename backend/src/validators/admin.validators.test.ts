import { resetScoresBodySchema, sendPushBodySchema } from "./admin.validators.js";

describe("resetScoresBodySchema", () => {
  it("accepts valid PIN", () => {
    const result = resetScoresBodySchema.safeParse({ resetPin: "1234" });
    expect(result.success).toBe(true);
  });

  it("rejects empty PIN", () => {
    const result = resetScoresBodySchema.safeParse({ resetPin: "" });
    expect(result.success).toBe(false);
  });

  it("rejects PIN longer than 80 chars", () => {
    const result = resetScoresBodySchema.safeParse({ resetPin: "a".repeat(81) });
    expect(result.success).toBe(false);
  });

  it("trims whitespace", () => {
    const result = resetScoresBodySchema.safeParse({ resetPin: "  1234  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.resetPin).toBe("1234");
  });
});

describe("sendPushBodySchema", () => {
  const baseNotification = {
    notification: { title: "Hello", body: "World" },
  };

  it("accepts token target", () => {
    const result = sendPushBodySchema.safeParse({
      target: { type: "token", token: "a".repeat(30) },
      ...baseNotification,
    });
    expect(result.success).toBe(true);
  });

  it("accepts player target", () => {
    const result = sendPushBodySchema.safeParse({
      target: { type: "player", playerName: "Alice" },
      ...baseNotification,
    });
    expect(result.success).toBe(true);
  });

  it("accepts allAndroid target", () => {
    const result = sendPushBodySchema.safeParse({
      target: { type: "allAndroid" },
      ...baseNotification,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid target type", () => {
    const result = sendPushBodySchema.safeParse({
      target: { type: "ios" },
      ...baseNotification,
    });
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 120 chars", () => {
    const result = sendPushBodySchema.safeParse({
      target: { type: "allAndroid" },
      notification: { title: "a".repeat(121), body: "World" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects body longer than 500 chars", () => {
    const result = sendPushBodySchema.safeParse({
      target: { type: "allAndroid" },
      notification: { title: "Hello", body: "a".repeat(501) },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = sendPushBodySchema.safeParse({
      target: { type: "allAndroid" },
      notification: { title: "", body: "World" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional data record", () => {
    const result = sendPushBodySchema.safeParse({
      target: { type: "allAndroid" },
      ...baseNotification,
      data: { key: "value" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing notification", () => {
    const result = sendPushBodySchema.safeParse({
      target: { type: "allAndroid" },
    });
    expect(result.success).toBe(false);
  });
});
