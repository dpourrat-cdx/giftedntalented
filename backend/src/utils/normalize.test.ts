import { normalizePlayerName, normalizeElapsedSeconds } from "./normalize.js";

describe("normalizePlayerName", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizePlayerName("  Alice  ")).toBe("Alice");
  });

  it("collapses multiple spaces to a single space", () => {
    expect(normalizePlayerName("Bob   the   Builder")).toBe("Bob the Builder");
  });

  it("truncates to 40 characters", () => {
    const long = "A".repeat(50);
    expect(normalizePlayerName(long)).toBe("A".repeat(40));
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalizePlayerName("   ")).toBe("");
  });

  it("passes through a normal name unchanged", () => {
    expect(normalizePlayerName("Charlie")).toBe("Charlie");
  });
});

describe("normalizeElapsedSeconds", () => {
  it("returns null for null", () => {
    expect(normalizeElapsedSeconds(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizeElapsedSeconds(undefined)).toBeNull();
  });

  it("returns null for negative numbers", () => {
    expect(normalizeElapsedSeconds(-5)).toBeNull();
  });

  it("returns null for Infinity", () => {
    expect(normalizeElapsedSeconds(Infinity)).toBeNull();
  });

  it("returns null for NaN", () => {
    expect(normalizeElapsedSeconds(NaN)).toBeNull();
  });

  it("rounds to nearest integer", () => {
    expect(normalizeElapsedSeconds(10.7)).toBe(11);
    expect(normalizeElapsedSeconds(10.3)).toBe(10);
  });

  it("passes through valid integers unchanged", () => {
    expect(normalizeElapsedSeconds(120)).toBe(120);
  });

  it("returns 0 for zero", () => {
    expect(normalizeElapsedSeconds(0)).toBe(0);
  });
});
