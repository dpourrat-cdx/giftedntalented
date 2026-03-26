import { playerNameParamsSchema, scoreRecordBodySchema } from "./score.validators.js";

describe("playerNameParamsSchema", () => {
  it("accepts a valid name", () => {
    const result = playerNameParamsSchema.safeParse({ playerName: "Alice" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.playerName).toBe("Alice");
  });

  it("trims and normalizes whitespace", () => {
    const result = playerNameParamsSchema.safeParse({ playerName: "  Bob   the   Builder  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.playerName).toBe("Bob the Builder");
  });

  it("rejects whitespace-only string", () => {
    const result = playerNameParamsSchema.safeParse({ playerName: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = playerNameParamsSchema.safeParse({ playerName: "" });
    expect(result.success).toBe(false);
  });

  it("truncates names longer than 40 characters", () => {
    const longName = "A".repeat(50);
    const result = playerNameParamsSchema.safeParse({ playerName: longName });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.playerName).toHaveLength(40);
  });
});

describe("scoreRecordBodySchema", () => {
  const validBody = {
    score: 50,
    percentage: 78,
    totalQuestions: 64,
    clientType: "web" as const,
  };

  it("accepts valid quiz input", () => {
    const result = scoreRecordBodySchema.safeParse(validBody);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mode).toBe("quiz");
  });

  it("defaults mode to quiz when omitted", () => {
    const result = scoreRecordBodySchema.safeParse(validBody);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mode).toBe("quiz");
  });

  it("accepts story mode", () => {
    const result = scoreRecordBodySchema.safeParse({ ...validBody, mode: "story" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mode).toBe("story");
  });

  it("rejects score greater than totalQuestions", () => {
    const result = scoreRecordBodySchema.safeParse({ ...validBody, score: 65 });
    expect(result.success).toBe(false);
  });

  it("rejects negative score", () => {
    const result = scoreRecordBodySchema.safeParse({ ...validBody, score: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects percentage above 100", () => {
    const result = scoreRecordBodySchema.safeParse({ ...validBody, percentage: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects percentage below 0", () => {
    const result = scoreRecordBodySchema.safeParse({ ...validBody, percentage: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts nullable elapsedSeconds", () => {
    const result = scoreRecordBodySchema.safeParse({ ...validBody, elapsedSeconds: null });
    expect(result.success).toBe(true);
  });

  it("accepts valid elapsedSeconds", () => {
    const result = scoreRecordBodySchema.safeParse({ ...validBody, elapsedSeconds: 1200 });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = scoreRecordBodySchema.safeParse({ score: 50 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid clientType", () => {
    const result = scoreRecordBodySchema.safeParse({ ...validBody, clientType: "ios" });
    expect(result.success).toBe(false);
  });
});
